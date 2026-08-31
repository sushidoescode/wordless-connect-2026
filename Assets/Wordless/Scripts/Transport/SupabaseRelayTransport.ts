import {
  createClient,
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
  type SupabaseClient,
} from 'SupabaseClient.lspkg/supabase-snapcloud'

import {
  BROADCAST_EVENT,
  CONNECTION_ID_LENGTH,
  LOBBY_ROUND_ID,
  MAX_MESSAGE_BYTES,
  POINT_BATCH_INTERVAL_MS,
  PROTOCOL_VERSION,
  parseRelayMessage,
  serializedAsciiBytes,
  type RelayMessage,
  type RelayMessageDraft,
} from '../Core/Protocol'
import {
  ReceivePolicy,
  type ReceivePeerTransition,
  type ReceiveRejectReason,
} from '../Core/ReceivePolicy'
import type {
  RelayControlEvent,
  RelayDiagnostics,
  RelayPort,
  RelayStatus,
} from './RelayPort'

const READY_INTERVAL_MS = 1_000
const READY_SEND_LIMIT = 3
const PING_INTERVAL_MS = 2_000
const PEER_TIMEOUT_MS = 6_000
const IDENTIFIER_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const SESSION_ID_PATTERN = /^[A-Z0-9]{6}$/

type MessageListener = (message: RelayMessage) => void
type StatusListener = (status: RelayStatus, detail: string) => void
type ControlListener = (event: RelayControlEvent) => void
type QueueOwner = 'adapter' | 'application'
type AdapterQueueKind = 'ready' | 'ack' | 'ping' | 'rejection'
type QueueKind = AdapterQueueKind | 'application'

interface QueueEntry {
  readonly draft: RelayMessageDraft
  readonly owner: QueueOwner
  readonly generation: number
  readonly kind: QueueKind
  readonly resolve: () => void
  readonly reject: (error: Error) => void
  sendStarted: boolean
  cancelError: Error | null
}

export interface RelayMessageMetrics {
  readonly receivedCount: number
  readonly sentCount: number
  readonly largestReceivedBytes: number
  readonly largestSentBytes: number
}

export class ApplicationGenerationCancelledError extends Error {
  readonly code = 'APPLICATION_GENERATION_CANCELLED'

  constructor() {
    super('application generation was invalidated before send start')
    this.name = 'ApplicationGenerationCancelledError'
  }
}

class RelayUnavailableError extends Error {
  constructor(detail: string) {
    super(detail)
    this.name = 'RelayUnavailableError'
  }
}

let identifierOrdinal = 0

function createRuntimeIdentifier(length: number): string {
  identifierOrdinal = (identifierOrdinal + 1) % (36 * 36)
  const suffix = identifierOrdinal
    .toString(36)
    .toUpperCase()
    .padStart(2, '0')
  let identifier = ''
  for (let index = 0; index < length - suffix.length; index += 1) {
    const alphabetIndex = Math.min(
      IDENTIFIER_ALPHABET.length - 1,
      Math.floor(Math.random() * IDENTIFIER_ALPHABET.length),
    )
    identifier += IDENTIFIER_ALPHABET.charAt(alphabetIndex)
  }
  return `${identifier}${suffix}`
}

function cloneAndFreezeDraft(draft: RelayMessageDraft): RelayMessageDraft {
  let text: string
  try {
    const candidate = JSON.stringify(draft)
    if (typeof candidate !== 'string') {
      throw new Error('relay draft is not serializable')
    }
    text = candidate
  }
  catch {
    throw new Error('relay draft is not serializable')
  }

  const snapshot = JSON.parse(text) as RelayMessageDraft
  return deepFreeze(snapshot)
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) {
    return value
  }

  const record = value as { readonly [key: string]: unknown }
  for (const key of Object.keys(record)) deepFreeze(record[key])
  return Object.freeze(value)
}

function safeSerializedBytes(value: unknown): number | null {
  try {
    const bytes = serializedAsciiBytes(value)
    return Number.isFinite(bytes) ? bytes : null
  }
  catch {
    return null
  }
}

function isExpectedCancellation(error: Error): boolean {
  return error instanceof ApplicationGenerationCancelledError ||
    error.name === 'ReadyRetryCancelledError'
}

function readyRetryCancelledError(): Error {
  const error = new Error('ready retry was cancelled')
  error.name = 'ReadyRetryCancelledError'
  return error
}

@component
export class SupabaseRelayTransport extends BaseScriptComponent
  implements RelayPort {
  @input supabaseProject: SupabaseProject
  @input sessionId: string = 'WAVE42'
  @input connectOnStart: boolean = false

  private readonly senderId = createRuntimeIdentifier(CONNECTION_ID_LENGTH)
  private client: SupabaseClient | null = null
  private channel: RealtimeChannel | null = null
  private policy: ReceivePolicy | null = null
  private policySessionId: string | null = null
  private localConnectionId: string | null = null
  private subscriptionAttempted = false
  private subscribed = false
  private destroyed = false
  private explicitCloseRequested = false
  private teardownPromise: Promise<void> | null = null
  private closePromise: Promise<void> | null = null
  private closeStarted = false
  private closeRequestGeneration = 0

  private readonly messageListeners: MessageListener[] = []
  private readonly statusListeners: StatusListener[] = []
  private readonly controlListeners: ControlListener[] = []

  private readonly pending: QueueEntry[] = []
  private activeEntry: QueueEntry | null = null
  private queueOpen = false
  private draining = false
  private drainPromise: Promise<void> | null = null
  private applicationGeneration = 0
  private outboundSequence = 0
  private firstProductStartSent = false

  private readyDeadlineMs: number | null = null
  private readySendCount = 0
  private readyBurstToken = 0
  private readyBurstActive = false
  private pingDeadlineMs: number | null = null
  private peerLastSeenMs: number | null = null
  private lastUpdateMs: number | null = null
  private lastPointSendStartMs: number | null = null
  private pointStartDeadlineMs: number | null = null
  private pointStartResolve: ((released: boolean) => void) | null = null
  private counterpartPresenceObserved = false
  private reportedReadyTuple: string | null = null

  private receivedCount = 0
  private sentCount = 0
  private largestReceivedBytes = 0
  private largestSentBytes = 0

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => {
      if (!this.connectOnStart) return
      void this.connect().catch(() => {
        // connect() already reports a secret-safe transport status.
      })
    })
    this.createEvent('UpdateEvent').bind(() => this.onUpdate())
    this.createEvent('OnDestroyEvent').bind(() => this.destroyTransport())
  }

  async connect(): Promise<void> {
    if (this.destroyed) {
      throw new RelayUnavailableError('relay component was destroyed')
    }
    if (this.closeStarted && !this.closePromise) return

    const closeRequestGeneration = this.closeRequestGeneration
    const closing = this.closePromise
    if (closing) await closing
    if (this.destroyed ||
        closeRequestGeneration !== this.closeRequestGeneration) return
    this.closePromise = null
    this.closeStarted = false
    this.explicitCloseRequested = false
    const teardown = this.teardownPromise
    if (teardown) await teardown
    if (this.destroyed ||
        closeRequestGeneration !== this.closeRequestGeneration ||
        this.explicitCloseRequested ||
        this.subscribed || this.channel) return

    try {
      this.ensurePolicy()
      if (!this.supabaseProject || !this.supabaseProject.url ||
          !this.supabaseProject.publicToken) {
        throw new Error('Supabase project input is incomplete')
      }
      if (!this.client) {
        // SupabaseClient 2.1.0 initializes LensStudio:SupabaseModule internally.
        // Its default Realtime configuration is the Gate 0 proven path.
        this.client = createClient(
          this.supabaseProject.url,
          this.supabaseProject.publicToken,
        )
        print('[WordlessTransport] CLIENT_CONFIGURED')
      }
      await this.openSubscription(closeRequestGeneration)
    }
    catch (error) {
      this.emitStatus('CHANNEL_ERROR', 'CONNECT_FAILED')
      throw error
    }
  }

  send(draft: RelayMessageDraft): Promise<void> {
    const snapshot = cloneAndFreezeDraft(draft)
    if (snapshot.type === 'round.start') {
      return this.enqueueRoundStart(snapshot)
    }
    if (snapshot.type === 'round.reset') {
      this.assertCurrentTarget(snapshot.payload.targetConnectionId)
    }
    return this.enqueue(snapshot, 'application', 'application')
  }

  invalidateApplicationGeneration(): void {
    if (this.applicationGeneration >= Number.MAX_SAFE_INTEGER) {
      throw new Error('application generation exhausted')
    }
    this.applicationGeneration += 1
    const cancellation = new ApplicationGenerationCancelledError()

    const survivors: QueueEntry[] = []
    for (const entry of this.pending) {
      if (entry.owner === 'application' &&
          entry.generation < this.applicationGeneration) {
        entry.reject(cancellation)
      }
      else {
        survivors.push(entry)
      }
    }
    this.pending.splice(0, this.pending.length, ...survivors)

    const active = this.activeEntry
    if (active && !active.sendStarted && active.owner === 'application' &&
        active.generation < this.applicationGeneration) {
      active.cancelError = cancellation
      this.releasePointStart(false)
    }
  }

  close(): Promise<void> {
    if (this.destroyed) return Promise.resolve()
    this.closeRequestGeneration += 1
    const existingClose = this.closePromise
    if (existingClose) return existingClose
    if (this.closeStarted) return Promise.resolve()
    this.closeStarted = true
    this.explicitCloseRequested = true
    this.emitStatus('DISCONNECTED', 'CLOSING')
    this.subscribed = false
    this.stopTimers()
    this.stopQueue(new RelayUnavailableError('relay channel was closed'))
    const close = this.performExplicitClose()
    this.closePromise = close
    return close
  }

  private async performExplicitClose(): Promise<void> {
    if (this.destroyed) return

    const existing = this.teardownPromise
    if (existing) {
      await existing
      return
    }

    const teardown = this.teardownChannel()
    this.teardownPromise = teardown
    try {
      await teardown
    }
    finally {
      if (this.teardownPromise === teardown) this.teardownPromise = null
    }
    this.emitStatus('CLOSED', 'CLOSED')
  }

  onMessage(listener: MessageListener): () => void {
    return this.addListener(this.messageListeners, listener)
  }

  onStatus(listener: StatusListener): () => void {
    return this.addListener(this.statusListeners, listener)
  }

  onControl(listener: ControlListener): () => void {
    return this.addListener(this.controlListeners, listener)
  }

  setLocalRound(roundId: string): void {
    this.ensurePolicy().setLocalRound(roundId)
  }

  completeLocalResync(senderId: string): void {
    this.ensurePolicy().completeLocalResync(senderId)
  }

  getConfirmedPeerConnectionId(): string | null {
    if (!this.subscribed || this.localConnectionId === null) return null
    return this.ensurePolicy().getConfirmedPeerConnectionId()
  }

  getDiagnostics(): RelayDiagnostics {
    let activeTimers = 0
    if (this.readyBurstActive) activeTimers += 1
    if (this.pingDeadlineMs !== null) activeTimers += 1
    if (this.peerLastSeenMs !== null) activeTimers += 1
    if (this.pointStartDeadlineMs !== null) activeTimers += 1
    return Object.freeze({
      activeChannels: this.channel ? 1 : 0,
      activeTimers,
      messageListeners: this.messageListeners.length,
    })
  }

  getMessageMetrics(): RelayMessageMetrics {
    return Object.freeze({
      receivedCount: this.receivedCount,
      sentCount: this.sentCount,
      largestReceivedBytes: this.largestReceivedBytes,
      largestSentBytes: this.largestSentBytes,
    })
  }

  /**
   * Binds the composition-generated room code as the effective session ID.
   * Fails closed on any assignment once the receive policy exists, so the
   * room can never change after the first applied round, a reconnect, or a
   * recovery cycle — only a full component lifecycle gets a new room.
   */
  assignSessionId(sessionId: string): void {
    if (this.policy) {
      throw new Error('session ID cannot change during a relay instance')
    }
    if (typeof sessionId !== 'string' ||
        !SESSION_ID_PATTERN.test(sessionId)) {
      throw new Error('invalid session ID')
    }
    this.sessionId = sessionId
  }

  getEffectiveSessionId(): string {
    return this.sessionId
  }

  private ensurePolicy(): ReceivePolicy {
    if (!SESSION_ID_PATTERN.test(this.sessionId)) {
      throw new Error('invalid session ID')
    }
    if (this.policy) {
      if (this.policySessionId !== this.sessionId) {
        throw new Error('session ID cannot change during a relay instance')
      }
      return this.policy
    }
    this.policy = new ReceivePolicy(this.sessionId, 'painter')
    this.policySessionId = this.sessionId
    return this.policy
  }

  private async openSubscription(
    closeRequestGeneration: number,
  ): Promise<void> {
    const client = this.client
    if (!client || this.destroyed || this.explicitCloseRequested ||
        closeRequestGeneration !== this.closeRequestGeneration) return

    const policy = this.ensurePolicy()
    const connectionId = createRuntimeIdentifier(CONNECTION_ID_LENGTH)
    const isReconnect = this.subscriptionAttempted
    policy.beginLocalSubscription(connectionId, isReconnect)
    this.subscriptionAttempted = true
    this.localConnectionId = connectionId
    this.counterpartPresenceObserved = false
    this.reportedReadyTuple = null
    this.lastUpdateMs = this.monotonicNow()
    this.emitStatus('CONNECTING', 'CONNECTING')
    if (this.destroyed || this.explicitCloseRequested ||
        closeRequestGeneration !== this.closeRequestGeneration) return

    try {
      const channel = client.channel(`wordless-relay:${this.sessionId}`, {
        config: { broadcast: { self: false } },
      })
      this.channel = channel
      channel.on('broadcast', { event: BROADCAST_EVENT }, (message) => {
        this.handleInbound(channel, message.payload)
      })
      channel.subscribe((status) => {
        this.handleSubscriptionStatus(channel, status)
      })
    }
    catch (error) {
      const teardown = this.teardownChannel()
      this.teardownPromise = teardown
      try {
        await teardown
      }
      catch {
        this.emitStatus('CHANNEL_ERROR', 'SUBSCRIBE_CLEANUP_FAILED')
      }
      finally {
        if (this.teardownPromise === teardown) this.teardownPromise = null
      }
      this.emitStatus('CHANNEL_ERROR', 'SUBSCRIBE_FAILED')
      throw error
    }
  }

  private handleSubscriptionStatus(
    channel: RealtimeChannel,
    status: REALTIME_SUBSCRIBE_STATES,
  ): void {
    if (this.destroyed || this.channel !== channel) return

    if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
      this.emitStatus('SUBSCRIBED', 'SUBSCRIBED · TRANSPORT ONLY')
      if (this.subscribed) return
      this.subscribed = true
      this.startQueue()
      const nowMs = this.monotonicNow()
      this.lastUpdateMs = nowMs
      this.pingDeadlineMs = nowMs + PING_INTERVAL_MS
      this.startReadyBurst(nowMs)
      return
    }

    this.subscribed = false
    this.stopTimers()
    this.stopQueue(new RelayUnavailableError(`channel ${String(status)}`))
    if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
      this.emitStatus('CLOSED', 'CLOSED')
    }
    else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
      this.emitStatus('CHANNEL_ERROR', 'CHANNEL_ERROR')
    }
    else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
      this.emitStatus('TIMED_OUT', 'TIMED_OUT')
    }
  }

  private handleInbound(channel: RealtimeChannel, payload: unknown): void {
    if (this.destroyed || !this.subscribed || this.channel !== channel) return

    const parsedMessage = parseRelayMessage(payload)
    this.recordReceived(payload)
    if (!parsedMessage) {
      const bytes = safeSerializedBytes(payload)
      const reason = bytes !== null && bytes > MAX_MESSAGE_BYTES
        ? 'OVERSIZED'
        : 'MALFORMED'
      this.logRejected(reason)
      return
    }
    const message = deepFreeze(parsedMessage)

    const decision = this.ensurePolicy().evaluate(message)
    if (decision.accepted === false) {
      this.handleRejectedMessage(message, decision.reason)
      return
    }

    this.observeAcceptedPeerTraffic()
    const transition = decision.peerTransition
    if (transition && !this.emitPeerTransition(transition)) return

    if (message.type === 'presence.ready') {
      this.counterpartPresenceObserved = true
      this.enqueuePresenceAck(message.payload.connectionId)
      const confirmed = this.getConfirmedPeerConnectionId()
      if (transition || (confirmed === null && !this.readyBurstActive)) {
        this.startReadyBurst(this.monotonicNow())
      }
      this.emitControl({
        type: 'PEER_READY',
        senderId: message.senderId,
        connectionId: message.payload.connectionId,
      })
      return
    }

    if (message.type === 'presence.ack') {
      this.counterpartPresenceObserved = true
      const confirmedConnectionId = this.getConfirmedPeerConnectionId()
      if (confirmedConnectionId === null) return

      this.stopReadyBurst()
      const localConnectionId = this.localConnectionId
      if (!localConnectionId) return
      const readyTuple = `${localConnectionId}:${message.senderId}:` +
        confirmedConnectionId
      if (this.reportedReadyTuple === readyTuple) return
      this.reportedReadyTuple = readyTuple
      print('[WordlessTransport] COUNTERPART_READY')
      this.emitMessage(message)
      return
    }

    if (message.type === 'transport.ping') {
      this.enqueueAdapter({
        type: 'transport.ack',
        roundId: LOBBY_ROUND_ID,
        payload: {
          pingId: message.payload.pingId,
          originSentAtMs: message.payload.originSentAtMs,
        },
      }, 'ack')
      return
    }
    if (message.type === 'transport.ack') return

    this.emitMessage(message)
  }

  private handleRejectedMessage(
    message: RelayMessage,
    reason: ReceiveRejectReason,
  ): void {
    this.logRejected(reason)
    if (reason === 'SEQUENCE_GAP') {
      const emitted = this.emitControl({
        type: 'SEQUENCE_GAP',
        senderId: message.senderId,
        observedSequence: message.sequence,
      })
      if (!emitted) return
    }

    if (message.type !== 'guess.submit') return
    let rejectionReason: 'WRONG_ROUND' | 'STALE_SEQUENCE' | 'SEQUENCE_GAP'
    if (reason === 'WRONG_ROUND') rejectionReason = 'WRONG_ROUND'
    else if (reason === 'SEQUENCE_GAP') rejectionReason = 'SEQUENCE_GAP'
    else if (reason === 'DUPLICATE_SEQUENCE' || reason === 'STALE_SEQUENCE') {
      rejectionReason = 'STALE_SEQUENCE'
    }
    else {
      return
    }

    this.enqueueAdapter({
      type: 'guess.rejected',
      roundId: message.roundId,
      payload: {
        guessId: message.payload.guessId,
        choiceIndex: message.payload.choiceIndex,
        reason: rejectionReason,
      },
    }, 'rejection')
  }

  private emitPeerTransition(transition: ReceivePeerTransition): boolean {
    this.reportedReadyTuple = null
    if (transition.type === 'PEER_REPLACED') {
      return this.emitControl({
        type: 'PEER_REPLACED',
        previousSenderId: transition.previousSenderId,
        nextSenderId: transition.nextSenderId,
        previousConnectionId: transition.previousConnectionId,
        nextConnectionId: transition.nextConnectionId,
      })
    }
    return this.emitControl({
      type: 'PEER_REJOINED',
      senderId: transition.senderId,
      previousConnectionId: transition.previousConnectionId,
      nextConnectionId: transition.nextConnectionId,
    })
  }

  private enqueueRoundStart(
    draft: Extract<RelayMessageDraft, { type: 'round.start' }>,
  ): Promise<void> {
    const targetConnectionId = draft.payload.targetConnectionId
    this.assertCurrentTarget(targetConnectionId)
    if (this.firstProductStartSent) {
      return this.enqueue(draft, 'application', 'application')
    }

    const ackPromise = this.enqueueAdapter({
      type: 'presence.ack',
      roundId: LOBBY_ROUND_ID,
      payload: {
        role: 'painter',
        connectionId: this.requireLocalConnectionId(),
        acknowledgedConnectionId: targetConnectionId,
      },
    }, 'ack')
    const startPromise = this.enqueue(draft, 'application', 'application')
    return Promise.all([ackPromise, startPromise]).then(() => {
      this.firstProductStartSent = true
    })
  }

  private assertCurrentTarget(targetConnectionId: string): void {
    const confirmed = this.getConfirmedPeerConnectionId()
    if (!confirmed || confirmed !== targetConnectionId) {
      throw new RelayUnavailableError('target is not the confirmed guesser')
    }
  }

  private requireLocalConnectionId(): string {
    const connectionId = this.localConnectionId
    if (!connectionId) {
      throw new RelayUnavailableError('relay has no local subscription')
    }
    return connectionId
  }

  private enqueuePresenceAck(peerConnectionId: string): void {
    let localConnectionId: string
    try {
      localConnectionId = this.requireLocalConnectionId()
    }
    catch {
      return
    }
    this.enqueueAdapter({
      type: 'presence.ack',
      roundId: LOBBY_ROUND_ID,
      payload: {
        role: 'painter',
        connectionId: localConnectionId,
        acknowledgedConnectionId: peerConnectionId,
      },
    }, 'ack')
  }

  private enqueueAdapter(
    draft: RelayMessageDraft,
    kind: AdapterQueueKind,
  ): Promise<void> {
    const promise = this.enqueue(
      cloneAndFreezeDraft(draft),
      'adapter',
      kind,
    )
    void promise.catch((error: Error) => {
      if (!isExpectedCancellation(error) && this.queueOpen) {
        print('[WordlessTransport] CONTROL_SEND_REJECTED')
      }
    })
    return promise
  }

  private enqueue(
    draft: RelayMessageDraft,
    owner: QueueOwner,
    kind: QueueKind,
  ): Promise<void> {
    if (!this.queueOpen || !this.subscribed || !this.channel) {
      return Promise.reject(new RelayUnavailableError('relay is not subscribed'))
    }
    const generation = this.applicationGeneration
    const promise = new Promise<void>((resolve, reject) => {
      this.pending.push({
        draft,
        owner,
        generation,
        kind,
        resolve,
        reject,
        sendStarted: false,
        cancelError: null,
      })
    })
    this.startDrain()
    return promise
  }

  private startQueue(): void {
    if (this.queueOpen) return
    this.queueOpen = true
    this.startDrain()
  }

  private startDrain(): void {
    if (this.draining || !this.queueOpen || this.pending.length === 0) return
    this.draining = true
    const drain = Promise.resolve().then(() => this.drainQueue())
    this.drainPromise = drain
    void drain.finally(() => {
      if (this.drainPromise === drain) this.drainPromise = null
      this.draining = false
      if (this.queueOpen && this.pending.length > 0) this.startDrain()
    })
  }

  private async drainQueue(): Promise<void> {
    while (this.queueOpen) {
      const entry = this.pending.shift()
      if (!entry) return
      this.activeEntry = entry
      try {
        await this.publishEntry(entry)
        entry.resolve()
      }
      catch (error) {
        const typedError = error instanceof Error
          ? error
          : new Error('relay send failed')
        entry.reject(typedError)
        if (!isExpectedCancellation(typedError) && this.queueOpen) {
          this.failQueue(typedError)
          return
        }
      }
      finally {
        if (this.activeEntry === entry) this.activeEntry = null
      }
    }
  }

  private async publishEntry(entry: QueueEntry): Promise<void> {
    if (entry.cancelError) throw entry.cancelError
    if (entry.owner === 'application' &&
        entry.generation !== this.applicationGeneration) {
      throw new ApplicationGenerationCancelledError()
    }
    if (entry.draft.type === 'stroke.points') {
      const released = await this.waitForPointStart()
      if (!released) {
        throw entry.cancelError ||
          new RelayUnavailableError('point send was cancelled')
      }
    }
    if (entry.cancelError) throw entry.cancelError
    if (entry.owner === 'application' &&
        entry.generation !== this.applicationGeneration) {
      throw new ApplicationGenerationCancelledError()
    }

    const channel = this.channel
    if (!channel || !this.subscribed || !this.queueOpen) {
      throw new RelayUnavailableError('relay disconnected before send start')
    }
    if (this.outboundSequence >= Number.MAX_SAFE_INTEGER) {
      throw new Error('outbound sequence exhausted')
    }

    const candidateSequence = this.outboundSequence + 1
    const candidate = {
      ...entry.draft,
      v: PROTOCOL_VERSION,
      sessionId: this.sessionId,
      senderId: this.senderId,
      sequence: candidateSequence,
      sentAtMs: Date.now(),
    }
    const message = parseRelayMessage(candidate)
    if (!message) throw new Error('invalid outbound relay message')
    const bytes = serializedAsciiBytes(message)
    if (!Number.isFinite(bytes) || bytes > MAX_MESSAGE_BYTES) {
      throw new Error('outbound relay message exceeds byte cap')
    }
    const frozenMessage = deepFreeze(message)

    this.outboundSequence = candidateSequence
    entry.sendStarted = true
    if (entry.draft.type === 'stroke.points') {
      this.lastPointSendStartMs = this.monotonicNow()
    }
    const result = await channel.send({
      type: 'broadcast',
      event: BROADCAST_EVENT,
      payload: frozenMessage,
    })
    if (result !== 'ok') {
      throw new Error(`ambiguous channel send: ${result}`)
    }
    this.recordSent(bytes)
  }

  private failQueue(_error: Error): void {
    if (this.destroyed || this.explicitCloseRequested) {
      this.stopQueue(new RelayUnavailableError('relay FIFO halted'))
      return
    }
    void this.stopQueue(
      new RelayUnavailableError('relay FIFO halted after ambiguous send'),
    )
    this.emitStatus('CHANNEL_ERROR', 'SEND_FAILED')
  }

  private stopQueue(error: Error): Promise<void> {
    this.queueOpen = false
    const rejected = this.pending.splice(0)
    for (const entry of rejected) entry.reject(error)

    const active = this.activeEntry
    if (active && !active.sendStarted) {
      active.cancelError = error
      this.releasePointStart(false)
    }
    return this.drainPromise || Promise.resolve()
  }

  private startReadyBurst(nowMs: number): void {
    if (!this.subscribed || !this.queueOpen) return
    this.stopReadyBurst()
    this.readyBurstToken += 1
    this.readyBurstActive = true
    this.readySendCount = 0
    this.sendReadyAttempt(this.readyBurstToken, nowMs)
  }

  private sendReadyAttempt(token: number, _nowMs: number): void {
    if (!this.subscribed || !this.queueOpen ||
        this.readySendCount >= READY_SEND_LIMIT) return
    let connectionId: string
    try {
      connectionId = this.requireLocalConnectionId()
    }
    catch {
      return
    }
    this.readySendCount += 1
    const attempt = this.enqueueAdapter({
      type: 'presence.ready',
      roundId: LOBBY_ROUND_ID,
      payload: { role: 'painter', connectionId },
    }, 'ready')
    void attempt.then(() => {
      if (token !== this.readyBurstToken || !this.subscribed ||
          !this.queueOpen || this.getConfirmedPeerConnectionId() !== null) {
        return
      }
      if (this.readySendCount >= READY_SEND_LIMIT) {
        this.readyBurstActive = false
        this.readyDeadlineMs = null
        if (this.counterpartPresenceObserved) {
          this.beginReadyExhaustionRecovery()
        }
        return
      }
      this.readyDeadlineMs = this.monotonicNow() + READY_INTERVAL_MS
    }).catch(() => {
      // Queue failure/cancellation owns its own status or lifecycle response.
    })
  }

  private stopReadyBurst(): void {
    this.readyBurstToken += 1
    this.readyBurstActive = false
    this.readyDeadlineMs = null
    const cancellation = readyRetryCancelledError()
    const survivors: QueueEntry[] = []
    for (const entry of this.pending) {
      if (entry.kind === 'ready') entry.reject(cancellation)
      else survivors.push(entry)
    }
    this.pending.splice(0, this.pending.length, ...survivors)

    const active = this.activeEntry
    if (active && active.kind === 'ready' && !active.sendStarted) {
      active.cancelError = cancellation
    }
  }

  private onUpdate(): void {
    if (this.destroyed) return
    const nowMs = getTime() * 1_000
    if (!Number.isFinite(nowMs) ||
        (this.lastUpdateMs !== null && nowMs < this.lastUpdateMs)) {
      if (this.subscribed) {
        this.subscribed = false
        this.stopTimers()
        this.stopQueue(new RelayUnavailableError('monotonic clock failed'))
        this.emitStatus('CHANNEL_ERROR', 'MONOTONIC_CLOCK_INVALID')
      }
      return
    }
    this.lastUpdateMs = nowMs
    this.releaseDuePointStart(nowMs)
    if (!this.subscribed) return

    const peerLastSeenMs = this.peerLastSeenMs
    if (peerLastSeenMs !== null && nowMs - peerLastSeenMs >= PEER_TIMEOUT_MS) {
      this.peerLastSeenMs = null
      this.emitStatus('COUNTERPART_TIMED_OUT', 'GUESSER_SILENT')
      return
    }

    const readyDeadlineMs = this.readyDeadlineMs
    if (readyDeadlineMs !== null && nowMs >= readyDeadlineMs) {
      this.readyDeadlineMs = null
      this.sendReadyAttempt(this.readyBurstToken, nowMs)
    }

    const pingDeadlineMs = this.pingDeadlineMs
    if (pingDeadlineMs !== null && nowMs >= pingDeadlineMs) {
      this.pingDeadlineMs = nowMs + PING_INTERVAL_MS
      const originSentAtMs = Date.now()
      this.enqueueAdapter({
        type: 'transport.ping',
        roundId: LOBBY_ROUND_ID,
        payload: {
          pingId: createRuntimeIdentifier(CONNECTION_ID_LENGTH),
          originSentAtMs,
        },
      }, 'ping')
    }
  }

  private observeAcceptedPeerTraffic(): void {
    const nowMs = this.monotonicNow()
    if (this.peerLastSeenMs === null) this.counterpartPresenceObserved = true
    this.peerLastSeenMs = nowMs
  }

  private monotonicNow(): number {
    const nowMs = getTime() * 1_000
    if (!Number.isFinite(nowMs)) {
      throw new Error('invalid Lens monotonic clock')
    }
    return nowMs
  }

  private waitForPointStart(): Promise<boolean> {
    const nowMs = this.monotonicNow()
    const lastStartMs = this.lastPointSendStartMs
    if (lastStartMs === null ||
        nowMs - lastStartMs >= POINT_BATCH_INTERVAL_MS) {
      return Promise.resolve(true)
    }
    if (this.pointStartResolve) {
      return Promise.reject(new Error('multiple point cadence waiters'))
    }

    this.pointStartDeadlineMs = lastStartMs + POINT_BATCH_INTERVAL_MS
    return new Promise((resolve) => {
      this.pointStartResolve = resolve
    })
  }

  private releaseDuePointStart(nowMs: number): void {
    const deadlineMs = this.pointStartDeadlineMs
    if (deadlineMs === null || nowMs < deadlineMs) return
    this.releasePointStart(true)
  }

  private releasePointStart(released: boolean): void {
    const resolve = this.pointStartResolve
    this.pointStartResolve = null
    this.pointStartDeadlineMs = null
    if (resolve) resolve(released)
  }

  private beginReadyExhaustionRecovery(): void {
    this.emitStatus('COUNTERPART_TIMED_OUT', 'READY_ACK_TIMED_OUT')
  }

  private async teardownChannel(): Promise<void> {
    this.subscribed = false
    this.stopTimers()
    const queueDrain = this.stopQueue(
      new RelayUnavailableError('relay channel was closed'),
    )
    const client = this.client
    this.channel = null
    this.localConnectionId = null
    this.reportedReadyTuple = null
    await queueDrain
    if (!client) return

    const results = await client.removeAllChannels()
    if (results.some((result) => result !== 'ok')) {
      throw new Error('one or more Supabase channels failed to close')
    }
  }

  private stopTimers(): void {
    this.stopReadyBurst()
    this.pingDeadlineMs = null
    this.peerLastSeenMs = null
    this.counterpartPresenceObserved = false
    this.releasePointStart(false)
  }

  private destroyTransport(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.closeStarted = true
    this.explicitCloseRequested = true
    this.subscribed = false
    this.stopTimers()
    const queueDrain = this.stopQueue(
      new RelayUnavailableError('relay component was destroyed'),
    )
    this.channel = null
    this.localConnectionId = null
    const client = this.client
    if (client) {
      void queueDrain
        .then(() => client.removeAllChannels())
        .catch(() => {
          print('[WordlessTransport] CHANNEL_REMOVE_FAILED')
        })
    }
  }

  private recordReceived(payload: unknown): void {
    this.receivedCount += 1
    const bytes = safeSerializedBytes(payload)
    if (bytes !== null) {
      this.largestReceivedBytes = Math.max(this.largestReceivedBytes, bytes)
    }
    print('[WordlessTransport] RX ' +
      `count=${this.receivedCount} bytes=${bytes === null ? -1 : bytes} ` +
      `largest=${this.largestReceivedBytes}`)
  }

  private recordSent(bytes: number): void {
    this.sentCount += 1
    this.largestSentBytes = Math.max(this.largestSentBytes, bytes)
    print('[WordlessTransport] TX ' +
      `count=${this.sentCount} bytes=${bytes} ` +
      `largest=${this.largestSentBytes}`)
  }

  private logRejected(reason: string): void {
    print(`[WordlessTransport] RX_REJECT reason=${reason}`)
  }

  private emitMessage(message: RelayMessage): void {
    const listeners = this.messageListeners.slice()
    let failed = false
    for (const listener of listeners) {
      try {
        listener(message)
      }
      catch {
        failed = true
      }
    }
    if (failed) this.emitStatus('CHANNEL_ERROR', 'MESSAGE_LISTENER_FAILED')
  }

  private emitControl(event: RelayControlEvent): boolean {
    const listeners = this.controlListeners.slice()
    let failed = false
    for (const listener of listeners) {
      try {
        listener(event)
      }
      catch {
        failed = true
      }
    }
    if (failed) this.emitStatus('CHANNEL_ERROR', 'CONTROL_LISTENER_FAILED')
    return !failed
  }

  private emitStatus(status: RelayStatus, detail: string): void {
    print(`[WordlessTransport] STATUS ${status} ${detail}`)
    const listeners = this.statusListeners.slice()
    for (const listener of listeners) {
      try {
        listener(status, detail)
      }
      catch {
        print('[WordlessTransport] STATUS_LISTENER_FAILED')
      }
    }
  }

  private addListener<T>(listeners: T[], listener: T): () => void {
    listeners.push(listener)
    let active = true
    return () => {
      if (!active) return
      active = false
      const index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    }
  }
}
