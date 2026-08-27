import {
  MAX_STROKE_POINTS,
  isProductRoundId,
} from '../Core/Protocol'
import type { QuantizedPoint, WorldPoint } from '../Core/Protocol'
import {
  DRAWING_HEIGHT_CM,
  DRAWING_WIDTH_CM,
  acceptWorldPoint,
  quantizePlanePoint,
} from '../Core/StrokeGeometry'

export type BrushLocalToWorld = (local: WorldPoint) => WorldPoint

export type BrushStrokeAction =
  | {
      readonly type: 'stroke-start'
      readonly strokeId: string
    }
  | {
      readonly type: 'stroke-point'
      readonly strokeId: string
      readonly local: WorldPoint
      readonly world: WorldPoint
      readonly normalized: QuantizedPoint
    }
  | {
      readonly type: 'stroke-end'
      readonly strokeId: string
      readonly reason: 'manual' | 'cap'
      readonly pointCount: number
    }

export interface BrushStrokeDiagnostics {
  readonly acceptedCount: number
  readonly maxAbsLocalZ: number
  readonly minimumSpacingCm: number | null
  readonly endCount: number
  readonly capReached: boolean
}

function snapshotPoint(value: unknown): WorldPoint | null {
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
  }
  catch {
    return null
  }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

export function constrainToDrawingPlane(value: unknown): WorldPoint | null {
  const point = snapshotPoint(value)
  if (point === null) return null
  return {
    x: clamp(point.x, -DRAWING_WIDTH_CM / 2, DRAWING_WIDTH_CM / 2),
    y: clamp(point.y, -DRAWING_HEIGHT_CM / 2, DRAWING_HEIGHT_CM / 2),
    z: 0,
  }
}

function distance(a: WorldPoint, b: WorldPoint): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dz = b.z - a.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export class BrushStrokeSession {
  private readonly localToWorld: BrushLocalToWorld
  private roundId: string | null = null
  private roundConsumed = true
  private manipulationHeld = false
  private activeStrokeId: string | null = null
  private strokeEnded = false
  private strokeOrdinal = 0
  private acceptedWorldPoints: WorldPoint[] = []
  private acceptedCount = 0
  private maxAbsLocalZ = 0
  private minimumSpacingCm: number | null = null
  private endCount = 0
  private capReached = false

  constructor(localToWorld: BrushLocalToWorld) {
    this.localToWorld = localToWorld
  }

  armForRound(roundId: string): boolean {
    if (!isProductRoundId(roundId) || roundId === this.roundId) return false

    this.roundId = roundId
    this.roundConsumed = false
    this.activeStrokeId = null
    this.strokeEnded = false
    this.acceptedWorldPoints = []
    this.acceptedCount = 0
    this.maxAbsLocalZ = 0
    this.minimumSpacingCm = null
    this.endCount = 0
    this.capReached = false
    return true
  }

  beginManipulation(): readonly BrushStrokeAction[] {
    if (this.manipulationHeld) return []
    this.manipulationHeld = true
    if (this.roundId === null || this.roundConsumed) return []

    this.roundConsumed = true
    this.strokeEnded = false
    this.acceptedWorldPoints = []
    this.strokeOrdinal += 1
    this.activeStrokeId = `stroke-${this.strokeOrdinal}`
    return [{
      type: 'stroke-start',
      strokeId: this.activeStrokeId,
    }]
  }

  sample(rawPlaneLocal: WorldPoint): readonly BrushStrokeAction[] {
    const strokeId = this.activeStrokeId
    if (!this.manipulationHeld || strokeId === null || this.strokeEnded) return []

    const local = constrainToDrawingPlane(rawPlaneLocal)
    if (local === null) return []

    let mapped: unknown
    try {
      mapped = this.localToWorld(local)
    }
    catch {
      return []
    }
    const world = snapshotPoint(mapped)
    if (world === null || !acceptWorldPoint(this.acceptedWorldPoints, world)) {
      return []
    }

    const previous = this.acceptedWorldPoints.length === 0
      ? null
      : this.acceptedWorldPoints[this.acceptedWorldPoints.length - 1]
    this.acceptedWorldPoints.push(world)
    this.acceptedCount = this.acceptedWorldPoints.length
    this.maxAbsLocalZ = Math.max(this.maxAbsLocalZ, Math.abs(local.z))
    if (previous !== null) {
      const spacing = distance(previous, world)
      this.minimumSpacingCm = this.minimumSpacingCm === null
        ? spacing
        : Math.min(this.minimumSpacingCm, spacing)
    }

    const pointAction: BrushStrokeAction = {
      type: 'stroke-point',
      strokeId,
      local,
      world: { x: world.x, y: world.y, z: world.z },
      normalized: quantizePlanePoint(local),
    }
    if (this.acceptedWorldPoints.length < MAX_STROKE_POINTS) {
      return [pointAction]
    }

    this.strokeEnded = true
    this.capReached = true
    this.endCount += 1
    return [
      pointAction,
      {
        type: 'stroke-end',
        strokeId,
        reason: 'cap',
        pointCount: this.acceptedWorldPoints.length,
      },
    ]
  }

  endManipulation(): readonly BrushStrokeAction[] {
    if (!this.manipulationHeld) return []
    this.manipulationHeld = false

    const strokeId = this.activeStrokeId
    this.activeStrokeId = null
    if (strokeId === null || this.strokeEnded) return []

    this.strokeEnded = true
    this.endCount += 1
    return [{
      type: 'stroke-end',
      strokeId,
      reason: 'manual',
      pointCount: this.acceptedWorldPoints.length,
    }]
  }

  getDiagnostics(): BrushStrokeDiagnostics {
    return Object.freeze({
      acceptedCount: this.acceptedCount,
      maxAbsLocalZ: this.maxAbsLocalZ,
      minimumSpacingCm: this.minimumSpacingCm,
      endCount: this.endCount,
      capReached: this.capReached,
    })
  }
}
