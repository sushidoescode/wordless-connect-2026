import { describe, expect, it, vi } from 'vitest'
import type {
  ChoiceIndex,
  RelayMessage,
  StrokeColorId,
} from '@wordless/core/Protocol'
import { parseRelayMessage } from '@wordless/core/Protocol'
import { WebRoundStore } from '../src/web-round-store'

const SESSION_ID = 'WAVE42'
const PAINTER_ID = 'painter-1'
const PAINTER_CONNECTION_ID = 'PAIN0001'
const BROWSER_CONNECTION_ID = 'BROW0001'
const CHOICES = ['SNAKE', 'RIVER', 'ROPE', 'WAVE'] as const

type MessageOf<T extends RelayMessage['type']> = Extract<RelayMessage, { type: T }>

function envelope<T extends RelayMessage['type']>(
  type: T,
  roundId: string,
  payload: MessageOf<T>['payload'],
  sequence = 1,
): MessageOf<T> {
  return {
    v: 2,
    type,
    sessionId: SESSION_ID,
    roundId,
    senderId: PAINTER_ID,
    sequence,
    sentAtMs: 1_000,
    payload,
  } as MessageOf<T>
}

function painterReady(sequence = 1): MessageOf<'presence.ready'> {
  return envelope('presence.ready', 'lobby', {
    role: 'painter',
    connectionId: PAINTER_CONNECTION_ID,
  }, sequence)
}

function targetedAck(sequence = 2): MessageOf<'presence.ack'> {
  return envelope('presence.ack', 'lobby', {
    role: 'painter',
    connectionId: PAINTER_CONNECTION_ID,
    acknowledgedConnectionId: BROWSER_CONNECTION_ID,
  }, sequence)
}

function roundStart(roundId = 'round-1', sequence = 3): MessageOf<'round.start'> {
  return envelope('round.start', roundId, {
    choices: CHOICES,
    durationMs: 20_000,
    targetConnectionId: BROWSER_CONNECTION_ID,
  }, sequence)
}

function roundReset(
  previousRoundId = 'round-1',
  nextRoundId = 'round-2',
  sequence = 4,
): MessageOf<'round.reset'> {
  return envelope('round.reset', previousRoundId, {
    nextRoundId,
    targetConnectionId: BROWSER_CONNECTION_ID,
  }, sequence)
}

function begin(
  roundId = 'round-1',
  colorId: StrokeColorId = 'violet',
  sequence = 4,
  strokeId = 'stroke-1',
): MessageOf<'stroke.begin'> {
  const message = parseRelayMessage({
    v: 2,
    type: 'stroke.begin',
    sessionId: SESSION_ID,
    roundId,
    senderId: PAINTER_ID,
    sequence,
    sentAtMs: 1_000,
    payload: { strokeId, colorId },
  })
  if (message?.type !== 'stroke.begin') throw new Error('valid begin fixture rejected')
  return message
}

function points(
  values: readonly (readonly [number, number])[],
  roundId = 'round-1',
  sequence = 4,
): MessageOf<'stroke.points'> {
  return envelope('stroke.points', roundId, {
    strokeId: 'stroke-1',
    points: values,
  }, sequence)
}

function incorrect(
  guessId: string,
  choiceIndex: ChoiceIndex,
  sequence = 5,
): MessageOf<'round.result'> {
  return envelope('round.result', 'round-1', {
    outcome: 'incorrect',
    guessId,
    choiceIndex,
  }, sequence)
}

function correct(
  guessId: string,
  choiceIndex: ChoiceIndex,
  finalPointCount: number,
  sequence = 6,
): MessageOf<'round.result'> {
  return envelope('round.result', 'round-1', {
    outcome: 'correct',
    guessId,
    choiceIndex,
    revealedWord: 'SNAKE',
    finalPointCount,
  }, sequence)
}

function rejected(
  guessId: string,
  choiceIndex: ChoiceIndex,
): MessageOf<'guess.rejected'> {
  return envelope('guess.rejected', 'round-1', {
    guessId,
    choiceIndex,
    reason: 'DUPLICATE_GUESS',
  }, 5)
}

function timeout(finalPointCount: number): MessageOf<'round.timeout'> {
  return envelope('round.timeout', 'round-1', { finalPointCount }, 6)
}

function createStore(ids: string[] = ['guess-1', 'guess-2']) {
  let nowMs = 1_000
  const guessIdFactory = vi.fn(() => ids.shift() ?? 'guess-fallback')
  const store = new WebRoundStore({
    sessionId: SESSION_ID,
    guessIdFactory,
    now: () => nowMs,
  })
  return {
    store,
    guessIdFactory,
    setNow(value: number) { nowMs = value },
  }
}

function colorSnapshot(store: WebRoundStore): WebRoundStore['getSnapshot'] extends () => infer Snapshot
  ? Snapshot & { readonly strokeColorId: StrokeColorId | null }
  : never {
  return store.getSnapshot() as WebRoundStore['getSnapshot'] extends () => infer Snapshot
    ? Snapshot & { readonly strokeColorId: StrokeColorId | null }
    : never
}

function activate(store: WebRoundStore, bindStroke = true): void {
  store.setTransportState('waiting', 'SUBSCRIBED · WAITING FOR PAINTER')
  store.dispatch(targetedAck())
  store.dispatch(roundStart())
  if (bindStroke) store.dispatch(begin())
}

describe('WebRoundStore', () => {
  it('binds points to one current-round begin and never lets a later begin recolor it', () => {
    const { store } = createStore()
    activate(store, false)

    store.dispatch(points([[100, 200]], 'round-1', 4))
    expect(colorSnapshot(store).points).toEqual([])
    expect(colorSnapshot(store).strokeColorId).toBeNull()

    store.dispatch(begin('round-1', 'mint', 5))
    expect(colorSnapshot(store).strokeColorId).toBe('mint')
    store.dispatch(envelope('stroke.points', 'round-1', {
      strokeId: 'other-stroke',
      points: [[100, 200]],
    }, 6))
    expect(colorSnapshot(store).points).toEqual([])
    store.dispatch(points([[100, 200]], 'round-1', 7))
    expect(colorSnapshot(store).points).toEqual([[100, 200]])

    store.dispatch(begin('round-1', 'lemon', 8))
    expect(colorSnapshot(store).strokeColorId).toBe('mint')
  })

  it('clears the public color and private stroke binding for reconnect, reset, and successor start', () => {
    const { store } = createStore()
    activate(store, false)
    store.dispatch(begin('round-1', 'mint', 4))
    store.dispatch(roundReset('round-1', 'round-2', 5))
    expect(colorSnapshot(store).strokeColorId).toBeNull()
    store.dispatch(roundStart('round-2', 6))
    expect(colorSnapshot(store).strokeColorId).toBeNull()
    store.dispatch(points([[100, 200]], 'round-2', 7))
    expect(colorSnapshot(store).points).toEqual([])
    store.dispatch(begin('round-2', 'lemon', 8))
    store.invalidateForReconnect()
    expect(colorSnapshot(store).strokeColorId).toBeNull()
    store.dispatch(roundReset('round-2', 'round-3', 9))
    store.dispatch(roundStart('round-3', 10))
    store.dispatch(points([[300, 400]], 'round-3', 11))
    expect(colorSnapshot(store).points).toEqual([])
    store.dispatch(begin('round-3', 'mint', 12, 'successor-stroke'))
    store.dispatch(envelope('stroke.points', 'round-3', {
      strokeId: 'successor-stroke',
      points: [[300, 400]],
    }, 13))
    expect(colorSnapshot(store).points).toEqual([[300, 400]])
  })

  it('enforces the aggregate point cap by rejecting the whole overflow batch with one resync request', () => {
    const { store } = createStore()
    activate(store)

    const batch = Array.from(
      { length: 8 },
      (_, index) => [index * 10, index * 10] as readonly [number, number],
    )
    for (let batchIndex = 0; batchIndex < 16; batchIndex += 1) {
      expect(store.dispatch(points(batch, 'round-1', 5 + batchIndex))).toEqual([])
    }
    expect(colorSnapshot(store).points).toHaveLength(128)
    expect(colorSnapshot(store).phase).toBe('ACTIVE')

    const intents = store.dispatch(points(batch, 'round-1', 21))
    expect(intents).toEqual([{
      type: 'round.resync.request',
      roundId: 'round-1',
      reason: 'POINT_COUNT_MISMATCH',
    }])

    const recovered = colorSnapshot(store)
    expect(recovered.connection).toBe('reconnecting')
    expect(recovered.phase).toBe('DISCONNECTED')
    expect(recovered.points).toEqual([])
    expect(recovered.strokeColorId).toBeNull()

    expect(store.dispatch(points(batch, 'round-1', 22))).toEqual([])
    expect(store.dispatch(points(batch, 'round-1', 23))).toEqual([])
    expect(colorSnapshot(store).points).toEqual([])
  })

  it('rejects a cap-crossing batch entirely without truncation below the point cap', () => {
    const { store } = createStore()
    activate(store)

    const batch = Array.from(
      { length: 8 },
      (_, index) => [index * 10, index * 10] as readonly [number, number],
    )
    for (let batchIndex = 0; batchIndex < 15; batchIndex += 1) {
      store.dispatch(points(batch, 'round-1', 5 + batchIndex))
    }
    store.dispatch(points(batch.slice(0, 4), 'round-1', 20))
    expect(colorSnapshot(store).points).toHaveLength(124)

    const intents = store.dispatch(points(batch, 'round-1', 21))
    expect(intents).toEqual([{
      type: 'round.resync.request',
      roundId: 'round-1',
      reason: 'POINT_COUNT_MISMATCH',
    }])
    expect(colorSnapshot(store).points).toEqual([])
    expect(colorSnapshot(store).connection).toBe('reconnecting')
  })

  it('leaves the snapshot untouched for malformed begins at the unsafe dispatch boundary', () => {
    const { store } = createStore()
    activate(store, false)
    const before = store.getSnapshot()
    const malformed = {
      ...begin('round-1', 'mint', 4),
      payload: { strokeId: 'stroke-1', colorId: 'coral' },
    }

    store.dispatch(malformed as unknown as RelayMessage)

    expect(store.getSnapshot()).toEqual(before)
  })

  it('does not call the channel subscription CONNECTED by itself', () => {
    const { store } = createStore()

    store.setTransportState('waiting', 'SUBSCRIBED · WAITING FOR PAINTER')

    expect(store.getSnapshot()).toMatchObject({
      connection: 'waiting',
      phase: 'JOINING',
      roundId: '',
    })
  })

  it('maps typed transport states without letting recovery close appear final', () => {
    const { store } = createStore()

    store.setTransportState('joining', 'JOINING')
    expect(store.getSnapshot().connection).toBe('joining')
    store.setTransportState('reconnecting', 'SEQUENCE GAP')
    expect(store.getSnapshot().connection).toBe('reconnecting')
    store.setTransportState('waiting', 'SUBSCRIBED · WAITING FOR PAINTER')
    expect(store.getSnapshot()).toMatchObject({ connection: 'waiting', phase: 'JOINING' })
    store.setTransportState('failed', 'CHANNEL ERROR')
    expect(store.getSnapshot().connection).toBe('failed')
    store.setTransportState('closed', 'CLOSED')
    expect(store.getSnapshot()).toMatchObject({ connection: 'closed', phase: 'JOINING' })
  })

  it('ready binds painter but stays waiting; targeted ack enters READY; authorized start enters ACTIVE', () => {
    const { store } = createStore()
    store.setTransportState('waiting', 'SUBSCRIBED · WAITING FOR PAINTER')

    expect(store.dispatch(painterReady())).toEqual([])
    expect(store.getSnapshot()).toMatchObject({ connection: 'waiting', phase: 'JOINING' })

    store.dispatch(targetedAck())
    expect(store.getSnapshot()).toMatchObject({ connection: 'live', phase: 'READY' })

    store.dispatch(roundStart())
    expect(store.getSnapshot()).toMatchObject({
      connection: 'live',
      phase: 'ACTIVE',
      roundId: 'round-1',
      choices: CHOICES,
      remainingMs: 20_000,
    })
  })

  it('authorized start may move waiting to ACTIVE; a later targeted ack cannot regress it', () => {
    const { store } = createStore()
    store.setTransportState('waiting', 'SUBSCRIBED · WAITING FOR PAINTER')

    store.dispatch(roundStart())
    const active = store.getSnapshot()
    store.dispatch(targetedAck(4))

    expect(active.phase).toBe('ACTIVE')
    expect(store.getSnapshot()).toMatchObject({
      connection: 'live',
      phase: 'ACTIVE',
      roundId: 'round-1',
    })
  })

  it('authorized reset may confirm reconnecting to live READY; a later ack is a no-op', () => {
    const { store } = createStore()
    activate(store)
    store.invalidateForReconnect()

    store.dispatch(roundReset())
    const ready = store.getSnapshot()
    store.dispatch(targetedAck(5))

    expect(ready).toMatchObject({
      connection: 'live',
      phase: 'READY',
      roundId: 'round-2',
      choices: null,
    })
    expect(store.getSnapshot()).toEqual(ready)
  })

  it('ignores a retransmitted current round.start without resetting state', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))
    const generation = store.getSnapshot().roundGeneration

    store.dispatch(roundStart('round-1', 8))

    expect(store.getSnapshot()).toMatchObject({
      roundGeneration: generation,
      points: [[100, 200]],
      phase: 'ACTIVE',
    })
  })

  it('appends already-policy-accepted point batches in dispatch order', () => {
    const { store } = createStore()
    activate(store)

    store.dispatch(points([[100, 200], [300, 400]], 'round-1', 4))
    store.dispatch(points([[500, 600]], 'round-1', 5))

    expect(store.getSnapshot().points).toEqual([
      [100, 200],
      [300, 400],
      [500, 600],
    ])
  })

  it('allows only one in-flight guess and disables the full grid while pending', () => {
    const { store, guessIdFactory } = createStore()
    activate(store)

    expect(store.submitChoice(2, 10_000)).not.toBeNull()
    expect(store.submitChoice(3, 10_001)).toBeNull()
    expect(store.getSnapshot()).toMatchObject({
      pendingChoice: 2,
      pendingGuessId: 'guess-1',
      pendingDeadlineAtMs: 13_000,
    })
    expect(guessIdFactory).toHaveBeenCalledTimes(1)
  })

  it('rejects runtime-invalid choice indexes before generating an ID or mutating state', () => {
    const { store, guessIdFactory } = createStore()
    activate(store)
    const before = store.getSnapshot()

    for (const invalid of [-1, 4, 9, 1.5, Number.NaN]) {
      expect(store.submitChoice(invalid as ChoiceIndex, 10_000)).toBeNull()
      expect(store.getSnapshot()).toEqual(before)
    }
    expect(guessIdFactory).not.toHaveBeenCalled()
  })

  it('returns the exact generated guess ID and round ID used by pending correlation', () => {
    const { store } = createStore(['guess-exact'])
    activate(store)

    const intent = store.submitChoice(1, 2_000)

    expect(intent).toEqual({
      type: 'guess.submit',
      roundId: 'round-1',
      guessId: 'guess-exact',
      choiceIndex: 1,
    })
    expect(store.getSnapshot()).toMatchObject({
      roundId: 'round-1',
      pendingGuessId: 'guess-exact',
      pendingChoice: 1,
    })
  })

  it('keeps an incorrect card coral and the remaining cards active', () => {
    const { store } = createStore()
    activate(store)
    store.submitChoice(1, 2_000)

    store.dispatch(incorrect('guess-1', 1))

    expect(store.getSnapshot()).toMatchObject({
      phase: 'ACTIVE',
      pendingChoice: null,
      pendingGuessId: null,
      wrongChoices: [1],
    })
    expect(store.submitChoice(1, 2_100)).toBeNull()
    expect(store.submitChoice(2, 2_100)).not.toBeNull()
  })

  it('matching rejection clears the single pending guess; other IDs do not', () => {
    const { store } = createStore()
    activate(store)
    store.submitChoice(1, 2_000)

    store.dispatch(rejected('other-guess', 1))
    expect(store.getSnapshot().pendingGuessId).toBe('guess-1')

    store.dispatch(rejected('guess-1', 1))
    expect(store.getSnapshot()).toMatchObject({
      pendingGuessId: null,
      pendingChoice: null,
      phase: 'ACTIVE',
    })
  })

  it('three-second delivery deadline enables retry without inventing outcome', () => {
    const { store } = createStore()
    activate(store)
    store.submitChoice(1, 2_000)

    expect(store.expirePending(4_999)).toBe(false)
    expect(store.expirePending(5_000)).toBe(true)
    expect(store.getSnapshot()).toMatchObject({
      phase: 'ACTIVE',
      pendingGuessId: null,
      pendingChoice: null,
      wrongChoices: [],
      revealedWord: null,
    })
    expect(store.submitChoice(1, 5_001)).not.toBeNull()
  })

  it('late incorrect for an expired guess preserves a newer pending retry', () => {
    const { store } = createStore()
    activate(store)
    store.submitChoice(1, 2_000)
    store.expirePending(5_000)
    store.submitChoice(2, 5_001)

    store.dispatch(incorrect('guess-1', 1))

    expect(store.getSnapshot()).toMatchObject({
      phase: 'ACTIVE',
      wrongChoices: [1],
      pendingChoice: 2,
      pendingGuessId: 'guess-2',
    })
  })

  it('late authoritative correct clears any newer pending retry and ends round', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))
    store.submitChoice(1, 2_000)
    store.expirePending(5_000)
    store.submitChoice(2, 5_001)

    store.dispatch(correct('guess-1', 1, 1))

    expect(store.getSnapshot()).toMatchObject({
      phase: 'CORRECT',
      correctChoice: 1,
      pendingChoice: null,
      pendingGuessId: null,
      revealedWord: 'SNAKE',
    })
  })

  it('locks only the matching correct round generation after 450 ms', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))
    store.dispatch(correct('guess-1', 0, 1))
    const { roundId, roundGeneration } = store.getSnapshot()

    expect(store.lockGlyph(roundId, roundGeneration + 1)).toBe(false)
    expect(store.getSnapshot().phase).toBe('CORRECT')
    expect(store.lockGlyph(roundId, roundGeneration)).toBe(true)
    expect(store.getSnapshot().phase).toBe('GLYPH_LOCKED')
  })

  it('ignores a stale glyph-lock callback after reset or reconnect invalidation', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))
    store.dispatch(correct('guess-1', 0, 1))
    const stale = store.getSnapshot()

    store.dispatch(roundReset('round-1', 'round-2', 7))

    expect(store.lockGlyph(stale.roundId, stale.roundGeneration)).toBe(false)
    expect(store.getSnapshot()).toMatchObject({ phase: 'READY', roundId: 'round-2' })

    store.dispatch(roundStart('round-2', 8))
    store.dispatch(points([[200, 300]], 'round-2', 9))
    store.dispatch(envelope('round.result', 'round-2', {
      outcome: 'correct',
      guessId: 'guess-2',
      choiceIndex: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 1,
    }, 10))
    const reconnectStale = store.getSnapshot()
    store.invalidateForReconnect()

    expect(store.lockGlyph(
      reconnectStale.roundId,
      reconnectStale.roundGeneration,
    )).toBe(false)
    expect(store.getSnapshot().phase).toBe('DISCONNECTED')
  })

  it('authoritative timeout clears pending, disables guesses, and creates no glyph', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))
    store.submitChoice(1, 2_000)

    store.dispatch(timeout(1))

    expect(store.getSnapshot()).toMatchObject({
      phase: 'TIMED_OUT',
      pendingChoice: null,
      pendingGuessId: null,
      finalPointCount: 1,
      glyph: [],
      points: [[100, 200]],
    })
    expect(store.submitChoice(2, 3_000)).toBeNull()
  })

  it('requires exact finalPointCount before deriving the glyph', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200], [900, 600]], 'round-1', 4))

    store.dispatch(correct('guess-1', 0, 2))

    expect(store.getSnapshot()).toMatchObject({
      phase: 'CORRECT',
      correctChoice: 0,
      finalPointCount: 2,
      glyph: [[100, 300], [900, 700]],
    })
  })

  it('count mismatch on correct or timeout requests one resync', () => {
    const correctStore = createStore().store
    activate(correctStore)
    correctStore.dispatch(points([[100, 200]], 'round-1', 4))
    const correctIntents = correctStore.dispatch(correct('guess-1', 0, 2))

    const timeoutStore = createStore().store
    activate(timeoutStore)
    timeoutStore.dispatch(points([[100, 200]], 'round-1', 4))
    const timeoutIntents = timeoutStore.dispatch(timeout(2))

    expect(correctIntents).toHaveLength(1)
    expect(timeoutIntents).toHaveLength(1)
    expect(correctStore.getSnapshot()).toMatchObject({
      connection: 'reconnecting',
      phase: 'DISCONNECTED',
      glyph: [],
      points: [],
    })
    expect(timeoutStore.getSnapshot()).toMatchObject({
      connection: 'reconnecting',
      phase: 'DISCONNECTED',
      glyph: [],
      points: [],
    })
  })

  it('count mismatch uses POINT_COUNT_MISMATCH, not SEQUENCE_GAP', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))

    expect(store.dispatch(correct('guess-1', 0, 2))).toEqual([{
      type: 'round.resync.request',
      roundId: 'round-1',
      reason: 'POINT_COUNT_MISMATCH',
    }])
  })

  it('returns one exact-round POINT_COUNT_MISMATCH resync intent', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))

    const intents = store.dispatch(timeout(3))

    expect(intents).toEqual([{
      type: 'round.resync.request',
      roundId: 'round-1',
      reason: 'POINT_COUNT_MISMATCH',
    }])
    expect(store.dispatch(timeout(3))).toEqual([])
  })

  it('clears an incomplete stroke and requires a new round ID after reconnect', () => {
    const { store } = createStore()
    activate(store)
    store.dispatch(points([[100, 200]], 'round-1', 4))
    const previousGeneration = store.getSnapshot().roundGeneration

    store.invalidateForReconnect()
    store.dispatch(roundStart('round-1', 5))

    expect(store.getSnapshot()).toMatchObject({
      connection: 'reconnecting',
      phase: 'DISCONNECTED',
      roundId: '',
      roundGeneration: previousGeneration + 1,
      choices: null,
      points: [],
    })

    store.dispatch(roundStart('round-2', 6))
    expect(store.getSnapshot()).toMatchObject({
      connection: 'live',
      phase: 'ACTIVE',
      roundId: 'round-2',
      roundGeneration: previousGeneration + 2,
    })
  })
})
