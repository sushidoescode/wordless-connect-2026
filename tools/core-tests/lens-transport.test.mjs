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
    v: 3,
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

async function explicitlyRecoverFromRoot(harness) {
  const previousWireMessages = harness.channel.sent.map(({ payload }) => payload)
  const previousReady = previousWireMessages.find(({ type }) =>
    type === 'presence.ready')
  const previousSequence = Math.max(...previousWireMessages.map(({ sequence }) =>
    sequence))
  const statusCountBeforeClose = harness.statuses.length

  await harness.transport.close()

  assert.deepEqual(harness.statuses.slice(statusCountBeforeClose), [
    { status: 'DISCONNECTED', detail: 'CLOSING' },
    { status: 'CLOSED', detail: 'CLOSED' },
  ])
  assert.equal(harness.supabase.removeAllCalls, 1)
  assert.equal(harness.supabase.channels.length, 1)

  await harness.transport.connect()
  assert.equal(harness.supabase.channels.length, 2)
  const successor = harness.supabase.channels[1]
  successor.emitStatus('SUBSCRIBED')
  await settle()

  const successorReady = messagesOfType(successor, 'presence.ready')[0]
  assert.ok(successorReady)
  assert.equal(successorReady.senderId, previousReady.senderId)
  assert.equal(successorReady.sequence, previousSequence + 1)
  assert.notEqual(
    successorReady.payload.connectionId,
    previousReady.payload.connectionId,
  )
  return successor
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

  const closing = harness.transport.close()
  assert.deepEqual(harness.statuses.at(-1), {
    status: 'DISCONNECTED', detail: 'CLOSING',
  })
  await closing
  assert.equal(harness.supabase.removeAllCalls, 1)
  assert.deepEqual(harness.statuses.slice(-2), [
    { status: 'DISCONNECTED', detail: 'CLOSING' },
    { status: 'CLOSED', detail: 'CLOSED' },
  ])
})

test('Lens close cancels a connect still awaiting the prior close', async () => {
  const harness = await createHarness()
  await harness.transport.close()

  const reconnect = harness.transport.connect()
  const teardown = harness.transport.close()
  await Promise.all([reconnect, teardown])

  assert.equal(harness.supabase.removeAllCalls, 1)
  assert.equal(harness.supabase.channels.length, 1)
  assert.deepEqual(harness.transport.getDiagnostics(), {
    activeChannels: 0,
    activeTimers: 0,
    messageListeners: 1,
  })
})

test('Lens close during CONNECTING cannot leave a newly created channel', async () => {
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

  let closing = null
  transport.onStatus((status) => {
    if (status === 'CONNECTING') closing = transport.close()
  })

  await transport.connect()
  await (closing ?? Promise.resolve())

  assert.equal(supabase.channels.length, 0)
  assert.equal(supabase.removeAllCalls, 1)
  assert.deepEqual(transport.getDiagnostics(), {
    activeChannels: 0,
    activeTimers: 0,
    messageListeners: 0,
  })
})

test('Lens known-peer ready exhaustion reports once and waits for explicit root recovery', async () => {
  const harness = await createHarness()
  harness.channel.emit(ready(1))
  await settle()

  await tick(harness.transport, 1_000)
  await tick(harness.transport, 1_000)
  await settle()

  assert.deepEqual(harness.statuses.slice(2), [{
    status: 'COUNTERPART_TIMED_OUT',
    detail: 'READY_ACK_TIMED_OUT',
  }])
  assert.equal(harness.supabase.removeAllCalls, 0)
  assert.equal(harness.supabase.channels.length, 1)

  await tick(harness.transport, 1_000)
  assert.deepEqual(harness.statuses.slice(2), [{
    status: 'COUNTERPART_TIMED_OUT',
    detail: 'READY_ACK_TIMED_OUT',
  }])

  await explicitlyRecoverFromRoot(harness)
})

test('Lens peer liveness expiry reports once and leaves lifecycle to the root', async () => {
  const harness = await createHarness()
  await bindPeer(harness)

  await tick(harness.transport, 5_999)
  assert.equal(harness.supabase.removeAllCalls, 0)
  assert.equal(harness.supabase.channels.length, 1)

  await tick(harness.transport, 1)
  await settle()
  assert.deepEqual(harness.statuses.slice(2), [{
    status: 'COUNTERPART_TIMED_OUT',
    detail: 'GUESSER_SILENT',
  }])
  assert.equal(harness.supabase.removeAllCalls, 0)
  assert.equal(harness.supabase.channels.length, 1)

  await tick(harness.transport, 6_000)
  assert.deepEqual(harness.statuses.slice(2), [{
    status: 'COUNTERPART_TIMED_OUT',
    detail: 'GUESSER_SILENT',
  }])

  await explicitlyRecoverFromRoot(harness)
})

test('Lens ambiguous application send reports once, halts FIFO, and waits for the root', async () => {
  const harness = await createHarness()
  harness.channel.sendBehavior = (broadcast) => broadcast.payload.type ===
    'stroke.begin' ? Promise.resolve('timed out') : Promise.resolve('ok')

  const failed = harness.transport.send({
    type: 'stroke.begin', roundId: 'round-1',
    payload: { strokeId: 'stroke-1', colorId: 'violet' },
  })
  const queued = harness.transport.send({
    type: 'stroke.end', roundId: 'round-1', payload: { strokeId: 'stroke-1' },
  })
  const queuedOutcome = queued.catch((error) => error)

  await assert.rejects(failed, /ambiguous channel send/)
  assert.ok(await queuedOutcome instanceof Error)
  await settle()

  assert.deepEqual(harness.statuses.slice(2), [{
    status: 'CHANNEL_ERROR',
    detail: 'SEND_FAILED',
  }])
  assert.equal(harness.supabase.removeAllCalls, 0)
  assert.equal(harness.supabase.channels.length, 1)
  assert.equal(messagesOfType(harness.channel, 'stroke.end').length, 0)

  await explicitlyRecoverFromRoot(harness)
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

test('Lens exposes every accepted same-tuple ready after queuing its private ack', async () => {
  const harness = await createHarness()
  await bindPeer(harness)
  assert.deepEqual(harness.controls, [{
    type: 'PEER_READY',
    senderId: 'guesser-a',
    connectionId: 'BROW0001',
  }])

  harness.controls.length = 0
  const receivedCount = harness.received.length
  const wireStart = harness.channel.sent.length
  let rootSend = null
  const unsubscribe = harness.transport.onControl((event) => {
    if (event.type !== 'PEER_READY') return
    rootSend = harness.transport.send({
      type: 'stroke.begin',
      roundId: 'round-1',
      payload: { strokeId: 'stroke-after-ready', colorId: 'violet' },
    })
  })

  harness.channel.emit(ready(3))
  await settle()
  assert.ok(rootSend)
  await rootSend
  unsubscribe()

  assert.deepEqual(harness.controls, [{
    type: 'PEER_READY',
    senderId: 'guesser-a',
    connectionId: 'BROW0001',
  }])
  assert.equal(harness.received.length, receivedCount)
  assert.deepEqual(
    harness.channel.sent.slice(wireStart).map(({ payload }) => payload.type),
    ['presence.ack', 'stroke.begin'],
  )
})

test('Lens emits a ready-introduced peer transition before private presence work and ready fact', async () => {
  const harness = await createHarness()
  await bindPeer(harness)
  harness.controls.length = 0
  const receivedCount = harness.received.length
  const wireStart = harness.channel.sent.length
  const controlOrder = []
  let rootSend = null
  const unsubscribe = harness.transport.onControl((event) => {
    controlOrder.push(event.type)
    if (event.type !== 'PEER_READY') return
    rootSend = harness.transport.send({
      type: 'stroke.begin',
      roundId: 'round-1',
      payload: { strokeId: 'stroke-after-transition-ready', colorId: 'violet' },
    })
  })

  harness.channel.emit(ready(3, 'BROW0002'))
  await settle()
  assert.ok(rootSend)
  await rootSend
  unsubscribe()

  assert.deepEqual(controlOrder, ['PEER_REJOINED', 'PEER_READY'])
  assert.deepEqual(harness.controls, [
    {
      type: 'PEER_REJOINED',
      senderId: 'guesser-a',
      previousConnectionId: 'BROW0001',
      nextConnectionId: 'BROW0002',
    },
    {
      type: 'PEER_READY',
      senderId: 'guesser-a',
      connectionId: 'BROW0002',
    },
  ])
  assert.equal(harness.received.length, receivedCount)
  assert.deepEqual(
    harness.channel.sent.slice(wireStart).map(({ payload }) => payload.type),
    ['presence.ack', 'presence.ready', 'stroke.begin'],
  )
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
    payload: { strokeId: 'stroke-1', colorId: 'violet' },
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
    type: 'stroke.begin', roundId: 'round-1',
    payload: { strokeId: 'stroke-1', colorId: 'violet' },
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

test('Lens assigned session ID drives the topic and locks at policy creation', async () => {
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

  assert.throws(() => transport.assignSessionId('bad'), /invalid session ID/)
  assert.throws(() => transport.assignSessionId('abc123'), /invalid session ID/)
  assert.throws(() => transport.assignSessionId(''), /invalid session ID/)
  transport.assignSessionId('AB23CD')
  assert.equal(transport.getEffectiveSessionId(), 'AB23CD')

  await transport.connect()
  const channel = supabase.channels[0]
  channel.emitStatus('SUBSCRIBED')
  await settle()

  assert.deepEqual(supabase.topics, ['wordless-relay:AB23CD'])
  const readyMessage = messagesOfType(channel, 'presence.ready')[0]
  assert.equal(readyMessage.sessionId, 'AB23CD')

  assert.throws(
    () => transport.assignSessionId('CD23AB'),
    /session ID cannot change during a relay instance/,
  )
  assert.throws(
    () => transport.assignSessionId('AB23CD'),
    /session ID cannot change during a relay instance/,
  )
  assert.equal(transport.getEffectiveSessionId(), 'AB23CD')

  await transport.close()
  assert.throws(
    () => transport.assignSessionId('CD23AB'),
    /session ID cannot change during a relay instance/,
  )
  await transport.connect()
  assert.equal(supabase.topics.length, 2)
  assert.equal(supabase.topics[1], 'wordless-relay:AB23CD')
})
