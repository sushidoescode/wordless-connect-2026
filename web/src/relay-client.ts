import { createClient } from '@supabase/supabase-js'
import {
  BROADCAST_EVENT,
  LOBBY_ROUND_ID,
  MAX_MESSAGE_BYTES,
  POINT_BATCH_INTERVAL_MS,
  PROTOCOL_VERSION,
  parseRelayMessage,
  serializedAsciiBytes,
  type RelayMessage,
  type RelayMessageDraft,
} from '@wordless/core/Protocol'
import {
  ReceivePolicy,
  type ReceivePeerTransition,
} from '@wordless/core/ReceivePolicy'

const READY_INTERVAL_MS = 1_000
const READY_SEND_LIMIT = 3
const PING_INTERVAL_MS = 2_000
const PEER_LIVENESS_MS = 6_000
const SESSION_ID_PATTERN = /^[A-Z0-9]{6}$/
const SENDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
const CONNECTION_ID_PATTERN = /^[A-Z0-9]{8}$/

type BrowserTransportState =
  | 'joining' | 'waiting' | 'reconnecting' | 'failed' | 'closed'

export interface BrowserChannel {
  on(
    type: 'broadcast',
    filter: { event: string },
    callback: (message: { payload: unknown }) => void,
  ): BrowserChannel
  subscribe(callback: (status: string, error?: unknown) => void): BrowserChannel
  send(message: {
    type: 'broadcast'
    event: string
    payload: unknown
  }): Promise<string>
  unsubscribe(): Promise<string>
  remove(): Promise<void>
}

export type BrowserChannelFactory = (topic: string) => BrowserChannel

export interface BrowserRoundDelegate {
  dispatchAccepted(message: RelayMessage): void
  invalidateForReconnect(): void
  setTransportState(state: BrowserTransportState, detail: string): void
}

export interface BrowserTimerFactory {
  setTimeout(callback: () => void, delayMs: number): unknown
  clearTimeout(handle: unknown): void
}

export type BrowserRelayControlEvent =
  | {
      readonly type: 'SEQUENCE_GAP'
      readonly senderId: string
      readonly observedSequence: number
    }
  | ReceivePeerTransition

export interface BrowserRelayClientOptions {
  readonly channelFactory: BrowserChannelFactory
  readonly sessionId: string
  readonly senderId: string
  readonly connectionIdFactory: () => string
  readonly now?: () => number
  readonly timers?: BrowserTimerFactory
  readonly delegate: BrowserRoundDelegate
}

type QueueOwner = 'adapter' | 'application'

type QueueEntry = {
  readonly draft: RelayMessageDraft
  readonly owner: QueueOwner
  readonly generation: number
  readonly resolve: () => void
  readonly reject: (error: Error) => void
}

type ResetCommit = {
  readonly previousRoundId: string
  readonly nextRoundId: string
}

type CadenceWait = {
  readonly entry: QueueEntry
  handle: unknown
  readonly resolve: () => void
}

const defaultTimers: BrowserTimerFactory = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs)
  },
  clearTimeout(handle) {
    globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>)
  },
}

export class ApplicationGenerationCancelledError extends Error {
  constructor() {
    super('application generation cancelled')
    this.name = 'ApplicationGenerationCancelledError'
  }
}

class BrowserRelayClosedError extends Error {
  constructor(message = 'browser relay is not connected') {
    super(message)
    this.name = 'BrowserRelayClosedError'
  }
}

function topicFor(sessionId: string): string {
  return `wordless-relay:${sessionId}`
}

function errorDetail(prefix: string, error?: unknown): string {
  const kind = error instanceof Error ? error.name : typeof error
  return `${prefix}${error === undefined ? '' : ` (${kind})`}`
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  for (const key of Object.keys(value)) {
    deepFreeze((value as Record<string, unknown>)[key])
  }
  return value
}

function snapshotDraft(draft: RelayMessageDraft): RelayMessageDraft {
  try {
    const serialized = JSON.stringify(draft)
    if (typeof serialized !== 'string') throw new Error('not serializable')
    return JSON.parse(serialized) as RelayMessageDraft
  }
  catch {
    throw new Error('invalid outbound relay message')
  }
}

/**
 * Creates the ordinary-hosted-Supabase browser boundary. Credentials stay in
 * the composition root; the relay client itself receives only this factory.
 */
export function createSupabaseBrowserChannelFactory(
  url: string,
  publicKey: string,
): BrowserChannelFactory {
  const client = createClient(url, publicKey)
  return (topic) => {
    const channel = client.channel(topic, {
      config: { broadcast: { self: false } },
    })
    const wrapper: BrowserChannel = {
      on(type, filter, callback) {
        channel.on(type, filter, (message) => {
          callback({ payload: message.payload })
        })
        return wrapper
      },
      subscribe(callback) {
        channel.subscribe((status, error) => { callback(status, error) })
        return wrapper
      },
      send(message) {
        return channel.send(message)
      },
      unsubscribe() {
        return channel.unsubscribe()
      },
      async remove() {
        await client.removeChannel(channel)
      },
    }
    return wrapper
  }
}

export class BrowserRelayClient {
  private readonly channelFactory: BrowserChannelFactory
  private readonly sessionId: string
  private readonly senderId: string
  private readonly connectionIdFactory: () => string
  private readonly now: () => number
  private readonly timers: BrowserTimerFactory
  private readonly delegate: BrowserRoundDelegate
  private readonly policy: ReceivePolicy
  private readonly controlListeners = new Set<(event: BrowserRelayControlEvent) => void>()

  private channel: BrowserChannel | null = null
  private channelToken = 0
  private currentConnectionId: string | null = null
  private hasSubscribed = false
  private locallySubscribed = false
  private explicitlyClosing = false
  private closePromise: Promise<void> | null = null
  private readonly channelCleanups = new WeakMap<BrowserChannel, Promise<void>>()
  private latestCleanupPromise: Promise<void> | null = null

  private applicationGeneration = 0
  private outboundSequence = 0
  private outboundOpen = false
  private readonly queue: QueueEntry[] = []
  private drainActive = false
  private drainPromise: Promise<void> | null = null
  private activeSendSettled: Promise<void> | null = null
  private cadenceWait: CadenceWait | null = null
  private lastPointSendStartedAtMs: number | null = null

  private readyTimer: unknown | null = null
  private readyAttempts = 0
  private readyBurstGeneration = 0
  private pingTimer: unknown | null = null
  private livenessTimer: unknown | null = null
  private peerSeenThisSubscription = false
  private tupleConfirmed = false
  private pingCounter = 0

  private recoveryPromise: Promise<void> | null = null
  private recoveryAttemptOutstanding = false
  private quarantineGameplay = false
  private resetCommit: ResetCommit | null = null

  constructor(options: BrowserRelayClientOptions) {
    if (!SESSION_ID_PATTERN.test(options.sessionId)) {
      throw new Error('invalid session ID')
    }
    if (!SENDER_ID_PATTERN.test(options.senderId)) {
      throw new Error('invalid sender ID')
    }
    this.channelFactory = options.channelFactory
    this.sessionId = options.sessionId
    this.senderId = options.senderId
    this.connectionIdFactory = options.connectionIdFactory
    this.now = options.now ?? Date.now
    this.timers = options.timers ?? defaultTimers
    this.delegate = options.delegate
    this.policy = new ReceivePolicy(options.sessionId, 'guesser')
  }

  async connect(): Promise<void> {
    if (this.channel || this.recoveryPromise) return
    if (this.closePromise) await this.closePromise
    if (this.latestCleanupPromise) await this.latestCleanupPromise
    if (this.channel || this.recoveryPromise) return

    this.explicitlyClosing = false
    this.closePromise = null
    this.outboundOpen = true
    this.delegate.setTransportState('joining', 'JOINING')
    try {
      await this.openChannel(this.hasSubscribed)
    }
    catch (error) {
      this.outboundOpen = false
      this.delegate.setTransportState('failed', errorDetail('CONNECT FAILED', error))
      throw error
    }
  }

  send(draft: RelayMessageDraft): Promise<void> {
    return this.enqueue(draft, 'application', this.applicationGeneration)
  }

  invalidateApplicationGeneration(): void {
    this.applicationGeneration += 1
    const retained: QueueEntry[] = []
    for (const entry of this.queue) {
      if (entry.owner === 'application' && entry.generation < this.applicationGeneration) {
        this.cancelCadenceWait(entry)
        entry.reject(new ApplicationGenerationCancelledError())
      }
      else {
        retained.push(entry)
      }
    }
    this.queue.splice(0, this.queue.length, ...retained)
  }

  async close(): Promise<void> {
    if (this.closePromise) return this.closePromise
    this.explicitlyClosing = true
    this.recoveryAttemptOutstanding = false
    this.channelToken += 1
    this.locallySubscribed = false
    this.disarmTimers()
    this.outboundOpen = false
    this.applicationGeneration += 1
    this.cancelAllQueued(true)

    const recovery = this.recoveryPromise
    const channel = this.channel
    this.channel = null
    this.currentConnectionId = null
    this.closePromise = (async () => {
      await this.awaitActiveSend()
      if (recovery) await recovery
      const cleanup = this.latestCleanupPromise
      if (cleanup) await cleanup
      await this.removeChannel(channel)
      this.delegate.setTransportState('closed', 'CLOSED')
    })()
    return this.closePromise
  }

  onControl(listener: (event: BrowserRelayControlEvent) => void): () => void {
    this.controlListeners.add(listener)
    return () => { this.controlListeners.delete(listener) }
  }

  setLocalRound(roundId: string): void {
    this.policy.setLocalRound(roundId)
  }

  completeLocalResync(senderId: string): void {
    this.policy.completeLocalResync(senderId)
  }

  getConfirmedPeerConnectionId(): string | null {
    return this.policy.getConfirmedPeerConnectionId()
  }

  private async openChannel(isReconnect: boolean): Promise<void> {
    const connectionId = this.connectionIdFactory()
    if (!CONNECTION_ID_PATTERN.test(connectionId)) {
      throw new Error('invalid connection ID')
    }

    const channel = this.channelFactory(topicFor(this.sessionId))
    const token = this.channelToken + 1
    this.channelToken = token
    this.currentConnectionId = connectionId
    this.peerSeenThisSubscription = false
    this.tupleConfirmed = false
    this.locallySubscribed = false
    this.readyAttempts = 0
    this.channel = channel
    try {
      channel.on('broadcast', { event: BROADCAST_EVENT }, ({ payload }) => {
        if (token !== this.channelToken || channel !== this.channel) return
        this.handlePayload(payload)
      })
      this.policy.beginLocalSubscription(connectionId, isReconnect)
      channel.subscribe((status, error) => {
        if (token !== this.channelToken || channel !== this.channel) return
        this.handleStatus(status, error)
      })
      this.hasSubscribed = true
    }
    catch (error) {
      this.channel = null
      this.currentConnectionId = null
      this.channelToken += 1
      await this.removeChannel(channel)
      throw error
    }
  }

  private handleStatus(status: string, error?: unknown): void {
    if (this.explicitlyClosing) return
    if (status === 'SUBSCRIBED') {
      this.locallySubscribed = true
      this.outboundOpen = true
      const recovering = this.recoveryAttemptOutstanding
      if (!recovering) {
        this.delegate.setTransportState('waiting', 'SUBSCRIBED · WAITING FOR PAINTER')
      }
      this.startReadyBurst()
      this.schedulePing()
      return
    }

    if (status !== 'CLOSED' && status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') {
      return
    }

    if (this.recoveryAttemptOutstanding) {
      this.failRecovery(errorDetail(status, error))
      return
    }
    this.beginLocalRecovery(errorDetail(status, error))
  }

  private handlePayload(raw: unknown): void {
    if (this.explicitlyClosing) return
    const message = parseRelayMessage(raw)
    if (!message) return
    const decision = this.policy.evaluate(message)
    if (!decision.accepted) {
      if (decision.reason === 'SEQUENCE_GAP') {
        this.emitControl({
          type: 'SEQUENCE_GAP',
          senderId: message.senderId,
          observedSequence: message.sequence,
        })
        this.beginLocalRecovery('SEQUENCE GAP')
      }
      return
    }

    const peerTransitioned = decision.peerTransition !== null
    if (decision.peerTransition) this.handlePeerTransition(decision.peerTransition)
    this.noteAcceptedPeerTraffic()

    if (message.type === 'presence.ready') {
      this.enqueuePresenceAck(message.payload.connectionId)
      if (peerTransitioned) {
        this.startReadyBurst()
      }
      else if (!this.tupleConfirmed && this.readyTimer === null &&
          this.readyAttempts >= READY_SEND_LIMIT) {
        this.startReadyBurst()
      }
      return
    }

    if (message.type === 'presence.ack') {
      this.markTupleConfirmed()
      this.dispatchAccepted(message)
      return
    }

    if (message.type === 'transport.ping') {
      void this.enqueue({
        type: 'transport.ack',
        roundId: LOBBY_ROUND_ID,
        payload: {
          pingId: message.payload.pingId,
          originSentAtMs: message.payload.originSentAtMs,
        },
      }, 'adapter', this.applicationGeneration).catch(() => undefined)
      return
    }

    if (message.type === 'transport.ack') return

    if (message.type === 'round.reset') {
      this.handleReset(message)
      return
    }

    if (message.type === 'round.start') {
      if (!this.dispatchAccepted(message)) {
        this.quarantineGameplay = true
        return
      }
      this.markTupleConfirmed()
      this.quarantineGameplay = false
      this.recoveryAttemptOutstanding = false
      return
    }

    if (this.quarantineGameplay) return
    this.dispatchAccepted(message)
  }

  private handlePeerTransition(transition: ReceivePeerTransition): void {
    this.invalidateApplicationGeneration()
    this.quarantineGameplay = true
    this.tupleConfirmed = false
    this.recoveryAttemptOutstanding = false
    this.resetCommit = null
    this.stopReadyBurst()
    this.clearLivenessTimer()
    this.emitControl(transition)
    this.delegate.invalidateForReconnect()
  }

  private handleReset(message: Extract<RelayMessage, { type: 'round.reset' }>): void {
    const semantic = {
      previousRoundId: message.roundId,
      nextRoundId: message.payload.nextRoundId,
    }
    const alreadyCommitted = this.resetCommit !== null &&
      this.resetCommit.previousRoundId === semantic.previousRoundId &&
      this.resetCommit.nextRoundId === semantic.nextRoundId

    this.quarantineGameplay = true
    this.markTupleConfirmed()
    if (!alreadyCommitted) {
      try {
        this.delegate.dispatchAccepted(message)
      }
      catch (error) {
        this.delegate.setTransportState(
          'failed',
          errorDetail('ROUND RESET DISPATCH FAILED', error),
        )
        return
      }
      this.resetCommit = semantic
    }

    this.quarantineGameplay = false
    this.recoveryAttemptOutstanding = false
    void this.enqueue({
      type: 'round.reset.ack',
      roundId: message.payload.nextRoundId,
      payload: { nextRoundId: message.payload.nextRoundId },
    }, 'adapter', this.applicationGeneration).catch(() => undefined)
  }

  private dispatchAccepted(message: RelayMessage): boolean {
    try {
      this.delegate.dispatchAccepted(message)
      return true
    }
    catch (error) {
      this.delegate.setTransportState('failed', errorDetail('DELEGATE DISPATCH FAILED', error))
      return false
    }
  }

  private noteAcceptedPeerTraffic(): void {
    this.peerSeenThisSubscription = true
    this.clearLivenessTimer()
    if (!this.locallySubscribed || this.explicitlyClosing) return
    this.livenessTimer = this.timers.setTimeout(() => {
      this.livenessTimer = null
      this.beginLocalRecovery('COUNTERPART TIMED OUT')
    }, PEER_LIVENESS_MS)
  }

  private markTupleConfirmed(): void {
    this.tupleConfirmed = true
    this.recoveryAttemptOutstanding = false
    this.stopReadyBurst()
  }

  private startReadyBurst(): void {
    if (!this.locallySubscribed || this.explicitlyClosing || this.tupleConfirmed) return
    this.stopReadyBurst()
    this.readyAttempts = 0
    this.sendReadyAttempt(this.readyBurstGeneration)
  }

  private sendReadyAttempt(generation: number): void {
    const connectionId = this.currentConnectionId
    if (generation !== this.readyBurstGeneration || !connectionId ||
        !this.locallySubscribed || this.tupleConfirmed ||
        this.explicitlyClosing) return
    this.readyAttempts += 1
    void this.enqueue({
      type: 'presence.ready',
      roundId: LOBBY_ROUND_ID,
      payload: { role: 'guesser', connectionId },
    }, 'adapter', this.applicationGeneration).then(() => {
      if (generation !== this.readyBurstGeneration || !this.locallySubscribed ||
          this.tupleConfirmed || this.explicitlyClosing) return
      if (this.readyAttempts >= READY_SEND_LIMIT) {
        this.readyTimer = null
        if (this.peerSeenThisSubscription) {
          this.beginLocalRecovery('READY ACK TIMED OUT')
        }
        return
      }
      this.readyTimer = this.timers.setTimeout(() => {
        if (generation !== this.readyBurstGeneration) return
        this.readyTimer = null
        this.sendReadyAttempt(generation)
      }, READY_INTERVAL_MS)
    }).catch(() => undefined)
  }

  private enqueuePresenceAck(peerConnectionId: string): void {
    const connectionId = this.currentConnectionId
    if (!connectionId) return
    void this.enqueue({
      type: 'presence.ack',
      roundId: LOBBY_ROUND_ID,
      payload: {
        role: 'guesser',
        connectionId,
        acknowledgedConnectionId: peerConnectionId,
      },
    }, 'adapter', this.applicationGeneration).catch(() => undefined)
  }

  private schedulePing(): void {
    this.clearPingTimer()
    if (!this.locallySubscribed || this.explicitlyClosing) return
    this.pingTimer = this.timers.setTimeout(() => {
      this.pingTimer = null
      if (!this.locallySubscribed || this.explicitlyClosing) return
      this.pingCounter += 1
      const nowMs = this.now()
      void this.enqueue({
        type: 'transport.ping',
        roundId: LOBBY_ROUND_ID,
        payload: {
          pingId: `ping-${this.pingCounter}`,
          originSentAtMs: nowMs,
        },
      }, 'adapter', this.applicationGeneration).catch(() => undefined)
      this.schedulePing()
    }, PING_INTERVAL_MS)
  }

  private enqueue(
    draft: RelayMessageDraft,
    owner: QueueOwner,
    generation: number,
  ): Promise<void> {
    if (!this.outboundOpen || !this.channel || !this.locallySubscribed) {
      return Promise.reject(new BrowserRelayClosedError())
    }
    let queuedDraft: RelayMessageDraft
    try {
      queuedDraft = snapshotDraft(draft)
    }
    catch (error) {
      return Promise.reject(error)
    }
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ draft: queuedDraft, owner, generation, resolve, reject })
      this.startDrain()
    })
  }

  private startDrain(): void {
    if (this.drainActive) return
    this.drainActive = true
    const drain = this.drainQueue()
    this.drainPromise = drain
    void drain.finally(() => {
      if (this.drainPromise === drain) {
        this.drainPromise = null
        this.drainActive = false
      }
      if (this.queue.length > 0 && this.outboundOpen) this.startDrain()
    })
  }

  private async drainQueue(): Promise<void> {
    while (this.queue.length > 0 && this.outboundOpen) {
      const entry = this.queue[0]
      if (!entry) return
      if (entry.owner === 'application' &&
          entry.generation !== this.applicationGeneration) {
        this.queue.shift()
        entry.reject(new ApplicationGenerationCancelledError())
        continue
      }

      if (entry.draft.type === 'stroke.points') await this.waitForPointCadence(entry)
      const currentIndex = this.queue.indexOf(entry)
      if (currentIndex < 0) continue
      if (!this.outboundOpen || !this.channel || !this.locallySubscribed ||
          (entry.owner === 'application' &&
            entry.generation !== this.applicationGeneration)) {
        this.queue.splice(currentIndex, 1)
        entry.reject(entry.owner === 'application'
          ? new ApplicationGenerationCancelledError()
          : new BrowserRelayClosedError())
        continue
      }
      this.queue.splice(currentIndex, 1)

      const channel = this.channel
      const sequence = this.outboundSequence + 1
      let message: RelayMessage
      try {
        message = this.buildMessage(entry.draft, sequence)
      }
      catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error))
        entry.reject(failure)
        continue
      }

      this.outboundSequence = sequence
      if (message.type === 'stroke.points') {
        this.lastPointSendStartedAtMs = this.now()
      }
      try {
        await this.publishStartedEntry(channel, message)
        entry.resolve()
      }
      catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error))
        entry.reject(failure)
        if (this.outboundOpen) this.beginLocalRecovery('AMBIGUOUS SEND FAILURE')
        return
      }
    }
  }

  private async publishStartedEntry(
    channel: BrowserChannel,
    message: RelayMessage,
  ): Promise<void> {
    let releaseActive!: () => void
    const active = new Promise<void>((resolve) => { releaseActive = resolve })
    this.activeSendSettled = active
    let result: string
    try {
      const sendPromise = Promise.resolve(channel.send({
        type: 'broadcast',
        event: BROADCAST_EVENT,
        payload: message,
      }))
      result = await sendPromise
    }
    finally {
      releaseActive()
      if (this.activeSendSettled === active) this.activeSendSettled = null
    }
    if (result !== 'ok') throw new Error(`broadcast failed: ${result}`)
  }

  private buildMessage(draft: RelayMessageDraft, sequence: number): RelayMessage {
    const candidate = {
      ...draft,
      v: PROTOCOL_VERSION,
      sessionId: this.sessionId,
      senderId: this.senderId,
      sequence,
      sentAtMs: this.now(),
    }
    const parsed = parseRelayMessage(candidate)
    if (!parsed || serializedAsciiBytes(parsed) > MAX_MESSAGE_BYTES) {
      throw new Error('invalid outbound relay message')
    }
    return deepFreeze(parsed)
  }

  private async waitForPointCadence(entry: QueueEntry): Promise<void> {
    if (this.lastPointSendStartedAtMs === null) return
    const remaining = this.lastPointSendStartedAtMs + POINT_BATCH_INTERVAL_MS - this.now()
    if (remaining <= 0) return
    await new Promise<void>((resolve) => {
      const wait: CadenceWait = { entry, handle: null, resolve }
      wait.handle = this.timers.setTimeout(() => {
        if (this.cadenceWait === wait) this.cadenceWait = null
        resolve()
      }, remaining)
      this.cadenceWait = wait
    })
  }

  private beginLocalRecovery(detail: string): void {
    if (this.explicitlyClosing || this.recoveryPromise) return
    if (this.recoveryAttemptOutstanding) {
      this.failRecovery(detail)
      return
    }

    this.recoveryAttemptOutstanding = true
    this.invalidateApplicationGeneration()
    this.quarantineGameplay = true
    this.tupleConfirmed = false
    this.resetCommit = null
    this.delegate.invalidateForReconnect()
    this.delegate.setTransportState('reconnecting', detail)
    this.disarmTimers()
    this.locallySubscribed = false
    this.outboundOpen = false
    this.cancelAllQueued(false)

    const channel = this.channel
    this.channel = null
    this.currentConnectionId = null
    this.channelToken += 1
    const recovery = (async () => {
      await this.awaitActiveSend()
      await this.removeChannel(channel)
      if (this.explicitlyClosing) return
      this.outboundOpen = true
      try {
        await this.openChannel(true)
      }
      catch (error) {
        this.failRecovery(errorDetail('RECOVERY FAILED', error))
      }
    })()
    this.recoveryPromise = recovery
    void recovery.finally(() => {
      if (this.recoveryPromise === recovery) this.recoveryPromise = null
    })
  }

  private failRecovery(detail: string): void {
    if (this.explicitlyClosing) return
    this.recoveryAttemptOutstanding = false
    this.channelToken += 1
    const channel = this.channel
    this.channel = null
    this.currentConnectionId = null
    this.locallySubscribed = false
    this.outboundOpen = false
    this.disarmTimers()
    this.cancelAllQueued(false)
    const cleanup = this.removeChannel(channel)
    void cleanup.then(() => {
      if (!this.explicitlyClosing) {
        this.delegate.setTransportState('failed', detail)
      }
    })
  }

  private cancelAllQueued(applicationCancellation: boolean): void {
    const entries = this.queue.splice(0)
    for (const entry of entries) {
      this.cancelCadenceWait(entry)
      if (entry.owner === 'application' || applicationCancellation) {
        entry.reject(new ApplicationGenerationCancelledError())
      }
      else {
        entry.reject(new BrowserRelayClosedError())
      }
    }
  }

  private cancelCadenceWait(entry: QueueEntry): void {
    const wait = this.cadenceWait
    if (!wait || wait.entry !== entry) return
    this.cadenceWait = null
    this.timers.clearTimeout(wait.handle)
    wait.resolve()
  }

  private async awaitActiveSend(): Promise<void> {
    const active = this.activeSendSettled
    if (active) await active
  }

  private removeChannel(channel: BrowserChannel | null): Promise<void> {
    if (!channel) return Promise.resolve()
    const existing = this.channelCleanups.get(channel)
    if (existing) return existing
    const cleanup = (async () => {
      try {
        await channel.unsubscribe()
      }
      catch {
        // Removal still owns final cleanup when unsubscribe reports a failure.
      }
      try {
        await channel.remove()
      }
      catch {
        // Cleanup failures are contained; no late transport callback may revive it.
      }
    })()
    this.channelCleanups.set(channel, cleanup)
    this.latestCleanupPromise = cleanup
    void cleanup.finally(() => {
      if (this.latestCleanupPromise === cleanup) this.latestCleanupPromise = null
    })
    return cleanup
  }

  private emitControl(event: BrowserRelayControlEvent): void {
    const listeners = [...this.controlListeners]
    for (const listener of listeners) {
      try {
        listener(event)
      }
      catch {
        // One observer cannot prevent the synchronous recovery barrier.
      }
    }
  }

  private disarmTimers(): void {
    this.stopReadyBurst()
    this.clearPingTimer()
    this.clearLivenessTimer()
  }

  private stopReadyBurst(): void {
    this.readyBurstGeneration += 1
    this.clearReadyTimer()
  }

  private clearReadyTimer(): void {
    if (this.readyTimer === null) return
    this.timers.clearTimeout(this.readyTimer)
    this.readyTimer = null
  }

  private clearPingTimer(): void {
    if (this.pingTimer === null) return
    this.timers.clearTimeout(this.pingTimer)
    this.pingTimer = null
  }

  private clearLivenessTimer(): void {
    if (this.livenessTimer === null) return
    this.timers.clearTimeout(this.livenessTimer)
    this.livenessTimer = null
  }
}
