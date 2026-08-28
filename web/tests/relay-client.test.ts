import { describe, expect, it, vi } from 'vitest'
import {
  ApplicationGenerationCancelledError,
  BrowserRelayClient,
  createSupabaseBrowserChannelFactory,
  type BrowserChannel,
  type BrowserChannelFactory,
  type BrowserRoundDelegate,
  type BrowserTimerFactory,
} from '../src/relay-client'
import {
  BROADCAST_EVENT,
  LOBBY_ROUND_ID,
  parseRelayMessage,
  type RelayMessage,
  type RelayMessageDraft,
} from '@wordless/core/Protocol'
import { ReceivePolicy } from '@wordless/core/ReceivePolicy'
import type { RelayControlEvent } from '../../Assets/Wordless/Scripts/Transport/RelayPort'

const supabaseMock = vi.hoisted(() => ({
  createClient: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseMock.createClient,
}))

type Broadcast = Readonly<{
  type: 'broadcast'
  event: string
  payload: unknown
}>

type ScheduledTask = {
  readonly id: number
  readonly atMs: number
  readonly callback: () => void
  cancelled: boolean
}

class ManualClock implements BrowserTimerFactory {
  nowMs = 0
  private nextId = 1
  private readonly tasks: ScheduledTask[] = []

  readonly now = (): number => this.nowMs

  setTimeout(callback: () => void, delayMs: number): number {
    const task: ScheduledTask = {
      id: this.nextId,
      atMs: this.nowMs + Math.max(0, delayMs),
      callback,
      cancelled: false,
    }
    this.nextId += 1
    this.tasks.push(task)
    return task.id
  }

  clearTimeout(handle: unknown): void {
    const task = this.tasks.find((candidate) => candidate.id === handle)
    if (task) task.cancelled = true
  }

  async advanceBy(deltaMs: number): Promise<void> {
    const target = this.nowMs + deltaMs
    while (true) {
      const due = this.tasks
        .filter((task) => !task.cancelled && task.atMs <= target)
        .sort((a, b) => a.atMs - b.atMs || a.id - b.id)[0]
      if (!due) break
      due.cancelled = true
      this.nowMs = due.atMs
      due.callback()
      await settle()
    }
    this.nowMs = target
    await settle()
  }

  activeTimerCount(): number {
    return this.tasks.filter((task) => !task.cancelled).length
  }
}

class FakeChannel implements BrowserChannel {
  readonly sent: Broadcast[] = []
  readonly sendStartedAtMs: number[] = []
  readonly lifecycle: string[] = []
  subscribeCalls = 0
  unsubscribeCalls = 0
  removeCalls = 0
  sendResult: string | Error = 'ok'
  onFailure: Error | null = null
  subscribeFailure: Error | null = null
  sendBehavior: ((message: Broadcast) => Promise<string>) | null = null
  unsubscribeBehavior: (() => Promise<string>) | null = null
  removeBehavior: (() => Promise<void>) | null = null
  private payloadListener: ((message: { payload: unknown }) => void) | null = null
  private statusListener: ((status: string, error?: unknown) => void) | null = null

  constructor(private readonly clock: ManualClock) {}

  on(
    type: 'broadcast',
    filter: { event: string },
    callback: (message: { payload: unknown }) => void,
  ): BrowserChannel {
    if (this.onFailure) throw this.onFailure
    expect(type).toBe('broadcast')
    expect(filter).toEqual({ event: BROADCAST_EVENT })
    this.payloadListener = callback
    return this
  }

  subscribe(callback: (status: string, error?: unknown) => void): BrowserChannel {
    if (this.subscribeFailure) throw this.subscribeFailure
    this.subscribeCalls += 1
    this.lifecycle.push('subscribe')
    this.statusListener = callback
    return this
  }

  async send(message: Broadcast): Promise<string> {
    this.sent.push(message)
    this.sendStartedAtMs.push(this.clock.nowMs)
    if (this.sendBehavior) return this.sendBehavior(message)
    if (this.sendResult instanceof Error) throw this.sendResult
    return this.sendResult
  }

  async unsubscribe(): Promise<string> {
    this.unsubscribeCalls += 1
    this.lifecycle.push('unsubscribe')
    if (this.unsubscribeBehavior) return this.unsubscribeBehavior()
    return 'ok'
  }

  async remove(): Promise<void> {
    this.removeCalls += 1
    this.lifecycle.push('remove')
    if (this.removeBehavior) await this.removeBehavior()
  }

  emit(payload: unknown): void {
    this.payloadListener?.({ payload })
  }

  emitStatus(status: string, error?: unknown): void {
    this.statusListener?.(status, error)
  }
}

class FakeChannelFactory {
  readonly topics: string[] = []
  readonly channels: FakeChannel[] = []

  constructor(private readonly clock: ManualClock) {}

  readonly create: BrowserChannelFactory = (topic) => {
    this.topics.push(topic)
    const channel = new FakeChannel(this.clock)
    this.channels.push(channel)
    return channel
  }
}

class RecordingDelegate implements BrowserRoundDelegate {
  readonly dispatched: RelayMessage[] = []
  readonly events: string[] = []
  readonly states: { state: string; detail: string }[] = []
  invalidations = 0
  throwNextDispatch = false

  dispatchAccepted(message: RelayMessage): void {
    this.events.push(`dispatch:${message.type}`)
    if (this.throwNextDispatch) {
      this.throwNextDispatch = false
      throw new Error('delegate failed')
    }
    this.dispatched.push(message)
  }

  invalidateForReconnect(): void {
    this.invalidations += 1
    this.events.push('invalidate')
  }

  setTransportState(
    state: 'joining' | 'waiting' | 'reconnecting' | 'failed' | 'closed',
    detail: string,
  ): void {
    this.states.push({ state, detail })
    this.events.push(`state:${state}`)
  }
}

type Harness = {
  readonly client: BrowserRelayClient
  readonly clock: ManualClock
  readonly channels: FakeChannelFactory
  readonly delegate: RecordingDelegate
  readonly controls: RelayControlEvent[]
}

class LinkedPainterPeer {
  readonly received: RelayMessage[] = []
  startCount = 0
  startAttemptCount = 0
  resetCount = 0
  peerTransitionCount = 0
  recoverWithReset = false
  dropBrowserReadyCount = 0
  dropPainterReadyCount = 0
  dropPainterAckOrdinal: number | null = null
  dropPainterStartCount = 0
  private readonly policy = new ReceivePolicy('WAVE42', 'painter')
  private sequence = 0
  private ackOrdinal = 0
  private browserConnectionId: string | null = null
  private channel: FakeChannel | null = null
  private recoveryResetPending = false
  private recoveryResetSent = false
  private initialStartAttempted = false

  constructor() {
    this.policy.beginLocalSubscription('PAIN0001', false)
    this.policy.setLocalRound('round-1')
  }

  attach(channel: FakeChannel): void {
    this.channel = channel
    channel.sendBehavior = async (broadcast) => {
      const message = parseRelayMessage(broadcast.payload)
      if (!message) return 'ok'
      if (message.type === 'presence.ready' && this.dropBrowserReadyCount > 0) {
        this.dropBrowserReadyCount -= 1
        return 'ok'
      }
      const decision = this.policy.evaluate(message)
      if (!decision.accepted) return 'ok'
      if (decision.peerTransition) this.peerTransitionCount += 1
      this.received.push(message)
      if (message.type === 'presence.ready') {
        this.browserConnectionId = message.payload.connectionId
        if (decision.peerTransition && this.recoverWithReset) {
          this.policy.setLocalRound('round-2')
          this.recoveryResetPending = true
        }
        this.sendReady()
        this.sendTargetedAck(message.payload.connectionId)
      }
      else if (message.type === 'presence.ack' && this.recoveryResetPending &&
          !this.recoveryResetSent) {
        this.browserConnectionId = message.payload.connectionId
        this.sendTargetedAck(message.payload.connectionId)
        this.sendReset(message.payload.connectionId)
        this.recoveryResetSent = true
      }
      else if (message.type === 'presence.ack' && !this.initialStartAttempted) {
        this.initialStartAttempted = true
        this.browserConnectionId = message.payload.connectionId
        this.sendTargetedAck(message.payload.connectionId)
        this.sendStart(message.payload.connectionId)
      }
      else if (message.type === 'round.reset.ack' && this.recoveryResetSent) {
        this.recoveryResetPending = false
        this.sendStart(this.browserConnectionId ?? 'BROW0002', 'round-2')
      }
      return 'ok'
    }
  }

  sendReady(): void {
    this.sequence += 1
    if (this.dropPainterReadyCount > 0) {
      this.dropPainterReadyCount -= 1
      return
    }
    this.channel?.emit(ready(this.sequence))
  }

  sendPing(): void {
    this.sequence += 1
    this.channel?.emit(painterMessage('transport.ping', this.sequence, LOBBY_ROUND_ID, {
      pingId: `painter-ping-${this.sequence}`,
      originSentAtMs: this.sequence * 10,
    }))
  }

  private sendTargetedAck(browserConnectionId: string): void {
    this.sequence += 1
    this.ackOrdinal += 1
    if (this.dropPainterAckOrdinal === this.ackOrdinal) return
    this.channel?.emit(targetedAck(this.sequence, browserConnectionId))
  }

  private sendReset(browserConnectionId: string): void {
    this.sequence += 1
    this.resetCount += 1
    this.channel?.emit(reset(
      this.sequence,
      'round-1',
      'round-2',
      browserConnectionId,
    ))
  }

  private sendStart(browserConnectionId: string, roundId = 'round-1'): void {
    this.sequence += 1
    this.startAttemptCount += 1
    if (this.dropPainterStartCount > 0) {
      this.dropPainterStartCount -= 1
      return
    }
    this.startCount += 1
    this.channel?.emit(start(this.sequence, browserConnectionId, roundId))
  }
}

function createHarness(connectionIds: string[] = ['BROW0001', 'BROW0002']): Harness {
  const clock = new ManualClock()
  const channels = new FakeChannelFactory(clock)
  const delegate = new RecordingDelegate()
  const ids = [...connectionIds]
  const client = new BrowserRelayClient({
    channelFactory: channels.create,
    sessionId: 'WAVE42',
    senderId: 'browser-a',
    connectionIdFactory: () => {
      const connectionId = ids.shift()
      if (!connectionId) throw new Error('test connection ID exhausted')
      return connectionId
    },
    now: clock.now,
    timers: clock,
    delegate,
  })
  const controls: RelayControlEvent[] = []
  client.onControl((event) => { controls.push(event) })
  return { client, clock, channels, delegate, controls }
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve()
}

function payloads(channel: FakeChannel): RelayMessage[] {
  return channel.sent.map((message) => message.payload as RelayMessage)
}

function messagesOfType<T extends RelayMessage['type']>(
  channel: FakeChannel,
  type: T,
): Extract<RelayMessage, { type: T }>[] {
  return payloads(channel).filter(
    (message): message is Extract<RelayMessage, { type: T }> => message.type === type,
  )
}

function painterMessage<T extends RelayMessage['type']>(
  type: T,
  sequence: number,
  roundId: string,
  payload: Extract<RelayMessage, { type: T }>['payload'],
  overrides: Partial<Pick<RelayMessage, 'sessionId' | 'senderId' | 'sentAtMs'>> = {},
): Extract<RelayMessage, { type: T }> {
  return {
    v: 2,
    type,
    sessionId: overrides.sessionId ?? 'WAVE42',
    roundId,
    senderId: overrides.senderId ?? 'painter-a',
    sequence,
    sentAtMs: overrides.sentAtMs ?? sequence * 10,
    payload,
  } as Extract<RelayMessage, { type: T }>
}

function ready(
  sequence: number,
  connectionId = 'PAIN0001',
  senderId = 'painter-a',
): Extract<RelayMessage, { type: 'presence.ready' }> {
  return painterMessage('presence.ready', sequence, LOBBY_ROUND_ID, {
    role: 'painter',
    connectionId,
  }, { senderId })
}

function targetedAck(
  sequence: number,
  browserConnectionId = 'BROW0001',
  painterConnectionId = 'PAIN0001',
  senderId = 'painter-a',
): Extract<RelayMessage, { type: 'presence.ack' }> {
  return painterMessage('presence.ack', sequence, LOBBY_ROUND_ID, {
    role: 'painter',
    connectionId: painterConnectionId,
    acknowledgedConnectionId: browserConnectionId,
  }, { senderId })
}

function start(
  sequence: number,
  targetConnectionId = 'BROW0001',
  roundId = 'round-1',
  senderId = 'painter-a',
): Extract<RelayMessage, { type: 'round.start' }> {
  return painterMessage('round.start', sequence, roundId, {
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
    durationMs: 20_000,
    targetConnectionId,
  }, { senderId })
}

function reset(
  sequence: number,
  oldRoundId: string,
  nextRoundId: string,
  targetConnectionId = 'BROW0001',
  senderId = 'painter-a',
): Extract<RelayMessage, { type: 'round.reset' }> {
  return painterMessage('round.reset', sequence, oldRoundId, {
    nextRoundId,
    targetConnectionId,
  }, { senderId })
}

function guessDraft(guessId: string, choiceIndex: 0 | 1 | 2 | 3): RelayMessageDraft {
  return {
    type: 'guess.submit',
    roundId: 'round-1',
    payload: { guessId, choiceIndex },
  }
}

async function subscribe(harness: Harness): Promise<FakeChannel> {
  await harness.client.connect()
  const channel = harness.channels.channels.at(-1)
  if (!channel) throw new Error('channel not created')
  channel.emitStatus('SUBSCRIBED')
  await settle()
  return channel
}

async function bindAndStart(
  harness: Harness,
  channel: FakeChannel,
  firstSequence = 1,
): Promise<void> {
  channel.emit(ready(firstSequence))
  channel.emit(targetedAck(firstSequence + 1))
  channel.emit(start(firstSequence + 2))
  await settle()
}

describe('BrowserRelayClient transport lifecycle', () => {
  it('uses the session topic and maps subscribe to joining then waiting without claiming live', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    expect(harness.channels.topics).toEqual(['wordless-relay:WAVE42'])
    expect(channel.subscribeCalls).toBe(1)
    expect(harness.delegate.states.map(({ state }) => state)).toEqual(['joining', 'waiting'])
    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(1)
    expect(messagesOfType(channel, 'presence.ready')[0].payload).toEqual({
      role: 'guesser',
      connectionId: 'BROW0001',
    })
  })

  it('sanitizes inbound payloads and drops malformed, wrong-session, and wrong-role traffic', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    const mutable = ready(1)
    channel.emit(mutable)
    mutable.payload.connectionId = 'MUTATE01'
    channel.emit({ ...ready(2), sessionId: 'OTHER1' })
    channel.emit(painterMessage('presence.ready', 2, LOBBY_ROUND_ID, {
      role: 'guesser', connectionId: 'PAIN0001',
    }))
    channel.emit({ nonsense: true })
    await settle()

    const acks = messagesOfType(channel, 'presence.ack')
    expect(acks).toHaveLength(1)
    expect(acks[0].payload.acknowledgedConnectionId).toBe('PAIN0001')
    expect(harness.delegate.dispatched).toEqual([])
  })

  it('awaits unsubscribe then owner removal exactly once, and final close is the only closed state', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    await harness.client.close()
    await harness.client.close()

    expect(channel.lifecycle).toEqual(['subscribe', 'unsubscribe', 'remove'])
    expect(channel.unsubscribeCalls).toBe(1)
    expect(channel.removeCalls).toBe(1)
    expect(harness.delegate.states.at(-1)?.state).toBe('closed')
    expect(harness.clock.activeTimerCount()).toBe(0)
  })

  it('reconnects the same instance after close with a new connection ID and continued sequence', async () => {
    const harness = createHarness()
    const first = await subscribe(harness)
    await harness.client.close()

    const second = await subscribe(harness)

    const firstReady = messagesOfType(first, 'presence.ready')[0]
    const secondReady = messagesOfType(second, 'presence.ready')[0]
    expect(firstReady.senderId).toBe('browser-a')
    expect(secondReady.senderId).toBe('browser-a')
    expect([firstReady.sequence, secondReady.sequence]).toEqual([1, 2])
    expect([firstReady.payload.connectionId, secondReady.payload.connectionId]).toEqual([
      'BROW0001', 'BROW0002',
    ])
  })

  it('contains non-ok and thrown sends, halts the old FIFO, and enters one recovery', async () => {
    for (const failure of ['rate limited', new Error('ambiguous')] as const) {
      const harness = createHarness()
      const channel = await subscribe(harness)
      channel.sendResult = failure

      const result = harness.client.send(guessDraft('guess-1', 0))
      await expect(result).rejects.toThrow()
      await settle()

      expect(harness.delegate.invalidations).toBe(1)
      expect(harness.delegate.states.some(({ state }) => state === 'reconnecting')).toBe(true)
      expect(channel.unsubscribeCalls).toBe(1)
      expect(channel.removeCalls).toBe(1)
      expect(harness.channels.channels).toHaveLength(2)
    }
  })

  it('keeps an expected recovery close reconnecting, then reports failed only when recovery is exhausted', async () => {
    const harness = createHarness()
    const first = await subscribe(harness)

    first.emitStatus('CHANNEL_ERROR', new Error('lost'))
    first.emitStatus('CLOSED')
    await settle()

    expect(harness.delegate.states.at(-1)?.state).toBe('reconnecting')
    const second = harness.channels.channels[1]
    second.emitStatus('CHANNEL_ERROR', new Error('still lost'))
    await settle()

    expect(harness.delegate.states.at(-1)).toMatchObject({ state: 'failed' })
    expect(harness.delegate.states.filter(({ state }) => state === 'closed')).toEqual([])
  })

  it('awaits exhausted-recovery cleanup before publishing the failed state', async () => {
    const harness = createHarness()
    const first = await subscribe(harness)
    first.emitStatus('CHANNEL_ERROR', new Error('lost'))
    await settle()
    const second = harness.channels.channels[1]
    let releaseRemoval: (() => void) | null = null
    second.removeBehavior = async () => {
      await new Promise<void>((resolve) => { releaseRemoval = resolve })
    }

    second.emitStatus('CHANNEL_ERROR', new Error('still lost'))
    await settle()
    expect(second.unsubscribeCalls).toBe(1)
    expect(second.removeCalls).toBe(1)
    expect(harness.delegate.states.some(({ state }) => state === 'failed')).toBe(false)

    releaseRemoval?.()
    await settle()
    expect(harness.delegate.states.at(-1)?.state).toBe('failed')
  })

  it('explicit close during recovery awaits the recovery-owned channel removal before reporting closed', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    let releaseRemoval: (() => void) | null = null
    channel.removeBehavior = async () => {
      await new Promise<void>((resolve) => { releaseRemoval = resolve })
    }

    channel.emitStatus('CHANNEL_ERROR', new Error('lost'))
    await settle()
    let closed = false
    const closing = harness.client.close().then(() => { closed = true })
    await settle()

    expect(closed).toBe(false)
    expect(channel.removeCalls).toBe(1)
    releaseRemoval?.()
    await closing
    expect(closed).toBe(true)
    expect(channel.removeCalls).toBe(1)
    expect(harness.delegate.states.at(-1)?.state).toBe('closed')
  })

  it.each(['on', 'subscribe'] as const)(
    'removes a partially-created channel when %s registration throws',
    async (failureStage) => {
      const clock = new ManualClock()
      const channel = new FakeChannel(clock)
      const delegate = new RecordingDelegate()
      if (failureStage === 'on') channel.onFailure = new Error('on failed')
      else channel.subscribeFailure = new Error('subscribe failed')
      const client = new BrowserRelayClient({
        channelFactory: () => channel,
        sessionId: 'WAVE42',
        senderId: 'browser-a',
        connectionIdFactory: () => 'BROW0001',
        now: clock.now,
        timers: clock,
        delegate,
      })

      await expect(client.connect()).rejects.toThrow(`${failureStage} failed`)
      await settle()

      expect(channel.unsubscribeCalls).toBe(1)
      expect(channel.removeCalls).toBe(1)
      expect(delegate.states.at(-1)?.state).toBe('failed')
    },
  )

  it('awaits partial-channel cleanup before rejecting construction failure', async () => {
    const clock = new ManualClock()
    const channel = new FakeChannel(clock)
    const delegate = new RecordingDelegate()
    let releaseUnsubscribe: (() => void) | null = null
    channel.onFailure = new Error('on failed')
    channel.unsubscribeBehavior = async () => {
      await new Promise<void>((resolve) => { releaseUnsubscribe = resolve })
      return 'ok'
    }
    const client = new BrowserRelayClient({
      channelFactory: () => channel,
      sessionId: 'WAVE42',
      senderId: 'browser-a',
      connectionIdFactory: () => 'BROW0001',
      now: clock.now,
      timers: clock,
      delegate,
    })

    let outcome = 'pending'
    const connecting = client.connect().then(
      () => { outcome = 'resolved' },
      () => { outcome = 'rejected' },
    )
    await settle()

    expect(outcome).toBe('pending')
    expect(channel.unsubscribeCalls).toBe(1)
    expect(channel.removeCalls).toBe(0)
    releaseUnsubscribe?.()
    await connecting
    expect(outcome).toBe('rejected')
    expect(channel.lifecycle).toEqual(['unsubscribe', 'remove'])
  })

  it('coalesces concurrent connect calls resumed after one close into one successor channel', async () => {
    const harness = createHarness()
    const first = await subscribe(harness)
    let releaseRemoval: (() => void) | null = null
    first.removeBehavior = async () => {
      await new Promise<void>((resolve) => { releaseRemoval = resolve })
    }

    const closing = harness.client.close()
    const reconnectA = harness.client.connect()
    const reconnectB = harness.client.connect()
    await settle()
    releaseRemoval?.()
    await Promise.all([closing, reconnectA, reconnectB])

    expect(harness.channels.channels).toHaveLength(2)
    expect(harness.channels.channels[1].subscribeCalls).toBe(1)
  })

  it('reserves an active publication before synchronous lifecycle re-entry', async () => {
    const harness = createHarness()
    const first = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    let releaseSend: (() => void) | null = null
    first.sendBehavior = (broadcast) => {
      if ((broadcast.payload as RelayMessage).type !== 'guess.submit') {
        return Promise.resolve('ok')
      }
      first.emitStatus('CHANNEL_ERROR', new Error('sync callback'))
      return new Promise<string>((resolve) => {
        releaseSend = () => resolve('ok')
      })
    }

    const send = harness.client.send(guessDraft('guess-1', 0))
    await settle()

    expect(first.unsubscribeCalls).toBe(0)
    expect(first.removeCalls).toBe(0)
    releaseSend?.()
    await send
    await settle()
    expect(first.lifecycle).toEqual(['subscribe', 'unsubscribe', 'remove'])
    expect(harness.channels.channels).toHaveLength(2)
  })

  it('delegates Supabase channel removal to the factory-owning client', async () => {
    const removeChannel = vi.fn(async () => 'ok')
    const rawChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      send: vi.fn(async () => 'ok'),
      unsubscribe: vi.fn(async () => 'ok'),
    }
    supabaseMock.createClient.mockReturnValue({
      channel: vi.fn(() => rawChannel),
      removeChannel,
    })

    const factory = createSupabaseBrowserChannelFactory('https://example.supabase.co', 'public')
    const wrapper = factory('wordless-relay:WAVE42')
    await wrapper.remove()

    expect(removeChannel).toHaveBeenCalledTimes(1)
    expect(removeChannel).toHaveBeenCalledWith(rawChannel)
  })
})

describe('BrowserRelayClient handshake and liveness', () => {
  it('ready binds painter and re-acks, while only a targeted ack is dispatched as readiness', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    channel.emit(ready(1))
    await settle()
    expect(harness.delegate.dispatched).toEqual([])
    expect(messagesOfType(channel, 'presence.ack')).toHaveLength(1)
    expect(harness.client.getConfirmedPeerConnectionId()).toBeNull()

    channel.emit(targetedAck(2))
    await settle()
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['presence.ack'])
    expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0001')
  })

  it('never echoes an ack and duplicate ready only produces another targeted ack', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    channel.emit(ready(1))
    channel.emit(targetedAck(2))
    await settle()
    const beforeAckCount = messagesOfType(channel, 'presence.ack').length

    channel.emit(ready(3))
    await settle()

    expect(messagesOfType(channel, 'presence.ack')).toHaveLength(beforeAckCount + 1)
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['presence.ack'])
  })

  it('sends exactly three ready attempts, waits indefinitely before peer presence, and restarts on late ready', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    await harness.clock.advanceBy(3_500)
    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(3)
    expect(harness.channels.channels).toHaveLength(1)
    expect(harness.delegate.states.at(-1)?.state).toBe('waiting')

    channel.emit(ready(20))
    await settle()
    expect(messagesOfType(channel, 'presence.ack')).toHaveLength(1)
    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(4)

    channel.emit(targetedAck(21))
    await harness.clock.advanceBy(2_000)
    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(4)
  })

  it('recovers after a known peer outlives the three-ready window but never churns an unknown peer', async () => {
    const known = createHarness()
    const knownChannel = await subscribe(known)
    knownChannel.emit(ready(1))
    await settle()
    await known.clock.advanceBy(2_100)

    expect(known.delegate.invalidations).toBe(1)
    expect(known.channels.channels).toHaveLength(2)

    const unknown = createHarness()
    await subscribe(unknown)
    await unknown.clock.advanceBy(20_000)
    expect(unknown.delegate.invalidations).toBe(0)
    expect(unknown.channels.channels).toHaveLength(1)
  })

  it('accepts a late counterpart baseline after lost first readiness in either direction', async () => {
    for (const baseline of [2, 37]) {
      const harness = createHarness()
      const channel = await subscribe(harness)
      channel.emit(ready(baseline))
      channel.emit(targetedAck(baseline + 1))
      await settle()

      expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['presence.ack'])
      expect(messagesOfType(channel, 'presence.ack')).toHaveLength(1)
      expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0001')
    }
  })

  it('bridges a lost targeted ack through ready retry without a gap storm', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    channel.emit(ready(1))
    channel.emit(ready(3))
    channel.emit(targetedAck(4))
    await settle()

    expect(harness.controls).toEqual([])
    expect(messagesOfType(channel, 'presence.ack')).toHaveLength(2)
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['presence.ack'])
  })

  it('invalidates an in-flight old ready burst so a peer transition retains only one retry cadence', async () => {
    const harness = createHarness()
    await harness.client.connect()
    const channel = harness.channels.channels[0]
    if (!channel) throw new Error('channel not created')
    let releaseInitialReady: (() => void) | null = null
    channel.sendBehavior = async (broadcast) => {
      const message = broadcast.payload as RelayMessage
      if (message.type === 'presence.ready' && !releaseInitialReady) {
        await new Promise<void>((resolve) => { releaseInitialReady = resolve })
      }
      return 'ok'
    }
    channel.emitStatus('SUBSCRIBED')
    await settle()

    channel.emit(ready(1))
    channel.emit(targetedAck(2))
    channel.emit(ready(3, 'PAIN0002'))
    await settle()
    releaseInitialReady?.()
    await settle()
    await settle()
    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(2)

    await harness.clock.advanceBy(1_000)

    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(3)
    expect(harness.channels.channels).toHaveLength(1)
  })

  it('sends pings every two seconds, acks painter pings once, and never delegates transport traffic', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    channel.emit(ready(1))
    channel.emit(targetedAck(2))
    await settle()

    await harness.clock.advanceBy(2_000)
    const pings = messagesOfType(channel, 'transport.ping')
    expect(pings).toHaveLength(1)
    expect(pings[0].roundId).toBe(LOBBY_ROUND_ID)

    channel.emit(painterMessage('transport.ping', 3, LOBBY_ROUND_ID, {
      pingId: 'ping-peer', originSentAtMs: 123,
    }))
    await settle()
    expect(messagesOfType(channel, 'transport.ack').map(({ payload }) => payload)).toEqual([
      { pingId: 'ping-peer', originSentAtMs: 123 },
    ])
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['presence.ack'])
  })

  it('arms peer expiry only after accepted painter presence and performs one browser-only recovery at six seconds', async () => {
    const harness = createHarness()
    const first = await subscribe(harness)
    await harness.clock.advanceBy(12_000)
    expect(harness.channels.channels).toHaveLength(1)

    first.emit(ready(1))
    first.emit(targetedAck(2))
    await settle()
    await harness.clock.advanceBy(5_999)
    expect(harness.channels.channels).toHaveLength(1)
    await harness.clock.advanceBy(1)

    expect(harness.delegate.invalidations).toBe(1)
    expect(harness.channels.channels).toHaveLength(2)
    expect(first.unsubscribeCalls).toBe(1)
    expect(first.removeCalls).toBe(1)
  })

  it('refreshes the six-second peer clock with accepted painter traffic', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    await bindAndStart(harness, channel)

    await harness.clock.advanceBy(5_000)
    channel.emit(painterMessage('stroke.begin', 4, 'round-1', {
      strokeId: 'stroke-1', colorId: 'violet',
    }))
    await settle()
    await harness.clock.advanceBy(5_000)
    expect(harness.channels.channels).toHaveLength(1)
    await harness.clock.advanceBy(1_000)
    expect(harness.channels.channels).toHaveLength(2)
  })
})

describe('BrowserRelayClient linked painter lifecycle', () => {
  it.each([
    'simultaneous',
    'lens-first-ready-lost',
    'browser-first-ready-window-expired',
    'browser-first-ready-lost',
  ] as const)('reaches one targeted authoritative start for %s subscription', async (mode) => {
    const harness = createHarness()
    const peer = new LinkedPainterPeer()
    let channel: FakeChannel

    if (mode === 'browser-first-ready-window-expired') {
      channel = await subscribe(harness)
      await harness.clock.advanceBy(3_500)
      peer.attach(channel)
      peer.sendReady()
    }
    else {
      await harness.client.connect()
      const created = harness.channels.channels[0]
      if (!created) throw new Error('linked channel not created')
      channel = created
      peer.attach(channel)
      if (mode === 'lens-first-ready-lost') {
        peer.dropPainterReadyCount = 1
        peer.sendReady()
      }
      if (mode === 'browser-first-ready-lost') peer.dropBrowserReadyCount = 1
      channel.emitStatus('SUBSCRIBED')
      if (mode === 'browser-first-ready-lost') {
        await settle()
        await harness.clock.advanceBy(1_000)
      }
    }
    await settle()

    expect(peer.startCount).toBe(1)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.start')).toHaveLength(1)
    expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0001')
    expect(harness.delegate.invalidations).toBe(0)
    expect(harness.channels.channels).toHaveLength(1)
  })

  it('recovers when the painter first ready is lost and never echoes the painter ack', async () => {
    const harness = createHarness()
    await harness.client.connect()
    const channel = harness.channels.channels[0]
    if (!channel) throw new Error('linked channel not created')
    const peer = new LinkedPainterPeer()
    peer.dropPainterReadyCount = 1
    peer.attach(channel)
    channel.emitStatus('SUBSCRIBED')
    await settle()
    expect(peer.startCount).toBe(0)

    peer.sendReady()
    await settle()

    expect(peer.startCount).toBe(1)
    expect(harness.delegate.dispatched.map(({ type }) => type)).toContain('round.start')
    const browserAcks = peer.received.filter(({ type }) => type === 'presence.ack')
    expect(browserAcks).toHaveLength(1)
  })

  it('uses the initial-start barrier when only the painter fresh targeted ack is lost', async () => {
    const harness = createHarness()
    await harness.client.connect()
    const channel = harness.channels.channels[0]
    if (!channel) throw new Error('linked channel not created')
    const peer = new LinkedPainterPeer()
    peer.dropPainterAckOrdinal = 2
    peer.attach(channel)

    channel.emitStatus('SUBSCRIBED')
    await settle()

    expect(peer.startCount).toBe(1)
    expect(harness.controls).toEqual([])
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual([
      'presence.ack', 'round.start',
    ])
    expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0001')
  })

  it('recovers one-sided painter silence with one browser connection change and one authoritative reset', async () => {
    const harness = createHarness()
    await harness.client.connect()
    const first = harness.channels.channels[0]
    if (!first) throw new Error('first linked channel not created')
    const peer = new LinkedPainterPeer()
    peer.recoverWithReset = true
    peer.attach(first)
    first.emitStatus('SUBSCRIBED')
    await settle()
    expect(peer.startCount).toBe(1)

    await harness.clock.advanceBy(6_000)
    const second = harness.channels.channels[1]
    if (!second) throw new Error('recovery linked channel not created')
    peer.attach(second)
    second.emitStatus('SUBSCRIBED')
    await settle()
    await settle()

    expect(harness.delegate.invalidations).toBe(1)
    expect(harness.channels.channels).toHaveLength(2)
    expect(first.unsubscribeCalls).toBe(1)
    expect(first.removeCalls).toBe(1)
    expect(messagesOfType(first, 'round.resync.request')).toHaveLength(0)
    expect(messagesOfType(second, 'round.resync.request')).toHaveLength(0)
    expect(messagesOfType(first, 'presence.ready')[0].payload.connectionId).toBe('BROW0001')
    expect(messagesOfType(second, 'presence.ready')[0].payload.connectionId).toBe('BROW0002')
    expect(peer.peerTransitionCount).toBe(1)
    expect(peer.resetCount).toBe(1)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset')).toHaveLength(1)
    expect(messagesOfType(second, 'round.reset.ack')).toHaveLength(1)
    expect(peer.received.filter(({ type }) => type === 'round.reset.ack')).toHaveLength(1)
    expect(peer.startCount).toBe(2)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.start')).toHaveLength(2)
    expect(peer.received.filter(({ type }) => type === 'transport.ping').length).toBeGreaterThan(0)
  })

  it('recovers a lost initial start by re-subscribing without inventing a resync round', async () => {
    const harness = createHarness()
    await harness.client.connect()
    const first = harness.channels.channels[0]
    if (!first) throw new Error('first linked channel not created')
    const peer = new LinkedPainterPeer()
    peer.dropPainterStartCount = 1
    peer.recoverWithReset = true
    peer.attach(first)
    first.emitStatus('SUBSCRIBED')
    await settle()

    expect(peer.startAttemptCount).toBe(1)
    expect(peer.startCount).toBe(0)
    peer.sendPing()
    await settle()

    const second = harness.channels.channels[1]
    if (!second) throw new Error('recovery linked channel not created')
    peer.attach(second)
    second.emitStatus('SUBSCRIBED')
    await settle()
    await settle()

    expect(messagesOfType(first, 'round.resync.request')).toHaveLength(0)
    expect(messagesOfType(second, 'round.resync.request')).toHaveLength(0)
    expect(first.unsubscribeCalls).toBe(1)
    expect(peer.resetCount).toBe(1)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset')).toHaveLength(1)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.start')).toHaveLength(1)
  })
})

describe('BrowserRelayClient authoritative product routing', () => {
  it('rejects pre-presence product and a stale-target start without binding a round or cancelling retries', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    channel.emit(start(1))
    channel.emit(ready(2))
    channel.emit(start(3, 'OLD00001'))
    await settle()

    expect(harness.delegate.dispatched).toEqual([])
    expect(harness.client.getConfirmedPeerConnectionId()).toBeNull()
    await harness.clock.advanceBy(1_000)
    expect(messagesOfType(channel, 'presence.ready').length).toBeGreaterThan(1)
  })

  it('consumes an old-browser-target start then recovers on the fresh target without a false gap', async () => {
    const harness = createHarness(['BROW0002'])
    const channel = await subscribe(harness)

    channel.emit(ready(20))
    channel.emit(start(21, 'BROW0001', 'old-round'))
    channel.emit(targetedAck(22, 'BROW0002'))
    channel.emit(start(23, 'BROW0002', 'round-1'))
    await settle()

    expect(harness.controls).toEqual([])
    expect(harness.delegate.dispatched.map(({ type, sequence }) => ({ type, sequence }))).toEqual([
      { type: 'presence.ack', sequence: 22 },
      { type: 'round.start', sequence: 23 },
    ])
    expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0001')
  })

  it('keeps gameplay quarantined when the initial-start delegate throws until a retry commits', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    channel.emit(ready(1))
    harness.delegate.throwNextDispatch = true

    channel.emit(start(2))
    channel.emit(painterMessage('stroke.begin', 3, 'round-1', {
      strokeId: 'stroke-1', colorId: 'violet',
    }))
    await settle()
    expect(harness.delegate.dispatched).toEqual([])

    channel.emit(start(4))
    channel.emit(painterMessage('stroke.begin', 5, 'round-1', {
      strokeId: 'stroke-1', colorId: 'violet',
    }))
    await settle()
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual([
      'round.start', 'stroke.begin',
    ])
  })

  it('uses a current-target initial start as readiness proof and treats a later targeted ack as an idempotent dispatch', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)

    channel.emit(ready(1))
    channel.emit(start(3))
    channel.emit(targetedAck(4))
    await settle()

    expect(harness.controls).toEqual([])
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual([
      'round.start', 'presence.ack',
    ])
    expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0001')
    await harness.clock.advanceBy(2_000)
    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(1)
  })

  it('uses a current-target reset as readiness proof, dispatches before ack, and forwards the new local round', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    channel.emit(ready(1))
    channel.sendBehavior = async (message) => {
      if ((message.payload as RelayMessage).type === 'round.reset.ack') {
        harness.delegate.events.push('send:round.reset.ack')
      }
      return 'ok'
    }

    channel.emit(reset(3, 'round-1', 'round-2'))
    await settle()

    expect(harness.delegate.events).toContain('dispatch:round.reset')
    expect(harness.delegate.events.indexOf('dispatch:round.reset')).toBeLessThan(
      harness.delegate.events.indexOf('send:round.reset.ack'),
    )
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['round.reset'])
    expect(messagesOfType(channel, 'round.reset.ack').map(({ roundId, payload }) => ({
      roundId, nextRoundId: payload.nextRoundId,
    }))).toEqual([{ roundId: 'round-2', nextRoundId: 'round-2' }])

    channel.emit(start(4, 'BROW0001', 'round-2'))
    await settle()
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual([
      'round.reset', 'round.start',
    ])
  })

  it('does not ack a reset when delegate commit throws, retries it, then re-acks without duplicate commit', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    channel.emit(ready(1))
    harness.delegate.throwNextDispatch = true

    channel.emit(reset(2, 'round-1', 'round-2'))
    channel.emit(painterMessage('stroke.begin', 3, 'round-2', {
      strokeId: 'stale-stroke', colorId: 'violet',
    }))
    await settle()
    expect(messagesOfType(channel, 'round.reset.ack')).toHaveLength(0)
    expect(harness.delegate.dispatched).toEqual([])

    channel.emit(reset(4, 'round-1', 'round-2'))
    await settle()
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['round.reset'])
    expect(messagesOfType(channel, 'round.reset.ack')).toHaveLength(1)

    channel.emit(reset(5, 'round-1', 'round-2'))
    await settle()
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['round.reset'])
    expect(messagesOfType(channel, 'round.reset.ack')).toHaveLength(2)
  })

  it('replays a previously committed reset into the delegate after projection invalidation', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    channel.emit(ready(1))
    channel.emit(reset(2, 'round-1', 'round-2'))
    await settle()
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset')).toHaveLength(1)

    channel.emit(ready(3, 'PAIN0002'))
    channel.emit(reset(4, 'round-1', 'round-2'))
    await settle()

    expect(harness.delegate.invalidations).toBe(1)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset')).toHaveLength(2)
    expect(messagesOfType(channel, 'round.reset.ack')).toHaveLength(2)
  })

  it('consumes stale-target reset without dispatch, confirmation, quarantine release, or ack', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')

    channel.emit(ready(1))
    channel.emit(reset(2, 'round-1', 'round-2', 'OLD00001'))
    await settle()

    expect(harness.delegate.dispatched).toEqual([])
    expect(messagesOfType(channel, 'round.reset.ack')).toHaveLength(0)
    expect(harness.client.getConfirmedPeerConnectionId()).toBeNull()

    channel.emit(ready(3))
    channel.emit(reset(4, 'round-1', 'round-2'))
    await settle()
    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual(['round.reset'])
    expect(messagesOfType(channel, 'round.reset.ack')).toHaveLength(1)
  })

  it('dispatches accepted public messages in FIFO receive order but never ready or transport control', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    await bindAndStart(harness, channel)

    channel.emit(painterMessage('stroke.begin', 4, 'round-1', {
      strokeId: 'stroke-1', colorId: 'violet',
    }))
    channel.emit(painterMessage('stroke.points', 5, 'round-1', {
      strokeId: 'stroke-1', points: [[100, 200], [300, 400]],
    }))
    channel.emit(painterMessage('stroke.end', 6, 'round-1', { strokeId: 'stroke-1' }))
    channel.emit(painterMessage('round.result', 7, 'round-1', {
      outcome: 'correct', guessId: 'guess-1', choiceIndex: 0,
      revealedWord: 'SNAKE', finalPointCount: 2,
    }))
    await settle()

    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual([
      'presence.ack', 'round.start', 'stroke.begin', 'stroke.points',
      'stroke.end', 'round.result',
    ])
    expect(harness.delegate.dispatched.slice(2, 4)).toMatchObject([
      { type: 'stroke.begin', payload: { strokeId: 'stroke-1', colorId: 'violet' } },
      { type: 'stroke.points', payload: { strokeId: 'stroke-1' } },
    ])
  })

  it('emits a sequence-gap control and invalidates once before dispatching no gameplay or resync request', async () => {
    const harness = createHarness()
    const first = await subscribe(harness)
    await bindAndStart(harness, first)
    harness.delegate.events.length = 0

    first.emit(painterMessage('stroke.points', 5, 'round-1', {
      strokeId: 'stroke-1', points: [[100, 200]],
    }))
    await settle()

    expect(harness.controls).toEqual([{
      type: 'SEQUENCE_GAP', senderId: 'painter-a', observedSequence: 5,
    }])
    expect(harness.delegate.events.slice(0, 2)).toEqual(['invalidate', 'state:reconnecting'])
    expect(harness.delegate.dispatched.some(({ sequence }) => sequence === 5)).toBe(false)
    expect(messagesOfType(first, 'round.resync.request')).toHaveLength(0)
    expect(harness.channels.channels).toHaveLength(2)
  })

  it('forwards setLocalRound and completeLocalResync into policy routing', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    channel.emit(ready(1))
    channel.emit(targetedAck(2))
    harness.client.setLocalRound('round-1')

    channel.emit(painterMessage('stroke.begin', 3, 'round-1', {
      strokeId: 'stroke-1', colorId: 'violet',
    }))
    harness.client.completeLocalResync('painter-a')
    await settle()

    expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual([
      'presence.ack', 'stroke.begin',
    ])
  })
})

describe('BrowserRelayClient peer generations and quarantine', () => {
  it('emits PEER_REJOINED before invalidation-dependent dispatch, keeps the healthy channel, and blocks old-target ack', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    await bindAndStart(harness, channel)
    harness.delegate.events.length = 0

    channel.emit(ready(4, 'PAIN0002'))
    await settle()
    expect(harness.controls).toEqual([{
      type: 'PEER_REJOINED',
      senderId: 'painter-a',
      previousConnectionId: 'PAIN0001',
      nextConnectionId: 'PAIN0002',
    }])
    expect(harness.delegate.events[0]).toBe('invalidate')
    expect(harness.delegate.invalidations).toBe(1)
    expect(harness.channels.channels).toHaveLength(1)

    channel.emit(targetedAck(5, 'BROW9999', 'PAIN0002'))
    await settle()
    expect(harness.client.getConfirmedPeerConnectionId()).toBeNull()

    channel.emit(targetedAck(6, 'BROW0001', 'PAIN0002'))
    await settle()
    expect(harness.delegate.dispatched.at(-1)?.type).toBe('presence.ack')
    expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0002')
  })

  it('emits PEER_REPLACED once before readiness when a targeted ack introduces the new sender', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    channel.emit(ready(1))
    channel.emit(targetedAck(2))
    await settle()
    harness.delegate.events.length = 0
    const readyCount = messagesOfType(channel, 'presence.ready').length

    channel.emit(targetedAck(1, 'BROW0001', 'PAIN0009', 'painter-b'))
    await settle()

    expect(harness.controls).toEqual([{
      type: 'PEER_REPLACED',
      previousSenderId: 'painter-a',
      nextSenderId: 'painter-b',
      previousConnectionId: 'PAIN0001',
      nextConnectionId: 'PAIN0009',
    }])
    expect(harness.delegate.events).toEqual(['invalidate', 'dispatch:presence.ack'])
    expect(messagesOfType(channel, 'presence.ready')).toHaveLength(readyCount)
    expect(harness.client.getConfirmedPeerConnectionId()).toBe('PAIN0009')
  })

  it.each([true, false])(
    'quarantines an old started payload (delivered=%s) until reset is the next product transition',
    async (deliverOldPayload) => {
      const harness = createHarness()
      const channel = await subscribe(harness)
      await bindAndStart(harness, channel)
      harness.delegate.dispatched.length = 0

      channel.emit(ready(4, 'PAIN0002'))
      if (deliverOldPayload) {
        channel.emit(painterMessage('stroke.points', 5, 'round-1', {
          strokeId: 'stroke-1', points: [[100, 200]],
        }))
      }
      channel.emit(reset(6, 'round-1', 'round-2', 'BROW0001'))
      channel.emit(start(7, 'BROW0001', 'round-2'))
      await settle()

      expect(harness.delegate.dispatched.map(({ type }) => type)).toEqual([
        'round.reset', 'round.start',
      ])
      expect(messagesOfType(channel, 'round.reset.ack')).toHaveLength(1)
      expect(harness.controls.filter(({ type }) => type === 'SEQUENCE_GAP')).toHaveLength(0)
    },
  )

  it('does not reciprocally reconnect when the painter alone changes connection ID', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    await bindAndStart(harness, channel)

    channel.emit(ready(4, 'PAIN0002'))
    channel.emit(targetedAck(5, 'BROW0001', 'PAIN0002'))
    channel.emit(reset(6, 'round-1', 'round-2'))
    channel.emit(start(7, 'BROW0001', 'round-2'))
    await settle()

    expect(harness.channels.channels).toHaveLength(1)
    expect(channel.unsubscribeCalls).toBe(0)
    expect(channel.subscribeCalls).toBe(1)
    expect(harness.delegate.invalidations).toBe(1)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset')).toHaveLength(1)
    expect(harness.delegate.dispatched.filter(({ type }) => type === 'round.start')).toHaveLength(2)
  })
})

describe('BrowserRelayClient outbound FIFO and generation barriers', () => {
  it('rejects a malformed local draft without consuming sequence or entering network recovery', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    const initialSequence = payloads(channel).at(-1)?.sequence ?? 0

    const invalid = harness.client.send({
      type: 'guess.submit',
      roundId: 'round-1',
      payload: { guessId: 'contains spaces', choiceIndex: 0 },
    } as RelayMessageDraft)
    const valid = harness.client.send(guessDraft('guess-1', 0))

    await expect(invalid).rejects.toThrow('invalid outbound relay message')
    await expect(valid).resolves.toBeUndefined()
    expect(harness.delegate.invalidations).toBe(0)
    expect(harness.channels.channels).toHaveLength(1)
    expect(messagesOfType(channel, 'guess.submit').map(({ sequence, payload }) => ({
      sequence, guessId: payload.guessId,
    }))).toEqual([{ sequence: initialSequence + 1, guessId: 'guess-1' }])
  })

  it('allocates transport sequence at send start across adapter and application traffic in one FIFO', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    channel.emit(ready(1))
    channel.emit(targetedAck(2))
    harness.client.setLocalRound('round-1')
    await settle()

    const first = harness.client.send(guessDraft('guess-1', 0))
    channel.emit(painterMessage('transport.ping', 3, LOBBY_ROUND_ID, {
      pingId: 'peer-ping', originSentAtMs: 20,
    }))
    const second = harness.client.send(guessDraft('guess-2', 1))
    await Promise.all([first, second])
    await settle()

    const tail = payloads(channel).filter(({ type }) =>
      type === 'guess.submit' || type === 'transport.ack')
    expect(tail.map(({ type }) => type)).toEqual([
      'guess.submit', 'transport.ack', 'guess.submit',
    ])
    expect(tail.map(({ sequence }) => sequence)).toEqual([
      tail[0].sequence, tail[0].sequence + 1, tail[0].sequence + 2,
    ])
    expect(tail.every(Object.isFrozen)).toBe(true)
  })

  it('snapshots a queued caller draft before later mutation can change its wire meaning', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    let releaseFirst: (() => void) | null = null
    channel.sendBehavior = async (broadcast) => {
      const message = broadcast.payload as RelayMessage
      if (message.type === 'guess.submit' && !releaseFirst) {
        await new Promise<void>((resolve) => { releaseFirst = resolve })
      }
      return 'ok'
    }

    const first = harness.client.send(guessDraft('guess-1', 0))
    const mutable = {
      type: 'guess.submit',
      roundId: 'round-1',
      payload: { guessId: 'guess-2', choiceIndex: 1 },
    } as RelayMessageDraft as {
      type: 'guess.submit'
      roundId: string
      payload: { guessId: string; choiceIndex: 0 | 1 | 2 | 3 }
    }
    const second = harness.client.send(mutable)
    mutable.payload.guessId = 'guess-mutated'
    mutable.payload.choiceIndex = 3
    releaseFirst?.()

    await Promise.all([first, second])
    expect(messagesOfType(channel, 'guess.submit').map(({ payload }) => payload)).toEqual([
      { guessId: 'guess-1', choiceIndex: 0 },
      { guessId: 'guess-2', choiceIndex: 1 },
    ])
  })

  it('enforces 100 ms between actual stroke-point send starts after a backlog unblocks', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    const before = channel.sent.length

    const drafts: RelayMessageDraft[] = [0, 1, 2].map((index) => ({
      type: 'stroke.points',
      roundId: 'round-1',
      payload: { strokeId: 'stroke-1', points: [[index, index]] },
    }))
    const sends = drafts.map((draft) => harness.client.send(draft))
    await settle()
    await harness.clock.advanceBy(200)
    await Promise.all(sends)

    expect(channel.sendStartedAtMs.slice(before)).toEqual([0, 100, 200])
  })

  it('cancels a cadence-waiting point immediately at a peer generation barrier', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    await bindAndStart(harness, channel)
    harness.client.setLocalRound('round-1')

    await harness.client.send({
      type: 'stroke.points',
      roundId: 'round-1',
      payload: { strokeId: 'stroke-1', points: [[0, 0]] },
    })
    let waitingOutcome: unknown = 'pending'
    const waiting = harness.client.send({
      type: 'stroke.points',
      roundId: 'round-1',
      payload: { strokeId: 'stroke-1', points: [[1, 1]] },
    }).then(
      () => { waitingOutcome = 'resolved' },
      (error: unknown) => { waitingOutcome = error },
    )
    await settle()

    channel.emit(ready(4, 'PAIN0002'))
    await settle()

    expect(waitingOutcome).toBeInstanceOf(ApplicationGenerationCancelledError)
    expect(messagesOfType(channel, 'stroke.points')).toHaveLength(1)
    await waiting
  })

  it('cancels a cadence-waiting point before close cleanup resolves', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    await harness.client.send({
      type: 'stroke.points',
      roundId: 'round-1',
      payload: { strokeId: 'stroke-1', points: [[0, 0]] },
    })
    let waitingOutcome: unknown = 'pending'
    const waiting = harness.client.send({
      type: 'stroke.points',
      roundId: 'round-1',
      payload: { strokeId: 'stroke-1', points: [[1, 1]] },
    }).then(
      () => { waitingOutcome = 'resolved' },
      (error: unknown) => { waitingOutcome = error },
    )
    await settle()

    await harness.client.close()

    expect(waitingOutcome).toBeInstanceOf(ApplicationGenerationCancelledError)
    expect(messagesOfType(channel, 'stroke.points')).toHaveLength(1)
    expect(channel.lifecycle).toEqual(['subscribe', 'unsubscribe', 'remove'])
    await waiting
  })

  it('cancels queued application drafts at a peer barrier without allocating their sequences and preserves the targeted ack', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    channel.emit(ready(1))
    channel.emit(targetedAck(2))
    harness.client.setLocalRound('round-1')
    await settle()

    let releaseStarted: (() => void) | null = null
    channel.sendBehavior = async (message) => {
      if ((message.payload as RelayMessage).type === 'guess.submit' && !releaseStarted) {
        await new Promise<void>((resolve) => { releaseStarted = resolve })
      }
      return 'ok'
    }

    const first = harness.client.send(guessDraft('guess-1', 0))
    const second = harness.client.send(guessDraft('guess-2', 1))
    const third = harness.client.send(guessDraft('guess-3', 2))
    const secondOutcome = second.catch((error: unknown) => error)
    const thirdOutcome = third.catch((error: unknown) => error)
    await settle()
    const firstWire = messagesOfType(channel, 'guess.submit')[0]

    channel.emit(ready(3, 'PAIN0002'))
    await settle()
    expect(await secondOutcome).toBeInstanceOf(ApplicationGenerationCancelledError)
    expect(await thirdOutcome).toBeInstanceOf(ApplicationGenerationCancelledError)
    releaseStarted?.()
    await first
    await settle()

    const guesses = messagesOfType(channel, 'guess.submit')
    expect(guesses.map(({ payload }) => payload.guessId)).toEqual(['guess-1'])
    const transitionAck = messagesOfType(channel, 'presence.ack').at(-1)
    expect(transitionAck?.payload.acknowledgedConnectionId).toBe('PAIN0002')
    expect(transitionAck?.sequence).toBe(firstWire.sequence + 1)
  })

  it('cancels pending drafts on close while allowing only the already-started send to settle', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    let release: (() => void) | null = null
    channel.sendBehavior = async (message) => {
      if ((message.payload as RelayMessage).type === 'guess.submit' && !release) {
        await new Promise<void>((resolve) => { release = resolve })
      }
      return 'ok'
    }

    const first = harness.client.send(guessDraft('guess-1', 0))
    const queued = harness.client.send(guessDraft('guess-2', 1))
    const queuedOutcome = queued.catch((error: unknown) => error)
    await settle()
    const closing = harness.client.close()
    await settle()

    expect(await queuedOutcome).toBeInstanceOf(ApplicationGenerationCancelledError)
    expect(channel.unsubscribeCalls).toBe(0)
    release?.()
    await first
    await closing
    expect(messagesOfType(channel, 'guess.submit')).toHaveLength(1)
    expect(channel.lifecycle).toEqual(['subscribe', 'unsubscribe', 'remove'])
  })

  it('never continues the old FIFO after an ambiguous started send failure', async () => {
    const harness = createHarness()
    const channel = await subscribe(harness)
    harness.client.setLocalRound('round-1')
    channel.sendResult = new Error('unknown delivery')

    const first = harness.client.send(guessDraft('guess-1', 0))
    const queued = harness.client.send(guessDraft('guess-2', 1))
    const queuedOutcome = queued.catch((error: unknown) => error)
    await expect(first).rejects.toThrow('unknown delivery')
    expect(await queuedOutcome).toBeInstanceOf(ApplicationGenerationCancelledError)
    await settle()

    expect(messagesOfType(channel, 'guess.submit').map(({ payload }) => payload.guessId)).toEqual([
      'guess-1',
    ])
    expect(harness.channels.channels).toHaveLength(2)
  })
})
