import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BROADCAST_EVENT,
  LOBBY_ROUND_ID,
} from '../../Assets/Wordless/Scripts/Core/Protocol.ts'

let lensNowMs = 0
const lensLogs = []

globalThis.component = (value) => value
globalThis.input = () => undefined
globalThis.getTime = () => lensNowMs / 1_000
globalThis.print = (message) => { lensLogs.push(String(message)) }
globalThis.BaseScriptComponent = class BaseScriptComponent {
  constructor() {
    this.events = new Map()
  }

  createEvent(name) {
    return {
      bind: (callback) => { this.events.set(name, callback) },
    }
  }
}

const { ApplicationGenerationCancelledError, SupabaseRelayTransport } =
  await import('../../Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts')

class FakeRealtimeChannel {
  sent = []
  sendStartedAtMs = []
  subscribeCalls = 0
  sendBehavior = null
  payloadListener = null
  statusListener = null

  on(type, filter, callback) {
    assert.equal(type, 'broadcast')
    assert.deepEqual(filter, { event: BROADCAST_EVENT })
    this.payloadListener = callback
    return this
  }

  subscribe(callback) {
    this.subscribeCalls += 1
    this.statusListener = callback
    return this
  }

  async send(message) {
    this.sent.push(message)
    this.sendStartedAtMs.push(lensNowMs)
    if (this.sendBehavior) return this.sendBehavior(message)
    return 'ok'
  }

  emit(payload) {
    this.payloadListener?.({ payload })
  }

  emitStatus(status) {
    this.statusListener?.(status)
  }
}

class FakeSupabaseClient {
  topics = []
  channels = []
  removeAllCalls = 0
  removeAllBehavior = null

  channel(topic) {
    this.topics.push(topic)
    const channel = new FakeRealtimeChannel()
    this.channels.push(channel)
    return channel
  }

  async removeAllChannels() {
    this.removeAllCalls += 1
    if (this.removeAllBehavior) return this.removeAllBehavior()
    return ['ok']
  }
}

function settle() {
  return Promise.resolve().then(() => Promise.resolve()).then(() => Promise.resolve())
}

function guesserMessage(type, sequence, roundId, payload, overrides = {}) {
  return {
    v: 1,
    type,
    sessionId: overrides.sessionId ?? 'WAVE42',
    roundId,
    senderId: overrides.senderId ?? 'guesser-a',
    sequence,
    sentAtMs: sequence * 10,
    payload,
  }
}

function ready(sequence, connectionId = 'BROW0001', senderId = 'guesser-a') {
  return guesserMessage('presence.ready', sequence, LOBBY_ROUND_ID, {
    role: 'guesser', connectionId,
  }, { senderId })
}

function targetedAck(
  sequence,
  painterConnectionId,
  guesserConnectionId = 'BROW0001',
  senderId = 'guesser-a',
) {
  return guesserMessage('presence.ack', sequence, LOBBY_ROUND_ID, {
    role: 'guesser',
    connectionId: guesserConnectionId,
    acknowledgedConnectionId: painterConnectionId,
  }, { senderId })
}

function messagesOfType(channel, type) {
  return channel.sent
    .map(({ payload }) => payload)
    .filter((message) => message.type === type)
}

async function createHarness() {
  lensNowMs = 0
  lensLogs.length = 0
  const supabase = new FakeSupabaseClient()
  globalThis.__wordlessLensCreateClient = () => supabase
  const transport = new SupabaseRelayTransport()
  transport.supabaseProject = {
    url: 'https://example.supabase.co',
    publicToken: 'client-safe-public-key',
  }
  transport.sessionId = 'WAVE42'
  transport.connectOnStart = false
  transport.onAwake()
  const statuses = []
  const controls = []
  const received = []
  transport.onStatus((status, detail) => { statuses.push({ status, detail }) })
  transport.onControl((event) => { controls.push(event) })
  transport.onMessage((message) => { received.push(message) })
  await transport.connect()
  const channel = supabase.channels[0]
  assert.ok(channel)
  channel.emitStatus('SUBSCRIBED')
  await settle()
  return { transport, supabase, channel, statuses, controls, received }
}

async function tick(transport, deltaMs) {
  lensNowMs += deltaMs
  transport.events.get('UpdateEvent')?.()
  await settle()
}

async function bindPeer(harness, senderId = 'guesser-a', connectionId = 'BROW0001') {
  harness.channel.emit(ready(1, connectionId, senderId))
  await settle()
  const painterConnectionId = messagesOfType(harness.channel, 'presence.ready')[0]
    .payload.connectionId
  harness.channel.emit(targetedAck(2, painterConnectionId, connectionId, senderId))
  await settle()
  return painterConnectionId
}

test('Lens transport executes public-channel lifecycle and awaited teardown', async () => {
  const harness = await createHarness()

  assert.deepEqual(harness.supabase.topics, ['wordless-relay:WAVE42'])
  assert.equal(harness.channel.subscribeCalls, 1)
  assert.deepEqual(harness.statuses.slice(0, 2), [
    { status: 'CONNECTING', detail: 'CONNECTING' },
    { status: 'SUBSCRIBED', detail: 'SUBSCRIBED · TRANSPORT ONLY' },
  ])
  assert.equal(messagesOfType(harness.channel, 'presence.ready').length, 1)

  await harness.transport.close()
  assert.equal(harness.supabase.removeAllCalls, 1)
  assert.deepEqual(harness.statuses.at(-1), { status: 'CLOSED', detail: 'CLOSED' })
})

test('Lens known-peer ready exhaustion reports root-owned timeout before one local recovery', async () => {
  const harness = await createHarness()
  harness.channel.emit(ready(1))
  await settle()

  await tick(harness.transport, 1_000)
  await tick(harness.transport, 1_000)
  await settle()

  const recoveryStatuses = harness.statuses.slice(2)
  assert.deepEqual(recoveryStatuses.map(({ status }) => status), [
    'COUNTERPART_TIMED_OUT', 'CONNECTING', 'CONNECTING',
  ])
  assert.equal(harness.supabase.removeAllCalls, 1)
  assert.equal(harness.supabase.channels.length, 2)
})

test('Lens peer liveness expiry recovers exactly once at six seconds', async () => {
  const harness = await createHarness()
  await bindPeer(harness)

  await tick(harness.transport, 5_999)
  assert.equal(harness.supabase.removeAllCalls, 0)
  assert.equal(harness.supabase.channels.length, 1)

  await tick(harness.transport, 1)
  await settle()
  assert.equal(
    harness.statuses.filter(({ status }) => status === 'COUNTERPART_TIMED_OUT').length,
    1,
  )
  assert.equal(harness.supabase.removeAllCalls, 1)
  assert.equal(harness.supabase.channels.length, 2)
})

test('Lens ack-introduced peer transition emits control without authoring another ready', async () => {
  const harness = await createHarness()
  const originalPainterConnection = await bindPeer(harness)
  const readyCount = messagesOfType(harness.channel, 'presence.ready').length

  harness.channel.emit(targetedAck(
    1,
    originalPainterConnection,
    'BROW0009',
    'guesser-b',
  ))
  await settle()

  assert.equal(harness.controls.at(-1)?.type, 'PEER_REPLACED')
  assert.equal(messagesOfType(harness.channel, 'presence.ready').length, readyCount)
  assert.equal(harness.received.at(-1)?.type, 'presence.ack')
})

test('Lens drain is reserved before synchronous close and awaits the started send', async () => {
  const harness = await createHarness()
  let releaseSend
  let closing
  harness.channel.sendBehavior = (broadcast) => {
    if (broadcast.payload.type !== 'stroke.begin') return Promise.resolve('ok')
    closing = harness.transport.close()
    return new Promise((resolve) => { releaseSend = () => resolve('ok') })
  }

  const send = harness.transport.send({
    type: 'stroke.begin',
    roundId: 'round-1',
    payload: { strokeId: 'stroke-1' },
  })
  await settle()

  assert.equal(harness.supabase.removeAllCalls, 0)
  releaseSend()
  await send
  await closing
  assert.equal(harness.supabase.removeAllCalls, 1)
})

test('Lens FIFO cancels queued application drafts without allocating their sequences', async () => {
  const harness = await createHarness()
  let releaseStarted
  harness.channel.sendBehavior = (broadcast) => {
    if (broadcast.payload.type !== 'stroke.begin') return Promise.resolve('ok')
    return new Promise((resolve) => { releaseStarted = () => resolve('ok') })
  }

  const started = harness.transport.send({
    type: 'stroke.begin', roundId: 'round-1', payload: { strokeId: 'stroke-1' },
  })
  const points = harness.transport.send({
    type: 'stroke.points', roundId: 'round-1',
    payload: { strokeId: 'stroke-1', points: [[10, 20]] },
  })
  const result = harness.transport.send({
    type: 'round.result', roundId: 'round-1',
    payload: {
      outcome: 'correct', guessId: 'guess-1', choiceIndex: 0,
      revealedWord: 'SNAKE', finalPointCount: 1,
    },
  })
  const pointOutcome = points.catch((error) => error)
  const resultOutcome = result.catch((error) => error)
  await settle()
  const startedSequence = messagesOfType(harness.channel, 'stroke.begin')[0].sequence

  harness.transport.invalidateApplicationGeneration()
  assert.ok(await pointOutcome instanceof ApplicationGenerationCancelledError)
  assert.ok(await resultOutcome instanceof ApplicationGenerationCancelledError)
  releaseStarted()
  await started

  await harness.transport.send({
    type: 'stroke.end', roundId: 'round-1', payload: { strokeId: 'stroke-1' },
  })
  assert.equal(messagesOfType(harness.channel, 'stroke.points').length, 0)
  assert.equal(messagesOfType(harness.channel, 'round.result').length, 0)
  assert.equal(messagesOfType(harness.channel, 'stroke.end')[0].sequence, startedSequence + 1)
})

test('Lens enforces point cadence at actual send start', async () => {
  const harness = await createHarness()
  const first = harness.transport.send({
    type: 'stroke.points', roundId: 'round-1',
    payload: { strokeId: 'stroke-1', points: [[10, 20]] },
  })
  const second = harness.transport.send({
    type: 'stroke.points', roundId: 'round-1',
    payload: { strokeId: 'stroke-1', points: [[20, 30]] },
  })
  await first
  await tick(harness.transport, 99)
  assert.equal(messagesOfType(harness.channel, 'stroke.points').length, 1)
  await tick(harness.transport, 1)
  await second

  const pointIndexes = harness.channel.sent
    .map(({ payload }, index) => ({ payload, index }))
    .filter(({ payload }) => payload.type === 'stroke.points')
    .map(({ index }) => harness.channel.sendStartedAtMs[index])
  assert.deepEqual(pointIndexes, [0, 100])
})

test('Lens named resync advances only the requested peer after the root reset send', async () => {
  const harness = await createHarness()
  const painterConnectionId = await bindPeer(harness)
  harness.transport.setLocalRound('round-1')
  harness.channel.emit(guesserMessage('guess.submit', 4, 'round-1', {
    guessId: 'guess-gap', choiceIndex: 0,
  }))
  await settle()
  assert.equal(harness.controls.at(-1)?.type, 'SEQUENCE_GAP')

  await harness.transport.send({
    type: 'round.reset',
    roundId: 'round-1',
    payload: { nextRoundId: 'round-2', targetConnectionId: 'BROW0001' },
  })
  harness.transport.completeLocalResync('guesser-a')
  harness.transport.setLocalRound('round-2')
  harness.channel.emit(guesserMessage('guess.submit', 5, 'round-2', {
    guessId: 'guess-after-reset', choiceIndex: 1,
  }))
  await settle()

  assert.equal(painterConnectionId.length, 8)
  assert.equal(harness.received.at(-1)?.payload.guessId, 'guess-after-reset')
})
