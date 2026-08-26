export interface ProbeGuess {
  v: 1
  kind: 'guess'
  sessionId: string
  seq: number
  guessId: string
  choiceIndex: 0 | 1 | 2 | 3
  sentAtMs: number
}

export interface ProbePing {
  v: 1
  kind: 'ping'
  sessionId: string
  seq: number
  pingId: string
  sentAtMs: number
}

const BOUNDED_ID = /^[A-Za-z0-9_-]{1,64}$/
const MAX_SERIALIZED_BYTES = 1_024

const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value)

export const createProbeIdSet = (): { [id: string]: boolean } =>
  Object.create(null) as { [id: string]: boolean }

export function parseProbeInbound(
  value: unknown,
  expectedSession: string,
  lastAcceptedSequence: number,
  seenGuessIds: { [id: string]: boolean },
): ProbeGuess | ProbePing | null {
  let serialized: string
  try {
    const candidate = JSON.stringify(value)
    if (typeof candidate !== 'string') return null
    serialized = candidate
  }
  catch {
    return null
  }

  if (new TextEncoder().encode(serialized).byteLength >= MAX_SERIALIZED_BYTES) {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }

  const message = value as { [key: string]: unknown }
  if (message.v !== 1 || message.sessionId !== expectedSession) return null
  if (!isInteger(message.seq) || message.seq < 1 ||
      message.seq <= lastAcceptedSequence) return null
  if (typeof message.sentAtMs !== 'number' ||
      !Number.isFinite(message.sentAtMs)) return null

  if (message.kind === 'guess') {
    if (typeof message.guessId !== 'string' ||
        !BOUNDED_ID.test(message.guessId) ||
        Object.prototype.hasOwnProperty.call(
          seenGuessIds,
          message.guessId,
        )) return null
    if (!isInteger(message.choiceIndex) ||
        message.choiceIndex < 0 || message.choiceIndex > 3) return null
    return value as ProbeGuess
  }

  if (message.kind === 'ping') {
    if (typeof message.pingId !== 'string' ||
        !BOUNDED_ID.test(message.pingId)) return null
    return value as ProbePing
  }

  return null
}
