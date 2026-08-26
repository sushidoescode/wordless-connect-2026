import assert from 'node:assert/strict'
import test from 'node:test'

import {
  acceptWorldPoint,
  normalizeGlyph,
  pathCoordinateHash,
  quantizePlanePoint,
  takePointBatch,
} from '../../Assets/Wordless/Scripts/Core/StrokeGeometry.ts'

const point = (x, y, z = 0) => ({ x, y, z })

const nonFiniteNumbers = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
]

const invalidQuantizedPoints = [
  [Number.NaN, 0],
  [0, Number.NaN],
  [Number.POSITIVE_INFINITY, 0],
  [0, Number.POSITIVE_INFINITY],
  [Number.NEGATIVE_INFINITY, 0],
  [0, Number.NEGATIVE_INFINITY],
  [0.5, 0],
  [0, 0.5],
  [-1, 0],
  [0, -1],
  [1001, 0],
  [0, 1001],
  null,
  {},
  [],
  [0],
  [0, 0, 0],
  ['0', 0],
]

const isInvalidWorldPointError = (error) =>
  error instanceof Error && error.message === 'Invalid world point'

const isInvalidQuantizedPointError = (error) =>
  error instanceof Error && error.message === 'Invalid quantized point'

test('samples only after 2.5 cm of movement', () => {
  assert.equal(acceptWorldPoint([], point(90, -55, 40)), true)

  const accepted = [point(10, 20, 30)]
  assert.equal(acceptWorldPoint(accepted, point(11.5, 22, 30)), true)
  assert.equal(acceptWorldPoint(accepted, point(11.5, 21.999, 30)), false)
  assert.equal(acceptWorldPoint(accepted, point(10, 20, 32.5)), true)
})

test('sampling distance is measured from the last accepted world point', () => {
  const accepted = [point(0, 0), point(100, 100)]

  assert.equal(acceptWorldPoint(accepted, point(101, 101)), false)
  assert.equal(acceptWorldPoint(accepted, point(98.5, 98)), true)
})

test('sampling fails closed for every non-finite candidate or last point', () => {
  const valid = point(0, 0, 0)
  for (const invalid of nonFiniteNumbers) {
    for (const axis of ['x', 'y', 'z']) {
      const invalidPoint = { ...valid, [axis]: invalid }
      assert.equal(acceptWorldPoint([], invalidPoint), false)
      assert.equal(acceptWorldPoint([valid], invalidPoint), false)
      assert.equal(acceptWorldPoint([invalidPoint], valid), false)
    }
  }
})

test('sampling snapshots candidate and last-point coordinates exactly once', () => {
  const candidateReads = { x: 0, y: 0, z: 0 }
  const candidate = {
    get x() { candidateReads.x += 1; return candidateReads.x === 1 ? 1.5 : Number.NaN },
    get y() { candidateReads.y += 1; return candidateReads.y === 1 ? 2 : Number.POSITIVE_INFINITY },
    get z() { candidateReads.z += 1; return candidateReads.z === 1 ? 0 : Number.NEGATIVE_INFINITY },
  }
  assert.equal(acceptWorldPoint([point(0, 0, 0)], candidate), true)
  assert.deepEqual(candidateReads, { x: 1, y: 1, z: 1 })

  const lastReads = { x: 0, y: 0, z: 0 }
  const last = {
    get x() { lastReads.x += 1; return lastReads.x === 1 ? 0 : Number.NaN },
    get y() { lastReads.y += 1; return lastReads.y === 1 ? 0 : Number.POSITIVE_INFINITY },
    get z() { lastReads.z += 1; return lastReads.z === 1 ? 0 : Number.NEGATIVE_INFINITY },
  }
  assert.equal(acceptWorldPoint([last], point(0, 0, 2.5)), true)
  assert.deepEqual(lastReads, { x: 1, y: 1, z: 1 })
})

test('world-point consumers fail closed on throwing Proxy accessors', () => {
  const throwingPoint = new Proxy(point(0, 0, 0), {
    get() { throw new Error('untrusted getter') },
  })
  const throwingPoints = new Proxy([point(0, 0, 0)], {
    get() { throw new Error('untrusted collection') },
  })

  assert.equal(acceptWorldPoint([], throwingPoint), false)
  assert.equal(acceptWorldPoint(throwingPoints, point(3, 0, 0)), false)
  assert.throws(() => quantizePlanePoint(throwingPoint), isInvalidWorldPointError)
})

test('quantizes drawing plane corners to 0 and 1000', () => {
  assert.deepEqual(quantizePlanePoint(point(-90, 55)), [0, 0])
  assert.deepEqual(quantizePlanePoint(point(90, -55)), [1000, 1000])
  assert.deepEqual(quantizePlanePoint(point(0, 0, 999)), [500, 500])
})

test('quantization clamps points beyond every drawing plane edge', () => {
  assert.deepEqual(quantizePlanePoint(point(-900, 550)), [0, 0])
  assert.deepEqual(quantizePlanePoint(point(900, -550)), [1000, 1000])
  assert.deepEqual(quantizePlanePoint(point(-900, -550)), [0, 1000])
  assert.deepEqual(quantizePlanePoint(point(900, 550)), [1000, 0])
})

test('quantization rejects non-finite and malformed world points', () => {
  const valid = point(0, 0, 0)
  for (const invalid of nonFiniteNumbers) {
    for (const axis of ['x', 'y', 'z']) {
      const invalidPoint = { ...valid, [axis]: invalid }
      assert.throws(() => quantizePlanePoint(invalidPoint), /invalid world point/i)
    }
  }
  for (const malformed of [null, {}, { x: 0, y: 0 }, { x: '0', y: 0, z: 0 }]) {
    assert.throws(() => quantizePlanePoint(malformed), /invalid world point/i)
  }
})

test('quantization snapshots world coordinates exactly once', () => {
  const reads = { x: 0, y: 0, z: 0 }
  const changingPoint = {
    get x() { reads.x += 1; return reads.x === 1 ? 0 : Number.NaN },
    get y() { reads.y += 1; return reads.y === 1 ? 0 : Number.POSITIVE_INFINITY },
    get z() { reads.z += 1; return reads.z === 1 ? 10 : Number.NEGATIVE_INFINITY },
  }

  assert.deepEqual(quantizePlanePoint(changingPoint), [500, 500])
  assert.deepEqual(reads, { x: 1, y: 1, z: 1 })
})

test('caps a stroke at exactly 128 points', () => {
  const belowCap = Array.from({ length: 127 }, (_, index) => point(index * 3, 0))
  const atCap = [...belowCap, point(381, 0)]

  assert.equal(acceptWorldPoint(belowCap, point(381, 0)), true)
  assert.equal(acceptWorldPoint(atCap, point(10_000, 10_000, 10_000)), false)
})

test('batches no more than eight points without reordering', () => {
  const queue = Array.from({ length: 11 }, (_, index) => [index, 1000 - index])
  const snapshot = queue.map(([x, y]) => [x, y])

  const result = takePointBatch(queue)

  assert.deepEqual(result.batch, snapshot.slice(0, 8))
  assert.deepEqual(result.rest, snapshot.slice(8))
  assert.deepEqual(queue, snapshot)
  assert.notEqual(result.batch, queue)
  assert.notEqual(result.rest, queue)
})

test('batching handles empty and exact-boundary queues', () => {
  assert.deepEqual(takePointBatch([]), { batch: [], rest: [] })

  const eight = Array.from({ length: 8 }, (_, index) => [index * 100, index])
  assert.deepEqual(takePointBatch(eight), { batch: eight, rest: [] })
})

test('batching snapshots a changing-length Proxy exactly once', () => {
  const original = Array.from({ length: 11 }, (_, index) => [index, 1000 - index])
  let lengthReads = 0
  const changingLength = new Proxy(original, {
    get(target, property, receiver) {
      if (property === 'length') {
        lengthReads += 1
        return lengthReads === 1 ? 11 : 8
      }
      return Reflect.get(target, property, receiver)
    },
  })

  assert.deepEqual(takePointBatch(changingLength), {
    batch: original.slice(0, 8),
    rest: original.slice(8),
  })
  assert.equal(lengthReads, 1)
})

test('batching snapshots changing outer indices and tuple coordinates once', () => {
  const expected = Array.from({ length: 9 }, (_, index) => [index, 1000 - index])
  const coordinateReads = expected.map(() => [0, 0])
  const tupleProxies = expected.map((tuple, tupleIndex) => new Proxy(tuple, {
    get(target, property, receiver) {
      if (property === '0' || property === '1') {
        const axis = Number(property)
        coordinateReads[tupleIndex][axis] += 1
        return coordinateReads[tupleIndex][axis] === 1
          ? target[axis]
          : Number.NaN
      }
      return Reflect.get(target, property, receiver)
    },
  }))
  const indexReads = Array(9).fill(0)
  const changingIndices = new Proxy(tupleProxies, {
    get(target, property, receiver) {
      if (/^[0-8]$/.test(String(property))) {
        const index = Number(property)
        indexReads[index] += 1
        return indexReads[index] === 1 ? target[index] : [Number.NaN, 0]
      }
      return Reflect.get(target, property, receiver)
    },
  })

  const result = takePointBatch(changingIndices)
  assert.deepEqual(indexReads, Array(9).fill(1))
  assert.deepEqual(coordinateReads, Array.from({ length: 9 }, () => [1, 1]))
  assert.deepEqual(result, { batch: expected.slice(0, 8), rest: expected.slice(8) })
  assert.deepEqual(result, { batch: expected.slice(0, 8), rest: expected.slice(8) })
})

test('batching rejects every invalid quantized tuple', () => {
  const sparseTuple = Array(2)
  sparseTuple[1] = 0
  for (const invalidPoint of [...invalidQuantizedPoints, sparseTuple]) {
    assert.throws(
      () => takePointBatch([[0, 0], invalidPoint]),
      isInvalidQuantizedPointError,
    )
  }
})

test('batching rejects sparse queues with the documented Error', () => {
  const sparseQueue = Array(2)
  sparseQueue[1] = [0, 0]

  assert.throws(() => takePointBatch(sparseQueue), isInvalidQuantizedPointError)
})

test('batching normalizes throwing queue and tuple accessors', () => {
  const throwingLength = new Proxy([[0, 0]], {
    get(target, property, receiver) {
      if (property === 'length') throw new Error('untrusted length')
      return Reflect.get(target, property, receiver)
    },
  })
  const throwingIndex = new Proxy([[0, 0]], {
    get(target, property, receiver) {
      if (property === '0') throw new Error('untrusted index')
      return Reflect.get(target, property, receiver)
    },
  })
  const throwingTuple = [0, 0]
  Object.defineProperty(throwingTuple, 0, {
    configurable: true,
    get() { throw new Error('untrusted coordinate') },
  })

  assert.throws(() => takePointBatch(throwingLength), isInvalidQuantizedPointError)
  assert.throws(() => takePointBatch(throwingIndex), isInvalidQuantizedPointError)
  assert.throws(() => takePointBatch([throwingTuple]), isInvalidQuantizedPointError)
})

test('batch and rest own independent tuple snapshots', () => {
  const queue = Array.from({ length: 9 }, (_, index) => [index, index + 100])
  const result = takePointBatch(queue)

  queue[0][0] = 999
  queue[8][0] = 999
  queue.push([999, 999])
  assert.deepEqual(result.batch[0], [0, 100])
  assert.deepEqual(result.rest[0], [8, 108])
  assert.equal(result.batch.length, 8)
  assert.equal(result.rest.length, 1)

  result.batch[0][1] = 777
  result.rest[0][1] = 888
  assert.deepEqual(queue[0], [999, 100])
  assert.deepEqual(queue[8], [999, 108])
})

test('normalizes the exact path into a centered 0.8 square', () => {
  const path = [[200, 300], [600, 300], [600, 500], [200, 500]]

  assert.deepEqual(normalizeGlyph(path), [
    [100, 300],
    [900, 300],
    [900, 700],
    [100, 700],
  ])
})

test('normalization preserves point count and order', () => {
  const path = [[800, 200], [200, 800], [500, 500], [800, 200]]
  const snapshot = path.map(([x, y]) => [x, y])
  const normalized = normalizeGlyph(path)

  assert.deepEqual(normalized, [
    [900, 100],
    [100, 900],
    [500, 500],
    [900, 100],
  ])
  assert.equal(normalized.length, path.length)
  assert.ok(normalized.every(([x, y]) =>
    Number.isInteger(x) && Number.isInteger(y) &&
    x >= 100 && x <= 900 && y >= 100 && y <= 900))
  assert.deepEqual(path, snapshot)
})

test('normalization retains all 128 points in their original order', () => {
  const path = Array.from({ length: 128 }, (_, index) => [index, index])
  const normalized = normalizeGlyph(path)

  assert.equal(normalized.length, 128)
  assert.deepEqual(normalized[0], [100, 100])
  assert.deepEqual(normalized[64], [503, 503])
  assert.deepEqual(normalized[127], [900, 900])
  for (let index = 1; index < normalized.length; index += 1) {
    assert.ok(normalized[index][0] >= normalized[index - 1][0])
    assert.ok(normalized[index][1] >= normalized[index - 1][1])
  }
})

test('empty glyph remains empty', () => {
  assert.deepEqual(normalizeGlyph([]), [])
})

test('single-point glyph remains finite and centered', () => {
  const normalized = normalizeGlyph([[123, 987]])

  assert.deepEqual(normalized, [[500, 500]])
  assert.ok(normalized[0].every(Number.isFinite))
})

test('degenerate paths center the fixed axis without losing duplicates', () => {
  assert.deepEqual(normalizeGlyph([[200, 700], [800, 700]]), [
    [100, 500],
    [900, 500],
  ])
  assert.deepEqual(normalizeGlyph([[250, 100], [250, 900]]), [
    [500, 100],
    [500, 900],
  ])
  assert.deepEqual(normalizeGlyph([[25, 30], [25, 30]]), [
    [500, 500],
    [500, 500],
  ])
})

test('normalization rejects poisoned and malformed quantized points', () => {
  for (const invalidPoint of invalidQuantizedPoints) {
    assert.throws(
      () => normalizeGlyph([[0, 0], invalidPoint, [1000, 1000]]),
      /invalid quantized point/i,
    )
  }
})

test('normalization snapshots quantized tuple accessors exactly once', () => {
  const reads = { x: 0, y: 0 }
  const changingTuple = [0, 0]
  Object.defineProperties(changingTuple, {
    0: { configurable: true, get() { reads.x += 1; return reads.x === 1 ? 0 : Number.NaN } },
    1: { configurable: true, get() { reads.y += 1; return reads.y === 1 ? 0 : Number.POSITIVE_INFINITY } },
  })

  assert.deepEqual(normalizeGlyph([changingTuple, [1000, 1000]]), [
    [100, 100],
    [900, 900],
  ])
  assert.deepEqual(reads, { x: 1, y: 1 })
})

test('quantized consumers reject sparse paths with the documented Error', () => {
  const sparsePath = Array(2)
  sparsePath[1] = [0, 0]

  assert.throws(() => normalizeGlyph(sparsePath), isInvalidQuantizedPointError)
  assert.throws(() => pathCoordinateHash(sparsePath), isInvalidQuantizedPointError)
})

test('quantized consumers snapshot outer Proxy length exactly once', () => {
  const makeChangingLengthPath = () => {
    let lengthReads = 0
    const value = new Proxy([[0, 0], [1000, 1000]], {
      get(target, property, receiver) {
        if (property === 'length') {
          lengthReads += 1
          return lengthReads === 1 ? 2 : 0
        }
        return Reflect.get(target, property, receiver)
      },
    })
    return { value, lengthReads: () => lengthReads }
  }

  const glyphPath = makeChangingLengthPath()
  assert.deepEqual(normalizeGlyph(glyphPath.value), [[100, 100], [900, 900]])
  assert.equal(glyphPath.lengthReads(), 1)

  const hashPath = makeChangingLengthPath()
  assert.equal(pathCoordinateHash(hashPath.value), 'ea85c175')
  assert.equal(hashPath.lengthReads(), 1)
})

test('quantized consumers snapshot each outer Proxy index exactly once', () => {
  const makeChangingIndexPath = () => {
    const indexReads = [0, 0]
    const value = new Proxy([[0, 0], [1000, 1000]], {
      get(target, property, receiver) {
        if (property === '0' || property === '1') {
          const index = Number(property)
          indexReads[index] += 1
          return indexReads[index] === 1 ? target[index] : [Number.NaN, 0]
        }
        return Reflect.get(target, property, receiver)
      },
    })
    return { value, indexReads }
  }

  const glyphPath = makeChangingIndexPath()
  assert.deepEqual(normalizeGlyph(glyphPath.value), [[100, 100], [900, 900]])
  assert.deepEqual(glyphPath.indexReads, [1, 1])

  const hashPath = makeChangingIndexPath()
  assert.equal(pathCoordinateHash(hashPath.value), 'ea85c175')
  assert.deepEqual(hashPath.indexReads, [1, 1])
})

test('quantized consumers normalize throwing outer and tuple accessors', () => {
  const throwingOuter = new Proxy([[0, 0]], {
    get(target, property, receiver) {
      if (property === '0') throw new Error('untrusted outer index')
      return Reflect.get(target, property, receiver)
    },
  })
  const throwingTuple = [0, 0]
  Object.defineProperty(throwingTuple, 0, {
    configurable: true,
    get() { throw new Error('untrusted tuple coordinate') },
  })

  assert.throws(() => normalizeGlyph(throwingOuter), isInvalidQuantizedPointError)
  assert.throws(() => pathCoordinateHash(throwingOuter), isInvalidQuantizedPointError)
  assert.throws(() => normalizeGlyph([throwingTuple]), isInvalidQuantizedPointError)
  assert.throws(() => pathCoordinateHash([throwingTuple]), isInvalidQuantizedPointError)
})

test('path checksum is deterministic and order-sensitive', () => {
  const path = [[100, 200], [300, 400], [500, 600]]

  assert.equal(pathCoordinateHash([]), '811c9dc5')
  assert.equal(pathCoordinateHash(path), '9253d601')
  assert.equal(pathCoordinateHash(path), '9253d601')
  assert.equal(pathCoordinateHash([[100, 200], [500, 600], [300, 400]]), '806705d1')
})

test('path checksum rejects poisoned and malformed quantized points', () => {
  for (const invalidPoint of invalidQuantizedPoints) {
    assert.throws(
      () => pathCoordinateHash([[0, 0], invalidPoint, [1000, 1000]]),
      /invalid quantized point/i,
    )
  }
})

test('path checksum snapshots quantized tuple accessors exactly once', () => {
  const reads = { x: 0, y: 0 }
  const changingTuple = [100, 200]
  Object.defineProperties(changingTuple, {
    0: { configurable: true, get() { reads.x += 1; return reads.x === 1 ? 100 : Number.NaN } },
    1: { configurable: true, get() { reads.y += 1; return reads.y === 1 ? 200 : Number.POSITIVE_INFINITY } },
  })

  assert.equal(pathCoordinateHash([changingTuple]), '011dd261')
  assert.deepEqual(reads, { x: 1, y: 1 })
})
