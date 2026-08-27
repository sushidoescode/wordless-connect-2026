export type GlyphTransitionPoint = readonly [x: number, y: number]

export function easeOutCubic(progress: number): number {
  if (!Number.isFinite(progress)) {
    throw new Error('glyph transition progress must be finite')
  }
  const clamped = Math.max(0, Math.min(1, progress))
  return 1 - Math.pow(1 - clamped, 3)
}

export function interpolatePath(
  from: readonly GlyphTransitionPoint[],
  to: readonly GlyphTransitionPoint[],
  progress: number,
): readonly GlyphTransitionPoint[] {
  if (from.length !== to.length) throw new Error('path length mismatch')
  const t = easeOutCubic(progress)
  if (t === 0) {
    return from.map((point) => [point[0], point[1]] as const)
  }
  if (t === 1) {
    return to.map((point) => [point[0], point[1]] as const)
  }
  return from.map((point, index) => [
    point[0] + (to[index][0] - point[0]) * t,
    point[1] + (to[index][1] - point[1]) * t,
  ] as const)
}
