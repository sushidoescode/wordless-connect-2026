import { MAX_BATCH_POINTS, MAX_STROKE_POINTS } from './Protocol'
import type { PointBatcher, QuantizedPoint, WorldPoint } from './Protocol'

export const DRAWING_WIDTH_CM = 180
export const DRAWING_HEIGHT_CM = 110
export const MIN_SAMPLE_DISTANCE_CM = 2.5

function snapshotWorldPoint(value: unknown): WorldPoint | null {
  try {
    if (typeof value !== 'object' || value === null) return null
    const candidate = value as {
      readonly x?: unknown
      readonly y?: unknown
      readonly z?: unknown
    }
    const x = candidate.x
    const y = candidate.y
    const z = candidate.z
    if (typeof x !== 'number' || !Number.isFinite(x) ||
        typeof y !== 'number' || !Number.isFinite(y) ||
        typeof z !== 'number' || !Number.isFinite(z)) {
      return null
    }
    return { x, y, z }
  } catch (_error) {
    return null
  }
}

function snapshotQuantizedPoint(value: unknown): QuantizedPoint | null {
  try {
    if (!Array.isArray(value)) return null
    const length = value.length
    if (length !== 2 ||
        !Object.prototype.hasOwnProperty.call(value, 0) ||
        !Object.prototype.hasOwnProperty.call(value, 1)) {
      return null
    }
    const x = value[0]
    const y = value[1]
    if (typeof x !== 'number' || !Number.isFinite(x) || !Number.isInteger(x) ||
        x < 0 || x > 1000 ||
        typeof y !== 'number' || !Number.isFinite(y) || !Number.isInteger(y) ||
        y < 0 || y > 1000) {
      return null
    }
    return [x, y]
  } catch (_error) {
    return null
  }
}

function snapshotQuantizedPoints(points: unknown): readonly QuantizedPoint[] {
  try {
    if (!Array.isArray(points)) throw new Error('Invalid quantized point')
    const length = points.length
    if (!Number.isSafeInteger(length) || length < 0) {
      throw new Error('Invalid quantized point')
    }

    const snapshot: QuantizedPoint[] = []
    for (let index = 0; index < length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(points, index)) {
        throw new Error('Invalid quantized point')
      }
      const point = snapshotQuantizedPoint(points[index])
      if (point === null) throw new Error('Invalid quantized point')
      snapshot.push(point)
    }
    return snapshot
  } catch (_error) {
    throw new Error('Invalid quantized point')
  }
}

export function acceptWorldPoint(
  points: readonly WorldPoint[],
  candidate: WorldPoint,
): boolean {
  const candidateSnapshot = snapshotWorldPoint(candidate)
  if (candidateSnapshot === null) return false

  let pointCount: number
  try {
    if (!Array.isArray(points)) return false
    pointCount = points.length
  } catch (_error) {
    return false
  }
  if (!Number.isSafeInteger(pointCount) || pointCount < 0) return false
  if (pointCount >= MAX_STROKE_POINTS) return false
  if (pointCount === 0) return true

  let lastValue: unknown
  try {
    if (!Object.prototype.hasOwnProperty.call(points, pointCount - 1)) return false
    lastValue = points[pointCount - 1]
  } catch (_error) {
    return false
  }
  const lastSnapshot = snapshotWorldPoint(lastValue)
  if (lastSnapshot === null) return false

  const dx = candidateSnapshot.x - lastSnapshot.x
  const dy = candidateSnapshot.y - lastSnapshot.y
  const dz = candidateSnapshot.z - lastSnapshot.z
  const minimumSquared = MIN_SAMPLE_DISTANCE_CM * MIN_SAMPLE_DISTANCE_CM
  return dx * dx + dy * dy + dz * dz >= minimumSquared
}

export function quantizePlanePoint(local: WorldPoint): QuantizedPoint {
  const snapshot = snapshotWorldPoint(local)
  if (snapshot === null) throw new Error('Invalid world point')
  const nx = Math.max(0, Math.min(1, snapshot.x / DRAWING_WIDTH_CM + 0.5))
  const ny = Math.max(0, Math.min(1, 0.5 - snapshot.y / DRAWING_HEIGHT_CM))
  return [Math.round(nx * 1000), Math.round(ny * 1000)]
}

export const takePointBatch: PointBatcher = (queue) => {
  const snapshot = snapshotQuantizedPoints(queue)
  return {
    batch: snapshot.slice(0, MAX_BATCH_POINTS),
    rest: snapshot.slice(MAX_BATCH_POINTS),
  }
}

export function pathCoordinateHash(points: readonly QuantizedPoint[]): string {
  const snapshot = snapshotQuantizedPoints(points)
  let hash = 2166136261
  for (const point of snapshot) {
    hash = Math.imul(hash ^ point[0], 16777619)
    hash = Math.imul(hash ^ point[1], 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function normalizeGlyph(
  points: readonly QuantizedPoint[],
): readonly QuantizedPoint[] {
  const snapshot = snapshotQuantizedPoints(points)
  if (snapshot.length === 0) return []

  const normalized = snapshot.map((point) => [
    point[0] / 1000,
    point[1] / 1000,
  ] as const)

  let minX = normalized[0][0]
  let maxX = minX
  let minY = normalized[0][1]
  let maxY = minY
  for (let index = 1; index < normalized.length; index += 1) {
    const point = normalized[index]
    minX = Math.min(minX, point[0])
    maxX = Math.max(maxX, point[0])
    minY = Math.min(minY, point[1])
    maxY = Math.max(maxY, point[1])
  }

  const width = maxX - minX
  const height = maxY - minY
  const largerDimension = Math.max(width, height)
  if (largerDimension === 0) {
    return normalized.map(() => [500, 500] as const)
  }

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const scale = 0.8 / largerDimension
  return normalized.map((point) => [
    width === 0 ? 500 : Math.round((0.5 + (point[0] - centerX) * scale) * 1000),
    height === 0 ? 500 : Math.round((0.5 + (point[1] - centerY) * scale) * 1000),
  ] as const)
}
