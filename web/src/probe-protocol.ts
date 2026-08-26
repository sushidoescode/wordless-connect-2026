export type ProbeMessage =
  | { v: 1; kind: 'points'; sessionId: string; seq: number; points: [number, number][]; sentAtMs: number }
  | { v: 1; kind: 'guess'; sessionId: string; seq: number; guessId: string; choiceIndex: 0 | 1 | 2 | 3; sentAtMs: number }
  | { v: 1; kind: 'ping'; sessionId: string; seq: number; pingId: string; sentAtMs: number }
  | { v: 1; kind: 'ack'; sessionId: string; seq: number; pingId: string; sentAtMs: number }

export const topicFor = (sessionId: string): string => {
  if (!/^[A-Z0-9]{6}$/.test(sessionId)) throw new Error('invalid session id')
  return `wordless-relay:${sessionId}`
}

const isInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value)

export function parseProbeMessage(
  value: unknown,
  expectedSession: string,
): ProbeMessage | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  let serialized: string
  try {
    const candidate = JSON.stringify(value)
    if (typeof candidate !== 'string') return null
    serialized = candidate
  }
  catch {
    return null
  }
  if (new TextEncoder().encode(serialized).byteLength >= 1024) return null
  if (v.v !== 1 || v.sessionId !== expectedSession ||
      !/^[A-Z0-9]{6}$/.test(expectedSession)) return null
  if (!isInt(v.seq) || v.seq < 1) return null
  if (typeof v.sentAtMs !== 'number' || !Number.isFinite(v.sentAtMs)) return null
  if (v.kind === 'points') {
    if (!Array.isArray(v.points) || v.points.length > 8) return null
    const valid = v.points.every((point) => Array.isArray(point) && point.length === 2 &&
      point.every((axis) => isInt(axis) && axis >= 0 && axis <= 1000))
    return valid ? value as ProbeMessage : null
  }
  if (v.kind === 'guess') {
    return typeof v.guessId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v.guessId) && isInt(v.choiceIndex) &&
      v.choiceIndex >= 0 && v.choiceIndex <= 3 ? value as ProbeMessage : null
  }
  if (v.kind === 'ping' || v.kind === 'ack') {
    return typeof v.pingId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v.pingId)
      ? value as ProbeMessage : null
  }
  return null
}
