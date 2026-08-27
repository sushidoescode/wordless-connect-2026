import assert from 'node:assert/strict'
import test from 'node:test'

import {
  easeOutCubic,
  interpolatePath,
} from '../../Assets/Wordless/Scripts/Core/GlyphTransition.ts'

const source = Object.freeze([
  Object.freeze([-12, 8]),
  Object.freeze([0, -4]),
  Object.freeze([18, 20]),
])

const destination = Object.freeze([
  Object.freeze([-8, 12]),
  Object.freeze([4, 0]),
  Object.freeze([12, -16]),
])

test('progress zero preserves the exact displayed path count and order', () => {
  const result = interpolatePath(source, destination, 0)

  assert.deepEqual(result, source)
  assert.equal(result.length, source.length)
  assert.notStrictEqual(result, source)
})

test('progress one settles on the exact normalized medallion path', () => {
  const result = interpolatePath(source, destination, 1)

  assert.deepEqual(result, destination)
  assert.equal(result.length, destination.length)
  assert.notStrictEqual(result, destination)
})

test('endpoint identity is exact for fractional coordinates', () => {
  const fractionalSource = [[92.4, -71.3]]
  const fractionalDestination = [[-15.8, 15.8]]

  assert.deepEqual(
    interpolatePath(fractionalSource, fractionalDestination, 0),
    fractionalSource,
  )
  assert.deepEqual(
    interpolatePath(fractionalSource, fractionalDestination, 1),
    fractionalDestination,
  )
})

test('half progress applies finite ease-out interpolation without reordering', () => {
  const result = interpolatePath(source, destination, 0.5)

  assert.equal(easeOutCubic(0.5), 0.875)
  assert.deepEqual(result, [
    [-8.5, 11.5],
    [3.5, -0.5],
    [12.75, -11.5],
  ])
  assert.equal(result.length, source.length)
  for (const point of result) {
    assert.equal(point.length, 2)
    assert.ok(point.every(Number.isFinite))
  }
})

test('progress clamps below zero and above one', () => {
  assert.equal(easeOutCubic(-1), 0)
  assert.equal(easeOutCubic(2), 1)
  assert.deepEqual(interpolatePath(source, destination, -1), source)
  assert.deepEqual(interpolatePath(source, destination, 2), destination)
})

test('mismatched paths reject instead of changing point identity', () => {
  assert.throws(
    () => interpolatePath(source, destination.slice(1), 0.5),
    /path length mismatch/i,
  )
})
