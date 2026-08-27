import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCrossedRibbonGeometry,
} from '../../Assets/Wordless/Scripts/View/StrokeRibbonMesh.ts'

const point = (x, y, z = 0) => ({ x, y, z })

test('builds two perpendicular quads without duplicate reverse winding', () => {
  const geometry = buildCrossedRibbonGeometry([
    point(0, 0, 0),
    point(10, 0, 0),
  ], 3.6)

  assert.equal(geometry.segmentCount, 1)
  assert.deepEqual(geometry.vertices.map((vertex) => vertex.slice(0, 3)), [
    [0, -1.8, 0],
    [0, 1.8, 0],
    [10, -1.8, 0],
    [10, 1.8, 0],
    [0, 0, -1.8],
    [0, 0, 1.8],
    [10, 0, -1.8],
    [10, 0, 1.8],
  ])
  assert.deepEqual(geometry.vertices.map((vertex) => vertex.slice(3, 6)), [
    [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
    [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0],
  ])
  assert.deepEqual(geometry.vertices.map((vertex) => vertex.slice(6)), [
    [0, 0], [0, 1], [1, 0], [1, 1],
    [0, 0], [0, 1], [1, 0], [1, 1],
  ])
  assert.equal(geometry.indices.length, 12)
  assert.deepEqual(geometry.indices, [
    0, 2, 1, 1, 2, 3,
    4, 6, 5, 5, 6, 7,
  ])
})

test('skips a zero-length pair without dropping the next segment', () => {
  const geometry = buildCrossedRibbonGeometry([
    point(4, 5, 6),
    point(4, 5, 6),
    point(14, 5, 6),
  ], 4)

  assert.equal(geometry.segmentCount, 1)
  assert.equal(geometry.vertices.length, 8)
  assert.equal(geometry.indices.length, 12)
  assert.deepEqual(geometry.vertices[0].slice(0, 3), [4, 3, 6])
  assert.deepEqual(geometry.vertices[2].slice(0, 3), [14, 3, 6])
})

test('uses a finite fallback basis for a reference-axis-aligned segment', () => {
  const geometry = buildCrossedRibbonGeometry([
    point(0, 0, 0),
    point(0, 0, 10),
  ], 4)

  assert.equal(geometry.segmentCount, 1)
  assert.ok(geometry.vertices.flat().every(Number.isFinite))
  assert.deepEqual(geometry.vertices.map((vertex) => vertex.slice(0, 3)), [
    [-2, 0, 0], [2, 0, 0], [-2, 0, 10], [2, 0, 10],
    [0, -2, 0], [0, 2, 0], [0, -2, 10], [0, 2, 10],
  ])
})

test('caps source input at 128 points and remains UInt16-safe', () => {
  const points = Array.from({ length: 129 }, (_, index) => point(index * 3, 0))
  const geometry = buildCrossedRibbonGeometry(points, 3.6)

  assert.equal(geometry.segmentCount, 127)
  assert.equal(geometry.vertices.length, 1016)
  assert.equal(geometry.indices.length, 1524)
  assert.equal(Math.max(...geometry.indices), 1015)
  assert.ok(geometry.indices.every((index) =>
    Number.isInteger(index) && index >= 0 && index <= 0xffff))
  assert.equal(Math.max(...geometry.vertices.map((vertex) => vertex[0])), 381)
})

test('fewer than two usable points produces empty geometry', () => {
  assert.deepEqual(buildCrossedRibbonGeometry([], 3.6), {
    vertices: [],
    indices: [],
    segmentCount: 0,
  })
  assert.deepEqual(buildCrossedRibbonGeometry([point(1, 2, 3)], 3.6), {
    vertices: [],
    indices: [],
    segmentCount: 0,
  })
  assert.deepEqual(buildCrossedRibbonGeometry([
    point(1, 2, 3),
    point(1, 2, 3),
  ], 3.6), {
    vertices: [],
    indices: [],
    segmentCount: 0,
  })
})
