import { describe, expect, it } from 'vitest'
import { parseProbeMessage, topicFor, type ProbeMessage } from '../src/probe-protocol'
import {
  appendGate0DisplayPoints,
  ProbeInboundController,
  ProbeRttTracker,
  RelayProbe,
  type ProbeTransportStatus,
  type RelayProbeChannel,
  type RelayProbeClient,
} from '../src/relay-probe'

type PingMessage = Extract<ProbeMessage, { kind: 'ping' }>
type AckMessage = Extract<ProbeMessage, { kind: 'ack' }>

class FakeRelayChannel implements RelayProbeChannel {
  sendCalls = 0
  removeCalls = 0
  sendResult: unknown = 'ok'
  removeFailure: unknown = null
  private onPayload: (payload: unknown) => void = () => undefined
  private onStatus: (status: ProbeTransportStatus, error?: unknown) => void = () => undefined

  attach(
    onPayload: (payload: unknown) => void,
    onStatus: (status: ProbeTransportStatus, error?: unknown) => void,
  ): void {
    this.onPayload = onPayload
    this.onStatus = onStatus
  }

  emitPayload(payload: unknown): void {
    this.onPayload(payload)
  }

  emitStatus(status: ProbeTransportStatus, error?: unknown): void {
    this.onStatus(status, error)
  }

  async send(): Promise<unknown> {
    this.sendCalls += 1
    if (this.sendResult instanceof Error) throw this.sendResult
    return this.sendResult
  }

  async remove(): Promise<void> {
    this.removeCalls += 1
    if (this.removeFailure) throw this.removeFailure
  }
}

class FakeRelayClient implements RelayProbeClient {
  openCalls = 0
  readonly channel: FakeRelayChannel

  constructor(channel: FakeRelayChannel) {
    this.channel = channel
  }

  openChannel(
    _topic: string,
    onPayload: (payload: unknown) => void,
    onStatus: (status: ProbeTransportStatus, error?: unknown) => void,
  ): RelayProbeChannel {
    this.openCalls += 1
    this.channel.attach(onPayload, onStatus)
    return this.channel
  }
}

const pointMessage = (seq: number): ProbeMessage => ({
  v: 1,
  kind: 'points',
  sessionId: 'WAVE42',
  seq,
  points: [[100, 200]],
  sentAtMs: 10,
})

const pingMessage = (seq: number, sentAtMs: number): PingMessage => ({
  v: 1,
  kind: 'ping',
  sessionId: 'WAVE42',
  seq,
  pingId: `ping-${seq}`,
  sentAtMs,
})

const ackMessage = (seq: number, sentAtMs: number): AckMessage => ({
  v: 1,
  kind: 'ack',
  sessionId: 'WAVE42',
  seq,
  pingId: `ping-${seq}`,
  sentAtMs,
})

describe('probe protocol', () => {
  it('creates one session-qualified topic', () => {
    expect(topicFor('WAVE42')).toBe('wordless-relay:WAVE42')
  })

  it('accepts a bounded point batch', () => {
    expect(parseProbeMessage({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 1,
      points: [[100, 200], [300, 400]], sentAtMs: 10,
    }, 'WAVE42')).not.toBeNull()
  })

  it('rejects out-of-range and malformed data', () => {
    expect(parseProbeMessage({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 1,
      points: [[1001, 0]], sentAtMs: 10,
    }, 'WAVE42')).toBeNull()
    expect(parseProbeMessage({ v: 1, kind: 'guess', choiceIndex: 9 }, 'WAVE42')).toBeNull()
    expect(parseProbeMessage({
      v: 2, kind: 'ack', sessionId: 'WAVE42', seq: 2,
      pingId: 'p-1', sentAtMs: 10,
    }, 'WAVE42')).toBeNull()
    expect(parseProbeMessage({
      v: 1, kind: 'ack', sessionId: 'OTHER1', seq: 2,
      pingId: 'p-1', sentAtMs: 10,
    }, 'WAVE42')).toBeNull()
  })

  it('rejects a circular payload instead of throwing during size validation', () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(parseProbeMessage(circular, 'WAVE42')).toBeNull()
  })

  it('rejects a BigInt payload instead of throwing during size validation', () => {
    expect(parseProbeMessage({ value: 1n }, 'WAVE42')).toBeNull()
  })

  it('registers a stamped ping before its transport send begins', async () => {
    const events: string[] = []
    const pendingOwner = {
      register: () => { events.push('register') },
      discard: () => undefined,
    }

    class OrderingProbe extends RelayProbe {
      override async send(): Promise<void> {
        events.push('send')
      }
    }

    const probe = new OrderingProbe(
      'https://example.supabase.co',
      'public-test-key',
      'WAVE42',
      () => undefined,
      () => undefined,
      () => undefined,
    )

    await probe.sendPing(pendingOwner)

    expect(events).toEqual(['register', 'send'])
  })

  it.each([
    ['CLOSED', 'closed'],
    ['CHANNEL_ERROR', 'failed'],
    ['TIMED_OUT', 'failed'],
  ] as const)('latches terminal transport status %s against late status and traffic', (
    terminalStatus,
    expectedStatus,
  ) => {
    const messages: number[] = []
    const statuses: string[] = []
    const controller = new ProbeInboundController(
      'WAVE42',
      (message) => { messages.push(message.seq) },
      (status) => { statuses.push(status) },
      () => undefined,
    )

    expect(controller.beginConnection()).toBe(true)
    controller.handleTransportStatus('SUBSCRIBED')
    controller.handleTransportStatus(terminalStatus)
    controller.handleTransportStatus('SUBSCRIBED')
    controller.handlePayload({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 1,
      points: [[100, 200]], sentAtMs: 10,
    })

    expect(controller.beginConnection()).toBe(false)
    expect(statuses).toEqual(['connecting', 'subscribed', expectedStatus])
    expect(messages).toEqual([])
  })

  it('accepts an initial sequence baseline then only contiguous traffic', () => {
    const messages: number[] = []
    const gaps: { expectedSeq: number; receivedSeq: number }[] = []
    const controller = new ProbeInboundController(
      'WAVE42',
      (message) => { messages.push(message.seq) },
      () => undefined,
      (gap) => { gaps.push(gap) },
    )

    controller.handlePayload({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 40,
      points: [[100, 200]], sentAtMs: 10,
    })
    controller.handlePayload({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 42,
      points: [[300, 400]], sentAtMs: 20,
    })
    controller.handlePayload({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 41,
      points: [[200, 300]], sentAtMs: 30,
    })
    controller.handlePayload({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 41,
      points: [[200, 300]], sentAtMs: 40,
    })
    controller.handlePayload({
      v: 1, kind: 'points', sessionId: 'WAVE42', seq: 39,
      points: [[0, 100]], sentAtMs: 50,
    })

    expect(messages).toEqual([40, 41])
    expect(gaps).toEqual([{ expectedSeq: 41, receivedSeq: 42 }])
  })

  it('keeps only the latest 128 points in the Gate 0 display window', () => {
    const displayPoints: [number, number][] = Array.from(
      { length: 128 },
      (_, index) => [index, index],
    )

    appendGate0DisplayPoints(displayPoints, [[128, 128], [129, 129]])

    expect(displayPoints).toHaveLength(128)
    expect(displayPoints[0]).toEqual([2, 2])
    expect(displayPoints[127]).toEqual([129, 129])
  })

  it.each([
    ['CLOSED', 'closed'],
    ['CHANNEL_ERROR', 'failed'],
    ['TIMED_OUT', 'failed'],
  ] as const)('RelayProbe detaches exactly once and rejects activity after %s', async (
    terminalStatus,
    expectedStatus,
  ) => {
    const channel = new FakeRelayChannel()
    const client = new FakeRelayClient(channel)
    const statuses: string[] = []
    const messages: ProbeMessage[] = []
    const probe = new RelayProbe(
      'unused',
      'unused',
      'WAVE42',
      (message) => { messages.push(message) },
      (status) => { statuses.push(status) },
      () => undefined,
      client,
    )

    probe.connect()
    channel.emitStatus('SUBSCRIBED')
    channel.emitStatus(terminalStatus, new Error('terminal'))
    channel.emitStatus('SUBSCRIBED')
    channel.emitPayload(pointMessage(1))
    channel.emitStatus('CLOSED')
    probe.connect()

    expect(channel.removeCalls).toBe(1)
    await expect(probe.send(pointMessage(1))).rejects.toThrow('probe terminated')
    await expect(probe.sendUncheckedForGate0({ raw: true })).rejects.toThrow('probe terminated')
    await expect(probe.sendGuess(1)).rejects.toThrow('probe terminated')
    await expect(probe.sendPing({
      register: () => undefined,
      discard: () => undefined,
    })).rejects.toThrow('probe terminated')
    await probe.close()

    expect(channel.removeCalls).toBe(1)
    expect(channel.sendCalls).toBe(0)
    expect(client.openCalls).toBe(1)
    expect(messages).toEqual([])
    expect(statuses).toEqual(['connecting', 'subscribed', expectedStatus])
  })

  it('contains an asynchronous channel-removal failure after terminal status', async () => {
    const channel = new FakeRelayChannel()
    channel.removeFailure = new Error('remove failed')
    const client = new FakeRelayClient(channel)
    const probe = new RelayProbe(
      'unused',
      'unused',
      'WAVE42',
      () => undefined,
      () => undefined,
      () => undefined,
      client,
    )

    probe.connect()
    channel.emitStatus('CHANNEL_ERROR', new Error('channel failed'))

    await expect(probe.close()).resolves.toBeUndefined()
    expect(channel.removeCalls).toBe(1)
  })

  it('caps pending ping ownership at 64 newest entries', () => {
    const tracker = new ProbeRttTracker(() => 0)
    for (let seq = 1; seq <= 65; seq += 1) tracker.register(pingMessage(seq, 0))

    expect(tracker.snapshot().pendingCount).toBe(64)
    expect(tracker.acceptAck(ackMessage(1, 0))).toBe(false)
    expect(tracker.acceptAck(ackMessage(2, 0))).toBe(true)
  })

  it('expires pending pings after ten seconds', () => {
    let now = 0
    const tracker = new ProbeRttTracker(() => now)
    tracker.register(pingMessage(1, 0))

    now = 10_001

    expect(tracker.snapshot().pendingCount).toBe(0)
    expect(tracker.acceptAck(ackMessage(1, 0))).toBe(false)
  })

  it('retains at most 128 RTT samples for bounded statistics', () => {
    let now = 0
    const tracker = new ProbeRttTracker(() => now)

    for (let seq = 1; seq <= 130; seq += 1) {
      const sentAtMs = now
      tracker.register(pingMessage(seq, sentAtMs))
      now += 10
      expect(tracker.acceptAck(ackMessage(seq, sentAtMs))).toBe(true)
    }

    expect(tracker.snapshot()).toEqual({
      pendingCount: 0,
      sampleCount: 128,
      medianMs: 10,
      p95Ms: 10,
      maxMs: 10,
    })
  })

  it('discards a registered ping when its transport send fails', async () => {
    const channel = new FakeRelayChannel()
    channel.sendResult = new Error('send failed')
    const client = new FakeRelayClient(channel)
    const tracker = new ProbeRttTracker(() => 100)
    const probe = new RelayProbe(
      'unused',
      'unused',
      'WAVE42',
      () => undefined,
      () => undefined,
      () => undefined,
      client,
    )
    probe.connect()
    channel.emitStatus('SUBSCRIBED')

    await expect(probe.sendPing(tracker)).rejects.toThrow('send failed')

    expect(channel.sendCalls).toBe(1)
    expect(tracker.snapshot().pendingCount).toBe(0)
  })
})
