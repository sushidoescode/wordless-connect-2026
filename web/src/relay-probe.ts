import { createClient } from '@supabase/supabase-js'
import { parseProbeMessage, topicFor, type ProbeMessage } from './probe-protocol'

export type ProbeStatus =
  | 'connecting' | 'subscribed' | 'live' | 'sequence-gap' | 'failed' | 'closed'

export type ProbeSequenceGap = Readonly<{
  expectedSeq: number
  receivedSeq: number
}>

export type ProbeTransportStatus =
  | 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT'

type ProbeBroadcastEnvelope = Readonly<{
  type: 'broadcast'
  event: 'wordless-message'
  payload: unknown
}>

export interface RelayProbeChannel {
  send(message: ProbeBroadcastEnvelope): Promise<unknown>
  remove(): Promise<void>
}

export interface RelayProbeClient {
  openChannel(
    topic: string,
    onPayload: (payload: unknown) => void,
    onStatus: (status: ProbeTransportStatus, error?: unknown) => void,
  ): RelayProbeChannel
}

type GuessMessage = Extract<ProbeMessage, { kind: 'guess' }>
export type ProbePingMessage = Extract<ProbeMessage, { kind: 'ping' }>
type ProbeAckMessage = Extract<ProbeMessage, { kind: 'ack' }>

export interface ProbePendingPingOwner {
  register(message: ProbePingMessage): void
  discard(pingId: string): void
}

export type ProbeRttSnapshot = Readonly<{
  pendingCount: number
  sampleCount: number
  medianMs: number | null
  p95Ms: number | null
  maxMs: number | null
}>

const GATE0_DISPLAY_POINT_CAP = 128
const MAX_PENDING_PINGS = 64
const PENDING_PING_TTL_MS = 10_000
const MAX_RTT_SAMPLES = 128

/**
 * Gate 0 visualization behavior only: retain a rolling draw window so the
 * spike cannot grow browser render memory without bound. This does not alter
 * the product protocol's separate per-stroke point-cap semantics.
 */
export function appendGate0DisplayPoints(
  displayPoints: [number, number][],
  incomingPoints: [number, number][],
): void {
  displayPoints.push(...incomingPoints)
  const overflow = displayPoints.length - GATE0_DISPLAY_POINT_CAP
  if (overflow > 0) displayPoints.splice(0, overflow)
}

export class ProbeRttTracker implements ProbePendingPingOwner {
  private readonly pending = new Map<string, number>()
  private readonly samples: number[] = []
  private readonly now: () => number

  constructor(now: () => number = Date.now) {
    this.now = now
  }

  register(message: ProbePingMessage): void {
    this.expirePending(this.now())
    this.pending.delete(message.pingId)
    this.pending.set(message.pingId, message.sentAtMs)
    while (this.pending.size > MAX_PENDING_PINGS) {
      const oldest = this.pending.keys().next()
      if (oldest.done) break
      this.pending.delete(oldest.value)
    }
  }

  discard(pingId: string): void {
    this.pending.delete(pingId)
  }

  acceptAck(message: ProbeAckMessage): boolean {
    const now = this.now()
    this.expirePending(now)
    const sentAtMs = this.pending.get(message.pingId)
    if (sentAtMs === undefined || sentAtMs !== message.sentAtMs) return false

    this.pending.delete(message.pingId)
    this.samples.push(Math.max(0, now - sentAtMs))
    const overflow = this.samples.length - MAX_RTT_SAMPLES
    if (overflow > 0) this.samples.splice(0, overflow)
    return true
  }

  snapshot(): ProbeRttSnapshot {
    this.expirePending(this.now())
    return {
      pendingCount: this.pending.size,
      sampleCount: this.samples.length,
      medianMs: median(this.samples),
      p95Ms: percentile(this.samples, 0.95),
      maxMs: this.samples.length > 0 ? Math.max(...this.samples) : null,
    }
  }

  private expirePending(now: number): void {
    for (const [pingId, sentAtMs] of this.pending) {
      if (now - sentAtMs > PENDING_PING_TTL_MS) this.pending.delete(pingId)
    }
  }
}

function percentile(values: number[], fraction: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.ceil(sorted.length * fraction) - 1)
  return sorted[index]
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const midpoint = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[midpoint - 1] + sorted[midpoint]) / 2
    : sorted[midpoint]
}

function createSupabaseRelayProbeClient(url: string, publicKey: string): RelayProbeClient {
  const client = createClient(url, publicKey)
  return {
    openChannel(topic, onPayload, onStatus) {
      const channel = client
        .channel(topic, { config: { broadcast: { self: false } } })
        .on('broadcast', { event: 'wordless-message' }, ({ payload }) => {
          onPayload(payload)
        })
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED' || status === 'CLOSED' ||
              status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onStatus(status, error)
          }
        })

      return {
        send(message) {
          return channel.send(message)
        },
        async remove() {
          let removed = false
          try {
            removed = await client.removeChannel(channel) === 'ok'
          }
          finally {
            if (!removed) channel.teardown()
          }
        },
      }
    },
  }
}

export class ProbeInboundController {
  private subscribed = false
  private counterpartSeen = false
  private terminalFailure = false
  private lastInboundSequence: number | null = null
  private readonly sessionId: string
  private readonly onMessage: (message: ProbeMessage) => void
  private readonly onStatus: (status: ProbeStatus, detail: string) => void
  private readonly onSequenceGap: (gap: ProbeSequenceGap) => void

  constructor(
    sessionId: string,
    onMessage: (message: ProbeMessage) => void,
    onStatus: (status: ProbeStatus, detail: string) => void,
    onSequenceGap: (gap: ProbeSequenceGap) => void,
  ) {
    this.sessionId = sessionId
    this.onMessage = onMessage
    this.onStatus = onStatus
    this.onSequenceGap = onSequenceGap
  }

  beginConnection(): boolean {
    if (this.terminalFailure) return false
    this.onStatus('connecting', 'CONNECTING')
    return true
  }

  handleTransportStatus(status: ProbeTransportStatus, error?: unknown): void {
    if (this.terminalFailure) return

    if (status === 'SUBSCRIBED') {
      this.subscribed = true
      this.onStatus('subscribed', 'SUBSCRIBED · WAITING FOR LENS')
      return
    }

    this.terminalFailure = true
    this.subscribed = false
    if (status === 'CLOSED') {
      this.onStatus('closed', 'CLOSED')
      return
    }
    this.onStatus('failed', `${status}: ${String(error ?? '')}`)
  }

  handlePayload(payload: unknown): void {
    if (this.terminalFailure) return

    const parsed = parseProbeMessage(payload, this.sessionId)
    if (!parsed) return

    if (this.lastInboundSequence !== null) {
      if (parsed.seq <= this.lastInboundSequence) return
      const expectedSeq = this.lastInboundSequence + 1
      if (parsed.seq !== expectedSeq) {
        this.onSequenceGap({ expectedSeq, receivedSeq: parsed.seq })
        return
      }
    }

    this.lastInboundSequence = parsed.seq
    this.onMessage(parsed)
    if (this.subscribed && !this.counterpartSeen) {
      this.counterpartSeen = true
      this.onStatus('live', 'CONNECTED')
    }
  }
}

export class RelayProbe {
  private readonly client: RelayProbeClient
  private channel: RelayProbeChannel | null = null
  private terminalFailure = false
  private removalPromise: Promise<void> | null = null
  private outboundSequence = 0
  private readonly sessionId: string
  private readonly inbound: ProbeInboundController

  constructor(
    url: string,
    publicKey: string,
    sessionId: string,
    onMessage: (message: ProbeMessage) => void,
    onStatus: (status: ProbeStatus, detail: string) => void,
    onSequenceGap: (gap: ProbeSequenceGap) => void,
    client?: RelayProbeClient,
  ) {
    this.client = client ?? createSupabaseRelayProbeClient(url, publicKey)
    this.sessionId = sessionId
    this.inbound = new ProbeInboundController(
      sessionId,
      onMessage,
      onStatus,
      onSequenceGap,
    )
  }

  connect(): void {
    if (this.channel || this.terminalFailure || !this.inbound.beginConnection()) return
    const channel = this.client.openChannel(
      topicFor(this.sessionId),
      (payload) => {
        this.inbound.handlePayload(payload)
      },
      (status, error) => {
        this.handleTransportStatus(status, error)
      },
    )
    this.channel = channel
    if (this.terminalFailure) this.startChannelRemoval()
  }

  async send(message: ProbeMessage): Promise<void> {
    const channel = this.requireActiveChannel()
    const result = await channel.send({
      type: 'broadcast', event: 'wordless-message', payload: message,
    })
    if (result !== 'ok') throw new Error(`broadcast failed: ${String(result)}`)
  }

  async sendGuess(choiceIndex: 0 | 1 | 2 | 3): Promise<GuessMessage> {
    const seq = ++this.outboundSequence
    const message: GuessMessage = {
      v: 1,
      kind: 'guess',
      sessionId: this.sessionId,
      seq,
      guessId: `guess-${seq}`,
      choiceIndex,
      sentAtMs: Date.now(),
    }
    await this.send(message)
    return message
  }

  async sendPing(pendingOwner: ProbePendingPingOwner): Promise<ProbePingMessage> {
    const seq = ++this.outboundSequence
    const message: ProbePingMessage = {
      v: 1,
      kind: 'ping',
      sessionId: this.sessionId,
      seq,
      pingId: `ping-${seq}`,
      sentAtMs: Date.now(),
    }
    pendingOwner.register(message)
    try {
      await this.send(message)
    }
    catch (error) {
      pendingOwner.discard(message.pingId)
      throw error
    }
    return message
  }

  async sendUncheckedForGate0(payload: unknown): Promise<void> {
    const channel = this.requireActiveChannel()
    const result = await channel.send({
      type: 'broadcast', event: 'wordless-message', payload,
    })
    if (result !== 'ok') throw new Error(`broadcast failed: ${String(result)}`)
  }

  async close(): Promise<void> {
    if (!this.terminalFailure) {
      this.terminalFailure = true
      this.inbound.handleTransportStatus('CLOSED')
    }
    this.startChannelRemoval()
    if (this.removalPromise) await this.removalPromise
  }

  private requireActiveChannel(): RelayProbeChannel {
    if (this.terminalFailure) throw new Error('probe terminated')
    if (!this.channel) throw new Error('channel not initialized')
    return this.channel
  }

  private handleTransportStatus(status: ProbeTransportStatus, error?: unknown): void {
    if (this.terminalFailure) return
    if (status === 'SUBSCRIBED') {
      this.inbound.handleTransportStatus(status, error)
      return
    }

    this.terminalFailure = true
    this.inbound.handleTransportStatus(status, error)
    this.startChannelRemoval()
  }

  private startChannelRemoval(): void {
    if (this.removalPromise || !this.channel) return
    const channel = this.channel
    this.channel = null
    try {
      this.removalPromise = channel.remove().then(
        () => undefined,
        () => undefined,
      )
    }
    catch {
      this.removalPromise = Promise.resolve()
    }
  }
}
