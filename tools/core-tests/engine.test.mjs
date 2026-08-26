import assert from 'node:assert/strict'
import test from 'node:test'

import {
  MAX_STROKE_POINTS,
  POINT_BATCH_INTERVAL_MS,
} from '../../Assets/Wordless/Scripts/Core/Protocol.ts'
import { RoundStore } from '../../Assets/Wordless/Scripts/Core/RoundStore.ts'
import { WordlessEngine } from '../../Assets/Wordless/Scripts/Core/WordlessEngine.ts'
import { WORD_DECK } from '../../Assets/Wordless/Scripts/Core/WordDeck.ts'

const SNAKE = WORD_DECK[0]

function makeHarness() {
  const store = new RoundStore()
  const normalizerInputs = []
  const normalizeGlyph = (points) => {
    normalizerInputs.push(points.map(([x, y]) => [x, y]))
    return points.map(([x, y]) => [x + 1, y + 2])
  }
  const takePointBatch = (points) => ({
    batch: points.slice(0, 8),
    rest: points.slice(8),
  })
  const engine = new WordlessEngine(store, normalizeGlyph, takePointBatch)
  return { engine, normalizerInputs, store }
}

function activate(
  harness,
  { roundId = 'round-a', readyAtMs = 0, durationMs = 20_000 } = {},
) {
  const applyEffects = harness.engine.applyRound(
    roundId,
    SNAKE,
    readyAtMs - 50,
    durationMs,
  )
  const startEffects = harness.engine.setCounterpartReady(true, readyAtMs)
  return { applyEffects, startEffects }
}

function worldPoint(index) {
  return { x: index * 3, y: index * 2, z: -index }
}

function publicPoint(index) {
  return [100 + index, 200 + index]
}

function types(effects) {
  return effects.map((effect) => effect.type)
}

function assertEffectScope(effects, roundId, generation) {
  for (const effect of effects) {
    assert.equal(effect.roundId, roundId)
    assert.equal(effect.generation, generation)
  }
}

function readyState(roundId) {
  return {
    phase: 'READY',
    roundId,
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
    durationMs: 20_000,
    startedAtMs: 0,
    remainingMs: 20_000,
    worldPoints: [],
    publicPoints: [],
    guessedIndices: [],
    lastOutcome: 'none',
    revealedWord: null,
    glyph: [],
    counterpartReady: false,
  }
}

test('throwing store listener cannot abort effects or skip later listeners', () => {
  const harness = makeHarness()
  harness.engine.applyRound('round-a', SNAKE, 0)
  let laterListenerCalls = 0
  harness.store.subscribe(() => {
    throw new Error('view failure')
  })
  harness.store.subscribe(() => {
    laterListenerCalls += 1
  })

  let effects
  assert.doesNotThrow(() => {
    effects = harness.engine.applyRound('round-b', SNAKE, 1)
  })
  assert.deepEqual(types(effects), ['publish-reset'])
  assertEffectScope(effects, 'round-b', 2)
  assert.equal(laterListenerCalls, 1)
  assert.equal(harness.store.getSnapshot().roundId, 'round-b')
})

test('reentrant store replacements notify exact snapshots in FIFO cycles', () => {
  const store = new RoundStore()
  const firstObserved = []
  const secondObserved = []
  const firstCurrent = []
  const secondCurrent = []
  let replaced = false

  store.subscribe((snapshot) => {
    firstObserved.push(snapshot.roundId)
    firstCurrent.push(store.getSnapshot().roundId)
    if (!replaced) {
      replaced = true
      store.replace(readyState('round-inner'))
    }
  })
  store.subscribe((snapshot) => {
    secondObserved.push(snapshot.roundId)
    secondCurrent.push(store.getSnapshot().roundId)
  })

  store.replace(readyState('round-outer'))
  assert.deepEqual(firstObserved, ['round-outer', 'round-inner'])
  assert.deepEqual(secondObserved, ['round-outer', 'round-inner'])
  assert.deepEqual(firstCurrent, ['round-outer', 'round-inner'])
  assert.deepEqual(secondCurrent, ['round-outer', 'round-inner'])
  assert.equal(store.getSnapshot().roundId, 'round-inner')
})

test('non-finite clocks fail closed before every timed command', () => {
  for (const invalidNowMs of [NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    const applyHarness = makeHarness()
    const beforeApply = applyHarness.store.getSnapshot()
    assert.deepEqual(
      applyHarness.engine.applyRound('round-a', SNAKE, invalidNowMs),
      [],
    )
    assert.strictEqual(applyHarness.store.getSnapshot(), beforeApply)
    assert.equal(applyHarness.engine.getRoundGeneration(), 0)

    const readyHarness = makeHarness()
    readyHarness.engine.applyRound('round-a', SNAKE, 0)
    const beforeReady = readyHarness.store.getSnapshot()
    assert.deepEqual(
      readyHarness.engine.setCounterpartReady(true, invalidNowMs),
      [],
    )
    assert.strictEqual(readyHarness.store.getSnapshot(), beforeReady)

    const beginHarness = makeHarness()
    activate(beginHarness)
    const beforeBegin = beginHarness.store.getSnapshot()
    assert.deepEqual(beginHarness.engine.beginStroke('stroke-a', invalidNowMs), [])
    assert.strictEqual(beginHarness.store.getSnapshot(), beforeBegin)

    const pointHarness = makeHarness()
    activate(pointHarness)
    pointHarness.engine.beginStroke('stroke-a', 0)
    const beforePoint = pointHarness.store.getSnapshot()
    assert.deepEqual(
      pointHarness.engine.appendPoint(
        worldPoint(0),
        publicPoint(0),
        invalidNowMs,
      ),
      [],
    )
    assert.strictEqual(pointHarness.store.getSnapshot(), beforePoint)

    const endHarness = makeHarness()
    activate(endHarness)
    endHarness.engine.beginStroke('stroke-a', 0)
    const beforeEnd = endHarness.store.getSnapshot()
    assert.deepEqual(endHarness.engine.endStroke(invalidNowMs), [])
    assert.strictEqual(endHarness.store.getSnapshot(), beforeEnd)

    const guessHarness = makeHarness()
    activate(guessHarness)
    const beforeGuess = guessHarness.store.getSnapshot()
    assert.deepEqual(
      guessHarness.engine.submitGuess('guess-wrong', 1, invalidNowMs),
      [],
    )
    assert.strictEqual(guessHarness.store.getSnapshot(), beforeGuess)

    const tickHarness = makeHarness()
    activate(tickHarness)
    const beforeTick = tickHarness.store.getSnapshot()
    assert.deepEqual(tickHarness.engine.tick(invalidNowMs), [])
    assert.strictEqual(tickHarness.store.getSnapshot(), beforeTick)
  }
})

test('per-round monotonic time rejects reversal without extending or stalling', () => {
  const harness = makeHarness()
  activate(harness, { readyAtMs: 0, durationMs: 1_000 })
  harness.engine.beginStroke('stroke-a', 0)
  for (let index = 0; index < 9; index += 1) {
    harness.engine.appendPoint(worldPoint(index), publicPoint(index), 1)
  }
  const firstBatch = harness.engine.tick(100)
  assert.deepEqual(types(firstBatch), ['publish-stroke-points'])
  assert.equal(firstBatch[0].points.length, 8)
  const beforeReversal = harness.store.getSnapshot()
  assert.equal(beforeReversal.remainingMs, 900)

  assert.deepEqual(harness.engine.beginStroke('reverse-stroke', 50), [])
  assert.deepEqual(
    harness.engine.appendPoint(worldPoint(9), publicPoint(9), 50),
    [],
  )
  assert.deepEqual(harness.engine.endStroke(50), [])
  assert.deepEqual(harness.engine.submitGuess('reverse-guess', 1, 50), [])
  assert.deepEqual(harness.engine.tick(50), [])
  assert.deepEqual(harness.engine.setCounterpartReady(false, 50), [])
  assert.strictEqual(harness.store.getSnapshot(), beforeReversal)

  const secondBatch = harness.engine.tick(200)
  assert.deepEqual(types(secondBatch), ['publish-stroke-points'])
  assert.deepEqual(secondBatch[0].points, [publicPoint(8)])
  assert.equal(harness.store.getSnapshot().remainingMs, 800)
  const acceptedGuess = harness.engine.submitGuess('reverse-guess', 1, 201)
  assert.equal(acceptedGuess[0].outcome, 'incorrect')

  assert.deepEqual(types(harness.engine.applyRound('round-b', SNAKE, 10)), [
    'publish-reset',
  ])
  assert.deepEqual(types(harness.engine.setCounterpartReady(true, 10)), [
    'publish-round-start',
  ])
})

test('stroke point effects are deeply immutable', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  harness.engine.appendPoint(worldPoint(0), publicPoint(0), 1)
  const [effect] = harness.engine.tick(100)

  assert.equal(effect.type, 'publish-stroke-points')
  assert.equal(Object.isFrozen(effect), true)
  assert.equal(Object.isFrozen(effect.points), true)
  assert.equal(Object.isFrozen(effect.points[0]), true)
  assert.throws(() => effect.points.push([999, 999]), TypeError)
  assert.throws(() => {
    effect.points[0][0] = 999
  }, TypeError)
  assert.deepEqual(effect.points, [publicPoint(0)])
  assert.deepEqual(harness.store.getSnapshot().publicPoints, [publicPoint(0)])
})

test('word deck is deeply frozen at runtime', () => {
  assert.equal(Object.isFrozen(WORD_DECK), true)
  for (const card of WORD_DECK) {
    assert.equal(Object.isFrozen(card), true)
    assert.equal(Object.isFrozen(card.choices), true)
  }
  assert.throws(() => WORD_DECK.push(SNAKE), TypeError)
  assert.throws(() => {
    WORD_DECK[0].answer = 'MOON'
  }, TypeError)
  assert.throws(() => {
    WORD_DECK[0].choices[0] = 'MOON'
  }, TypeError)
})

test('applyRound is the only full reset and publishes no secret', () => {
  const harness = makeHarness()
  let secondListenerCalls = 0
  let unsubscribeSecond = () => {}
  harness.store.subscribe(() => unsubscribeSecond())
  unsubscribeSecond = harness.store.subscribe(() => {
    secondListenerCalls += 1
  })

  const { applyEffects, startEffects } = activate(harness)
  const beginEffects = harness.engine.beginStroke('stroke-a', 1)
  const pointEffects = harness.engine.appendPoint(worldPoint(0), publicPoint(0), 2)
  const wrongEffects = harness.engine.submitGuess('guess-wrong', 1, 3)
  const publicEffects = [
    ...applyEffects,
    ...startEffects,
    ...beginEffects,
    ...pointEffects,
    ...wrongEffects,
  ]
  const serialized = JSON.stringify(publicEffects)
  assert.equal(serialized.includes('correctIndex'), false)
  assert.equal(serialized.includes('SNAKE'), false)

  const dirty = harness.store.getSnapshot()
  assert.equal(dirty.phase, 'ACTIVE')
  assert.deepEqual(dirty.worldPoints, [worldPoint(0)])
  assert.deepEqual(dirty.publicPoints, [publicPoint(0)])
  assert.deepEqual(dirty.guessedIndices, [1])
  assert.equal(Object.isFrozen(dirty.worldPoints[0]), true)
  assert.equal(Object.isFrozen(dirty.publicPoints[0]), true)

  const resetEffects = harness.engine.applyRound('round-b', SNAKE, 10)
  const clean = harness.store.getSnapshot()
  assert.equal(clean.phase, 'READY')
  assert.equal(clean.roundId, 'round-b')
  assert.deepEqual(clean.worldPoints, [])
  assert.deepEqual(clean.publicPoints, [])
  assert.deepEqual(clean.guessedIndices, [])
  assert.equal(clean.lastOutcome, 'none')
  assert.equal(clean.revealedWord, null)
  assert.deepEqual(clean.glyph, [])
  assert.equal(clean.counterpartReady, false)
  assert.deepEqual(types(resetEffects), ['publish-reset'])

  assert.equal(Object.isFrozen(clean), true)
  assert.equal(Object.isFrozen(clean.choices), true)
  assert.equal(Object.isFrozen(clean.worldPoints), true)
  assert.equal(Object.isFrozen(clean.publicPoints), true)
  assert.equal(Object.isFrozen(clean.guessedIndices), true)
  assert.equal(Object.isFrozen(clean.glyph), true)
  assert.throws(() => clean.guessedIndices.push(2), TypeError)
  assert.equal(secondListenerCalls, 1)
  assert.equal(harness.store.listenerCountForDiagnostics(), 1)
})

test('initial round emits no reset; replacement emits old-to-new reset', () => {
  const { engine } = makeHarness()

  assert.deepEqual(WORD_DECK, [
    { answer: 'SNAKE', correctIndex: 0, choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'] },
    { answer: 'SUN', correctIndex: 2, choices: ['MOON', 'CLOCK', 'SUN', 'STAR'] },
    { answer: 'HEART', correctIndex: 1, choices: ['APPLE', 'HEART', 'CLOUD', 'FLOWER'] },
    { answer: 'HOUSE', correctIndex: 3, choices: ['BOX', 'MOUNTAIN', 'TENT', 'HOUSE'] },
    { answer: 'FISH', correctIndex: 2, choices: ['BIRD', 'LEAF', 'FISH', 'BOAT'] },
    { answer: 'TREE', correctIndex: 1, choices: ['PERSON', 'TREE', 'FORK', 'CACTUS'] },
    { answer: 'STAR', correctIndex: 3, choices: ['SUN', 'FLOWER', 'KITE', 'STAR'] },
    { answer: 'WAVE', correctIndex: 2, choices: ['SNAKE', 'RIVER', 'WAVE', 'MOUNTAIN'] },
  ])

  assert.deepEqual(engine.applyRound('round-a', SNAKE, 10), [])
  assert.equal(engine.getRoundGeneration(), 1)
  assert.deepEqual(engine.applyRound('round-b', SNAKE, 20), [
    {
      type: 'publish-reset',
      previousRoundId: 'round-a',
      nextRoundId: 'round-b',
      roundId: 'round-b',
      generation: 2,
    },
  ])
})

test('drawing and guesses coexist in ACTIVE', () => {
  const harness = makeHarness()
  activate(harness)

  assert.deepEqual(types(harness.engine.beginStroke('stroke-a', 1)), [
    'publish-stroke-begin',
  ])
  assert.deepEqual(harness.engine.appendPoint(worldPoint(0), publicPoint(0), 2), [])
  const guessEffects = harness.engine.submitGuess('guess-wrong', 1, 3)
  assert.deepEqual(types(guessEffects), ['publish-result'])
  assert.equal(guessEffects[0].outcome, 'incorrect')
  assert.deepEqual(harness.engine.appendPoint(worldPoint(1), publicPoint(1), 4), [])
  assert.equal(harness.store.getSnapshot().phase, 'ACTIVE')
  assert.deepEqual(harness.store.getSnapshot().publicPoints, [
    publicPoint(0),
    publicPoint(1),
  ])
})

test('wrong guess marks only that choice and remains ACTIVE', () => {
  const harness = makeHarness()
  activate(harness)

  const effects = harness.engine.submitGuess('guess-wrong', 2, 10)
  assert.deepEqual(effects, [
    {
      type: 'publish-result',
      outcome: 'incorrect',
      guessId: 'guess-wrong',
      choiceIndex: 2,
      roundId: 'round-a',
      generation: 1,
    },
  ])
  assert.equal(harness.store.getSnapshot().phase, 'ACTIVE')
  assert.equal(harness.store.getSnapshot().lastOutcome, 'incorrect')
  assert.deepEqual(harness.store.getSnapshot().guessedIndices, [2])
  assert.equal(harness.store.getSnapshot().revealedWord, null)
  assert.deepEqual(harness.store.getSnapshot().glyph, [])
})

test('duplicate and already-tried guesses reject once without state mutation', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.submitGuess('guess-one', 1, 10)

  const beforeDuplicate = harness.store.getSnapshot()
  assert.deepEqual(harness.engine.submitGuess('guess-one', 2, 10), [
    {
      type: 'publish-guess-rejected',
      guessId: 'guess-one',
      choiceIndex: 2,
      reason: 'DUPLICATE_GUESS',
      roundId: 'round-a',
      generation: 1,
    },
  ])
  assert.strictEqual(harness.store.getSnapshot(), beforeDuplicate)

  const beforeTried = harness.store.getSnapshot()
  assert.deepEqual(harness.engine.submitGuess('guess-two', 1, 10), [
    {
      type: 'publish-guess-rejected',
      guessId: 'guess-two',
      choiceIndex: 1,
      reason: 'CHOICE_ALREADY_TRIED',
      roundId: 'round-a',
      generation: 1,
    },
  ])
  assert.strictEqual(harness.store.getSnapshot(), beforeTried)
  assert.deepEqual(harness.engine.submitGuess('guess-two', 1, 10), [
    {
      type: 'publish-guess-rejected',
      guessId: 'guess-two',
      choiceIndex: 1,
      reason: 'CHOICE_ALREADY_TRIED',
      roundId: 'round-a',
      generation: 1,
    },
  ])
  assert.strictEqual(harness.store.getSnapshot(), beforeTried)
})

test('correct guess reveals word and exact glyph once', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  harness.engine.appendPoint(worldPoint(0), publicPoint(0), 1)
  harness.engine.appendPoint(worldPoint(1), publicPoint(1), 2)
  harness.engine.endStroke(3)
  assert.deepEqual(types(harness.engine.tick(100)), [
    'publish-stroke-points',
    'publish-stroke-end',
  ])

  const effects = harness.engine.submitGuess('guess-correct', 0, 101)
  assert.deepEqual(types(effects), ['publish-result'])
  assert.equal(effects[0].revealedWord, 'SNAKE')
  assert.equal(harness.store.getSnapshot().phase, 'CORRECT')
  assert.equal(harness.store.getSnapshot().revealedWord, 'SNAKE')
  assert.deepEqual(harness.store.getSnapshot().glyph, [
    [101, 202],
    [102, 203],
  ])
  assert.equal(Object.isFrozen(harness.store.getSnapshot().glyph[0]), true)
  assert.equal(harness.normalizerInputs.length, 1)

  harness.engine.lockGlyph('round-a', 1)
  harness.engine.lockGlyph('round-a', 1)
  assert.equal(harness.store.getSnapshot().phase, 'GLYPH_LOCKED')
  assert.equal(harness.normalizerInputs.length, 1)
})

test('correct result publishes no geometry', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  harness.engine.appendPoint(worldPoint(0), publicPoint(0), 1)
  harness.engine.submitGuess('guess-correct', 0, 2)

  const effects = harness.engine.tick(100)
  assert.deepEqual(types(effects), [
    'publish-stroke-points',
    'publish-stroke-end',
    'publish-result',
  ])
  const result = effects[2]
  assert.equal(result.outcome, 'correct')
  assert.equal(result.finalPointCount, 1)
  assert.equal('points' in result, false)
  assert.equal('glyph' in result, false)
  assert.equal('worldPoints' in result, false)
})

test('correct mid-stroke drains points and end before final count result', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  for (let index = 0; index < 10; index += 1) {
    assert.deepEqual(
      harness.engine.appendPoint(worldPoint(index), publicPoint(index), index + 1),
      [],
    )
  }

  assert.deepEqual(harness.engine.endStroke(11), [])
  assert.deepEqual(harness.engine.submitGuess('guess-correct', 0, 12), [])
  const firstDrain = harness.engine.tick(100)
  assert.deepEqual(types(firstDrain), ['publish-stroke-points'])
  assert.equal(firstDrain[0].points.length, 8)
  assert.deepEqual(harness.engine.tick(199), [])

  const finalDrain = harness.engine.tick(200)
  assert.deepEqual(types(finalDrain), [
    'publish-stroke-points',
    'publish-stroke-end',
    'publish-result',
  ])
  assert.deepEqual(finalDrain[0].points, [publicPoint(8), publicPoint(9)])
  assert.equal(finalDrain[2].finalPointCount, 10)
  assert.equal(harness.store.getSnapshot().phase, 'CORRECT')
})

test('correct after stroke end emits no duplicate end', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  harness.engine.appendPoint(worldPoint(0), publicPoint(0), 1)
  harness.engine.endStroke(2)
  assert.deepEqual(types(harness.engine.tick(100)), [
    'publish-stroke-points',
    'publish-stroke-end',
  ])

  const effects = harness.engine.submitGuess('guess-correct', 0, 101)
  assert.deepEqual(types(effects), ['publish-result'])
  assert.equal(types(harness.engine.tick(500)).includes('publish-stroke-end'), false)
})

test('correct before stroke start emits no invalid end', () => {
  const harness = makeHarness()
  activate(harness)

  const effects = harness.engine.submitGuess('guess-correct', 0, 1)
  assert.deepEqual(types(effects), ['publish-result'])
  assert.equal(effects[0].finalPointCount, 0)
  assert.equal(types(effects).includes('publish-stroke-end'), false)
  assert.deepEqual(harness.engine.tick(500), [])
})

test('timeout creates no glyph and publishes authoritative timeout', () => {
  const harness = makeHarness()
  activate(harness, { readyAtMs: 100, durationMs: 100 })

  const effects = harness.engine.tick(200)
  assert.deepEqual(effects, [
    {
      type: 'publish-timeout',
      finalPointCount: 0,
      roundId: 'round-a',
      generation: 1,
    },
  ])
  assert.equal(harness.store.getSnapshot().phase, 'TIMED_OUT')
  assert.equal(harness.store.getSnapshot().lastOutcome, 'timeout')
  assert.equal(harness.store.getSnapshot().revealedWord, null)
  assert.deepEqual(harness.store.getSnapshot().glyph, [])
  assert.equal(harness.normalizerInputs.length, 0)
})

test('timeout mid-stroke drains points and end before final count', () => {
  const harness = makeHarness()
  activate(harness, { readyAtMs: 100, durationMs: 100 })
  harness.engine.beginStroke('stroke-a', 100)
  for (let index = 0; index < 10; index += 1) {
    harness.engine.appendPoint(worldPoint(index), publicPoint(index), 101 + index)
  }
  assert.deepEqual(harness.engine.endStroke(111), [])

  const firstDrain = harness.engine.tick(200)
  assert.deepEqual(types(firstDrain), ['publish-stroke-points'])
  assert.equal(firstDrain[0].points.length, 8)
  assert.equal(harness.store.getSnapshot().phase, 'ACTIVE')

  const finalDrain = harness.engine.tick(300)
  assert.deepEqual(types(finalDrain), [
    'publish-stroke-points',
    'publish-stroke-end',
    'publish-timeout',
  ])
  assert.equal(finalDrain[2].finalPointCount, 10)
  assert.equal(harness.store.getSnapshot().phase, 'TIMED_OUT')
  assert.deepEqual(harness.store.getSnapshot().glyph, [])
})

test('timeout after end or before start emits no duplicate or invalid end', () => {
  const beforeStart = makeHarness()
  activate(beforeStart, { readyAtMs: 0, durationMs: 100 })
  const noStrokeEffects = beforeStart.engine.tick(100)
  assert.deepEqual(types(noStrokeEffects), ['publish-timeout'])

  const afterEnd = makeHarness()
  activate(afterEnd, { readyAtMs: 0, durationMs: 200 })
  afterEnd.engine.beginStroke('stroke-a', 0)
  afterEnd.engine.appendPoint(worldPoint(0), publicPoint(0), 1)
  afterEnd.engine.endStroke(2)
  assert.deepEqual(types(afterEnd.engine.tick(100)), [
    'publish-stroke-points',
    'publish-stroke-end',
  ])
  const timeoutEffects = afterEnd.engine.tick(200)
  assert.deepEqual(types(timeoutEffects), ['publish-timeout'])
  assert.deepEqual(afterEnd.engine.tick(300), [])
})

test('closing drain emits at most one point batch per 100 ms', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  for (let index = 0; index < 17; index += 1) {
    harness.engine.appendPoint(worldPoint(index), publicPoint(index), 1)
  }
  harness.engine.endStroke(2)

  assert.deepEqual(harness.engine.tick(POINT_BATCH_INTERVAL_MS - 1), [])
  const at100 = harness.engine.tick(100)
  assert.deepEqual(types(at100), ['publish-stroke-points'])
  assert.equal(at100[0].points.length, 8)
  assert.deepEqual(harness.engine.tick(150), [])
  const at200 = harness.engine.tick(200)
  assert.deepEqual(types(at200), ['publish-stroke-points'])
  assert.equal(at200[0].points.length, 8)
  assert.deepEqual(harness.engine.tick(299), [])
  const at300 = harness.engine.tick(300)
  assert.deepEqual(types(at300), ['publish-stroke-points', 'publish-stroke-end'])
  assert.deepEqual(at300[0].points, [publicPoint(16)])
})

test('correct at deadline minus one latches before a later timeout tick', () => {
  const harness = makeHarness()
  activate(harness, { readyAtMs: 100, durationMs: 100 })

  const correctEffects = harness.engine.submitGuess('guess-correct', 0, 199)
  assert.deepEqual(types(correctEffects), ['publish-result'])
  assert.equal(correctEffects[0].outcome, 'correct')
  assert.deepEqual(harness.engine.tick(200), [])
  assert.equal(harness.store.getSnapshot().phase, 'CORRECT')
})

test('exact deadline advances timeout before evaluating a correct guess', () => {
  const harness = makeHarness()
  activate(harness, { readyAtMs: 100, durationMs: 100 })

  const effects = harness.engine.submitGuess('guess-correct', 0, 200)
  assert.deepEqual(types(effects), ['publish-timeout'])
  assert.equal(types(effects).includes('publish-result'), false)
  assert.equal(types(effects).includes('publish-guess-rejected'), false)
  assert.equal(harness.store.getSnapshot().phase, 'TIMED_OUT')
  assert.equal(harness.store.getSnapshot().revealedWord, null)
})

test('exact deadline rejects begin, point, and release before their input', () => {
  const beginHarness = makeHarness()
  activate(beginHarness, { readyAtMs: 100, durationMs: 100 })
  const beginEffects = beginHarness.engine.beginStroke('too-late', 200)
  assert.deepEqual(types(beginEffects), ['publish-timeout'])
  assert.equal(types(beginEffects).includes('publish-stroke-begin'), false)

  const pointHarness = makeHarness()
  activate(pointHarness, { readyAtMs: 100, durationMs: 100 })
  pointHarness.engine.beginStroke('stroke-a', 100)
  const pointEffects = pointHarness.engine.appendPoint(
    worldPoint(0),
    publicPoint(0),
    200,
  )
  assert.equal(types(pointEffects).includes('publish-stroke-points'), false)
  assert.equal(pointHarness.store.getSnapshot().publicPoints.length, 0)
  assert.deepEqual(types(pointEffects), ['publish-stroke-end', 'publish-timeout'])

  const releaseHarness = makeHarness()
  activate(releaseHarness, { readyAtMs: 100, durationMs: 100 })
  releaseHarness.engine.beginStroke('stroke-a', 100)
  const releaseEffects = releaseHarness.engine.endStroke(200)
  assert.deepEqual(types(releaseEffects), ['publish-stroke-end', 'publish-timeout'])
  assert.deepEqual(releaseHarness.engine.tick(300), [])
})

test('timeout latched first rejects a later correct guess', () => {
  const harness = makeHarness()
  activate(harness, { readyAtMs: 0, durationMs: 100 })
  harness.engine.tick(100)
  const before = harness.store.getSnapshot()

  assert.deepEqual(harness.engine.submitGuess('guess-correct', 0, 101), [
    {
      type: 'publish-guess-rejected',
      guessId: 'guess-correct',
      choiceIndex: 0,
      reason: 'WRONG_PHASE',
      roundId: 'round-a',
      generation: 1,
    },
  ])
  assert.strictEqual(harness.store.getSnapshot(), before)
})

test('applyRound during drain invalidates every old-round pending effect', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  for (let index = 0; index < 10; index += 1) {
    harness.engine.appendPoint(worldPoint(index), publicPoint(index), 1)
  }
  harness.engine.submitGuess('guess-correct', 0, 2)
  const firstDrain = harness.engine.tick(100)
  assert.deepEqual(types(firstDrain), ['publish-stroke-points'])

  const reset = harness.engine.applyRound('round-b', SNAKE, 150)
  assert.deepEqual(types(reset), ['publish-reset'])
  assertEffectScope(reset, 'round-b', 2)
  assert.deepEqual(harness.engine.tick(30_000), [])
  assert.equal(harness.normalizerInputs.length, 0)
  assert.equal(harness.store.getSnapshot().roundId, 'round-b')
  assert.equal(harness.store.getSnapshot().phase, 'READY')
  assert.deepEqual(harness.store.getSnapshot().publicPoints, [])
})

test('disconnect during drain invalidates every old-round pending effect', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  for (let index = 0; index < 10; index += 1) {
    harness.engine.appendPoint(worldPoint(index), publicPoint(index), 1)
  }
  harness.engine.submitGuess('guess-correct', 0, 2)
  harness.engine.tick(100)

  harness.engine.disconnect()
  assert.equal(harness.engine.getRoundGeneration(), 2)
  assert.deepEqual(harness.engine.tick(30_000), [])
  assert.equal(harness.normalizerInputs.length, 0)
  assert.equal(harness.store.getSnapshot().phase, 'DISCONNECTED')
})

test('every effect carries its exact round ID and current generation', () => {
  const harness = makeHarness()
  const first = activate(harness)
  const begin = harness.engine.beginStroke('stroke-a', 0)
  harness.engine.appendPoint(worldPoint(0), publicPoint(0), 1)
  const points = harness.engine.tick(100)
  const end = harness.engine.endStroke(101)
  const incorrect = harness.engine.submitGuess('guess-wrong', 1, 102)
  const rejected = harness.engine.submitGuess('guess-wrong', 2, 102)
  const correct = harness.engine.submitGuess('guess-correct', 0, 103)
  const roundAEffects = [
    ...first.startEffects,
    ...begin,
    ...points,
    ...end,
    ...incorrect,
    ...rejected,
    ...correct,
  ]
  assertEffectScope(roundAEffects, 'round-a', 1)
  assert.deepEqual(types(roundAEffects), [
    'publish-round-start',
    'publish-stroke-begin',
    'publish-stroke-points',
    'publish-stroke-end',
    'publish-result',
    'publish-guess-rejected',
    'publish-result',
  ])
  assert.equal(incorrect[0].outcome, 'incorrect')
  assert.equal(correct[0].outcome, 'correct')

  const reset = harness.engine.applyRound('round-b', SNAKE, 200)
  assertEffectScope(reset, 'round-b', 2)
  const start = harness.engine.setCounterpartReady(true, 201)
  assertEffectScope(start, 'round-b', 2)
  const timeout = harness.engine.tick(20_201)
  assertEffectScope(timeout, 'round-b', 2)
  assert.deepEqual(types(timeout), ['publish-timeout'])
  const lateRejection = harness.engine.submitGuess('late-guess', 0, 20_202)
  assertEffectScope(lateRejection, 'round-b', 2)
})

test('stale glyph-lock callback after applyRound is a no-op', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.submitGuess('guess-correct', 0, 1)
  const oldGeneration = harness.engine.getRoundGeneration()
  harness.engine.applyRound('round-b', SNAKE, 2)

  harness.engine.lockGlyph('round-a', oldGeneration)
  assert.equal(harness.store.getSnapshot().roundId, 'round-b')
  assert.equal(harness.store.getSnapshot().phase, 'READY')
  harness.engine.lockGlyph('round-b', oldGeneration)
  assert.equal(harness.store.getSnapshot().phase, 'READY')
})

test('manual close rejects a second stroke until applyRound', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.beginStroke('stroke-a', 0)
  assert.deepEqual(types(harness.engine.endStroke(1)), ['publish-stroke-end'])
  assert.deepEqual(harness.engine.beginStroke('stroke-b', 2), [])

  harness.engine.applyRound('round-b', SNAKE, 3)
  harness.engine.setCounterpartReady(true, 4)
  assert.deepEqual(types(harness.engine.beginStroke('stroke-b', 5)), [
    'publish-stroke-begin',
  ])
})

test('point-cap close rejects a second stroke until applyRound', () => {
  const harness = makeHarness()
  activate(harness, { readyAtMs: 1_000 })
  harness.engine.beginStroke('stroke-a', 1_000)
  for (let index = 0; index < MAX_STROKE_POINTS; index += 1) {
    harness.engine.appendPoint(worldPoint(index), publicPoint(index), 1_001)
  }

  assert.equal(harness.store.getSnapshot().publicPoints.length, 128)
  assert.deepEqual(
    harness.engine.appendPoint(worldPoint(128), publicPoint(128), 1_002),
    [],
  )
  assert.equal(harness.store.getSnapshot().publicPoints.length, 128)
  assert.deepEqual(harness.engine.beginStroke('stroke-b', 1_003), [])

  harness.engine.applyRound('round-b', SNAKE, 1_004)
  harness.engine.setCounterpartReady(true, 1_005)
  assert.deepEqual(types(harness.engine.beginStroke('stroke-b', 1_006)), [
    'publish-stroke-begin',
  ])
})

test('duplicate counterpart readiness emits no second round start', () => {
  const harness = makeHarness()
  harness.engine.applyRound('round-a', SNAKE, 10)

  const first = harness.engine.setCounterpartReady(true, 100)
  const started = harness.store.getSnapshot()
  assert.deepEqual(types(first), ['publish-round-start'])
  assert.equal(started.startedAtMs, 100)
  assert.equal(started.counterpartReady, true)
  assert.deepEqual(harness.engine.setCounterpartReady(true, 200), [])
  assert.deepEqual(harness.engine.setCounterpartReady(false, 300), [])
  assert.deepEqual(harness.engine.setCounterpartReady(true, 400), [])
  assert.strictEqual(harness.store.getSnapshot(), started)
})

test('disconnect blocks guesses and reconnect requires applyRound', () => {
  const harness = makeHarness()
  activate(harness)
  harness.engine.disconnect()

  const before = harness.store.getSnapshot()
  const rejected = harness.engine.submitGuess('guess-correct', 0, 10)
  assert.deepEqual(rejected, [
    {
      type: 'publish-guess-rejected',
      guessId: 'guess-correct',
      choiceIndex: 0,
      reason: 'WRONG_PHASE',
      roundId: 'round-a',
      generation: 2,
    },
  ])
  assert.strictEqual(harness.store.getSnapshot(), before)
  assert.deepEqual(harness.engine.setCounterpartReady(true, 11), [])
  assert.equal(harness.store.getSnapshot().phase, 'DISCONNECTED')

  assert.deepEqual(types(harness.engine.applyRound('round-b', SNAKE, 12)), [
    'publish-reset',
  ])
  assert.equal(harness.store.getSnapshot().phase, 'READY')
  assert.deepEqual(types(harness.engine.setCounterpartReady(true, 13)), [
    'publish-round-start',
  ])
  assert.equal(harness.store.getSnapshot().phase, 'ACTIVE')
})
