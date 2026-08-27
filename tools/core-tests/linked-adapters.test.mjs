import assert from 'node:assert/strict'
import test from 'node:test'

let lensNowMs = 0
globalThis.component = (value) => value
globalThis.input = () => undefined
globalThis.getTime = () => lensNowMs / 1_000
globalThis.print = () => undefined
globalThis.BaseScriptComponent = class BaseScriptComponent {
  constructor() {
    this.events = new Map()
  }

  createEvent(name) {
    return { bind: (callback) => { this.events.set(name, callback) } }
  }
}
globalThis.__wordlessBrowserCreateClient = () => {
  throw new Error('linked tests inject the browser channel factory')
}

const {
  ApplicationGenerationCancelledError: BrowserGenerationCancelledError,
  BrowserRelayClient,
} = await import('../../web/src/relay-client.ts')
const {
  ApplicationGenerationCancelledError: LensGenerationCancelledError,
  SupabaseRelayTransport,
} = await import(
  '../../Assets/Wordless/Scripts/Transport/SupabaseRelayTransport.ts'
)

class ManualClock {
  nowMs = 0
  nextId = 1
  tasks = []
  now = () => this.nowMs

  setTimeout(callback, delayMs) {
    const task = {
      id: this.nextId++,
      atMs: this.nowMs + Math.max(0, delayMs),
      callback,
      cancelled: false,
    }
    this.tasks.push(task)
    return task.id
  }

  clearTimeout(handle) {
    const task = this.tasks.find(({ id }) => id === handle)
    if (task) task.cancelled = true
  }

  async advanceBy(deltaMs) {
    const target = this.nowMs + deltaMs
    while (true) {
      const due = this.tasks
        .filter(({ cancelled, atMs }) => !cancelled && atMs <= target)
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
}

class LinkedChannel {
  subscribed = false
  removed = false
  subscribeCalls = 0
  unsubscribeCalls = 0
  removeCalls = 0
  payloadListener = null
  statusListener = null

  constructor(bus, side, topic) {
    this.bus = bus
    this.side = side
    this.topic = topic
  }

  on(type, filter, callback) {
    assert.equal(type, 'broadcast')
    assert.deepEqual(filter, { event: 'wordless-message' })
    this.payloadListener = callback
    return this
  }

  subscribe(callback) {
    this.subscribeCalls += 1
    this.statusListener = callback
    if (this.bus[`autoSubscribe${this.side}`]) {
      void Promise.resolve().then(() => this.emitStatus('SUBSCRIBED'))
    }
    return this
  }

  async send(broadcast) {
    return this.bus.publish(this, broadcast)
  }

  async unsubscribe() {
    this.unsubscribeCalls += 1
    this.subscribed = false
    return 'ok'
  }

  async remove() {
    this.removeCalls += 1
    this.removed = true
    this.subscribed = false
    if (this.side === 'browser') this.bus.browserRemovalRecords.push(this)
  }

  emitStatus(status) {
    this.subscribed = status === 'SUBSCRIBED'
    this.statusListener?.(status)
  }

  receive(payload) {
    if (this.subscribed && !this.removed) this.payloadListener?.({ payload })
  }
}

class LinkedBus {
  browserChannels = []
  lensChannels = []
  records = []
  rules = []
  held = []
  blockedSides = new Set()
  blockedTypes = new Set()
  browserRemovalRecords = []
  removeAllCalls = 0
  autoSubscribebrowser = false
  autoSubscribelens = false

  browserFactory = (topic) => {
    const channel = new LinkedChannel(this, 'browser', topic)
    this.browserChannels.push(channel)
    return channel
  }

  lensClient = {
    channel: (topic) => {
      const channel = new LinkedChannel(this, 'lens', topic)
      this.lensChannels.push(channel)
      return channel
    },
    removeAllChannels: async () => {
      this.removeAllCalls += 1
      for (const channel of this.lensChannels) {
        channel.subscribed = false
        channel.removed = true
      }
      return ['ok']
    },
  }

  dropOrdinal(side, type, ordinal = 1) {
    const rule = { kind: 'drop', side, type, ordinal, seen: 0, consumed: 0 }
    this.rules.push(rule)
    return rule
  }

  failNext(side, type, result = 'timed out') {
    this.rules.push({ kind: 'fail', side, type, ordinal: 1, seen: 0, result })
  }

  holdNext(side, type, deliverOnRelease) {
    const rule = { kind: 'hold', side, type, ordinal: 1, seen: 0, deliverOnRelease }
    this.rules.push(rule)
    return rule
  }

  release(rule) {
    const held = this.held.find((candidate) => candidate.rule === rule)
    assert.ok(held, `no held ${rule.side} ${rule.type}`)
    if (rule.deliverOnRelease) held.deliver()
    held.resolve('ok')
    this.held.splice(this.held.indexOf(held), 1)
  }

  async publish(channel, broadcast) {
    const message = broadcast.payload
    this.records.push({ side: channel.side, channel, message, atMs: lensNowMs })
    if (this.blockedSides.has(channel.side)) return 'ok'
    if (this.blockedTypes.has(`${channel.side}:${message.type}`)) return 'ok'
    const rule = this.rules.find((candidate) => {
      if (candidate.side !== channel.side || candidate.type !== message.type) return false
      candidate.seen += 1
      return candidate.seen === candidate.ordinal
    })
    const deliver = () => this.deliver(channel.side, message)
    if (rule) rule.consumed += 1
    if (rule?.kind === 'drop') return 'ok'
    if (rule?.kind === 'fail') return rule.result
    if (rule?.kind === 'hold') {
      return new Promise((resolve) => { this.held.push({ rule, deliver, resolve }) })
    }
    deliver()
    return 'ok'
  }

  deliver(side, payload) {
    const targets = side === 'lens' ? this.browserChannels : this.lensChannels
    for (const channel of targets) channel.receive(payload)
  }

  messages(side, type) {
    return this.records
      .filter((record) => record.side === side && record.message.type === type)
      .map(({ message }) => message)
  }
}

class BrowserDelegate {
  dispatched = []
  invalidations = 0
  states = []
  throwNextReset = false

  dispatchAccepted(message) {
    if (message.type === 'round.reset' && this.throwNextReset) {
      this.throwNextReset = false
      throw new Error('reset commit failed')
    }
    this.dispatched.push(message)
  }

  invalidateForReconnect() {
    this.invalidations += 1
  }

  setTransportState(state, detail) {
    this.states.push({ state, detail })
  }
}

class LensRoot {
  currentRoundId = 'round-1'
  nextRoundOrdinal = 2
  gameplayQuarantined = false
  recoveryPending = false
  resetInFlight = false
  initialStartSent = false
  lastResetDraft = null
  controls = []
  statuses = []
  messages = []
  suppressed = []
  sends = []
  errors = []

  constructor(lens, autoStart = true) {
    this.lens = lens
    this.autoStart = autoStart
    lens.setLocalRound(this.currentRoundId)
    lens.onControl((event) => {
      this.controls.push(event)
      lens.invalidateApplicationGeneration()
      this.recoveryPending = true
      if (event.type === 'SEQUENCE_GAP') {
        const reset = this.issueReset()
        if (reset) {
          void reset.then(() => {
            this.resyncTrace?.push(`reset-sent:${event.senderId}`)
            lens.completeLocalResync(event.senderId)
            this.resyncTrace?.push(`resync-complete:${event.senderId}`)
          }).catch(() => undefined)
        }
      }
    })
    lens.onStatus((status, detail) => {
      this.statuses.push({ status, detail })
      if (status === 'COUNTERPART_TIMED_OUT' ||
          (status === 'CONNECTING' && detail !== 'CONNECTING')) {
        this.gameplayQuarantined = true
        this.recoveryPending = true
      }
    })
    lens.onMessage((message) => {
      if (message.type === 'guess.submit' && this.gameplayQuarantined) {
        this.suppressed.push(message)
        return
      }
      this.messages.push(message)
      if (message.type === 'presence.ack') {
        if (this.recoveryPending) this.issueReset()
        else if (this.autoStart && !this.initialStartSent) this.issueStart()
      }
      else if (message.type === 'round.reset.ack') {
        this.resetInFlight = false
        this.recoveryPending = false
        this.issueStart()
        this.gameplayQuarantined = false
      }
    })
  }

  track(promise) {
    this.sends.push(promise)
    void promise.catch((error) => { this.errors.push(error) })
    return promise
  }

  issueStart() {
    const targetConnectionId = this.lens.getConfirmedPeerConnectionId()
    if (!targetConnectionId) return null
    this.initialStartSent = true
    return this.track(this.lens.send({
      type: 'round.start',
      roundId: this.currentRoundId,
      payload: {
        choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
        durationMs: 20_000,
        targetConnectionId,
      },
    }))
  }

  issueReset() {
    if (this.resetInFlight) return null
    const targetConnectionId = this.lens.getConfirmedPeerConnectionId()
    if (!targetConnectionId) return null
    const previousRoundId = this.currentRoundId
    const nextRoundId = `round-${this.nextRoundOrdinal++}`
    this.currentRoundId = nextRoundId
    this.lens.setLocalRound(nextRoundId)
    this.lastResetDraft = {
      type: 'round.reset',
      roundId: previousRoundId,
      payload: { nextRoundId, targetConnectionId },
    }
    this.resetInFlight = true
    return this.track(this.lens.send(this.lastResetDraft))
  }

  retryReset() {
    assert.ok(this.lastResetDraft)
    return this.track(this.lens.send(this.lastResetDraft))
  }
}

async function settle(turns = 30) {
  for (let turn = 0; turn < turns; turn += 1) await Promise.resolve()
}

async function createLinkedHarness({ autoStart = true } = {}) {
  lensNowMs = 0
  const bus = new LinkedBus()
  globalThis.__wordlessLensCreateClient = () => bus.lensClient
  const clock = new ManualClock()
  const delegate = new BrowserDelegate()
  const ids = ['BROW0001', 'BROW0002', 'BROW0003', 'BROW0004']
  const browser = new BrowserRelayClient({
    channelFactory: bus.browserFactory,
    sessionId: 'WAVE42',
    senderId: 'browser-a',
    connectionIdFactory: () => {
      const id = ids.shift()
      if (!id) throw new Error('browser connection IDs exhausted')
      return id
    },
    now: clock.now,
    timers: clock,
    delegate,
  })
  const lens = new SupabaseRelayTransport()
  lens.supabaseProject = {
    url: 'https://example.supabase.co',
    publicToken: 'client-safe-public-key',
  }
  lens.sessionId = 'WAVE42'
  lens.connectOnStart = false
  lens.onAwake()
  const root = new LensRoot(lens, autoStart)
  return { bus, clock, browser, lens, delegate, root }
}

async function subscribeInitial(harness, mode) {
  const { bus, browser, lens } = harness
  if (mode === 'lens-first') {
    await lens.connect()
    bus.lensChannels[0].emitStatus('SUBSCRIBED')
    await settle()
    await browser.connect()
    bus.browserChannels[0].emitStatus('SUBSCRIBED')
  }
  else if (mode === 'browser-first') {
    await browser.connect()
    bus.browserChannels[0].emitStatus('SUBSCRIBED')
    await settle()
    await lens.connect()
    bus.lensChannels[0].emitStatus('SUBSCRIBED')
  }
  else {
    await lens.connect()
    await browser.connect()
    bus.lensChannels[0].emitStatus('SUBSCRIBED')
    bus.browserChannels[0].emitStatus('SUBSCRIBED')
  }
  bus.autoSubscribelens = true
  bus.autoSubscribebrowser = true
  await settle()
}

async function advance(harness, deltaMs) {
  lensNowMs += deltaMs
  await harness.clock.advanceBy(deltaMs)
  harness.lens.events.get('UpdateEvent')?.()
  await settle()
}

async function reachInitialStart(harness) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await settle()
    if (harness.delegate.dispatched.some(({ type }) => type === 'round.start')) return
    await advance(harness, 1_000)
  }
  assert.fail('linked adapters did not reach initial round.start')
}

function browserCurrentConnection(bus) {
  return bus.messages('browser', 'presence.ready').at(-1)?.payload.connectionId
}

test('real adapters complete join orders and lost initial ready in either direction', async (t) => {
  const cases = [
    ['simultaneous', null],
    ['lens-first', null],
    ['browser-first', null],
    ['simultaneous', 'lens'],
    ['simultaneous', 'browser'],
    ['lens-first', 'lens'],
    ['lens-first', 'browser'],
    ['browser-first', 'lens'],
    ['browser-first', 'browser'],
  ]
  for (const [mode, droppedSide] of cases) {
    await t.test(`${mode} drop=${droppedSide ?? 'none'}`, async () => {
      const harness = await createLinkedHarness()
      let droppedReadyRule = null
      if (droppedSide) {
        droppedReadyRule = harness.bus.dropOrdinal(droppedSide, 'presence.ready')
      }
      await subscribeInitial(harness, mode)
      await reachInitialStart(harness)

      const starts = harness.bus.messages('lens', 'round.start')
      assert.equal(starts.length, 1)
      assert.equal(starts[0].payload.targetConnectionId, browserCurrentConnection(harness.bus))
      assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 1)
      assert.deepEqual(harness.root.errors, [])

      const auditedOrderedLoss =
        (mode === 'lens-first' && droppedSide === 'browser') ||
        (mode === 'browser-first' && droppedSide === 'lens')
      if (auditedOrderedLoss) {
        assert.equal(droppedReadyRule?.consumed, 1)
        assert.equal(harness.bus.browserChannels.length, 1)
        assert.equal(harness.bus.lensChannels.length, 1)
        assert.equal(harness.bus.browserChannels[0].subscribeCalls, 1)
        assert.equal(harness.bus.lensChannels[0].subscribeCalls, 1)
        assert.equal(harness.bus.browserChannels[0].unsubscribeCalls, 0)
        assert.equal(harness.bus.browserChannels[0].removeCalls, 0)
        assert.equal(harness.bus.lensChannels[0].unsubscribeCalls, 0)
        assert.equal(harness.bus.lensChannels[0].removeCalls, 0)
        assert.equal(harness.bus.removeAllCalls, 0)
        assert.deepEqual(harness.bus.browserRemovalRecords, [])
        assert.equal(harness.delegate.invalidations, 0)
        assert.deepEqual(harness.root.controls, [])
        assert.equal(
          harness.browser.getConfirmedPeerConnectionId(),
          harness.bus.messages('lens', 'presence.ready').at(-1).payload.connectionId,
        )
        assert.equal(
          harness.lens.getConfirmedPeerConnectionId(),
          browserCurrentConnection(harness.bus),
        )
        const targetAckIndex = harness.bus.records.findIndex(({ side, message }) =>
          side === 'lens' && message.type === 'presence.ack' &&
          message.payload.acknowledgedConnectionId === browserCurrentConnection(harness.bus))
        const startIndex = harness.bus.records.findIndex(({ side, message }) =>
          side === 'lens' && message.type === 'round.start')
        assert.ok(targetAckIndex >= 0 && targetAckIndex < startIndex)
      }
    })
  }
})

test('real adapters recover dropped targeted acks through ready retries without duplicate start', async () => {
  const harness = await createLinkedHarness()
  harness.bus.dropOrdinal('lens', 'presence.ack', 1)
  harness.bus.dropOrdinal('browser', 'presence.ack', 1)
  await subscribeInitial(harness, 'simultaneous')
  await advance(harness, 1_000)
  await reachInitialStart(harness)

  const browserReadies = harness.bus.messages('browser', 'presence.ready')
  const lensReadies = harness.bus.messages('lens', 'presence.ready')
  assert.ok(browserReadies.length >= 2)
  assert.ok(lensReadies.length >= 2)
  assert.equal(new Set(browserReadies.map(({ payload }) => payload.connectionId)).size, 1)
  assert.equal(new Set(lensReadies.map(({ payload }) => payload.connectionId)).size, 1)
  assert.ok(harness.bus.messages('lens', 'presence.ack').filter(({ payload }) =>
    payload.acknowledgedConnectionId === browserReadies[0].payload.connectionId).length >= 2)
  assert.equal(harness.bus.messages('lens', 'round.start').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 1)

  const lensAckCount = harness.bus.messages('lens', 'presence.ack').length
  const browserAckCount = harness.bus.messages('browser', 'presence.ack').length
  await harness.browser.send({
    type: 'presence.ready', roundId: 'lobby',
    payload: { role: 'guesser', connectionId: browserReadies[0].payload.connectionId },
  })
  await settle()
  assert.equal(harness.bus.messages('lens', 'presence.ack').length, lensAckCount + 1)
  assert.equal(harness.bus.messages('browser', 'presence.ack').length, browserAckCount)

  await harness.lens.send({
    type: 'presence.ready', roundId: 'lobby',
    payload: { role: 'painter', connectionId: lensReadies[0].payload.connectionId },
  })
  await settle()
  assert.equal(harness.bus.messages('browser', 'presence.ack').length, browserAckCount + 1)
  assert.equal(harness.bus.messages('lens', 'presence.ack').length, lensAckCount + 1)
  assert.equal(harness.bus.messages('lens', 'round.start').length, 1)
})

test('real current-target initial start bridges a lost fresh ack without duplicate store start', async () => {
  const harness = await createLinkedHarness()
  harness.bus.dropOrdinal('lens', 'presence.ack', 1)
  await subscribeInitial(harness, 'browser-first')
  await settle()

  const firstReady = harness.bus.records.findIndex(
    ({ side, message }) => side === 'lens' && message.type === 'presence.ready')
  const lostAck = harness.bus.records.findIndex(
    ({ side, message }) => side === 'lens' && message.type === 'presence.ack')
  const deliveredStart = harness.bus.records.findIndex(
    ({ side, message }) => side === 'lens' && message.type === 'round.start')
  assert.ok(firstReady >= 0 && firstReady < lostAck && lostAck < deliveredStart)
  assert.equal(
    harness.browser.getConfirmedPeerConnectionId(),
    harness.bus.messages('lens', 'presence.ready')[0].payload.connectionId,
  )
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 1)

  await advance(harness, 1_000)
  await settle()

  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 1)
  assert.equal(harness.bus.messages('lens', 'round.start').length, 1)
})

test('real current-target reset bridges a lost fresh ack without duplicate recovery', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  const deliveredAckCount = harness.delegate.dispatched
    .filter(({ type }) => type === 'presence.ack').length
  const recoveryRecordStart = harness.bus.records.length
  const droppedAck = harness.bus.dropOrdinal('lens', 'presence.ack', 1)

  harness.bus.browserChannels[0].emitStatus('CHANNEL_ERROR')
  await settle()
  const successorConnectionId = browserCurrentConnection(harness.bus)
  const recoveryRecords = harness.bus.records.slice(recoveryRecordStart)
  const authoredAckIndex = recoveryRecords.findIndex(({ side, message }) =>
    side === 'lens' && message.type === 'presence.ack')
  const resetIndex = recoveryRecords.findIndex(({ side, message }) =>
    side === 'lens' && message.type === 'round.reset')
  assert.ok(authoredAckIndex >= 0 && authoredAckIndex < resetIndex)
  assert.equal(
    recoveryRecords[authoredAckIndex].message.payload.acknowledgedConnectionId,
    successorConnectionId,
  )
  assert.equal(droppedAck?.consumed, 1)
  assert.equal(
    harness.delegate.dispatched.filter(({ type }) => type === 'presence.ack').length,
    deliveredAckCount,
  )
  assert.equal(
    harness.browser.getConfirmedPeerConnectionId(),
    harness.bus.messages('lens', 'presence.ready').at(-1).payload.connectionId,
  )
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)

  await advance(harness, 1_000)
  await settle()

  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
  assert.equal(harness.bus.messages('lens', 'round.reset').length, 1)
})

test('real adapters restore after the Lens ready window expires before browser join', async () => {
  const harness = await createLinkedHarness()
  await harness.lens.connect()
  harness.bus.lensChannels[0].emitStatus('SUBSCRIBED')
  harness.bus.autoSubscribelens = true
  await settle()
  const initialLensConnectionId = harness.bus.messages('lens', 'presence.ready')[0]
    .payload.connectionId
  await advance(harness, 1_000)
  await advance(harness, 1_000)
  await advance(harness, 5_000)
  assert.equal(harness.bus.messages('lens', 'presence.ready').length, 3)
  assert.equal(new Set(harness.bus.messages('lens', 'presence.ready')
    .map(({ payload }) => payload.connectionId)).size, 1)
  assert.equal(harness.bus.messages('lens', 'presence.ready')[0]
    .payload.connectionId, initialLensConnectionId)
  assert.equal(harness.bus.removeAllCalls, 0)
  assert.equal(harness.bus.lensChannels.length, 1)
  assert.equal(harness.bus.lensChannels[0].subscribeCalls, 1)
  assert.equal(harness.bus.lensChannels[0].unsubscribeCalls, 0)
  assert.equal(harness.bus.lensChannels[0].removeCalls, 0)

  await harness.browser.connect()
  harness.bus.browserChannels[0].emitStatus('SUBSCRIBED')
  harness.bus.autoSubscribebrowser = true
  await reachInitialStart(harness)

  assert.equal(harness.bus.messages('lens', 'round.start').length, 1)
  assert.equal(harness.bus.browserChannels.length, 1)
  assert.equal(harness.bus.lensChannels.length, 1)
})

test('real browser waits indefinitely when no painter presence was ever observed', async () => {
  const harness = await createLinkedHarness()
  await harness.browser.connect()
  harness.bus.browserChannels[0].emitStatus('SUBSCRIBED')
  harness.bus.autoSubscribebrowser = true
  await settle()
  const initialConnectionId = browserCurrentConnection(harness.bus)

  await advance(harness, 1_000)
  await advance(harness, 1_000)
  await advance(harness, 5_000)

  assert.equal(harness.bus.messages('browser', 'presence.ready').length, 3)
  assert.equal(harness.bus.browserChannels.length, 1)
  assert.equal(harness.bus.browserChannels[0].subscribed, true)
  assert.equal(harness.bus.browserChannels[0].subscribeCalls, 1)
  assert.equal(harness.bus.browserChannels[0].unsubscribeCalls, 0)
  assert.equal(harness.bus.browserChannels[0].removeCalls, 0)
  assert.deepEqual(harness.bus.browserRemovalRecords, [])
  assert.equal(browserCurrentConnection(harness.bus), initialConnectionId)
  assert.equal(harness.browser.getConfirmedPeerConnectionId(), null)
  assert.equal(harness.delegate.invalidations, 0)
  assert.equal(harness.delegate.states.at(-1)?.state, 'waiting')
  assert.equal(harness.bus.messages('browser', 'round.resync.request').length, 0)
  assert.equal(harness.bus.lensChannels.length, 0)
})

test('real adapters perform one-sided browser re-subscribe and one authoritative reset/start', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  const healthyLensChannel = harness.bus.lensChannels[0]

  harness.bus.browserChannels[0].emitStatus('CHANNEL_ERROR')
  await settle()

  assert.equal(harness.bus.browserChannels.length, 2)
  assert.equal(harness.bus.lensChannels.length, 1)
  assert.equal(healthyLensChannel.subscribeCalls, 1)
  assert.equal(harness.root.controls.filter(({ type }) => type === 'PEER_REJOINED').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
  assert.equal(harness.bus.messages('lens', 'round.reset').length, 1)
  assert.equal(
    harness.bus.messages('lens', 'round.reset')[0].payload.targetConnectionId,
    'BROW0002',
  )
})

test('real adapters perform one-sided Lens recovery at six-second asymmetric expiry', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  harness.bus.blockedTypes.add('browser:transport.ping')
  harness.bus.blockedTypes.add('browser:transport.ack')

  await advance(harness, 1_999)
  await advance(harness, 1)
  await advance(harness, 2_000)
  await advance(harness, 1_999)
  assert.equal(harness.bus.lensChannels.length, 1)
  assert.equal(harness.bus.browserChannels.length, 1)
  await advance(harness, 1)
  await settle()

  assert.equal(harness.bus.removeAllCalls, 1)
  assert.equal(harness.bus.lensChannels.length, 2)
  assert.equal(harness.bus.browserChannels.length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
})

test('real adapters reject a held old-target start after browser re-subscribe and accept reset', async () => {
  const harness = await createLinkedHarness({ autoStart: false })
  await subscribeInitial(harness, 'simultaneous')
  await advance(harness, 1_000)
  const heldStart = harness.bus.holdNext('lens', 'round.start', true)
  harness.root.issueStart()
  await settle()
  const heldReset = harness.bus.holdNext('lens', 'round.reset', true)

  harness.bus.browserChannels[0].emitStatus('CHANNEL_ERROR')
  await settle()
  assert.equal(browserCurrentConnection(harness.bus), 'BROW0002')
  harness.bus.release(heldStart)
  await settle()
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 0)

  harness.bus.release(heldReset)
  await settle()
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
})

test('real adapters reject stale-target reset/start then recover with a current-target retry', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  harness.root.recoveryPending = true
  const heldStaleReset = harness.bus.holdNext('lens', 'round.reset', true)
  harness.root.issueReset()
  await settle()
  const staleRoundId = harness.root.currentRoundId

  harness.bus.browserChannels[0].emitStatus('CHANNEL_ERROR')
  await settle()
  const successorConnection = browserCurrentConnection(harness.bus)
  assert.equal(successorConnection, 'BROW0002')
  harness.bus.release(heldStaleReset)
  await settle()
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 0)
  assert.equal(harness.bus.messages('browser', 'round.reset.ack').length, 0)

  const currentTargetReset = {
    ...harness.root.lastResetDraft,
    payload: {
      ...harness.root.lastResetDraft.payload,
      targetConnectionId: successorConnection,
    },
  }
  harness.root.lastResetDraft = currentTargetReset
  await harness.lens.send(currentTargetReset)
  await settle()

  const recoveryStart = harness.bus.messages('lens', 'round.start').at(-1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(recoveryStart.roundId, staleRoundId)
  assert.equal(recoveryStart.payload.targetConnectionId, successorConnection)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
})

test('real sequence gap sends reset before named resync completion and resumes the confirmed peer', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  const confirmedBefore = harness.lens.getConfirmedPeerConnectionId()
  harness.root.resyncTrace = []
  const heldResetAck = harness.bus.holdNext('browser', 'round.reset.ack', true)
  harness.bus.dropOrdinal('browser', 'guess.submit', 1)

  await harness.browser.send({
    type: 'guess.submit', roundId: harness.root.currentRoundId,
    payload: { guessId: 'gap-1', choiceIndex: 0 },
  })
  await harness.browser.send({
    type: 'guess.submit', roundId: harness.root.currentRoundId,
    payload: { guessId: 'gap-2', choiceIndex: 1 },
  })
  await settle()

  assert.equal(harness.root.controls.at(-1)?.type, 'SEQUENCE_GAP')
  assert.deepEqual(harness.root.resyncTrace, [
    `reset-sent:${harness.root.controls.at(-1).senderId}`,
    `resync-complete:${harness.root.controls.at(-1).senderId}`,
  ])
  assert.equal(harness.lens.getConfirmedPeerConnectionId(), confirmedBefore)
  assert.equal(harness.bus.held.some(({ rule }) => rule === heldResetAck), true)

  harness.bus.release(heldResetAck)
  await settle()
  assert.equal(harness.lens.getConfirmedPeerConnectionId(), confirmedBefore)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
})

test('real reset retry stays atomic after delegate failure and suppresses next-round gameplay', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  harness.delegate.throwNextReset = true

  harness.bus.browserChannels[0].emitStatus('CHANNEL_ERROR')
  await settle()
  assert.equal(harness.bus.messages('browser', 'round.reset.ack').length, 0)
  await harness.lens.send({
    type: 'stroke.begin',
    roundId: harness.root.currentRoundId,
    payload: { strokeId: 'stale-stroke' },
  })
  await settle()
  assert.equal(harness.delegate.dispatched.some(
    ({ type, payload }) => type === 'stroke.begin' && payload.strokeId === 'stale-stroke',
  ), false)

  await harness.root.retryReset()
  await settle()
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.bus.messages('browser', 'round.reset.ack').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
})

test('real Lens peer transition cancels queued Lens application drafts', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  const held = harness.bus.holdNext('lens', 'stroke.begin', false)
  const started = harness.lens.send({
    type: 'stroke.begin', roundId: harness.root.currentRoundId,
    payload: { strokeId: 'stroke-1' },
  })
  const points = harness.lens.send({
    type: 'stroke.points', roundId: harness.root.currentRoundId,
    payload: { strokeId: 'stroke-1', points: [[10, 20]] },
  })
  const result = harness.lens.send({
    type: 'round.result', roundId: harness.root.currentRoundId,
    payload: {
      outcome: 'correct', guessId: 'guess-1', choiceIndex: 0,
      revealedWord: 'SNAKE', finalPointCount: 1,
    },
  })
  const pointOutcome = points.catch((error) => error)
  const resultOutcome = result.catch((error) => error)
  await settle()
  const startedWire = harness.bus.messages('lens', 'stroke.begin').at(-1)

  harness.bus.browserChannels[0].emitStatus('CHANNEL_ERROR')
  await settle()
  assert.ok(await pointOutcome instanceof LensGenerationCancelledError)
  assert.ok(await resultOutcome instanceof LensGenerationCancelledError)
  harness.bus.release(held)
  await started
  await settle()
  assert.equal(harness.bus.messages('lens', 'stroke.points').length, 0)
  assert.equal(harness.bus.messages('lens', 'round.result').length, 0)
  const firstAfterBarrier = harness.bus.records.find(
    ({ side, message }) => side === 'lens' && message.sequence > startedWire.sequence,
  )?.message
  assert.ok(firstAfterBarrier)
  assert.ok(
    firstAfterBarrier.type === 'presence.ack' ||
    firstAfterBarrier.type === 'presence.ready',
  )
  assert.equal(firstAfterBarrier.sequence, startedWire.sequence + 1)
})

test('real old started payload is suppressed delivered or withheld and reset is next', async (t) => {
  for (const deliverOldPayload of [true, false]) {
    await t.test(`delivered=${deliverOldPayload}`, async () => {
      const harness = await createLinkedHarness()
      await subscribeInitial(harness, 'simultaneous')
      await reachInitialStart(harness)
      const held = harness.bus.holdNext('lens', 'stroke.begin', deliverOldPayload)
      const started = harness.lens.send({
        type: 'stroke.begin', roundId: harness.root.currentRoundId,
        payload: { strokeId: 'old-stroke' },
      })
      const queuedPoints = harness.lens.send({
        type: 'stroke.points', roundId: harness.root.currentRoundId,
        payload: { strokeId: 'old-stroke', points: [[10, 20]] },
      })
      const queuedResult = harness.lens.send({
        type: 'round.result', roundId: harness.root.currentRoundId,
        payload: {
          outcome: 'correct', guessId: 'guess-old', choiceIndex: 0,
          revealedWord: 'SNAKE', finalPointCount: 1,
        },
      })
      const pointOutcome = queuedPoints.catch((error) => error)
      const resultOutcome = queuedResult.catch((error) => error)
      await settle()

      harness.bus.browserChannels[0].emitStatus('CHANNEL_ERROR')
      await settle()
      assert.ok(await pointOutcome instanceof LensGenerationCancelledError)
      assert.ok(await resultOutcome instanceof LensGenerationCancelledError)
      harness.bus.release(held)
      await started
      await settle()

      const postInitialProducts = harness.delegate.dispatched
        .filter(({ type }) => type !== 'presence.ack' && type !== 'round.start')
      assert.deepEqual(postInitialProducts.map(({ type }) => type), ['round.reset'])
      assert.equal(harness.bus.messages('lens', 'stroke.points').length, 0)
      assert.equal(harness.bus.messages('lens', 'round.result').length, 0)
      assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
    })
  }
})

test('real browser alone recovers after one-way painter silence without invented resync', async () => {
  const harness = await createLinkedHarness()
  await subscribeInitial(harness, 'simultaneous')
  await reachInitialStart(harness)
  const initialInvalidations = harness.delegate.invalidations
  const oldBrowserChannel = harness.bus.browserChannels[0]
  const healthyLensChannel = harness.bus.lensChannels[0]
  harness.bus.blockedSides = new Set(['lens'])

  await advance(harness, 2_000)
  await advance(harness, 2_000)
  await advance(harness, 2_000)
  await settle()
  assert.equal(harness.bus.browserChannels.length, 2)
  assert.equal(oldBrowserChannel.unsubscribeCalls, 1)
  assert.equal(oldBrowserChannel.removeCalls, 1)
  assert.deepEqual(harness.bus.browserRemovalRecords, [oldBrowserChannel])
  assert.equal(harness.bus.browserChannels[1].subscribeCalls, 1)
  assert.equal(harness.bus.browserChannels[1].unsubscribeCalls, 0)
  assert.equal(harness.bus.browserChannels[1].removeCalls, 0)
  assert.equal(harness.bus.lensChannels.length, 1)
  assert.equal(harness.bus.removeAllCalls, 0)
  assert.equal(harness.bus.lensChannels[0].subscribeCalls, 1)
  assert.equal(harness.bus.lensChannels[0].unsubscribeCalls, 0)
  assert.equal(healthyLensChannel.removeCalls, 0)
  assert.equal(harness.delegate.invalidations, initialInvalidations + 1)
  assert.equal(harness.bus.messages('browser', 'round.resync.request').length, 0)
  assert.ok(harness.bus.messages('browser', 'transport.ping').length >= 2)
  assert.deepEqual(
    [...new Set(harness.bus.messages('browser', 'presence.ready')
      .map(({ payload }) => payload.connectionId))],
    ['BROW0001', 'BROW0002'],
  )

  harness.bus.blockedSides.clear()
  await advance(harness, 1_000)
  await settle()
  assert.equal(harness.root.controls.filter(({ type }) => type === 'PEER_REJOINED').length, 1)
  assert.equal(harness.bus.removeAllCalls, 0)
  assert.equal(harness.bus.lensChannels.length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 2)
})

test('real lost initial start recovers by re-subscribe without invented resync', async () => {
  const harness = await createLinkedHarness()
  harness.bus.dropOrdinal('lens', 'round.start', 1)
  await subscribeInitial(harness, 'simultaneous')
  await settle()
  const oldBrowserChannel = harness.bus.browserChannels[0]
  const healthyLensChannel = harness.bus.lensChannels[0]
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 0)

  await harness.lens.send({
    type: 'stroke.begin', roundId: harness.root.currentRoundId,
    payload: { strokeId: 'later-painter-traffic' },
  })
  await settle()

  assert.equal(harness.bus.messages('browser', 'round.resync.request').length, 0)
  assert.equal(harness.bus.browserChannels.length, 2)
  assert.equal(oldBrowserChannel.unsubscribeCalls, 1)
  assert.equal(oldBrowserChannel.removeCalls, 1)
  assert.deepEqual(harness.bus.browserRemovalRecords, [oldBrowserChannel])
  assert.equal(harness.bus.browserChannels[1].subscribeCalls, 1)
  assert.equal(harness.bus.browserChannels[1].unsubscribeCalls, 0)
  assert.equal(harness.bus.browserChannels[1].removeCalls, 0)
  assert.equal(harness.bus.lensChannels.length, 1)
  assert.equal(healthyLensChannel.subscribeCalls, 1)
  assert.equal(healthyLensChannel.unsubscribeCalls, 0)
  assert.equal(healthyLensChannel.removeCalls, 0)
  assert.equal(harness.bus.removeAllCalls, 0)
  assert.equal(harness.root.controls.filter(({ type }) => type === 'PEER_REJOINED').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.reset').length, 1)
  assert.equal(harness.bus.messages('browser', 'round.reset.ack').length, 1)
  assert.equal(harness.delegate.dispatched.filter(({ type }) => type === 'round.start').length, 1)
  assert.equal(harness.bus.messages('lens', 'round.reset').length, 1)
  assert.equal(harness.bus.messages('lens', 'round.start').length, 2)
  assert.equal(
    harness.bus.messages('lens', 'round.reset')[0].payload.targetConnectionId,
    'BROW0002',
  )
})

test('real old browser guess is suppressed delivered or withheld across Lens transition', async (t) => {
  for (const deliverOldPayload of [true, false]) {
    await t.test(`delivered=${deliverOldPayload}`, async () => {
      const harness = await createLinkedHarness()
      await subscribeInitial(harness, 'simultaneous')
      await reachInitialStart(harness)
      const held = harness.bus.holdNext('browser', 'guess.submit', deliverOldPayload)
      const first = harness.browser.send({
        type: 'guess.submit', roundId: harness.root.currentRoundId,
        payload: { guessId: 'guess-1', choiceIndex: 0 },
      })
      const second = harness.browser.send({
        type: 'guess.submit', roundId: harness.root.currentRoundId,
        payload: { guessId: 'guess-2', choiceIndex: 1 },
      })
      const third = harness.browser.send({
        type: 'guess.submit', roundId: harness.root.currentRoundId,
        payload: { guessId: 'guess-3', choiceIndex: 2 },
      })
      const secondOutcome = second.catch((error) => error)
      const thirdOutcome = third.catch((error) => error)
      await settle()
      const startedWire = harness.bus.messages('browser', 'guess.submit')[0]

      await advance(harness, 2_000)
      await advance(harness, 2_000)
      await advance(harness, 2_000)
      assert.ok(await secondOutcome instanceof BrowserGenerationCancelledError)
      assert.ok(await thirdOutcome instanceof BrowserGenerationCancelledError)
      harness.bus.release(held)
      await first
      await settle()

      assert.equal(harness.bus.messages('browser', 'guess.submit').length, 1)
      assert.equal(harness.root.messages.filter(({ type }) => type === 'guess.submit').length, 0)
      assert.equal(
        harness.root.suppressed.filter(({ type }) => type === 'guess.submit').length,
        deliverOldPayload ? 1 : 0,
      )
      const postInitialProducts = harness.delegate.dispatched
        .filter(({ type }) => type !== 'presence.ack' && type !== 'round.start')
      assert.deepEqual(postInitialProducts.map(({ type }) => type), ['round.reset'])

      const afterBarrier = harness.bus.records
        .filter(({ side, message }) =>
          side === 'browser' && message.sequence > startedWire.sequence)
        .map(({ message }) => message)
      assert.ok(afterBarrier.some(({ type }) =>
        type === 'presence.ack' || type === 'presence.ready'))
      assert.ok(afterBarrier.every(({ type }) =>
        type === 'presence.ack' || type === 'presence.ready' ||
        type === 'transport.ping' || type === 'transport.ack' ||
        type === 'round.reset.ack'))
      assert.deepEqual(
        afterBarrier.map(({ sequence }) => sequence),
        afterBarrier.map((_, index) => startedWire.sequence + index + 1),
      )
    })
  }
})

test('real adapters halt ambiguous application sends and recover without FIFO continuation', async () => {
  const browserFailure = await createLinkedHarness()
  await subscribeInitial(browserFailure, 'simultaneous')
  await reachInitialStart(browserFailure)
  browserFailure.bus.failNext('browser', 'guess.submit')
  await assert.rejects(browserFailure.browser.send({
    type: 'guess.submit', roundId: browserFailure.root.currentRoundId,
    payload: { guessId: 'guess-fail', choiceIndex: 0 },
  }))
  await settle()
  assert.equal(browserFailure.bus.browserChannels.length, 2)

  const lensFailure = await createLinkedHarness()
  await subscribeInitial(lensFailure, 'simultaneous')
  await reachInitialStart(lensFailure)
  lensFailure.bus.failNext('lens', 'stroke.begin')
  await assert.rejects(lensFailure.lens.send({
    type: 'stroke.begin', roundId: lensFailure.root.currentRoundId,
    payload: { strokeId: 'stroke-fail' },
  }))
  await settle()
  assert.equal(lensFailure.bus.lensChannels.length, 2)
})
