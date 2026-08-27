import {
  MAX_STROKE_POINTS,
  POINT_BATCH_INTERVAL_MS,
} from './Protocol'
import type {
  ChoiceIndex,
  GlyphNormalizer,
  GuessRejectionReason,
  PointBatcher,
  QuantizedPoint,
  WorldPoint,
} from './Protocol'
import type { LensRoundState } from './RoundStore'
import { RoundStore } from './RoundStore'
import type { WordCard } from './WordDeck'

export type PublishResultEffect =
  | {
      type: 'publish-result'
      outcome: 'correct'
      guessId: string
      choiceIndex: ChoiceIndex
      revealedWord: string
      finalPointCount: number
    }
  | {
      type: 'publish-result'
      outcome: 'incorrect'
      guessId: string
      choiceIndex: ChoiceIndex
    }

export interface EngineEffectMeta {
  readonly roundId: string
  readonly generation: number
}

type EngineEffectBody =
  | { type: 'publish-round-start' }
  | { type: 'publish-stroke-begin'; strokeId: string }
  | {
      type: 'publish-stroke-points'
      strokeId: string
      points: readonly QuantizedPoint[]
    }
  | { type: 'publish-stroke-end'; strokeId: string }
  | PublishResultEffect
  | {
      type: 'publish-guess-rejected'
      guessId: string
      choiceIndex: ChoiceIndex
      reason: GuessRejectionReason
    }
  | { type: 'publish-timeout'; finalPointCount: number }
  | { type: 'publish-reset'; previousRoundId: string; nextRoundId: string }

export type EngineEffect = EngineEffectMeta & EngineEffectBody

type StrokeState = 'NOT_STARTED' | 'OPEN' | 'CLOSING' | 'ENDED'

type PendingTerminal =
  | {
      readonly outcome: 'correct'
      readonly guessId: string
      readonly choiceIndex: ChoiceIndex
      readonly generation: number
    }
  | {
      readonly outcome: 'timeout'
      readonly generation: number
    }

interface DeadlineAdvance {
  readonly effects: EngineEffect[]
  readonly timeoutLatchedNow: boolean
}

export class WordlessEngine {
  private readonly store: RoundStore
  private readonly normalizeGlyph: GlyphNormalizer
  private readonly takePointBatch: PointBatcher

  private card: WordCard | null = null
  private roundGeneration = 0
  private deadlineMs: number | null = null
  private readonly seenGuessIds = new Set<string>()
  private strokeState: StrokeState = 'NOT_STARTED'
  private strokeId: string | null = null
  private pointQueue: readonly QuantizedPoint[] = []
  private lastPointBatchAtMs: number | null = null
  private pendingTerminal: PendingTerminal | null = null
  private deferredGeneration = 0
  private lastNowMs: number | null = null

  constructor(
    store: RoundStore,
    normalizeGlyph: GlyphNormalizer,
    takePointBatch: PointBatcher,
  ) {
    this.store = store
    this.normalizeGlyph = normalizeGlyph
    this.takePointBatch = takePointBatch
  }

  applyRound(
    roundId: string,
    card: WordCard,
    nowMs: number,
    durationMs = 20000,
  ): EngineEffect[] {
    if (!Number.isFinite(nowMs)) return []
    const previousRoundId = this.store.getSnapshot().roundId
    this.roundGeneration += 1
    this.card = {
      answer: card.answer,
      correctIndex: card.correctIndex,
      choices: [
        card.choices[0],
        card.choices[1],
        card.choices[2],
        card.choices[3],
      ],
    }
    this.deadlineMs = null
    this.seenGuessIds.clear()
    this.strokeState = 'NOT_STARTED'
    this.strokeId = null
    this.pointQueue = []
    this.lastPointBatchAtMs = null
    this.pendingTerminal = null
    this.deferredGeneration = this.roundGeneration
    this.lastNowMs = nowMs
    this.store.replace({
      phase: 'READY',
      roundId,
      promptWord: this.card.answer,
      choices: this.card.choices,
      durationMs,
      startedAtMs: 0,
      remainingMs: durationMs,
      worldPoints: [],
      publicPoints: [],
      guessedIndices: [],
      lastOutcome: 'none',
      revealedWord: null,
      glyph: [],
      counterpartReady: false,
      strokeComplete: false,
    })

    if (previousRoundId.length === 0) return []
    return [this.effect({
      type: 'publish-reset',
      previousRoundId,
      nextRoundId: roundId,
    })]
  }

  setCounterpartReady(ready: boolean, nowMs: number): EngineEffect[] {
    if (!this.acceptTime(nowMs)) return []
    const snapshot = this.store.getSnapshot()
    if (snapshot.phase !== 'READY') return []
    if (!ready) {
      if (snapshot.counterpartReady) {
        this.replaceState({ counterpartReady: false })
      }
      return []
    }

    this.deadlineMs = nowMs + snapshot.durationMs
    this.store.replace({
      ...snapshot,
      phase: 'ACTIVE',
      startedAtMs: nowMs,
      remainingMs: snapshot.durationMs,
      counterpartReady: true,
    })
    return [this.effect({ type: 'publish-round-start' })]
  }

  beginStroke(strokeId: string, nowMs: number): EngineEffect[] {
    if (!this.acceptTime(nowMs)) return []
    const advanced = this.advanceDeadline(nowMs)
    if (advanced.timeoutLatchedNow) return advanced.effects
    if (this.pendingTerminal !== null) {
      return [...advanced.effects, ...this.progressClosing(nowMs)]
    }
    if (this.store.getSnapshot().phase !== 'ACTIVE' ||
        this.strokeState !== 'NOT_STARTED') {
      return advanced.effects
    }

    this.strokeState = 'OPEN'
    this.strokeId = strokeId
    this.lastPointBatchAtMs = nowMs
    this.deferredGeneration = this.roundGeneration
    return [...advanced.effects, this.effect({
      type: 'publish-stroke-begin',
      strokeId,
    })]
  }

  appendPoint(
    world: WorldPoint,
    point: QuantizedPoint,
    nowMs: number,
  ): EngineEffect[] {
    if (!this.acceptTime(nowMs)) return []
    const advanced = this.advanceDeadline(nowMs)
    if (advanced.timeoutLatchedNow) return advanced.effects
    if (this.pendingTerminal !== null) {
      return [...advanced.effects, ...this.progressClosing(nowMs)]
    }
    if (this.store.getSnapshot().phase !== 'ACTIVE' ||
        this.strokeState !== 'OPEN') {
      return advanced.effects
    }

    const snapshot = this.store.getSnapshot()
    if (snapshot.publicPoints.length >= MAX_STROKE_POINTS) {
      this.beginClosing()
      return [...advanced.effects, ...this.progressClosing(nowMs)]
    }

    const acceptedPoint: QuantizedPoint = [point[0], point[1]]
    this.pointQueue = [...this.pointQueue, acceptedPoint]
    this.store.replace({
      ...snapshot,
      worldPoints: [...snapshot.worldPoints, {
        x: world.x,
        y: world.y,
        z: world.z,
      }],
      publicPoints: [...snapshot.publicPoints, acceptedPoint],
    })

    if (this.store.getSnapshot().publicPoints.length >= MAX_STROKE_POINTS) {
      this.beginClosing()
      return [...advanced.effects, ...this.progressClosing(nowMs)]
    }
    return [...advanced.effects, ...this.emitOpenBatchIfDue(nowMs)]
  }

  endStroke(nowMs: number): EngineEffect[] {
    if (!this.acceptTime(nowMs)) return []
    const advanced = this.advanceDeadline(nowMs)
    if (advanced.timeoutLatchedNow) return advanced.effects
    if (this.pendingTerminal !== null) {
      return [...advanced.effects, ...this.progressClosing(nowMs)]
    }
    if (this.store.getSnapshot().phase !== 'ACTIVE' ||
        this.strokeState !== 'OPEN') {
      return advanced.effects
    }

    this.beginClosing()
    return [...advanced.effects, ...this.progressClosing(nowMs)]
  }

  submitGuess(
    guessId: string,
    choiceIndex: ChoiceIndex,
    nowMs: number,
  ): EngineEffect[] {
    if (!this.acceptTime(nowMs)) return []
    const advanced = this.advanceDeadline(nowMs)
    if (advanced.timeoutLatchedNow) return advanced.effects

    const snapshot = this.store.getSnapshot()
    if (snapshot.phase !== 'ACTIVE' || this.pendingTerminal !== null) {
      return [...advanced.effects, this.guessRejection(
        guessId,
        choiceIndex,
        'WRONG_PHASE',
      )]
    }
    if (this.seenGuessIds.has(guessId)) {
      return [...advanced.effects, this.guessRejection(
        guessId,
        choiceIndex,
        'DUPLICATE_GUESS',
      )]
    }
    if (snapshot.guessedIndices.includes(choiceIndex)) {
      return [...advanced.effects, this.guessRejection(
        guessId,
        choiceIndex,
        'CHOICE_ALREADY_TRIED',
      )]
    }
    this.seenGuessIds.add(guessId)

    if (!this.card || choiceIndex !== this.card.correctIndex) {
      this.store.replace({
        ...snapshot,
        guessedIndices: [...snapshot.guessedIndices, choiceIndex],
        lastOutcome: 'incorrect',
      })
      return [...advanced.effects, this.effect({
        type: 'publish-result',
        outcome: 'incorrect',
        guessId,
        choiceIndex,
      })]
    }

    this.pendingTerminal = {
      outcome: 'correct',
      guessId,
      choiceIndex,
      generation: this.roundGeneration,
    }
    this.deferredGeneration = this.roundGeneration
    this.beginClosing()
    return [...advanced.effects, ...this.progressClosing(nowMs)]
  }

  lockGlyph(expectedRoundId: string, expectedGeneration: number): void {
    const snapshot = this.store.getSnapshot()
    if (expectedRoundId !== snapshot.roundId ||
        expectedGeneration !== this.roundGeneration ||
        snapshot.phase !== 'CORRECT') {
      return
    }
    this.store.replace({ ...snapshot, phase: 'GLYPH_LOCKED' })
  }

  tick(nowMs: number): EngineEffect[] {
    if (!this.acceptTime(nowMs)) return []
    if (this.deferredGeneration !== this.roundGeneration) return []
    const advanced = this.advanceDeadline(nowMs)
    if (advanced.timeoutLatchedNow) return advanced.effects
    if (this.pendingTerminal !== null || this.strokeState === 'CLOSING') {
      return [...advanced.effects, ...this.progressClosing(nowMs)]
    }
    if (this.strokeState === 'OPEN') {
      return [...advanced.effects, ...this.emitOpenBatchIfDue(nowMs)]
    }
    return advanced.effects
  }

  disconnect(): void {
    this.roundGeneration += 1
    this.card = null
    this.deadlineMs = null
    this.seenGuessIds.clear()
    this.strokeState = 'NOT_STARTED'
    this.strokeId = null
    this.pointQueue = []
    this.lastPointBatchAtMs = null
    this.pendingTerminal = null
    this.deferredGeneration = this.roundGeneration
    this.lastNowMs = null

    const snapshot = this.store.getSnapshot()
    this.store.replace({
      ...snapshot,
      phase: 'DISCONNECTED',
      remainingMs: 0,
      counterpartReady: false,
    })
  }

  getRoundGeneration(): number {
    return this.roundGeneration
  }

  private acceptTime(nowMs: number): boolean {
    if (!Number.isFinite(nowMs)) return false
    if (this.lastNowMs !== null && nowMs < this.lastNowMs) return false
    this.lastNowMs = nowMs
    return true
  }

  private advanceDeadline(nowMs: number): DeadlineAdvance {
    const snapshot = this.store.getSnapshot()
    if (snapshot.phase !== 'ACTIVE' ||
        this.deadlineMs === null ||
        this.pendingTerminal !== null) {
      return { effects: [], timeoutLatchedNow: false }
    }

    if (nowMs < this.deadlineMs) {
      const remainingMs = Math.max(0, this.deadlineMs - nowMs)
      if (remainingMs !== snapshot.remainingMs) {
        this.replaceState({ remainingMs })
      }
      return { effects: [], timeoutLatchedNow: false }
    }

    if (snapshot.remainingMs !== 0) this.replaceState({ remainingMs: 0 })
    this.pendingTerminal = {
      outcome: 'timeout',
      generation: this.roundGeneration,
    }
    this.deferredGeneration = this.roundGeneration
    this.beginClosing()
    return {
      effects: this.progressClosing(nowMs),
      timeoutLatchedNow: true,
    }
  }

  private beginClosing(): void {
    if (this.strokeState !== 'OPEN') return
    this.strokeState = 'CLOSING'
    const snapshot = this.store.getSnapshot()
    if (!snapshot.strokeComplete) {
      this.store.replace({ ...snapshot, strokeComplete: true })
    }
  }

  private emitOpenBatchIfDue(nowMs: number): EngineEffect[] {
    if (this.strokeState !== 'OPEN' || this.pointQueue.length === 0) return []
    return this.emitOnePointBatch(nowMs)
  }

  private progressClosing(nowMs: number): EngineEffect[] {
    if (this.deferredGeneration !== this.roundGeneration) return []
    const effects: EngineEffect[] = []

    if (this.strokeState === 'CLOSING') {
      if (this.pointQueue.length > 0) {
        const pointEffects = this.emitOnePointBatch(nowMs)
        effects.push(...pointEffects)
        if (this.pointQueue.length > 0 || pointEffects.length === 0) {
          return effects
        }
      }

      const strokeId = this.strokeId
      this.strokeState = 'ENDED'
      if (strokeId !== null) {
        effects.push(this.effect({
          type: 'publish-stroke-end',
          strokeId,
        }))
      }
    }

    if (this.pendingTerminal !== null &&
        (this.strokeState === 'NOT_STARTED' || this.strokeState === 'ENDED')) {
      effects.push(this.finalizeTerminal())
    }
    return effects
  }

  private emitOnePointBatch(nowMs: number): EngineEffect[] {
    if (this.pointQueue.length === 0 || this.strokeId === null) return []
    if (this.lastPointBatchAtMs !== null &&
        nowMs - this.lastPointBatchAtMs < POINT_BATCH_INTERVAL_MS) {
      return []
    }

    const { batch, rest } = this.takePointBatch(this.pointQueue)
    if (batch.length === 0) return []
    this.pointQueue = rest.map((point) => [point[0], point[1]])
    this.lastPointBatchAtMs = nowMs
    return [this.effect({
      type: 'publish-stroke-points',
      strokeId: this.strokeId,
      points: batch.map((point) => [point[0], point[1]]),
    })]
  }

  private finalizeTerminal(): EngineEffect {
    const pending = this.pendingTerminal
    if (pending === null || pending.generation !== this.roundGeneration) {
      throw new Error('stale terminal finalization')
    }
    const snapshot = this.store.getSnapshot()
    this.pendingTerminal = null

    if (pending.outcome === 'timeout') {
      this.store.replace({
        ...snapshot,
        phase: 'TIMED_OUT',
        remainingMs: 0,
        lastOutcome: 'timeout',
        revealedWord: null,
        glyph: [],
      })
      return this.effect({
        type: 'publish-timeout',
        finalPointCount: snapshot.publicPoints.length,
      })
    }

    if (this.card === null) throw new Error('correct terminal without card')
    const glyph = this.normalizeGlyph(snapshot.publicPoints)
    this.store.replace({
      ...snapshot,
      phase: 'CORRECT',
      remainingMs: 0,
      guessedIndices: [...snapshot.guessedIndices, pending.choiceIndex],
      lastOutcome: 'correct',
      revealedWord: this.card.answer,
      glyph,
    })
    return this.effect({
      type: 'publish-result',
      outcome: 'correct',
      guessId: pending.guessId,
      choiceIndex: pending.choiceIndex,
      revealedWord: this.card.answer,
      finalPointCount: snapshot.publicPoints.length,
    })
  }

  private guessRejection(
    guessId: string,
    choiceIndex: ChoiceIndex,
    reason: GuessRejectionReason,
  ): EngineEffect {
    return this.effect({
      type: 'publish-guess-rejected',
      guessId,
      choiceIndex,
      reason,
    })
  }

  private replaceState(changes: Partial<LensRoundState>): void {
    this.store.replace({ ...this.store.getSnapshot(), ...changes })
  }

  private effect(body: EngineEffectBody): EngineEffect {
    let frozenBody = body
    if (body.type === 'publish-stroke-points') {
      frozenBody = {
        ...body,
        points: Object.freeze(body.points.map((point) => Object.freeze([
          point[0],
          point[1],
        ]) as QuantizedPoint)),
      }
    }
    return Object.freeze({
      ...frozenBody,
      roundId: this.store.getSnapshot().roundId,
      generation: this.roundGeneration,
    }) as EngineEffect
  }
}
