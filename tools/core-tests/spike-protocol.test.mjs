import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createProbeIdSet,
  parseProbeInbound,
} from '../../Assets/Wordless/Scripts/Spike/ProbeProtocol'

const validGuess = (overrides = {}) => ({
  v: 1,
  kind: 'guess',
  sessionId: 'WAVE42',
  seq: 7,
  guessId: 'guess-7',
  choiceIndex: 2,
  sentAtMs: 1_000,
  ...overrides,
})

const validPing = (overrides = {}) => ({
  v: 1,
  kind: 'ping',
  sessionId: 'WAVE42',
  seq: 8,
  pingId: 'ping-8',
  sentAtMs: 1_250,
  ...overrides,
})

test('accepts a fresh unseen guess without mutating caller-owned state', () => {
  const input = validGuess()
  const seenGuessIds = {}

  assert.deepEqual(parseProbeInbound(input, 'WAVE42', 6, seenGuessIds), input)
  assert.deepEqual(seenGuessIds, {})
})

test('rejects choice index 9', () => {
  assert.equal(
    parseProbeInbound(validGuess({ choiceIndex: 9 }), 'WAVE42', 6, {}),
    null,
  )
})

test('rejects a message for another session', () => {
  assert.equal(
    parseProbeInbound(validGuess({ sessionId: 'OTHER1' }), 'WAVE42', 6, {}),
    null,
  )
})

test('rejects a guess with no guess ID', () => {
  const input = validGuess()
  delete input.guessId

  assert.equal(parseProbeInbound(input, 'WAVE42', 6, {}), null)
})

test('rejects a guess ID already present in the caller-owned set', () => {
  const seenGuessIds = { 'guess-7': true }

  assert.equal(
    parseProbeInbound(validGuess(), 'WAVE42', 6, seenGuessIds),
    null,
  )
  assert.deepEqual(seenGuessIds, { 'guess-7': true })
})

test('rejects a later-sequence duplicate for the regex-valid __proto__ ID', () => {
  const seenGuessIds = createProbeIdSet()
  const first = validGuess({ guessId: '__proto__', seq: 7 })

  assert.deepEqual(parseProbeInbound(first, 'WAVE42', 6, seenGuessIds), first)
  seenGuessIds[first.guessId] = true
  assert.equal(
    parseProbeInbound(
      validGuess({ guessId: '__proto__', seq: 8 }),
      'WAVE42',
      7,
      seenGuessIds,
    ),
    null,
  )
})

test('accepts a fresh ping', () => {
  const input = validPing()

  assert.deepEqual(parseProbeInbound(input, 'WAVE42', 7, {}), input)
})

test('rejects a ping with no ping ID', () => {
  const input = validPing()
  delete input.pingId

  assert.equal(parseProbeInbound(input, 'WAVE42', 7, {}), null)
})

test('rejects an unknown message kind', () => {
  assert.equal(
    parseProbeInbound(validPing({ kind: 'unknown' }), 'WAVE42', 7, {}),
    null,
  )
})

test('rejects the wrong protocol version', () => {
  assert.equal(
    parseProbeInbound(validGuess({ v: 2 }), 'WAVE42', 6, {}),
    null,
  )
})

test('rejects duplicate, stale, nonpositive, and fractional sequences', () => {
  for (const seq of [6, 5, 0, -1, 6.5]) {
    assert.equal(
      parseProbeInbound(validGuess({ seq }), 'WAVE42', 6, {}),
      null,
      `sequence ${seq}`,
    )
  }
})

test('rejects a serialized payload at the 1024-byte ceiling', () => {
  const input = validPing({ padding: '' })
  const emptyBytes = new TextEncoder().encode(JSON.stringify(input)).byteLength
  input.padding = 'x'.repeat(1_024 - emptyBytes)

  assert.equal(new TextEncoder().encode(JSON.stringify(input)).byteLength, 1_024)
  assert.equal(parseProbeInbound(input, 'WAVE42', 7, {}), null)
})

test('rejects overlong and non-ASCII bounded IDs', () => {
  const invalidInputs = [
    validGuess({ guessId: 'g'.repeat(65) }),
    validGuess({ guessId: 'guess-é' }),
    validPing({ pingId: 'p'.repeat(65) }),
    validPing({ pingId: 'ping-é' }),
  ]

  for (const input of invalidInputs) {
    assert.equal(parseProbeInbound(input, 'WAVE42', 6, {}), null)
  }
})

test('rejects a non-finite timestamp', () => {
  for (const sentAtMs of [Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(
      parseProbeInbound(validGuess({ sentAtMs }), 'WAVE42', 6, {}),
      null,
    )
  }
})
