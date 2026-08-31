import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
} from '@wordless/core/RoomCode'

test('alphabet is the 32 unambiguous characters without I O 0 1', () => {
  assert.equal(ROOM_CODE_ALPHABET, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
  assert.equal(ROOM_CODE_ALPHABET.length, 32)
  assert.equal(new Set(ROOM_CODE_ALPHABET).size, 32)
  for (const ambiguous of ['I', 'O', '0', '1']) {
    assert.equal(ROOM_CODE_ALPHABET.includes(ambiguous), false)
  }
  assert.equal(ROOM_CODE_LENGTH, 6)
})

test('deterministic boundary sources map to the alphabet edges', () => {
  assert.equal(generateRoomCode(() => 0), 'AAAAAA')
  assert.equal(generateRoomCode(() => 0.999999999), '999999')
})

test('generation consumes one random value per character', () => {
  let calls = 0
  const code = ((source) => generateRoomCode(source))(() => {
    calls += 1
    return 0.5
  })
  assert.equal(calls, 6)
  assert.equal(code.length, 6)
})

test('every generated character comes from the alphabet', () => {
  let seed = 0.05
  const source = () => {
    seed = (seed + 0.117) % 1
    return seed
  }
  for (let round = 0; round < 50; round += 1) {
    const code = generateRoomCode(source)
    assert.match(code, /^[A-Z2-9]{6}$/)
    for (const character of code) {
      assert.equal(ROOM_CODE_ALPHABET.includes(character), true)
    }
  }
})

test('out-of-range random sources fail closed', () => {
  assert.throws(() => generateRoomCode(() => 1))
  assert.throws(() => generateRoomCode(() => -0.1))
  assert.throws(() => generateRoomCode(() => Number.NaN))
})

test('normalization trims and uppercases without validating', () => {
  assert.equal(normalizeRoomCode('  abc123 '), 'ABC123')
  assert.equal(normalizeRoomCode('WAVE42'), 'WAVE42')
  assert.equal(normalizeRoomCode(''), '')
})

test('validation keeps the wide six-character public contract', () => {
  for (const valid of ['WAVE42', 'EOU4LZ', 'ABC123', generateRoomCode(() => 0.3)]) {
    assert.equal(isValidRoomCode(valid), true)
  }
  for (const invalid of [
    'ABC12', 'ABC1234', 'abc123', 'AB CD1', 'ABC12é', '',
    null, undefined, 123456, ['A', 'B', 'C', '1', '2', '3'],
  ]) {
    assert.equal(isValidRoomCode(invalid), false)
  }
})
