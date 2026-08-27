import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import ts from 'typescript'

async function loadWordlessApp() {
  const fileUrl = new URL(
    '../../Assets/Wordless/Scripts/WordlessApp.ts',
    import.meta.url,
  )
  const source = await readFile(fileUrl, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      experimentalDecorators: true,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2021,
      useDefineForClassFields: false,
    },
    fileName: fileUrl.pathname,
  })

  let executableSource = output.outputText
  for (const relativeImport of [
    './Core/Protocol',
    './Core/RecoveryCoordinator',
    './Core/RoundStore',
    './Core/StrokeGeometry',
    './Core/WordDeck',
    './Core/WordlessEngine',
  ]) {
    const targetUrl = new URL(`${relativeImport}.ts`, fileUrl).href
    executableSource = executableSource
      .replaceAll(`'${relativeImport}'`, JSON.stringify(targetUrl))
      .replaceAll(`"${relativeImport}"`, JSON.stringify(targetUrl))
  }

  globalThis.component = (constructor) => constructor
  globalThis.input = () => undefined
  globalThis.getTime = () => 0
  globalThis.print = () => undefined
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

  return import(
    `data:text/javascript;base64,${Buffer.from(executableSource).toString('base64')}`
  )
}

const {
  WordlessApp,
  WordlessAppController,
  createInstanceNonce,
  mapEngineEffectToDraft,
} = await loadWordlessApp()
const { SupabaseRelayTransport } = await import(
  '../../Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts'
)

const ROUND_ONE = 'r-APP00001-1'
const ROUND_TWO = 'r-APP00001-2'
const ROUND_THREE = 'r-APP00001-3'
const LOCAL_CONNECTION = 'LENS0001'
const NEXT_LOCAL_CONNECTION = 'LENS0002'
const PEER_CONNECTION = 'BROW0001'
const NEXT_PEER_CONNECTION = 'BROW0002'
const PEER_SENDER = 'guesser-a'

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

async function settle() {
  for (let turn = 0; turn < 32; turn += 1) await Promise.resolve()
}

class FakeRelay {
  constructor() {
    this.messageListeners = []
    this.statusListeners = []
    this.controlListeners = []
    this.sent = []
    this.localRounds = []
    this.completedResyncs = []
    this.invalidations = 0
    this.connectCalls = 0
    this.closeCalls = 0
    this.confirmedPeerConnectionId = null
    this.closeDeferred = null
    this.sendDeferreds = []
    this.diagnostics = {
      activeChannels: 1,
      activeTimers: 2,
      messageListeners: 1,
    }
  }

  async connect() {
    this.connectCalls += 1
  }

  close() {
    this.closeCalls += 1
    this.emitStatus('DISCONNECTED', 'CLOSING')
    if (this.closeDeferred !== null) return this.closeDeferred.promise
    this.emitStatus('CLOSED', 'CLOSED')
    return Promise.resolve()
  }

  send(draft) {
    this.sent.push(clone(draft))
    const nextDeferred = this.sendDeferreds.shift()
    return nextDeferred ? nextDeferred.promise : Promise.resolve()
  }

  invalidateApplicationGeneration() {
    this.invalidations += 1
  }

  onMessage(listener) {
    this.messageListeners.push(listener)
    return () => {
      const index = this.messageListeners.indexOf(listener)
      if (index >= 0) this.messageListeners.splice(index, 1)
    }
  }

  onStatus(listener) {
    this.statusListeners.push(listener)
    return () => {
      const index = this.statusListeners.indexOf(listener)
      if (index >= 0) this.statusListeners.splice(index, 1)
    }
  }

  onControl(listener) {
    this.controlListeners.push(listener)
    return () => {
      const index = this.controlListeners.indexOf(listener)
      if (index >= 0) this.controlListeners.splice(index, 1)
    }
  }

  setLocalRound(roundId) {
    this.localRounds.push(roundId)
  }

  completeLocalResync(senderId) {
    this.completedResyncs.push(senderId)
  }

  getConfirmedPeerConnectionId() {
    return this.confirmedPeerConnectionId
  }

  getDiagnostics() {
    return Object.freeze({ ...this.diagnostics })
  }

  emitMessage(message) {
    for (const listener of this.messageListeners.slice()) listener(message)
  }

  emitStatus(status, detail = status) {
    for (const listener of this.statusListeners.slice()) listener(status, detail)
  }

  emitControl(event) {
    for (const listener of this.controlListeners.slice()) listener(event)
  }
}

class ConcreteRealtimeChannel {
  statusListener = null

  on() {
    return this
  }

  subscribe(listener) {
    this.statusListener = listener
    return this
  }

  async send() {
    return 'ok'
  }
}

class ConcreteSupabaseClient {
  channels = []
  removeAllCalls = 0

  channel() {
    const channel = new ConcreteRealtimeChannel()
    this.channels.push(channel)
    return channel
  }

  async removeAllChannels() {
    this.removeAllCalls += 1
    return ['ok']
  }
}

class FakeBrush {
  constructor() {
    this.listener = null
    this.armedRounds = []
    this.disarmCount = 0
    this.diagnostics = {
      acceptedCount: 0,
      maxAbsLocalZ: 0,
      minimumSpacingCm: null,
      endCount: 0,
      capReached: false,
    }
  }

  setListener(listener) {
    this.listener = listener
  }

  armForRound(roundId) {
    this.armedRounds.push(roundId)
  }

  disarm() {
    this.disarmCount += 1
  }

  getStrokeDiagnostics() {
    return this.diagnostics
  }

  begin(strokeId) {
    this.listener?.onStrokeStart(strokeId)
  }

  point(world, normalized) {
    this.listener?.onStrokePoint(world, normalized)
  }

  end(strokeId) {
    this.listener?.onStrokeEnd(strokeId)
  }
}

class FakeRibbon {
  constructor() {
    this.renders = []
    this.payoffStates = []
  }

  render(points) {
    this.renders.push(clone(points))
  }

  setPayoffActive(active) {
    this.payoffStates.push(active)
  }

  getOwnedResourceCounts() {
    return { sceneObjects: 2, materials: 2 }
  }
}

class FakeHud {
  constructor() {
    this.renders = []
  }

  render(snapshot) {
    this.renders.push(snapshot)
  }

  getOwnedResourceCounts() {
    return { sceneObjects: 8, materials: 3 }
  }
}

class FakeGlyph {
  constructor() {
    this.hiddenCount = 0
    this.renders = []
  }

  hide() {
    this.hiddenCount += 1
  }

  render(sourcePoints, glyphPoints, revealedWord) {
    this.renders.push({
      sourcePoints: clone(sourcePoints),
      glyphPoints: clone(glyphPoints),
      revealedWord,
    })
  }

  getOwnedResourceCounts() {
    return { sceneObjects: 4, materials: 2 }
  }
}

class FakeReplay {
  constructor() {
    this.listener = null
    this.availability = []
  }

  setListener(listener) {
    this.listener = listener
  }

  setAvailable(roundId, available) {
    this.availability.push({ roundId, available })
  }

  request(roundId) {
    this.listener?.onReplayRequested(roundId)
  }
}

function message(type, roundId, payload, overrides = {}) {
  return {
    v: 1,
    type,
    sessionId: 'WAVE42',
    roundId,
    senderId: overrides.senderId ?? PEER_SENDER,
    sequence: overrides.sequence ?? 1,
    sentAtMs: overrides.sentAtMs ?? 1_000,
    payload,
  }
}

function presenceAck(overrides = {}) {
  return message('presence.ack', 'lobby', {
    role: 'guesser',
    connectionId: overrides.peerConnectionId ?? PEER_CONNECTION,
    acknowledgedConnectionId:
      overrides.localConnectionId ?? LOCAL_CONNECTION,
  }, overrides)
}

function resetAck(nextRoundId, overrides = {}) {
  return message('round.reset.ack', nextRoundId, { nextRoundId }, overrides)
}

function guess(roundId, guessId, choiceIndex, sequence = 3) {
  return message('guess.submit', roundId, { guessId, choiceIndex }, { sequence })
}

function pointMismatch(roundId, sequence = 20) {
  return message('round.resync.request', roundId, {
    reason: 'POINT_COUNT_MISMATCH',
  }, { sequence })
}

function makeHarness(relay = new FakeRelay()) {
  const brush = new FakeBrush()
  const ribbon = new FakeRibbon()
  const hud = new FakeHud()
  const glyph = new FakeGlyph()
  const replay = new FakeReplay()
  const logs = []
  const clock = { nowMs: 1_000 }
  const app = new WordlessAppController({
    relay,
    brush,
    ribbon,
    hud,
    glyph,
    replay,
    nowMs: () => clock.nowMs,
    createNonce: () => 'APP00001',
    log: (line) => logs.push(line),
  })
  return {
    app,
    relay,
    brush,
    ribbon,
    hud,
    glyph,
    replay,
    logs,
    clock,
  }
}

async function startAndBind(harness) {
  await harness.app.start()
  harness.relay.emitStatus('SUBSCRIBED', 'SUBSCRIBED · TRANSPORT ONLY')
  harness.relay.confirmedPeerConnectionId = PEER_CONNECTION
  harness.relay.emitMessage(presenceAck())
  await settle()
}

async function finishCorrectRound(harness) {
  harness.brush.begin('stroke-1')
  harness.clock.nowMs += 100
  harness.brush.point({ x: 1, y: 2, z: -3 }, [100, 200])
  harness.brush.end('stroke-1')
  harness.clock.nowMs += 1
  harness.relay.emitMessage(guess(ROUND_ONE, 'guess-wrong', 1, 3))
  harness.clock.nowMs += 1
  harness.relay.emitMessage(guess(ROUND_ONE, 'guess-correct', 0, 4))
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'CORRECT')
  harness.clock.nowMs += 450
  harness.app.update()
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'GLYPH_LOCKED')
}

async function finishTimedOutRound(harness) {
  harness.clock.nowMs += 20_000
  harness.app.update()
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'TIMED_OUT')
}

test('maps every engine effect into a versionless authority-safe draft', () => {
  const snapshot = {
    phase: 'ACTIVE',
    roundId: ROUND_ONE,
    promptWord: 'SNAKE',
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
    durationMs: 20_000,
    startedAtMs: 1_000,
    remainingMs: 19_000,
    worldPoints: [],
    publicPoints: [[100, 200]],
    guessedIndices: [],
    lastOutcome: 'none',
    revealedWord: null,
    glyph: [],
    counterpartReady: true,
    strokeComplete: false,
  }
  const meta = { roundId: ROUND_ONE, generation: 7 }
  const cases = [
    [
      { ...meta, type: 'publish-round-start' },
      {
        type: 'round.start',
        roundId: ROUND_ONE,
        payload: {
          choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
          durationMs: 20_000,
          targetConnectionId: PEER_CONNECTION,
        },
      },
    ],
    [
      { ...meta, type: 'publish-stroke-begin', strokeId: 'stroke-1' },
      {
        type: 'stroke.begin',
        roundId: ROUND_ONE,
        payload: { strokeId: 'stroke-1' },
      },
    ],
    [
      {
        ...meta,
        type: 'publish-stroke-points',
        strokeId: 'stroke-1',
        points: [[100, 200]],
      },
      {
        type: 'stroke.points',
        roundId: ROUND_ONE,
        payload: { strokeId: 'stroke-1', points: [[100, 200]] },
      },
    ],
    [
      { ...meta, type: 'publish-stroke-end', strokeId: 'stroke-1' },
      {
        type: 'stroke.end',
        roundId: ROUND_ONE,
        payload: { strokeId: 'stroke-1' },
      },
    ],
    [
      {
        ...meta,
        type: 'publish-result',
        outcome: 'incorrect',
        guessId: 'guess-1',
        choiceIndex: 2,
      },
      {
        type: 'round.result',
        roundId: ROUND_ONE,
        payload: {
          outcome: 'incorrect',
          guessId: 'guess-1',
          choiceIndex: 2,
        },
      },
    ],
    [
      {
        ...meta,
        type: 'publish-result',
        outcome: 'correct',
        guessId: 'guess-2',
        choiceIndex: 0,
        revealedWord: 'SNAKE',
        finalPointCount: 1,
      },
      {
        type: 'round.result',
        roundId: ROUND_ONE,
        payload: {
          outcome: 'correct',
          guessId: 'guess-2',
          choiceIndex: 0,
          revealedWord: 'SNAKE',
          finalPointCount: 1,
        },
      },
    ],
    [
      {
        ...meta,
        type: 'publish-guess-rejected',
        guessId: 'guess-3',
        choiceIndex: 1,
        reason: 'CHOICE_ALREADY_TRIED',
      },
      {
        type: 'guess.rejected',
        roundId: ROUND_ONE,
        payload: {
          guessId: 'guess-3',
          choiceIndex: 1,
          reason: 'CHOICE_ALREADY_TRIED',
        },
      },
    ],
    [
      { ...meta, type: 'publish-timeout', finalPointCount: 1 },
      {
        type: 'round.timeout',
        roundId: ROUND_ONE,
        payload: { finalPointCount: 1 },
      },
    ],
    [
      {
        roundId: ROUND_TWO,
        generation: 8,
        type: 'publish-reset',
        previousRoundId: ROUND_ONE,
        nextRoundId: ROUND_TWO,
      },
      {
        type: 'round.reset',
        roundId: ROUND_ONE,
        payload: {
          nextRoundId: ROUND_TWO,
          targetConnectionId: PEER_CONNECTION,
        },
      },
    ],
  ]

  for (const [effect, want] of cases) {
    assert.deepEqual(
      mapEngineEffectToDraft(effect, snapshot, PEER_CONNECTION),
      want,
      effect.type,
    )
  }
  assert.equal(
    mapEngineEffectToDraft(cases[0][0], snapshot, null),
    null,
  )
  assert.equal(
    mapEngineEffectToDraft(cases.at(-1)[0], snapshot, null),
    null,
  )
})

test('creates a bounded eight-character uppercase runtime nonce', () => {
  assert.equal(createInstanceNonce(() => 0), 'AAAAAAAA')
  assert.equal(createInstanceNonce(() => 0.999999), '99999999')
  assert.match(createInstanceNonce(() => 0.5), /^[A-Z0-9]{8}$/)
  assert.throws(() => createInstanceNonce(() => Number.NaN), /random source/i)
})

test('initializes one local round and starts only on the confirmed ack tuple', async () => {
  const harness = makeHarness()
  await harness.app.start()

  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(harness.app.getSnapshot().roundId, ROUND_ONE)
  assert.equal(harness.app.getSnapshot().promptWord, 'SNAKE')
  assert.deepEqual(harness.relay.localRounds, [ROUND_ONE])
  assert.equal(harness.relay.connectCalls, 1)
  assert.deepEqual(harness.relay.sent, [])
  assert.deepEqual(harness.ribbon.renders.at(-1), [])
  assert.deepEqual(harness.replay.availability.at(-1), {
    roundId: ROUND_ONE,
    available: false,
  })

  harness.relay.emitStatus('SUBSCRIBED', 'SUBSCRIBED · TRANSPORT ONLY')
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(harness.app.getSnapshot().counterpartReady, false)

  harness.relay.confirmedPeerConnectionId = 'OTHER001'
  harness.relay.emitMessage(presenceAck())
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.deepEqual(harness.relay.sent, [])

  harness.relay.confirmedPeerConnectionId = PEER_CONNECTION
  harness.relay.emitMessage(presenceAck({ sequence: 2 }))
  await settle()

  assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
  assert.deepEqual(harness.brush.armedRounds, [ROUND_ONE])
  assert.deepEqual(harness.relay.sent, [{
    type: 'round.start',
    roundId: ROUND_ONE,
    payload: {
      choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
      durationMs: 20_000,
      targetConnectionId: PEER_CONNECTION,
    },
  }])
  assert.equal(
    harness.logs.filter((line) => line === '[Wordless] PHASE READY -> ACTIVE').length,
    1,
  )
})

test('routes brush and guesses through the engine and guards the 450ms glyph lock', async () => {
  const harness = makeHarness()
  await startAndBind(harness)

  harness.brush.begin('stroke-1')
  harness.clock.nowMs += 100
  harness.brush.point({ x: 1, y: 2, z: -3 }, [100, 200])
  harness.brush.end('stroke-1')
  harness.clock.nowMs += 1
  harness.relay.emitMessage(guess(ROUND_ONE, 'guess-wrong', 1, 3))
  harness.clock.nowMs += 1
  harness.relay.emitMessage(guess(ROUND_ONE, 'guess-correct', 0, 4))
  await settle()

  assert.equal(harness.app.getSnapshot().phase, 'CORRECT')
  assert.equal(harness.app.getSnapshot().lastOutcome, 'correct')
  assert.deepEqual(harness.app.getSnapshot().worldPoints, [{ x: 1, y: 2, z: -3 }])
  assert.deepEqual(harness.app.getSnapshot().glyph, [[500, 500]])
  assert.deepEqual(harness.glyph.renders, [{
    sourcePoints: [{ x: 1, y: 2, z: -3 }],
    glyphPoints: [[500, 500]],
    revealedWord: 'SNAKE',
  }])
  assert.equal(harness.ribbon.payoffStates.at(-1), true)
  assert.deepEqual(harness.replay.availability.at(-1), {
    roundId: ROUND_ONE,
    available: false,
  })
  assert.deepEqual(
    harness.relay.sent.map(({ type }) => type),
    [
      'round.start',
      'stroke.begin',
      'stroke.points',
      'stroke.end',
      'round.result',
      'round.result',
    ],
  )
  assert.ok(harness.logs.some((line) =>
    line.startsWith(
      '[Wordless] STROKE worldPoints=1 publicPoints=1 bytes=',
    )))

  harness.replay.request(ROUND_ONE)
  assert.equal(harness.app.getSnapshot().roundId, ROUND_ONE)
  harness.clock.nowMs += 449
  harness.app.update()
  assert.equal(harness.app.getSnapshot().phase, 'CORRECT')
  harness.clock.nowMs += 1
  harness.app.update()

  assert.equal(harness.app.getSnapshot().phase, 'GLYPH_LOCKED')
  assert.deepEqual(harness.glyph.renders, [{
    sourcePoints: [{ x: 1, y: 2, z: -3 }],
    glyphPoints: [[500, 500]],
    revealedWord: 'SNAKE',
  }])
  assert.deepEqual(harness.replay.availability.at(-1), {
    roundId: ROUND_ONE,
    available: true,
  })
  assert.ok(harness.logs.includes(
    '[Wordless] GLYPH_LOCKED points=1 hash=c98cf275',
  ))
})

test('awaits each engine-effect draft before starting the next one', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  const heldBegin = deferred()
  harness.relay.sendDeferreds.push(heldBegin)
  const sentBeforeStroke = harness.relay.sent.length

  harness.brush.begin('stroke-held')
  harness.clock.nowMs += 100
  harness.brush.point({ x: 3, y: 4, z: -5 }, [300, 400])
  harness.brush.end('stroke-held')
  await settle()

  assert.deepEqual(
    harness.relay.sent.slice(sentBeforeStroke).map(({ type }) => type),
    ['stroke.begin'],
  )

  heldBegin.resolve()
  await settle()
  assert.deepEqual(
    harness.relay.sent.slice(sentBeforeStroke).map(({ type }) => type),
    ['stroke.begin', 'stroke.points', 'stroke.end'],
  )
})

test('replay invalidation discards queued drafts from the prior engine generation', async () => {
  const harness = makeHarness()
  await startAndBind(harness)

  harness.brush.begin('stroke-stale')
  await settle()
  harness.clock.nowMs += 50
  harness.brush.point({ x: 2, y: 3, z: -4 }, [200, 300])
  const heldPointBatch = deferred()
  harness.relay.sendDeferreds.push(heldPointBatch)
  const sentBeforeDrain = harness.relay.sent.length

  harness.clock.nowMs += 50
  harness.relay.emitMessage(guess(ROUND_ONE, 'guess-terminal', 0, 50))
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'CORRECT')
  assert.deepEqual(
    harness.relay.sent.slice(sentBeforeDrain).map(({ type }) => type),
    ['stroke.points'],
  )

  harness.clock.nowMs += 450
  harness.app.update()
  harness.replay.request(ROUND_ONE)
  await settle()
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(harness.app.getSnapshot().phase, 'READY')

  heldPointBatch.resolve()
  await settle()

  assert.deepEqual(
    harness.relay.sent.slice(sentBeforeDrain).map(({ type, roundId }) => ({
      type,
      roundId,
    })),
    [
      { type: 'stroke.points', roundId: ROUND_ONE },
      { type: 'round.reset', roundId: ROUND_ONE },
    ],
  )

  harness.relay.emitMessage(resetAck(ROUND_TWO, { sequence: 51 }))
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
  assert.deepEqual(
    harness.relay.sent.slice(sentBeforeDrain).map(({ type, roundId }) => ({
      type,
      roundId,
    })),
    [
      { type: 'stroke.points', roundId: ROUND_ONE },
      { type: 'round.reset', roundId: ROUND_ONE },
      { type: 'round.start', roundId: ROUND_TWO },
    ],
  )
})

test('replay applies one successor and waits for a matching reset ack before start', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  await finishCorrectRound(harness)
  const sentBeforeReplay = harness.relay.sent.length

  harness.replay.request(ROUND_ONE)
  await settle()

  assert.equal(harness.relay.invalidations, 1)
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(harness.app.getSnapshot().remainingMs, 20_000)
  assert.deepEqual(harness.app.getSnapshot().worldPoints, [])
  assert.deepEqual(harness.app.getSnapshot().glyph, [])
  assert.deepEqual(harness.app.getSnapshot().guessedIndices, [])
  assert.deepEqual(harness.relay.localRounds, [ROUND_ONE, ROUND_TWO])
  assert.deepEqual(harness.ribbon.renders.at(-1), [])
  assert.equal(harness.ribbon.payoffStates.at(-1), false)
  assert.deepEqual(harness.relay.sent.slice(sentBeforeReplay), [{
    type: 'round.reset',
    roundId: ROUND_ONE,
    payload: {
      nextRoundId: ROUND_TWO,
      targetConnectionId: PEER_CONNECTION,
    },
  }])

  harness.replay.request(ROUND_ONE)
  harness.relay.emitMessage(resetAck('r-APP00001-99', { sequence: 30 }))
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(harness.relay.sent.length, sentBeforeReplay + 1)

  harness.relay.emitMessage(resetAck(ROUND_TWO, { sequence: 31 }))
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
  assert.equal(harness.relay.sent.at(-1).type, 'round.start')
  assert.equal(harness.relay.sent.at(-1).roundId, ROUND_TWO)
  assert.equal(
    harness.relay.sent.filter(({ type, roundId }) =>
      type === 'round.start' && roundId === ROUND_TWO).length,
    1,
  )
})

test('timeout replay applies one successor through the reset ack barrier', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  await finishTimedOutRound(harness)
  const sentBeforeReplay = harness.relay.sent.length

  assert.deepEqual(harness.replay.availability.at(-1), {
    roundId: ROUND_ONE,
    available: true,
  })
  harness.replay.request(ROUND_ONE)
  await settle()

  assert.equal(harness.relay.invalidations, 1)
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.deepEqual(harness.relay.localRounds, [ROUND_ONE, ROUND_TWO])
  assert.deepEqual(harness.relay.sent.slice(sentBeforeReplay), [{
    type: 'round.reset',
    roundId: ROUND_ONE,
    payload: {
      nextRoundId: ROUND_TWO,
      targetConnectionId: PEER_CONNECTION,
    },
  }])

  harness.replay.request(ROUND_ONE)
  harness.relay.emitMessage(resetAck(ROUND_TWO, { sequence: 60 }))
  await settle()

  assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(
    harness.relay.sent.filter(({ type, roundId }) =>
      type === 'round.start' && roundId === ROUND_TWO).length,
    1,
  )
})

test('coordinator releases an early reset ack only after send settlement', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  await finishCorrectRound(harness)
  const heldReset = deferred()
  harness.relay.sendDeferreds.push(heldReset)

  harness.replay.request(ROUND_ONE)
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    1,
  )

  harness.relay.emitMessage(resetAck(ROUND_TWO, { sequence: 31 }))
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(
    harness.relay.sent.filter(({ type, roundId }) =>
      type === 'round.start' && roundId === ROUND_TWO).length,
    0,
  )

  heldReset.resolve()
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
  assert.equal(
    harness.relay.sent.filter(({ type, roundId }) =>
      type === 'round.start' && roundId === ROUND_TWO).length,
    1,
  )

  harness.clock.nowMs += 1_000
  harness.app.update()
  await settle()
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    1,
  )
  assert.equal(
    harness.relay.sent.filter(({ type, roundId }) =>
      type === 'round.start' && roundId === ROUND_TWO).length,
    1,
  )

  harness.relay.emitMessage(pointMismatch(ROUND_ONE, 32))
  await settle()
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(
    harness.relay.sent.filter(({ type, roundId }) =>
      type === 'round.start' && roundId === ROUND_TWO).length,
    2,
  )
})

test('pending replay resets settle as carryover before one recovery successor starts', async (t) => {
  const scenarios = [
    { recovery: 'ambiguous-send', delivered: false },
    { recovery: 'ambiguous-send', delivered: true },
    { recovery: 'peer-transition', delivered: false },
    { recovery: 'peer-transition', delivered: true },
  ]

  for (const scenario of scenarios) {
    await t.test(
      `${scenario.recovery} delivered=${scenario.delivered}`,
      async () => {
        const harness = makeHarness()
        await startAndBind(harness)
        await finishCorrectRound(harness)
        const firstReset = deferred()
        harness.relay.sendDeferreds.push(firstReset)
        const sentBeforeReplay = harness.relay.sent.length

        harness.replay.request(ROUND_ONE)
        await settle()
        assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
        assert.equal(harness.app.getSnapshot().phase, 'READY')
        assert.deepEqual(
          harness.relay.sent.slice(sentBeforeReplay),
          [{
            type: 'round.reset',
            roundId: ROUND_ONE,
            payload: {
              nextRoundId: ROUND_TWO,
              targetConnectionId: PEER_CONNECTION,
            },
          }],
        )

        if (scenario.recovery === 'ambiguous-send') {
          if (scenario.delivered) {
            harness.relay.emitMessage(resetAck(ROUND_TWO, { sequence: 40 }))
            await settle()
            assert.equal(harness.app.getSnapshot().phase, 'READY')
          }
          firstReset.reject(new Error('ambiguous delivery'))
          await settle()

          assert.equal(harness.relay.closeCalls, 1)
          assert.equal(harness.relay.connectCalls, 2)
          harness.relay.emitStatus('SUBSCRIBED', 'TRANSPORT ONLY')
          assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
          harness.relay.confirmedPeerConnectionId = NEXT_PEER_CONNECTION
          harness.relay.emitMessage(presenceAck({
            peerConnectionId: NEXT_PEER_CONNECTION,
            localConnectionId: NEXT_LOCAL_CONNECTION,
            sequence: 41,
          }))
        }
        else {
          if (scenario.delivered) {
            firstReset.resolve()
            await settle()
          }
          harness.relay.emitControl({
            type: 'PEER_REJOINED',
            senderId: PEER_SENDER,
            previousConnectionId: PEER_CONNECTION,
            nextConnectionId: NEXT_PEER_CONNECTION,
          })
          if (!scenario.delivered) {
            const cancellation = new Error('generation invalidated')
            cancellation.name = 'ApplicationGenerationCancelledError'
            firstReset.reject(cancellation)
            await settle()
          }

          assert.equal(harness.relay.closeCalls, 0)
          assert.equal(harness.relay.connectCalls, 1)
          harness.relay.confirmedPeerConnectionId = NEXT_PEER_CONNECTION
          harness.relay.emitMessage(presenceAck({
            peerConnectionId: NEXT_PEER_CONNECTION,
            localConnectionId: LOCAL_CONNECTION,
            sequence: 41,
          }))
        }
        await settle()

        assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
        assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
        assert.deepEqual(harness.relay.sent.at(-1), {
          type: 'round.reset',
          roundId: ROUND_ONE,
          payload: {
            nextRoundId: ROUND_TWO,
            targetConnectionId: NEXT_PEER_CONNECTION,
          },
        })
        assert.equal(
          harness.relay.sent.filter(({ type, roundId }) =>
            type === 'round.start' && roundId === ROUND_TWO).length,
          0,
        )

        harness.relay.emitMessage(resetAck(ROUND_TWO, {
          peerConnectionId: NEXT_PEER_CONNECTION,
          sequence: 42,
        }))
        await settle()

        assert.equal(harness.app.getSnapshot().phase, 'READY')
        assert.equal(harness.app.getSnapshot().roundId, ROUND_THREE)
        assert.deepEqual(harness.relay.localRounds, [
          ROUND_ONE,
          ROUND_TWO,
          ROUND_THREE,
        ])
        assert.equal(
          harness.relay.sent.filter(({ type, roundId }) =>
            type === 'round.start' && roundId === ROUND_TWO).length,
          0,
        )
        assert.deepEqual(harness.relay.sent.at(-1), {
          type: 'round.reset',
          roundId: ROUND_TWO,
          payload: {
            nextRoundId: ROUND_THREE,
            targetConnectionId: NEXT_PEER_CONNECTION,
          },
        })

        harness.relay.emitMessage(resetAck(ROUND_THREE, {
          peerConnectionId: NEXT_PEER_CONNECTION,
          sequence: 43,
        }))
        await settle()

        assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
        assert.equal(harness.app.getSnapshot().roundId, ROUND_THREE)
        assert.deepEqual(
          harness.relay.sent
            .slice(sentBeforeReplay)
            .filter(({ type }) => type === 'round.start')
            .map(({ roundId, payload }) => ({
              roundId,
              targetConnectionId: payload.targetConnectionId,
            })),
          [{
            roundId: ROUND_THREE,
            targetConnectionId: NEXT_PEER_CONNECTION,
          }],
        )

        harness.relay.emitMessage(resetAck(ROUND_TWO, {
          peerConnectionId: NEXT_PEER_CONNECTION,
          sequence: 44,
        }))
        harness.relay.emitMessage(resetAck(ROUND_THREE, {
          peerConnectionId: NEXT_PEER_CONNECTION,
          sequence: 45,
        }))
        await settle()
        assert.equal(
          harness.relay.sent.filter(({ type, roundId }) =>
            type === 'round.start' && roundId === ROUND_THREE).length,
          1,
        )
      },
    )
  }
})

test('retries the cached reset at one-second intervals and fails closed after three attempts', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  await finishCorrectRound(harness)
  harness.replay.request(ROUND_ONE)
  await settle()

  for (let attempt = 2; attempt <= 3; attempt += 1) {
    harness.clock.nowMs += 1_000
    harness.app.update()
    await settle()
    assert.equal(
      harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
      attempt,
    )
  }
  harness.clock.nowMs += 1_000
  harness.app.update()
  await settle()

  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    3,
  )
  assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
  assert.equal(
    harness.relay.sent.filter(({ type, roundId }) =>
      type === 'round.start' && roundId === ROUND_TWO).length,
    0,
  )
  assert.equal(harness.brush.armedRounds.length, 1)
})

test('stages one local close/connect and teardown cannot resurrect it', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  harness.relay.closeDeferred = deferred()

  harness.relay.emitStatus('CHANNEL_ERROR', 'SEND_FAILED')
  harness.relay.emitStatus('TIMED_OUT', 'OVERLAP')
  await settle()

  assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
  assert.equal(harness.relay.invalidations, 1)
  assert.equal(harness.relay.closeCalls, 1)
  assert.equal(harness.relay.connectCalls, 1)

  harness.relay.closeDeferred.resolve()
  harness.relay.emitStatus('CLOSED', 'CLOSED')
  await settle()
  assert.equal(harness.relay.connectCalls, 2)

  const teardownHarness = makeHarness()
  await startAndBind(teardownHarness)
  teardownHarness.relay.closeDeferred = deferred()
  teardownHarness.relay.emitStatus('COUNTERPART_TIMED_OUT', 'GUESSER_SILENT')
  await settle()
  const destroyPromise = teardownHarness.app.destroy()
  teardownHarness.relay.closeDeferred.resolve()
  teardownHarness.relay.emitStatus('CLOSED', 'CLOSED')
  await destroyPromise
  await settle()
  assert.equal(teardownHarness.relay.connectCalls, 1)
  assert.equal(teardownHarness.relay.messageListeners.length, 0)
  assert.equal(teardownHarness.replay.listener, null)
  assert.equal(teardownHarness.brush.listener, null)
})

test('destroy cancels a concrete relay reconnect awaiting its prior close', async () => {
  const supabase = new ConcreteSupabaseClient()
  globalThis.__wordlessLensCreateClient = () => supabase
  const relay = new SupabaseRelayTransport()
  relay.supabaseProject = {
    url: 'https://example.supabase.co',
    publicToken: 'client-safe-public-key',
  }
  relay.sessionId = 'WAVE42'
  relay.connectOnStart = false
  relay.onAwake()

  const harness = makeHarness(relay)
  await harness.app.start()
  assert.equal(supabase.channels.length, 1)

  await relay.close()
  const reconnect = relay.connect()
  const destroy = harness.app.destroy()
  await Promise.all([reconnect, destroy])
  await settle()

  assert.equal(supabase.channels.length, 1)
  assert.deepEqual(relay.getDiagnostics(), {
    activeChannels: 0,
    activeTimers: 0,
    messageListeners: 0,
  })
  assert.equal(harness.replay.listener, null)
  assert.equal(harness.brush.listener, null)
})

test('failure statuses share one staged close/connect and subscription is transport-only', async (t) => {
  const failures = [
    { status: 'COUNTERPART_TIMED_OUT', detail: 'GUESSER_SILENT' },
    { status: 'CHANNEL_ERROR', detail: 'SEND_FAILED' },
    { status: 'TIMED_OUT', detail: 'READY_ACK_TIMED_OUT' },
    { status: 'CLOSED', detail: 'UNEXPECTED_CLOSE' },
    { status: 'DISCONNECTED', detail: 'UNEXPECTED_DISCONNECT' },
  ]

  for (const failure of failures) {
    await t.test(failure.status, async () => {
      const harness = makeHarness()
      await startAndBind(harness)
      const heldClose = deferred()
      harness.relay.closeDeferred = heldClose
      const sentBeforeFailure = harness.relay.sent.length

      harness.relay.emitStatus(failure.status, failure.detail)
      await settle()

      assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
      assert.equal(harness.app.getSnapshot().counterpartReady, false)
      assert.equal(harness.relay.invalidations, 1)
      assert.equal(harness.relay.closeCalls, 1)
      assert.equal(harness.relay.connectCalls, 1)
      assert.equal(harness.relay.sent.length, sentBeforeFailure)

      harness.relay.emitStatus(failure.status, 'OVERLAP')
      harness.relay.emitStatus('CHANNEL_ERROR', 'OVERLAP')
      await settle()

      assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
      assert.equal(harness.app.getSnapshot().counterpartReady, false)
      assert.equal(harness.relay.invalidations, 1)
      assert.equal(harness.relay.closeCalls, 1)
      assert.equal(harness.relay.connectCalls, 1)
      assert.equal(harness.relay.sent.length, sentBeforeFailure)

      harness.relay.emitStatus('DISCONNECTED', 'CLOSING')
      harness.relay.emitStatus('CLOSED', 'CLOSED')
      harness.relay.emitStatus('SUBSCRIBED', 'PREMATURE_SUBSCRIPTION')
      await settle()
      assert.equal(harness.relay.closeCalls, 1)
      assert.equal(harness.relay.connectCalls, 1)
      assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')

      heldClose.resolve()
      await settle()
      assert.equal(harness.relay.closeCalls, 1)
      assert.equal(harness.relay.connectCalls, 2)

      harness.relay.emitStatus('CONNECTING', 'CONNECTING')
      harness.relay.emitStatus('SUBSCRIBED', 'SUBSCRIBED · TRANSPORT ONLY')
      harness.relay.emitStatus('SUBSCRIBED', 'DUPLICATE_SUBSCRIPTION')
      await settle()

      assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
      assert.equal(harness.app.getSnapshot().counterpartReady, false)
      assert.equal(harness.relay.invalidations, 1)
      assert.equal(harness.relay.closeCalls, 1)
      assert.equal(harness.relay.connectCalls, 2)
      assert.equal(harness.relay.sent.length, sentBeforeFailure)
    })
  }
})

test('peer transitions stay on the healthy channel and recover through reset ack', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  harness.relay.emitControl({
    type: 'PEER_REJOINED',
    senderId: PEER_SENDER,
    previousConnectionId: PEER_CONNECTION,
    nextConnectionId: 'BROW0002',
  })

  assert.equal(harness.app.getSnapshot().phase, 'DISCONNECTED')
  assert.equal(harness.relay.closeCalls, 0)
  assert.equal(harness.relay.connectCalls, 1)
  assert.equal(harness.relay.invalidations, 1)

  harness.relay.confirmedPeerConnectionId = 'BROW0002'
  harness.relay.emitMessage(presenceAck({
    peerConnectionId: 'BROW0002',
    sequence: 10,
  }))
  await settle()

  assert.equal(harness.relay.invalidations, 1)
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(harness.app.getSnapshot().phase, 'READY')
  assert.equal(harness.relay.sent.at(-1).type, 'round.reset')
  assert.equal(
    harness.relay.sent.at(-1).payload.targetConnectionId,
    'BROW0002',
  )
  assert.equal(harness.relay.closeCalls, 0)

  harness.relay.emitMessage(resetAck(ROUND_TWO, {
    peerConnectionId: 'BROW0002',
    sequence: 11,
  }))
  await settle()
  assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
  assert.equal(harness.relay.sent.at(-1).type, 'round.start')
  assert.equal(
    harness.relay.sent.at(-1).payload.targetConnectionId,
    'BROW0002',
  )
})

test('an exact same-tuple ready resends only the cached pending reset', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  await finishCorrectRound(harness)
  harness.replay.request(ROUND_ONE)
  await settle()
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    1,
  )

  harness.relay.emitControl({
    type: 'PEER_READY',
    senderId: PEER_SENDER,
    connectionId: 'BROW0009',
  })
  await settle()
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    1,
  )

  harness.relay.emitControl({
    type: 'PEER_READY',
    senderId: PEER_SENDER,
    connectionId: PEER_CONNECTION,
  })
  await settle()
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    2,
  )
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(harness.app.getSnapshot().phase, 'READY')
})

test('sequence gaps reset once and complete policy resync only after the reset send settles', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  const pendingSend = deferred()
  harness.relay.sendDeferreds.push(pendingSend)

  harness.relay.emitControl({
    type: 'SEQUENCE_GAP',
    senderId: PEER_SENDER,
    observedSequence: 19,
  })
  await settle()

  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(harness.relay.invalidations, 1)
  assert.deepEqual(harness.relay.completedResyncs, [])
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    1,
  )

  pendingSend.resolve()
  await settle()
  assert.deepEqual(harness.relay.completedResyncs, [PEER_SENDER])

  harness.relay.emitControl({
    type: 'SEQUENCE_GAP',
    senderId: PEER_SENDER,
    observedSequence: 20,
  })
  await settle()
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    2,
  )
})

test('a generation-cancelled reset releases the cached sequence-gap resend', async () => {
  const harness = makeHarness()
  await startAndBind(harness)
  await finishCorrectRound(harness)
  const cancelledSend = deferred()
  harness.relay.sendDeferreds.push(cancelledSend)
  harness.replay.request(ROUND_ONE)
  await settle()

  harness.relay.emitControl({
    type: 'SEQUENCE_GAP',
    senderId: PEER_SENDER,
    observedSequence: 40,
  })
  const cancellation = new Error('cancelled')
  cancellation.name = 'ApplicationGenerationCancelledError'
  cancelledSend.reject(cancellation)
  await settle()

  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    2,
  )
  assert.deepEqual(harness.relay.completedResyncs, [PEER_SENDER])
})

test('point-count mismatch is terminal/current-only and pending requests only resend', async () => {
  const harness = makeHarness()
  await startAndBind(harness)

  harness.relay.emitMessage(pointMismatch(ROUND_ONE))
  assert.equal(harness.app.getSnapshot().roundId, ROUND_ONE)

  await finishCorrectRound(harness)
  harness.relay.emitMessage(pointMismatch('r-UNKNOWN1-8', 21))
  assert.equal(harness.app.getSnapshot().roundId, ROUND_ONE)

  harness.relay.emitMessage(pointMismatch(ROUND_ONE, 22))
  await settle()
  assert.equal(harness.relay.invalidations, 1)
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    1,
  )

  harness.relay.emitMessage(pointMismatch(ROUND_ONE, 23))
  await settle()
  assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
  assert.equal(
    harness.relay.sent.filter(({ type }) => type === 'round.reset').length,
    2,
  )
})

test('each current terminal phase recovers one point-count mismatch through reset ack', async (t) => {
  for (const terminalPhase of ['CORRECT', 'GLYPH_LOCKED', 'TIMED_OUT']) {
    await t.test(terminalPhase, async () => {
      const harness = makeHarness()
      await startAndBind(harness)

      if (terminalPhase === 'TIMED_OUT') {
        await finishTimedOutRound(harness)
      }
      else {
        harness.brush.begin('stroke-terminal')
        harness.clock.nowMs += 100
        harness.brush.point({ x: 4, y: 5, z: -6 }, [400, 500])
        harness.brush.end('stroke-terminal')
        harness.relay.emitMessage(guess(
          ROUND_ONE,
          `guess-${terminalPhase.toLowerCase()}`,
          0,
          61,
        ))
        await settle()
        assert.equal(harness.app.getSnapshot().phase, 'CORRECT')
        if (terminalPhase === 'GLYPH_LOCKED') {
          harness.clock.nowMs += 450
          harness.app.update()
          await settle()
        }
      }
      assert.equal(harness.app.getSnapshot().phase, terminalPhase)
      const sentBeforeMismatch = harness.relay.sent.length

      harness.relay.emitMessage(pointMismatch(ROUND_ONE, 62))
      await settle()

      assert.equal(harness.relay.invalidations, 1)
      assert.equal(harness.app.getSnapshot().phase, 'READY')
      assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
      assert.deepEqual(harness.relay.localRounds, [ROUND_ONE, ROUND_TWO])
      assert.deepEqual(harness.relay.sent.slice(sentBeforeMismatch), [{
        type: 'round.reset',
        roundId: ROUND_ONE,
        payload: {
          nextRoundId: ROUND_TWO,
          targetConnectionId: PEER_CONNECTION,
        },
      }])
      assert.equal(
        harness.relay.sent.filter(({ type, roundId }) =>
          type === 'round.start' && roundId === ROUND_TWO).length,
        0,
      )

      harness.relay.emitMessage(resetAck(ROUND_TWO, { sequence: 63 }))
      await settle()
      assert.equal(harness.app.getSnapshot().phase, 'ACTIVE')
      assert.equal(
        harness.relay.sent.filter(({ type, roundId }) =>
          type === 'round.start' && roundId === ROUND_TWO).length,
        1,
      )

      harness.relay.emitMessage(pointMismatch(ROUND_TWO, 64))
      await settle()
      assert.equal(harness.app.getSnapshot().roundId, ROUND_TWO)
      assert.deepEqual(harness.relay.localRounds, [ROUND_ONE, ROUND_TWO])
    })
  }
})

test('diagnostics use stable ownership counters and logs remain secret-safe', async () => {
  const harness = makeHarness()
  await startAndBind(harness)

  assert.equal(
    harness.app.diagnosticSnapshot(),
    '[WordlessDiag] round=r-APP00001-1 listeners=1 timers=2 channels=1 sceneObjects=14 materials=7',
  )
  assert.equal(harness.logs.some((line) =>
    /publicToken|auth|SUPABASE|raw message|SNAKE/.test(line)), false)
})

test('decorated runtime component binds authored dependencies and delegates lifecycle once', async () => {
  const harness = makeHarness()
  const component = new WordlessApp()
  component.relay = harness.relay
  component.brush = harness.brush
  component.ribbon = harness.ribbon
  component.hud = harness.hud
  component.glyph = harness.glyph
  component.replay = harness.replay
  harness.relay.connectOnStart = true
  component.onAwake()

  assert.equal(harness.relay.connectOnStart, false)
  assert.deepEqual([...component.events.keys()], [
    'OnStartEvent',
    'UpdateEvent',
    'OnDestroyEvent',
  ])
  component.events.get('OnStartEvent')()
  await settle()
  assert.equal(harness.relay.connectCalls, 1)
  component.events.get('UpdateEvent')()
  component.events.get('OnDestroyEvent')()
  await settle()
  assert.equal(harness.relay.closeCalls, 1)
})
