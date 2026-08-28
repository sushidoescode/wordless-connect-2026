import { normalizeGlyph } from '@wordless/core/StrokeGeometry'
import { isStrokeColorId } from '@wordless/core/Protocol'
import type {
  ChoiceIndex,
  ChoiceTuple,
  QuantizedPoint,
  RelayMessage,
  RoundPhase,
  StrokeColorId,
} from '@wordless/core/Protocol'

const PENDING_DELIVERY_MS = 3_000
const SESSION_ID_PATTERN = /^[A-Z0-9]{6}$/
const GUESS_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

export interface WebRoundSnapshot {
  readonly connection: 'joining' | 'waiting' | 'live' | 'reconnecting' | 'failed' | 'closed'
  readonly phase: RoundPhase
  readonly sessionId: string
  readonly roundId: string
  readonly roundGeneration: number
  readonly choices: ChoiceTuple | null
  readonly points: readonly QuantizedPoint[]
  readonly strokeColorId: StrokeColorId | null
  readonly pendingChoice: ChoiceIndex | null
  readonly pendingGuessId: string | null
  readonly pendingDeadlineAtMs: number | null
  readonly wrongChoices: readonly ChoiceIndex[]
  readonly correctChoice: ChoiceIndex | null
  readonly revealedWord: string | null
  readonly finalPointCount: number | null
  readonly glyph: readonly QuantizedPoint[]
  readonly remainingMs: number
}

export type WebRoundIntent =
  | {
      readonly type: 'guess.submit'
      readonly roundId: string
      readonly guessId: string
      readonly choiceIndex: ChoiceIndex
    }
  | {
      readonly type: 'round.resync.request'
      readonly roundId: string
      readonly reason: 'POINT_COUNT_MISMATCH'
    }

export type WebRoundStoreListener = (snapshot: WebRoundSnapshot) => void

export interface WebRoundStoreOptions {
  readonly sessionId: string
  readonly guessIdFactory: () => string
  readonly now: () => number
}

type TransportState = Exclude<WebRoundSnapshot['connection'], 'live'>

function freezePoints(points: readonly QuantizedPoint[]): readonly QuantizedPoint[] {
  return Object.freeze(points.map((point) => Object.freeze([
    point[0],
    point[1],
  ]) as QuantizedPoint))
}

function freezeChoices(choices: ChoiceTuple | null): ChoiceTuple | null {
  if (choices === null) return null
  return Object.freeze([
    choices[0],
    choices[1],
    choices[2],
    choices[3],
  ]) as ChoiceTuple
}

function freezeSnapshot(snapshot: WebRoundSnapshot): WebRoundSnapshot {
  return Object.freeze({
    ...snapshot,
    choices: freezeChoices(snapshot.choices),
    points: freezePoints(snapshot.points),
    wrongChoices: Object.freeze(snapshot.wrongChoices.slice()),
    glyph: freezePoints(snapshot.glyph),
  })
}

function includesChoice(
  choices: readonly ChoiceIndex[],
  choice: ChoiceIndex,
): boolean {
  return choices.includes(choice)
}

function isChoiceIndex(value: unknown): value is ChoiceIndex {
  return value === 0 || value === 1 || value === 2 || value === 3
}

export class WebRoundStore {
  private snapshot: WebRoundSnapshot
  private readonly guessIdFactory: () => string
  private readonly now: () => number
  private readonly listeners = new Set<WebRoundStoreListener>()
  private deadlineAtMs: number | null = null
  private invalidatedRoundId: string | null = null
  private resyncRequested = false
  private activeStrokeId: string | null = null

  constructor(options: WebRoundStoreOptions) {
    if (!SESSION_ID_PATTERN.test(options.sessionId)) {
      throw new Error('invalid session ID')
    }
    this.guessIdFactory = options.guessIdFactory
    this.now = options.now
    this.snapshot = freezeSnapshot({
      connection: 'joining',
      phase: 'JOINING',
      sessionId: options.sessionId,
      roundId: '',
      roundGeneration: 0,
      choices: null,
      points: [],
      strokeColorId: null,
      pendingChoice: null,
      pendingGuessId: null,
      pendingDeadlineAtMs: null,
      wrongChoices: [],
      correctChoice: null,
      revealedWord: null,
      finalPointCount: null,
      glyph: [],
      remainingMs: 0,
    })
  }

  getSnapshot(): WebRoundSnapshot {
    return this.snapshot
  }

  subscribe(listener: WebRoundStoreListener): () => void {
    this.listeners.add(listener)
    let active = true
    return () => {
      if (!active) return
      active = false
      this.listeners.delete(listener)
    }
  }

  dispatch(message: RelayMessage): readonly WebRoundIntent[] {
    if (message.sessionId !== this.snapshot.sessionId || message.senderId.length === 0) {
      return []
    }

    switch (message.type) {
      case 'presence.ready':
        return []
      case 'presence.ack':
        this.acceptPainterAck(message)
        return []
      case 'round.start':
        this.acceptRoundStart(message)
        return []
      case 'round.reset':
        this.acceptRoundReset(message)
        return []
      case 'stroke.begin':
        this.acceptStrokeBegin(message)
        return []
      case 'stroke.points':
        this.acceptPoints(message)
        return []
      case 'round.result':
        return this.acceptResult(message)
      case 'guess.rejected':
        this.acceptRejection(message)
        return []
      case 'round.timeout':
        return this.acceptTimeout(message)
      default:
        return []
    }
  }

  setTransportState(state: TransportState, _detail: string): void {
    if (this.snapshot.connection === state) return
    this.replace({ ...this.snapshot, connection: state })
  }

  invalidateForReconnect(): void {
    const oldRoundId = this.snapshot.roundId
    if (oldRoundId) this.invalidatedRoundId = oldRoundId
    this.deadlineAtMs = null
    this.resyncRequested = false
    this.activeStrokeId = null
    this.replace({
      ...this.snapshot,
      connection: 'reconnecting',
      phase: 'DISCONNECTED',
      roundId: '',
      roundGeneration: this.snapshot.roundGeneration + 1,
      choices: null,
      points: [],
      strokeColorId: null,
      pendingChoice: null,
      pendingGuessId: null,
      pendingDeadlineAtMs: null,
      wrongChoices: [],
      correctChoice: null,
      revealedWord: null,
      finalPointCount: null,
      glyph: [],
      remainingMs: 0,
    })
  }

  submitChoice(index: ChoiceIndex, nowMs: number): WebRoundIntent | null {
    if (!isChoiceIndex(index) ||
        this.snapshot.connection !== 'live' || this.snapshot.phase !== 'ACTIVE' ||
        this.snapshot.choices === null || this.snapshot.pendingGuessId !== null ||
        includesChoice(this.snapshot.wrongChoices, index)) {
      return null
    }

    const guessId = this.guessIdFactory()
    if (!GUESS_ID_PATTERN.test(guessId)) throw new Error('invalid guess ID')
    const pendingDeadlineAtMs = nowMs + PENDING_DELIVERY_MS
    this.replace({
      ...this.snapshot,
      pendingChoice: index,
      pendingGuessId: guessId,
      pendingDeadlineAtMs,
    })
    return {
      type: 'guess.submit',
      roundId: this.snapshot.roundId,
      guessId,
      choiceIndex: index,
    }
  }

  expirePending(nowMs: number): boolean {
    const deadline = this.snapshot.pendingDeadlineAtMs
    if (deadline === null || nowMs < deadline) return false
    this.clearPending()
    return true
  }

  tick(nowMs: number): boolean {
    if (this.snapshot.phase !== 'ACTIVE' || this.deadlineAtMs === null) return false
    const remainingMs = Math.max(0, this.deadlineAtMs - nowMs)
    if (remainingMs === this.snapshot.remainingMs) return false
    this.replace({ ...this.snapshot, remainingMs })
    return true
  }

  lockGlyph(expectedRoundId: string, expectedGeneration: number): boolean {
    if (this.snapshot.phase !== 'CORRECT' ||
        this.snapshot.roundId !== expectedRoundId ||
        this.snapshot.roundGeneration !== expectedGeneration) {
      return false
    }
    this.replace({ ...this.snapshot, phase: 'GLYPH_LOCKED' })
    return true
  }

  private acceptPainterAck(message: Extract<RelayMessage, { type: 'presence.ack' }>): void {
    if (message.payload.role !== 'painter' ||
        (this.snapshot.connection !== 'joining' &&
          this.snapshot.connection !== 'waiting' &&
          this.snapshot.connection !== 'reconnecting')) {
      return
    }
    const phase = this.snapshot.phase === 'JOINING' || this.snapshot.phase === 'DISCONNECTED'
      ? 'READY'
      : this.snapshot.phase
    this.replace({ ...this.snapshot, connection: 'live', phase })
  }

  private acceptRoundStart(message: Extract<RelayMessage, { type: 'round.start' }>): void {
    const isResetAuthorizedStart = this.snapshot.roundId === message.roundId &&
      this.snapshot.phase === 'READY' && this.snapshot.choices === null
    if (this.snapshot.roundId !== '' && !isResetAuthorizedStart) return
    if (this.snapshot.roundId === '' && this.invalidatedRoundId === message.roundId) return

    const nowMs = this.now()
    this.deadlineAtMs = nowMs + message.payload.durationMs
    this.invalidatedRoundId = null
    this.resyncRequested = false
    this.activeStrokeId = null
    this.replace({
      ...this.snapshot,
      connection: 'live',
      phase: 'ACTIVE',
      roundId: message.roundId,
      roundGeneration: isResetAuthorizedStart
        ? this.snapshot.roundGeneration
        : this.snapshot.roundGeneration + 1,
      choices: message.payload.choices,
      points: [],
      strokeColorId: null,
      pendingChoice: null,
      pendingGuessId: null,
      pendingDeadlineAtMs: null,
      wrongChoices: [],
      correctChoice: null,
      revealedWord: null,
      finalPointCount: null,
      glyph: [],
      remainingMs: message.payload.durationMs,
    })
  }

  private acceptRoundReset(message: Extract<RelayMessage, { type: 'round.reset' }>): void {
    const nextRoundId = message.payload.nextRoundId
    if (nextRoundId === this.snapshot.roundId || nextRoundId === this.invalidatedRoundId) return
    this.deadlineAtMs = null
    this.invalidatedRoundId = null
    this.resyncRequested = false
    this.activeStrokeId = null
    this.replace({
      ...this.snapshot,
      connection: 'live',
      phase: 'READY',
      roundId: nextRoundId,
      roundGeneration: this.snapshot.roundGeneration + 1,
      choices: null,
      points: [],
      strokeColorId: null,
      pendingChoice: null,
      pendingGuessId: null,
      pendingDeadlineAtMs: null,
      wrongChoices: [],
      correctChoice: null,
      revealedWord: null,
      finalPointCount: null,
      glyph: [],
      remainingMs: 0,
    })
  }

  private acceptStrokeBegin(
    message: Extract<RelayMessage, { type: 'stroke.begin' }>,
  ): void {
    if (this.snapshot.phase !== 'ACTIVE' ||
        message.roundId !== this.snapshot.roundId ||
        this.activeStrokeId !== null ||
        this.snapshot.strokeColorId !== null ||
        !isStrokeColorId(message.payload.colorId)) return
    this.activeStrokeId = message.payload.strokeId
    this.replace({ ...this.snapshot, strokeColorId: message.payload.colorId })
  }

  private acceptPoints(message: Extract<RelayMessage, { type: 'stroke.points' }>): void {
    if (this.snapshot.phase !== 'ACTIVE' ||
        message.roundId !== this.snapshot.roundId ||
        this.activeStrokeId !== message.payload.strokeId ||
        this.snapshot.strokeColorId === null) return
    this.replace({
      ...this.snapshot,
      points: [...this.snapshot.points, ...message.payload.points],
    })
  }

  private acceptResult(
    message: Extract<RelayMessage, { type: 'round.result' }>,
  ): readonly WebRoundIntent[] {
    if (message.roundId !== this.snapshot.roundId || this.snapshot.phase !== 'ACTIVE') return []
    if (message.payload.outcome === 'incorrect') {
      const clearsPending = this.snapshot.pendingGuessId === message.payload.guessId
      const wrongChoices = includesChoice(this.snapshot.wrongChoices, message.payload.choiceIndex)
        ? this.snapshot.wrongChoices
        : [...this.snapshot.wrongChoices, message.payload.choiceIndex]
      this.replace({
        ...this.snapshot,
        wrongChoices,
        pendingChoice: clearsPending ? null : this.snapshot.pendingChoice,
        pendingGuessId: clearsPending ? null : this.snapshot.pendingGuessId,
        pendingDeadlineAtMs: clearsPending ? null : this.snapshot.pendingDeadlineAtMs,
      })
      return []
    }

    if (message.payload.finalPointCount !== this.snapshot.points.length) {
      return this.requestPointCountResync(message.roundId)
    }
    this.deadlineAtMs = null
    this.replace({
      ...this.snapshot,
      phase: 'CORRECT',
      pendingChoice: null,
      pendingGuessId: null,
      pendingDeadlineAtMs: null,
      correctChoice: message.payload.choiceIndex,
      revealedWord: message.payload.revealedWord,
      finalPointCount: message.payload.finalPointCount,
      glyph: normalizeGlyph(this.snapshot.points),
      remainingMs: 0,
    })
    return []
  }

  private acceptRejection(
    message: Extract<RelayMessage, { type: 'guess.rejected' }>,
  ): void {
    if (message.roundId !== this.snapshot.roundId ||
        message.payload.guessId !== this.snapshot.pendingGuessId) return
    this.clearPending()
  }

  private acceptTimeout(
    message: Extract<RelayMessage, { type: 'round.timeout' }>,
  ): readonly WebRoundIntent[] {
    if (message.roundId !== this.snapshot.roundId || this.snapshot.phase !== 'ACTIVE') return []
    if (message.payload.finalPointCount !== this.snapshot.points.length) {
      return this.requestPointCountResync(message.roundId)
    }
    this.deadlineAtMs = null
    this.replace({
      ...this.snapshot,
      phase: 'TIMED_OUT',
      pendingChoice: null,
      pendingGuessId: null,
      pendingDeadlineAtMs: null,
      finalPointCount: message.payload.finalPointCount,
      glyph: [],
      remainingMs: 0,
    })
    return []
  }

  private requestPointCountResync(roundId: string): readonly WebRoundIntent[] {
    if (this.resyncRequested) return []
    this.resyncRequested = true
    const intent: WebRoundIntent = {
      type: 'round.resync.request',
      roundId,
      reason: 'POINT_COUNT_MISMATCH',
    }
    this.invalidateForReconnect()
    this.resyncRequested = true
    return [intent]
  }

  private clearPending(): void {
    this.replace({
      ...this.snapshot,
      pendingChoice: null,
      pendingGuessId: null,
      pendingDeadlineAtMs: null,
    })
  }

  private replace(next: WebRoundSnapshot): void {
    const snapshot = freezeSnapshot(next)
    this.snapshot = snapshot
    for (const listener of [...this.listeners]) {
      try {
        listener(snapshot)
      }
      catch {
        // A view failure cannot interrupt the pure projection transition.
      }
    }
  }
}
