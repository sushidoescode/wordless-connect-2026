import {
  createRoundId,
  serializedAsciiBytes,
} from './Core/Protocol'
import type {
  RelayMessage,
  RelayMessageDraft,
  RoundPhase,
  StrokeColorId,
  WorldPoint,
  QuantizedPoint,
} from './Core/Protocol'
import {
  RecoveryCoordinator,
} from './Core/RecoveryCoordinator'
import type {
  RecoveryAction,
  RecoveryResetTransition,
} from './Core/RecoveryCoordinator'
import { RoundStore } from './Core/RoundStore'
import type { LensRoundState } from './Core/RoundStore'
import {
  normalizeGlyph,
  pathCoordinateHash,
  takePointBatch,
} from './Core/StrokeGeometry'
import { WORD_DECK } from './Core/WordDeck'
import type { WordCard } from './Core/WordDeck'
import { WordlessEngine } from './Core/WordlessEngine'
import type { EngineEffect } from './Core/WordlessEngine'
import type {
  BrushController,
  BrushListener,
} from './Input/BrushController'
import type {
  PainterPaletteController,
  PaletteSelectionListener,
} from './Input/PainterPaletteController'
import type {
  ReplayController,
  ReplayRequestListener,
} from './Input/ReplayController'
import type { SupabaseRelayTransport } from './Transport/SupabaseRelayTransport'
import type {
  RelayControlEvent,
  RelayPort,
  RelayStatus,
} from './Transport/RelayPort'
import type { GlyphMedallionView } from './View/GlyphMedallionView'
import type { LensHudView } from './View/LensHudView'
import type { StrokeRibbonView } from './View/StrokeRibbonView'

const INSTANCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const INSTANCE_NONCE_LENGTH = 8
const ROUND_DURATION_MS = 20_000
const GLYPH_LOCK_DELAY_MS = 450
const RESET_RETRY_INTERVAL_MS = 1_000
const MAX_RESET_ATTEMPTS = 3
const SAFE_LOG_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/

interface BrushPort {
  setListener(listener: BrushListener | null): void
  armForRound(roundId: string): void
  disarm(): void
}

interface RibbonPort {
  render(points: readonly WorldPoint[]): void
  setStrokeColor(colorId: StrokeColorId): void
  setIncorrectFeedbackActive(active: boolean): void
  setPayoffActive(active: boolean): void
  getOwnedResourceCounts(): {
    readonly sceneObjects: number
    readonly materials: number
  }
}

interface HudPort {
  render(snapshot: LensRoundState): void
  getOwnedResourceCounts(): {
    readonly sceneObjects: number
    readonly materials: number
  }
}

interface GlyphPort {
  hide(): void
  render(
    sourcePoints: readonly WorldPoint[],
    glyphPoints: readonly QuantizedPoint[],
    revealedWord: string,
    colorId: StrokeColorId,
  ): void
  getOwnedResourceCounts(): {
    readonly sceneObjects: number
    readonly materials: number
  }
}

interface ReplayPort {
  setListener(listener: ReplayRequestListener | null): void
  setAvailable(roundId: string, available: boolean): void
}

interface PalettePort {
  setListener(listener: PaletteSelectionListener | null): void
  render(colorId: StrokeColorId, inputLocked: boolean): void
}

export interface WordlessAppDependencies {
  readonly relay: RelayPort
  readonly brush: BrushPort
  readonly ribbon: RibbonPort
  readonly hud: HudPort
  readonly glyph: GlyphPort
  readonly replay: ReplayPort
  readonly palette: PalettePort
  readonly nowMs: () => number
  readonly createNonce: () => string
  readonly log: (line: string) => void
}

interface GlyphLockDeadline {
  readonly roundId: string
  readonly generation: number
  readonly dueAtMs: number
}

interface ResetRetryDeadline {
  readonly tokenId: string
  readonly nextRoundId: string
  readonly dueAtMs: number
}

interface OutboundCallbacks {
  readonly onSent?: () => void
  readonly onCancelled?: () => void
  readonly onFailed?: () => void
}

function safeLogId(value: string): string {
  return SAFE_LOG_ID_PATTERN.test(value) ? value : 'invalid'
}

function isTerminalReplayPhase(phase: RoundPhase): boolean {
  return phase === 'GLYPH_LOCKED' || phase === 'TIMED_OUT'
}

function isPointMismatchRecoveryPhase(phase: RoundPhase): boolean {
  return phase === 'CORRECT' ||
    phase === 'GLYPH_LOCKED' ||
    phase === 'TIMED_OUT'
}

function cloneChoices(snapshot: LensRoundState): LensRoundState['choices'] {
  return [
    snapshot.choices[0],
    snapshot.choices[1],
    snapshot.choices[2],
    snapshot.choices[3],
  ]
}

export function createInstanceNonce(
  randomSource: () => number = Math.random,
): string {
  let nonce = ''
  for (let index = 0; index < INSTANCE_NONCE_LENGTH; index += 1) {
    const randomValue = randomSource()
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new Error('instance nonce random source must return [0, 1)')
    }
    nonce += INSTANCE_ALPHABET[
      Math.floor(randomValue * INSTANCE_ALPHABET.length)
    ]
  }
  return nonce
}

/**
 * Maps an engine-owned semantic effect to a transport-owned versionless draft.
 * The transport adds session/sender/sequence/time fields at dequeue.
 */
export function mapEngineEffectToDraft(
  effect: EngineEffect,
  snapshot: LensRoundState,
  targetConnectionId: string | null = null,
): RelayMessageDraft | null {
  switch (effect.type) {
    case 'publish-round-start':
      if (targetConnectionId === null) return null
      return {
        type: 'round.start',
        roundId: effect.roundId,
        payload: {
          choices: cloneChoices(snapshot),
          durationMs: snapshot.durationMs,
          targetConnectionId,
        },
      }
    case 'publish-stroke-begin':
      return {
        type: 'stroke.begin',
        roundId: effect.roundId,
        payload: { strokeId: effect.strokeId, colorId: effect.colorId },
      }
    case 'publish-stroke-points':
      return {
        type: 'stroke.points',
        roundId: effect.roundId,
        payload: {
          strokeId: effect.strokeId,
          points: effect.points.map((point) => [point[0], point[1]]),
        },
      }
    case 'publish-stroke-end':
      return {
        type: 'stroke.end',
        roundId: effect.roundId,
        payload: { strokeId: effect.strokeId },
      }
    case 'publish-result':
      if (effect.outcome === 'correct') {
        return {
          type: 'round.result',
          roundId: effect.roundId,
          payload: {
            outcome: 'correct',
            guessId: effect.guessId,
            choiceIndex: effect.choiceIndex,
            revealedWord: effect.revealedWord,
            finalPointCount: effect.finalPointCount,
          },
        }
      }
      return {
        type: 'round.result',
        roundId: effect.roundId,
        payload: {
          outcome: 'incorrect',
          guessId: effect.guessId,
          choiceIndex: effect.choiceIndex,
        },
      }
    case 'publish-guess-rejected':
      return {
        type: 'guess.rejected',
        roundId: effect.roundId,
        payload: {
          guessId: effect.guessId,
          choiceIndex: effect.choiceIndex,
          reason: effect.reason,
        },
      }
    case 'publish-timeout':
      return {
        type: 'round.timeout',
        roundId: effect.roundId,
        payload: { finalPointCount: effect.finalPointCount },
      }
    case 'publish-reset':
      if (targetConnectionId === null) return null
      return {
        type: 'round.reset',
        roundId: effect.previousRoundId,
        payload: {
          nextRoundId: effect.nextRoundId,
          targetConnectionId,
        },
      }
  }
}

export class WordlessAppController
  implements BrushListener, ReplayRequestListener, PaletteSelectionListener {
  private readonly relay: RelayPort
  private readonly brush: BrushPort
  private readonly ribbon: RibbonPort
  private readonly hud: HudPort
  private readonly glyph: GlyphPort
  private readonly replay: ReplayPort
  private readonly palette: PalettePort
  private readonly nowSource: () => number
  private readonly nonceSource: () => string
  private readonly logLine: (line: string) => void
  private readonly store = new RoundStore()
  private readonly engine = new WordlessEngine(
    this.store,
    normalizeGlyph,
    takePointBatch,
  )
  private readonly recovery = new RecoveryCoordinator()
  private readonly unsubscribers: Array<() => void> = []
  private readonly invalidatedRecoveryTokens = new Set<string>()

  private started = false
  private destroyed = false
  private applicationGeneration = 0
  private outboundTail: Promise<void> = Promise.resolve()
  private instanceNonce = ''
  private roundCounter = 0
  private currentCard: WordCard = WORD_DECK[0]
  private armedRoundId: string | null = null
  private renderedGlyphRoundId: string | null = null
  private lastPhase: RoundPhase | null = null
  private glyphLockDeadline: GlyphLockDeadline | null = null
  private resetRetryDeadline: ResetRetryDeadline | null = null
  private currentTransition: RecoveryResetTransition | null = null
  private lastSettledTransition: RecoveryResetTransition | null = null
  private cachedStartDraft: Extract<
    RelayMessageDraft,
    { type: 'round.start' }
  > | null = null
  private localClosePromise: Promise<void> | null = null

  constructor(dependencies: WordlessAppDependencies) {
    this.relay = dependencies.relay
    this.brush = dependencies.brush
    this.ribbon = dependencies.ribbon
    this.hud = dependencies.hud
    this.glyph = dependencies.glyph
    this.replay = dependencies.replay
    this.palette = dependencies.palette
    this.nowSource = dependencies.nowMs
    this.nonceSource = dependencies.createNonce
    this.logLine = dependencies.log
  }

  async start(): Promise<void> {
    if (this.started || this.destroyed) return
    this.started = true

    this.unsubscribers.push(
      this.store.subscribe((snapshot) => this.renderSnapshot(snapshot)),
      this.relay.onMessage((message) => this.onRelayMessage(message)),
      this.relay.onStatus((status, detail) => {
        this.onRelayStatus(status, detail)
      }),
      this.relay.onControl((event) => this.onRelayControl(event)),
    )
    this.brush.setListener(this)
    this.replay.setListener(this)
    this.palette.setListener(this)

    this.instanceNonce = this.nonceSource()
    this.roundCounter = 1
    this.currentCard = WORD_DECK[0]
    this.applyRound(
      createRoundId(this.instanceNonce, this.roundCounter),
      this.currentCard,
      undefined,
    )

    try {
      await this.relay.connect()
    }
    catch {
      // The adapter emits a sanitized CHANNEL_ERROR; that is the single
      // recovery entry and avoids logging configuration or credential data.
    }
  }

  update(): void {
    if (!this.started || this.destroyed) return
    const nowMs = this.nowMs()
    this.publishEffects(this.engine.tick(nowMs))

    const glyphDeadline = this.glyphLockDeadline
    if (glyphDeadline !== null && nowMs >= glyphDeadline.dueAtMs) {
      this.glyphLockDeadline = null
      this.engine.lockGlyph(
        glyphDeadline.roundId,
        glyphDeadline.generation,
      )
    }

    const retryDeadline = this.resetRetryDeadline
    if (retryDeadline !== null && nowMs >= retryDeadline.dueAtMs) {
      this.resetRetryDeadline = null
      const diagnostics = this.recovery.getDiagnostics()
      if (diagnostics.activeTokenId !== retryDeadline.tokenId ||
          diagnostics.pendingReset?.nextRoundId !==
            retryDeadline.nextRoundId) {
        return
      }
      const event = diagnostics.resetAttempts >= MAX_RESET_ATTEMPTS
        ? {
            type: 'RESET_RETRY_EXHAUSTED' as const,
            tokenId: retryDeadline.tokenId,
            nextRoundId: retryDeadline.nextRoundId,
          }
        : {
            type: 'RESET_RETRY_DUE' as const,
            tokenId: retryDeadline.tokenId,
            nextRoundId: retryDeadline.nextRoundId,
          }
      this.executeRecoveryActions(this.recovery.handle(event))
    }
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return this.localClosePromise ?? Promise.resolve()
    this.destroyed = true
    this.glyphLockDeadline = null
    this.resetRetryDeadline = null
    this.executeRecoveryActions(this.recovery.handle({ type: 'TEARDOWN' }))

    while (this.unsubscribers.length > 0) {
      const unsubscribe = this.unsubscribers.pop()
      if (unsubscribe) unsubscribe()
    }
    this.brush.setListener(null)
    this.brush.disarm()
    this.replay.setListener(null)
    this.replay.setAvailable(this.store.getSnapshot().roundId, false)
    this.palette.setListener(null)
    this.invalidatedRecoveryTokens.clear()
    await (this.localClosePromise ?? Promise.resolve())
  }

  getSnapshot(): LensRoundState {
    return this.store.getSnapshot()
  }

  diagnosticSnapshot(): string {
    const relay = this.relay.getDiagnostics()
    const ribbon = this.ribbon.getOwnedResourceCounts()
    const hud = this.hud.getOwnedResourceCounts()
    const glyph = this.glyph.getOwnedResourceCounts()
    return '[WordlessDiag] ' +
      `round=${safeLogId(this.store.getSnapshot().roundId)} ` +
      `listeners=${this.store.listenerCountForDiagnostics()} ` +
      `timers=${relay.activeTimers} ` +
      `channels=${relay.activeChannels} ` +
      `sceneObjects=${ribbon.sceneObjects + hud.sceneObjects +
        glyph.sceneObjects} ` +
      `materials=${ribbon.materials + hud.materials + glyph.materials}`
  }

  onStrokeStart(strokeId: string): void {
    if (this.destroyed) return
    this.publishEffects(this.engine.beginStroke(strokeId, this.nowMs()))
  }

  onPaletteColorSelected(colorId: StrokeColorId): void {
    if (!this.engine.selectStrokeColor(colorId)) return
    this.renderSnapshot(this.store.getSnapshot())
  }

  onStrokePoint(world: WorldPoint, normalized: QuantizedPoint): void {
    if (this.destroyed) return
    this.publishEffects(
      this.engine.appendPoint(world, normalized, this.nowMs()),
    )
  }

  onStrokeEnd(_strokeId: string): void {
    if (this.destroyed) return
    this.publishEffects(this.engine.endStroke(this.nowMs()))
  }

  onReplayRequested(roundId: string): void {
    if (this.destroyed) return
    const snapshot = this.store.getSnapshot()
    if (roundId !== snapshot.roundId ||
        !isTerminalReplayPhase(snapshot.phase) ||
        this.recovery.getDiagnostics().state !== 'IDLE') {
      return
    }

    this.roundCounter += 1
    this.currentCard = WORD_DECK[
      (this.roundCounter - 1) % WORD_DECK.length
    ]
    this.invalidateApplication()
    this.applyRound(
      createRoundId(this.instanceNonce, this.roundCounter),
      this.currentCard,
      undefined,
    )
  }

  private nowMs(): number {
    const value = this.nowSource()
    return Number.isFinite(value) && value >= 0 ? value : 0
  }

  private renderSnapshot(snapshot: LensRoundState): void {
    if (this.lastPhase !== null && this.lastPhase !== snapshot.phase) {
      this.logLine(
        `[Wordless] PHASE ${this.lastPhase} -> ${snapshot.phase}`,
      )
    }
    this.lastPhase = snapshot.phase

    this.palette.render(
      snapshot.strokeColorId,
      snapshot.paletteInputLocked || snapshot.phase !== 'ACTIVE',
    )
    this.hud.render(snapshot)
    this.ribbon.setStrokeColor(snapshot.strokeColorId)
    this.ribbon.setIncorrectFeedbackActive(
      snapshot.phase === 'ACTIVE' && snapshot.lastOutcome === 'incorrect',
    )
    this.ribbon.setPayoffActive(
      snapshot.phase === 'CORRECT' || snapshot.phase === 'GLYPH_LOCKED',
    )
    this.ribbon.render(snapshot.worldPoints)

    if ((snapshot.phase === 'CORRECT' ||
          snapshot.phase === 'GLYPH_LOCKED') &&
        snapshot.revealedWord !== null) {
      if (this.renderedGlyphRoundId !== snapshot.roundId) {
        this.renderedGlyphRoundId = snapshot.roundId
        this.glyph.render(
          snapshot.worldPoints,
          snapshot.glyph,
          snapshot.revealedWord,
          snapshot.strokeColorId,
        )
      }
      if (snapshot.phase === 'GLYPH_LOCKED') {
        this.logLine(
          `[Wordless] GLYPH_LOCKED points=${snapshot.glyph.length} ` +
          `hash=${pathCoordinateHash(snapshot.glyph)}`,
        )
      }
    }
    else {
      this.renderedGlyphRoundId = null
      this.glyph.hide()
    }

    this.replay.setAvailable(
      snapshot.roundId,
      isTerminalReplayPhase(snapshot.phase),
    )

    if (snapshot.phase === 'ACTIVE' && !snapshot.strokeComplete) {
      if (this.armedRoundId !== snapshot.roundId) {
        this.armedRoundId = snapshot.roundId
        this.brush.armForRound(snapshot.roundId)
      }
    }
    else {
      this.brush.disarm()
    }

    if (snapshot.phase === 'CORRECT') {
      const pending = this.glyphLockDeadline
      if (pending === null || pending.roundId !== snapshot.roundId) {
        this.glyphLockDeadline = {
          roundId: snapshot.roundId,
          generation: this.engine.getRoundGeneration(),
          dueAtMs: this.nowMs() + GLYPH_LOCK_DELAY_MS,
        }
      }
    }
    else {
      this.glyphLockDeadline = null
    }
  }

  private onRelayMessage(message: RelayMessage): void {
    if (this.destroyed) return
    switch (message.type) {
      case 'presence.ack':
        this.handlePresenceAck(message)
        return
      case 'guess.submit':
        if (this.recovery.getDiagnostics().state !== 'IDLE' ||
            message.roundId !== this.store.getSnapshot().roundId) {
          return
        }
        this.publishEffects(this.engine.submitGuess(
          message.payload.guessId,
          message.payload.choiceIndex,
          this.nowMs(),
        ))
        return
      case 'round.reset.ack':
        this.handleResetAckMessage(message)
        return
      case 'round.resync.request':
        this.handlePointCountMismatch(message)
        return
      default:
        return
    }
  }

  private handlePresenceAck(
    message: Extract<RelayMessage, { type: 'presence.ack' }>,
  ): void {
    if (message.payload.role !== 'guesser' ||
        this.relay.getConfirmedPeerConnectionId() !==
          message.payload.connectionId) {
      return
    }
    const actions = this.recovery.handle({
      type: 'PEER_TUPLE_ACK',
      senderId: message.senderId,
      peerConnectionId: message.payload.connectionId,
      localConnectionId: message.payload.acknowledgedConnectionId,
    })
    this.executeRecoveryActions(actions)

    if (actions.length === 0 &&
        this.recovery.getDiagnostics().state === 'IDLE') {
      this.startReadyRound(message.payload.connectionId)
    }
  }

  private handleResetAckMessage(
    message: Extract<RelayMessage, { type: 'round.reset.ack' }>,
  ): void {
    const diagnostics = this.recovery.getDiagnostics()
    const tokenId = diagnostics.activeTokenId
    const pending = diagnostics.pendingReset
    const confirmedPeer = this.relay.getConfirmedPeerConnectionId()
    const tuple = diagnostics.peerTupleConfirmed
    if (tokenId === null || pending === null || tuple === null ||
        confirmedPeer === null ||
        message.roundId !== message.payload.nextRoundId ||
        pending.nextRoundId !== message.payload.nextRoundId ||
        message.senderId !== tuple.senderId ||
        confirmedPeer !== tuple.peerConnectionId) {
      return
    }

    const actions = this.recovery.handle({
      type: 'RESET_ACK',
      tokenId,
      nextRoundId: message.payload.nextRoundId,
      senderId: tuple.senderId,
      peerConnectionId: tuple.peerConnectionId,
      localConnectionId: tuple.localConnectionId,
    })
    this.recordResetSettlement(tokenId, actions)
    this.executeRecoveryActions(actions)
  }

  private handlePointCountMismatch(
    message: Extract<RelayMessage, { type: 'round.resync.request' }>,
  ): void {
    if (message.payload.reason !== 'POINT_COUNT_MISMATCH') return
    const diagnostics = this.recovery.getDiagnostics()
    const pending = diagnostics.pendingReset
    if (pending !== null) {
      if (message.roundId === pending.previousRoundId ||
          message.roundId === pending.nextRoundId) {
        this.executeRecoveryActions(this.recovery.handle({
          type: 'RESET_RETRY_DUE',
          tokenId: diagnostics.activeTokenId ?? '',
          nextRoundId: pending.nextRoundId,
        }))
      }
      return
    }

    const settled = this.lastSettledTransition
    if (settled !== null &&
        message.roundId === settled.previousRoundId &&
        this.store.getSnapshot().roundId === settled.nextRoundId) {
      this.resendCachedStart()
      return
    }

    const snapshot = this.store.getSnapshot()
    if (message.roundId !== snapshot.roundId ||
        !isPointMismatchRecoveryPhase(snapshot.phase)) {
      return
    }
    this.applyRecoveryRound(undefined)
  }

  private onRelayStatus(status: RelayStatus, _detail: string): void {
    if (this.destroyed) return
    if (status === 'CONNECTING') return
    if (status === 'SUBSCRIBED') {
      this.executeRecoveryActions(
        this.recovery.handle({ type: 'LOCAL_SUBSCRIBED' }),
      )
      return
    }
    if (status === 'COUNTERPART_TIMED_OUT') {
      this.logLine('[Wordless] PEER_TIMEOUT sender=guesser')
    }
    this.executeRecoveryActions(this.recovery.handle({
      type: 'LOCAL_FAILURE',
      reason: status,
    }))
  }

  private onRelayControl(event: RelayControlEvent): void {
    if (this.destroyed) return
    switch (event.type) {
      case 'SEQUENCE_GAP':
        this.executeRecoveryActions(this.recovery.handle({
          type: 'SEQUENCE_GAP',
          senderId: event.senderId,
        }))
        return
      case 'PEER_READY':
        this.executeRecoveryActions(this.recovery.handle({
          type: 'PEER_READY',
          senderId: event.senderId,
          peerConnectionId: event.connectionId,
        }))
        return
      case 'PEER_REJOINED':
        this.executeRecoveryActions(this.recovery.handle({
          type: 'PEER_TRANSITION',
          transition: 'PEER_REJOINED',
          senderId: event.senderId,
          peerConnectionId: event.nextConnectionId,
        }))
        return
      case 'PEER_REPLACED':
        this.executeRecoveryActions(this.recovery.handle({
          type: 'PEER_TRANSITION',
          transition: 'PEER_REPLACED',
          senderId: event.nextSenderId,
          peerConnectionId: event.nextConnectionId,
        }))
        return
    }
  }

  private executeRecoveryActions(
    actions: readonly RecoveryAction[],
  ): void {
    for (const action of actions) {
      switch (action.type) {
        case 'INVALIDATE_APPLICATION':
          this.invalidateApplication(action.tokenId)
          break
        case 'DISCONNECT_ENGINE':
          this.engine.disconnect()
          break
        case 'CLOSE_LOCAL':
          this.beginLocalClose(action.tokenId)
          break
        case 'CONNECT_LOCAL':
          this.beginLocalConnect()
          break
        case 'APPLY_ROUND':
          this.applyRecoveryRound(action.tokenId)
          break
        case 'SEND_RESET':
        case 'RESEND_RESET':
          this.sendReset(action)
          break
        case 'START_ROUND':
          this.invalidatedRecoveryTokens.delete(action.tokenId)
          this.startReadyRound(
            action.targetConnectionId,
            action.roundId,
          )
          break
        case 'COMPLETE_LOCAL_RESYNC': {
          // The coordinator emits this only from RESET_SENT, which the root
          // feeds after the corresponding awaited reset send succeeds.
          this.relay.completeLocalResync(action.senderId)
          break
        }
        case 'SHOW_RECOVERY_ERROR':
          this.invalidatedRecoveryTokens.delete(action.tokenId)
          if (this.store.getSnapshot().phase !== 'DISCONNECTED') {
            this.engine.disconnect()
          }
          this.brush.disarm()
          this.logLine('[Wordless] RECOVERY_ERROR reason=RESET_RETRY_EXHAUSTED')
          break
      }
    }
  }

  private beginLocalClose(tokenId: string): void {
    if (this.localClosePromise !== null) return
    let closePromise: Promise<void>
    try {
      closePromise = this.relay.close()
    }
    catch {
      closePromise = Promise.reject(new Error('relay close failed'))
    }
    const lifecycle = closePromise.then(() => {
      if (this.localClosePromise === lifecycle) {
        this.localClosePromise = null
      }
      this.executeRecoveryActions(this.recovery.handle({
        type: 'LOCAL_CLOSE_SETTLED',
        tokenId,
        status: 'CLOSED',
      }))
    }).catch(() => {
      if (this.localClosePromise === lifecycle) {
        this.localClosePromise = null
      }
      this.logLine('[Wordless] RECOVERY_ERROR reason=CLOSE_FAILED')
    })
    this.localClosePromise = lifecycle
  }

  private beginLocalConnect(): void {
    if (this.destroyed) return
    let connectPromise: Promise<void>
    try {
      connectPromise = this.relay.connect()
    }
    catch {
      connectPromise = Promise.reject(new Error('relay connect failed'))
    }
    void connectPromise.catch(() => {
      // The adapter reports CHANNEL_ERROR without exposing exception details.
    })
  }

  private applyRecoveryRound(tokenId: string | undefined): void {
    if (tokenId === undefined ||
        !this.invalidatedRecoveryTokens.has(tokenId)) {
      this.invalidateApplication(tokenId)
    }
    this.roundCounter += 1
    this.applyRound(
      createRoundId(this.instanceNonce, this.roundCounter),
      this.currentCard,
      tokenId,
    )
  }

  private applyRound(
    roundId: string,
    card: WordCard,
    tokenId: string | undefined,
  ): void {
    const effects = this.engine.applyRound(
      roundId,
      card,
      this.nowMs(),
      ROUND_DURATION_MS,
    )
    this.relay.setLocalRound(roundId)
    this.logLine(`[Wordless] APPLY_ROUND round=${safeLogId(roundId)}`)
    this.publishEffects(effects, tokenId)
  }

  private startReadyRound(
    targetConnectionId: string,
    expectedRoundId?: string,
  ): void {
    const snapshot = this.store.getSnapshot()
    if (snapshot.phase !== 'READY' ||
        (expectedRoundId !== undefined &&
          expectedRoundId !== snapshot.roundId) ||
        this.relay.getConfirmedPeerConnectionId() !== targetConnectionId) {
      return
    }
    this.publishEffects(
      this.engine.setCounterpartReady(true, this.nowMs()),
      undefined,
      targetConnectionId,
    )
  }

  private publishEffects(
    effects: readonly EngineEffect[],
    resetTokenId?: string,
    startTargetConnectionId?: string,
  ): void {
    for (const effect of effects) {
      if (!this.effectIsCurrent(effect)) continue
      if (effect.type === 'publish-reset') {
        const transition = {
          previousRoundId: effect.previousRoundId,
          nextRoundId: effect.nextRoundId,
        }
        this.currentTransition = transition
        this.cachedStartDraft = null
        this.logLine(
          `[Wordless] RESYNC old=${safeLogId(effect.previousRoundId)} ` +
          `new=${safeLogId(effect.nextRoundId)}`,
        )
        this.executeRecoveryActions(this.recovery.handle({
          type: 'RESET_PENDING',
          tokenId: resetTokenId,
          transition,
        }))
        this.logLine(this.diagnosticSnapshot())
        continue
      }

      const targetConnectionId = effect.type === 'publish-round-start'
        ? startTargetConnectionId ?? null
        : null
      const draft = mapEngineEffectToDraft(
        effect,
        this.store.getSnapshot(),
        targetConnectionId,
      )
      if (draft === null) continue
      if (draft.type === 'round.start') this.cachedStartDraft = draft
      if (effect.type === 'publish-stroke-points') {
        const snapshot = this.store.getSnapshot()
        const worldPointCount = snapshot.worldPoints.length
        const publicPointCount = snapshot.publicPoints.length
        this.logLine(
          `[Wordless] STROKE worldPoints=${worldPointCount} ` +
          `publicPoints=${publicPointCount} ` +
          `bytes=${serializedAsciiBytes(draft)}`,
        )
      }
      if (effect.type === 'publish-result') {
        this.logLine(
          `[Wordless] GUESS index=${effect.choiceIndex} ` +
          `outcome=${effect.outcome}`,
        )
      }
      this.sendDraft(draft, effect.generation)
    }
  }

  private effectIsCurrent(effect: EngineEffect): boolean {
    const snapshot = this.store.getSnapshot()
    return effect.generation === this.engine.getRoundGeneration() &&
      effect.roundId === snapshot.roundId
  }

  private sendDraft(
    draft: RelayMessageDraft,
    generation: number,
  ): void {
    this.enqueueTransportSend(draft, generation, {
      onFailed: () => this.handleSendFailure(),
    })
  }

  private handleSendFailure(): void {
    if (this.destroyed) return
    this.executeRecoveryActions(this.recovery.handle({
      type: 'LOCAL_FAILURE',
      reason: 'AMBIGUOUS_SEND',
    }))
  }

  private sendReset(
    action: Extract<
      RecoveryAction,
      { type: 'SEND_RESET' | 'RESEND_RESET' }
    >,
  ): void {
    const currentTarget = this.relay.getConfirmedPeerConnectionId()
    if (currentTarget === null ||
        currentTarget !== action.targetConnectionId) {
      return
    }
    const draft: Extract<RelayMessageDraft, { type: 'round.reset' }> = {
      type: 'round.reset',
      roundId: action.transition.previousRoundId,
      payload: {
        nextRoundId: action.transition.nextRoundId,
        targetConnectionId: currentTarget,
      },
    }
    this.enqueueTransportSend(
      draft,
      this.engine.getRoundGeneration(),
      {
        onSent: () => {
          const followup = this.recovery.handle({
            type: 'RESET_SENT',
            tokenId: action.tokenId,
            nextRoundId: action.transition.nextRoundId,
          })
          this.recordResetSettlement(action.tokenId, followup)
          this.executeRecoveryActions(followup)

          const diagnostics = this.recovery.getDiagnostics()
          const emittedAnotherReset = followup.some((candidate) =>
            candidate.type === 'SEND_RESET' ||
            candidate.type === 'RESEND_RESET')
          if (!emittedAnotherReset &&
              diagnostics.activeTokenId === action.tokenId &&
              diagnostics.pendingReset?.nextRoundId ===
                action.transition.nextRoundId) {
            this.resetRetryDeadline = {
              tokenId: action.tokenId,
              nextRoundId: action.transition.nextRoundId,
              dueAtMs: this.nowMs() + RESET_RETRY_INTERVAL_MS,
            }
          }

        },
        onCancelled: () => {
          this.executeRecoveryActions(this.recovery.handle({
            type: 'RESET_SEND_CANCELLED',
            tokenId: action.tokenId,
            nextRoundId: action.transition.nextRoundId,
          }))
        },
        onFailed: () => this.handleSendFailure(),
      },
    )
  }

  private enqueueTransportSend(
    draft: RelayMessageDraft,
    engineGeneration: number,
    callbacks: OutboundCallbacks,
  ): void {
    const applicationGeneration = this.applicationGeneration
    const previous = this.outboundTail
    const operation = previous.then(async () => {
      if (this.destroyed ||
          applicationGeneration !== this.applicationGeneration ||
          engineGeneration !== this.engine.getRoundGeneration()) {
        if (!this.destroyed) callbacks.onCancelled?.()
        return
      }

      try {
        await this.relay.send(draft)
      }
      catch (error) {
        if (error instanceof Error &&
            error.name === 'ApplicationGenerationCancelledError') {
          callbacks.onCancelled?.()
          return
        }
        callbacks.onFailed?.()
        return
      }
      callbacks.onSent?.()
    })
    this.outboundTail = operation.catch(() => {
      this.logLine('[Wordless] INVARIANT_ERROR code=OUTBOUND_CALLBACK')
      this.handleSendFailure()
    })
  }

  private invalidateApplication(tokenId?: string): void {
    if (this.applicationGeneration >= Number.MAX_SAFE_INTEGER) {
      throw new Error('Wordless application generation exhausted')
    }
    this.applicationGeneration += 1
    this.relay.invalidateApplicationGeneration()
    if (tokenId !== undefined) {
      this.invalidatedRecoveryTokens.add(tokenId)
    }
  }

  private recordResetSettlement(
    settledTokenId: string,
    actions: readonly RecoveryAction[],
  ): void {
    const settled = actions.some((action) =>
      action.type === 'START_ROUND' || action.type === 'APPLY_ROUND')
    if (!settled) return
    this.resetRetryDeadline = null
    this.lastSettledTransition = this.currentTransition
    this.invalidatedRecoveryTokens.delete(settledTokenId)
  }

  private resendCachedStart(): void {
    const cached = this.cachedStartDraft
    const target = this.relay.getConfirmedPeerConnectionId()
    if (cached === null || target === null ||
        cached.roundId !== this.store.getSnapshot().roundId) {
      return
    }
    const draft: Extract<RelayMessageDraft, { type: 'round.start' }> = {
      type: 'round.start',
      roundId: cached.roundId,
      payload: {
        choices: [
          cached.payload.choices[0],
          cached.payload.choices[1],
          cached.payload.choices[2],
          cached.payload.choices[3],
        ],
        durationMs: cached.payload.durationMs,
        targetConnectionId: target,
      },
    }
    this.sendDraft(draft, this.engine.getRoundGeneration())
  }
}

@component
export class WordlessApp extends BaseScriptComponent {
  @input relay: SupabaseRelayTransport
  @input brush: BrushController
  @input ribbon: StrokeRibbonView
  @input hud: LensHudView
  @input glyph: GlyphMedallionView
  @input replay: ReplayController
  @input palette: PainterPaletteController

  private controller: WordlessAppController | null = null

  onAwake(): void {
    this.assertBindings()
    this.relay.connectOnStart = false
    this.controller = new WordlessAppController({
      relay: this.relay,
      brush: this.brush,
      ribbon: this.ribbon,
      hud: this.hud,
      glyph: this.glyph,
      replay: this.replay,
      palette: this.palette,
      nowMs: () => Date.now(),
      createNonce: () => createInstanceNonce(),
      log: (line) => print(line),
    })
    this.createEvent('OnStartEvent').bind(() => {
      void this.controller?.start()
    })
    this.createEvent('UpdateEvent').bind(() => this.controller?.update())
    this.createEvent('OnDestroyEvent').bind(() => {
      void this.controller?.destroy()
    })
  }

  diagnosticSnapshot(): string {
    return this.controller?.diagnosticSnapshot() ??
      '[WordlessDiag] round=invalid listeners=0 timers=0 channels=0 ' +
      'sceneObjects=0 materials=0'
  }

  private assertBindings(): void {
    if (!this.relay || !this.brush || !this.ribbon || !this.hud ||
        !this.glyph || !this.replay || !this.palette) {
      throw new Error(
        'WordlessApp requires relay, brush, ribbon, HUD, glyph, replay, and palette bindings',
      )
    }
  }
}
