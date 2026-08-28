export const PROTOCOL_VERSION = 2 as const
export const BROADCAST_EVENT = 'wordless-message' as const
export const LOBBY_ROUND_ID = 'lobby' as const
export const MAX_BATCH_POINTS = 8
export const MAX_STROKE_POINTS = 128
export const MAX_MESSAGE_BYTES = 1024
export const POINT_BATCH_INTERVAL_MS = 100
export const SESSION_ID_LENGTH = 6
export const CONNECTION_ID_LENGTH = 8
export const MAX_SENDER_ID_LENGTH = 32
export const MAX_ROUND_ID_LENGTH = 32
export const MAX_STROKE_ID_LENGTH = 32
export const MAX_GUESS_ID_LENGTH = 32
export const MAX_PING_ID_LENGTH = 32
export const MAX_WORD_LENGTH = 12
export const INSTANCE_NONCE_LENGTH = 8

export type ChoiceIndex = 0 | 1 | 2 | 3
export type ChoiceTuple = readonly [string, string, string, string]
export type StrokeColorId = 'violet' | 'lemon' | 'mint'
export type QuantizedPoint = readonly [number, number]
export interface WorldPoint { readonly x: number; readonly y: number; readonly z: number }
export type GlyphNormalizer = (
  points: readonly QuantizedPoint[],
) => readonly QuantizedPoint[]
export interface PointBatch {
  readonly batch: readonly QuantizedPoint[]
  readonly rest: readonly QuantizedPoint[]
}
export type PointBatcher = (
  points: readonly QuantizedPoint[],
) => PointBatch
export type RoundPhase =
  | 'DISCONNECTED' | 'JOINING' | 'READY' | 'ACTIVE'
  | 'CORRECT' | 'GLYPH_LOCKED' | 'TIMED_OUT'

export type GuessRejectionReason =
  | 'WRONG_PHASE' | 'WRONG_ROUND'
  | 'DUPLICATE_GUESS' | 'CHOICE_ALREADY_TRIED'
  | 'STALE_SEQUENCE' | 'SEQUENCE_GAP'

export type ResyncReason = 'POINT_COUNT_MISMATCH'

export type RoundResultPayload =
  | {
      readonly outcome: 'correct'
      readonly guessId: string
      readonly choiceIndex: ChoiceIndex
      readonly revealedWord: string
      readonly finalPointCount: number
    }
  | {
      readonly outcome: 'incorrect'
      readonly guessId: string
      readonly choiceIndex: ChoiceIndex
    }

interface BaseMessage<T extends string, P> {
  readonly v: 2
  readonly type: T
  readonly sessionId: string
  readonly roundId: string
  readonly senderId: string
  readonly sequence: number
  readonly sentAtMs: number
  readonly payload: P
}

export type RelayMessage =
  | BaseMessage<'presence.ready', {
      role: 'painter' | 'guesser'
      connectionId: string
    }>
  | BaseMessage<'presence.ack', {
      role: 'painter' | 'guesser'
      connectionId: string
      acknowledgedConnectionId: string
    }>
  | BaseMessage<'round.start', {
      choices: ChoiceTuple
      durationMs: number
      targetConnectionId: string
    }>
  | BaseMessage<'stroke.begin', { strokeId: string; colorId: StrokeColorId }>
  | BaseMessage<'stroke.points', {
      strokeId: string
      points: readonly QuantizedPoint[]
    }>
  | BaseMessage<'stroke.end', { strokeId: string }>
  | BaseMessage<'guess.submit', {
      guessId: string
      choiceIndex: ChoiceIndex
    }>
  | BaseMessage<'round.result', RoundResultPayload>
  | BaseMessage<'guess.rejected', {
      guessId: string
      choiceIndex: ChoiceIndex
      reason: GuessRejectionReason
    }>
  | BaseMessage<'round.timeout', { finalPointCount: number }>
  | BaseMessage<'round.resync.request', { reason: ResyncReason }>
  | BaseMessage<'round.reset', {
      nextRoundId: string
      targetConnectionId: string
    }>
  | BaseMessage<'round.reset.ack', { nextRoundId: string }>
  | BaseMessage<'transport.ping', {
      pingId: string
      originSentAtMs: number
    }>
  | BaseMessage<'transport.ack', {
      pingId: string
      originSentAtMs: number
    }>

type TransportOwnedFields =
  | 'v' | 'sessionId' | 'senderId' | 'sequence' | 'sentAtMs'
type WithoutTransportOwnedFields<T> = T extends RelayMessage
  ? Omit<T, TransportOwnedFields>
  : never
export type RelayMessageDraft = WithoutTransportOwnedFields<RelayMessage>

export interface RoundStartInput {
  readonly sessionId: string
  readonly roundId: string
  readonly senderId: string
  readonly sequence: number
  readonly sentAtMs: number
  readonly choices: ChoiceTuple
  readonly durationMs: number
  readonly targetConnectionId: string
}

type UnknownRecord = Record<string, unknown>

const SESSION_ID_PATTERN = /^[A-Z0-9]{6}$/
const CONNECTION_ID_PATTERN = /^[A-Z0-9]{8}$/
const INSTANCE_NONCE_PATTERN = /^[A-Z0-9]{8}$/
const BOUNDED_ID_PATTERN = /^[A-Za-z0-9_-]+$/
const WORD_PATTERN = /^[A-Z]+$/

const GUESS_REJECTION_REASONS: readonly GuessRejectionReason[] = [
  'WRONG_PHASE',
  'WRONG_ROUND',
  'DUPLICATE_GUESS',
  'CHOICE_ALREADY_TRIED',
  'STALE_SEQUENCE',
  'SEQUENCE_GAP',
]

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBoundedId(value: unknown, maximumLength: number): value is string {
  return typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= maximumLength &&
    BOUNDED_ID_PATTERN.test(value)
}

function isSessionId(value: unknown): value is string {
  return typeof value === 'string' && SESSION_ID_PATTERN.test(value)
}

function isConnectionId(value: unknown): value is string {
  return typeof value === 'string' && CONNECTION_ID_PATTERN.test(value)
}

export function isProductRoundId(value: unknown): value is string {
  return isBoundedId(value, MAX_ROUND_ID_LENGTH) && value !== LOBBY_ROUND_ID
}

function isChoiceIndex(value: unknown): value is ChoiceIndex {
  return value === 0 || value === 1 || value === 2 || value === 3
}

export function isStrokeColorId(value: unknown): value is StrokeColorId {
  return value === 'violet' || value === 'lemon' || value === 'mint'
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1
}

function isFinalPointCount(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_STROKE_POINTS
}

function isWord(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= MAX_WORD_LENGTH &&
    WORD_PATTERN.test(value)
}

function sanitizeChoices(value: unknown): ChoiceTuple | null {
  if (!Array.isArray(value) || value.length !== 4) return null
  if (!value.every(isWord)) return null
  if (new Set(value).size !== 4) return null
  return [value[0], value[1], value[2], value[3]]
}

function sanitizePoints(value: unknown): readonly QuantizedPoint[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_BATCH_POINTS) {
    return null
  }
  const points: QuantizedPoint[] = []
  for (const valuePoint of value) {
    if (!Array.isArray(valuePoint) || valuePoint.length !== 2) return null
    const x = valuePoint[0]
    const y = valuePoint[1]
    if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x > 1000 ||
        typeof y !== 'number' || !Number.isInteger(y) || y < 0 || y > 1000) {
      return null
    }
    points.push([x, y])
  }
  return points
}

function isRole(value: unknown): value is 'painter' | 'guesser' {
  return value === 'painter' || value === 'guesser'
}

function isGuessRejectionReason(value: unknown): value is GuessRejectionReason {
  return GUESS_REJECTION_REASONS.includes(value as GuessRejectionReason)
}

function withBase<T extends RelayMessage['type'], P>(
  input: UnknownRecord,
  type: T,
  payload: P,
): Extract<RelayMessage, { type: T }> {
  return {
    v: PROTOCOL_VERSION,
    type,
    sessionId: input.sessionId as string,
    roundId: input.roundId as string,
    senderId: input.senderId as string,
    sequence: input.sequence as number,
    sentAtMs: input.sentAtMs as number,
    payload,
  } as unknown as Extract<RelayMessage, { type: T }>
}

function hasValidBase(input: UnknownRecord): boolean {
  return input.v === PROTOCOL_VERSION &&
    typeof input.type === 'string' &&
    isSessionId(input.sessionId) &&
    isBoundedId(input.senderId, MAX_SENDER_ID_LENGTH) &&
    isPositiveSafeInteger(input.sequence) &&
    isTimestamp(input.sentAtMs) &&
    isRecord(input.payload)
}

function hasExpectedRoundScope(type: string, roundId: unknown): boolean {
  const lobbyScoped = type === 'presence.ready' ||
    type === 'presence.ack' ||
    type === 'transport.ping' ||
    type === 'transport.ack'
  return lobbyScoped ? roundId === LOBBY_ROUND_ID : isProductRoundId(roundId)
}

function snapshotRelayInput(value: unknown): UnknownRecord | null {
  try {
    const text = JSON.stringify(value)
    if (typeof text !== 'string' || text.length > MAX_MESSAGE_BYTES) return null
    for (let index = 0; index < text.length; index += 1) {
      if (text.charCodeAt(index) > 127) return null
    }
    const snapshot: unknown = JSON.parse(text)
    return isRecord(snapshot) ? snapshot : null
  }
  catch {
    return null
  }
}

export function createRoundId(instanceNonce: string, counter: number): string {
  if (typeof instanceNonce !== 'string' ||
      !INSTANCE_NONCE_PATTERN.test(instanceNonce) ||
      !Number.isSafeInteger(counter) || counter < 1) {
    throw new Error('invalid round ID input')
  }
  const roundId = `r-${instanceNonce}-${counter}`
  if (roundId.length > MAX_ROUND_ID_LENGTH) {
    throw new Error('invalid round ID length')
  }
  return roundId
}

export function buildRoundStart(
  input: RoundStartInput,
): Extract<RelayMessage, { type: 'round.start' }> {
  const parsed = parseRelayMessage({
    v: PROTOCOL_VERSION,
    type: 'round.start',
    sessionId: input.sessionId,
    roundId: input.roundId,
    senderId: input.senderId,
    sequence: input.sequence,
    sentAtMs: input.sentAtMs,
    payload: {
      choices: input.choices,
      durationMs: input.durationMs,
      targetConnectionId: input.targetConnectionId,
    },
  })
  if (!parsed || parsed.type !== 'round.start') {
    throw new Error('invalid round start')
  }
  return parsed
}

export function parseRelayMessage(value: unknown): RelayMessage | null {
  try {
    const input = snapshotRelayInput(value)
    if (!input || !hasValidBase(input) ||
        !hasExpectedRoundScope(input.type as string, input.roundId)) {
      return null
    }

    const payload = input.payload as UnknownRecord
    switch (input.type) {
      case 'presence.ready': {
        if (!isRole(payload.role) || !isConnectionId(payload.connectionId)) return null
        return withBase(input, 'presence.ready', {
          role: payload.role,
          connectionId: payload.connectionId,
        })
      }
      case 'presence.ack': {
        if (!isRole(payload.role) ||
            !isConnectionId(payload.connectionId) ||
            !isConnectionId(payload.acknowledgedConnectionId)) return null
        return withBase(input, 'presence.ack', {
          role: payload.role,
          connectionId: payload.connectionId,
          acknowledgedConnectionId: payload.acknowledgedConnectionId,
        })
      }
      case 'round.start': {
        const choices = sanitizeChoices(payload.choices)
        if (!choices || !isPositiveSafeInteger(payload.durationMs) ||
            !isConnectionId(payload.targetConnectionId)) return null
        return withBase(input, 'round.start', {
          choices,
          durationMs: payload.durationMs,
          targetConnectionId: payload.targetConnectionId,
        })
      }
      case 'stroke.begin': {
        if (!isBoundedId(payload.strokeId, MAX_STROKE_ID_LENGTH) ||
            !isStrokeColorId(payload.colorId)) return null
        return withBase(input, 'stroke.begin', {
          strokeId: payload.strokeId,
          colorId: payload.colorId,
        })
      }
      case 'stroke.end': {
        if (!isBoundedId(payload.strokeId, MAX_STROKE_ID_LENGTH)) return null
        return withBase(input, 'stroke.end', { strokeId: payload.strokeId })
      }
      case 'stroke.points': {
        if (!isBoundedId(payload.strokeId, MAX_STROKE_ID_LENGTH)) return null
        const points = sanitizePoints(payload.points)
        if (!points) return null
        return withBase(input, 'stroke.points', {
          strokeId: payload.strokeId,
          points,
        })
      }
      case 'guess.submit': {
        if (!isBoundedId(payload.guessId, MAX_GUESS_ID_LENGTH) ||
            !isChoiceIndex(payload.choiceIndex)) return null
        return withBase(input, 'guess.submit', {
          guessId: payload.guessId,
          choiceIndex: payload.choiceIndex,
        })
      }
      case 'round.result': {
        if (!isBoundedId(payload.guessId, MAX_GUESS_ID_LENGTH) ||
            !isChoiceIndex(payload.choiceIndex)) return null
        if (payload.outcome === 'correct') {
          if (!isWord(payload.revealedWord) ||
              !isFinalPointCount(payload.finalPointCount)) return null
          return withBase(input, 'round.result', {
            outcome: 'correct',
            guessId: payload.guessId,
            choiceIndex: payload.choiceIndex,
            revealedWord: payload.revealedWord,
            finalPointCount: payload.finalPointCount,
          })
        }
        if (payload.outcome !== 'incorrect') return null
        return withBase(input, 'round.result', {
          outcome: 'incorrect',
          guessId: payload.guessId,
          choiceIndex: payload.choiceIndex,
        })
      }
      case 'guess.rejected': {
        if (!isBoundedId(payload.guessId, MAX_GUESS_ID_LENGTH) ||
            !isChoiceIndex(payload.choiceIndex) ||
            !isGuessRejectionReason(payload.reason)) return null
        return withBase(input, 'guess.rejected', {
          guessId: payload.guessId,
          choiceIndex: payload.choiceIndex,
          reason: payload.reason,
        })
      }
      case 'round.timeout': {
        if (!isFinalPointCount(payload.finalPointCount)) return null
        return withBase(input, 'round.timeout', {
          finalPointCount: payload.finalPointCount,
        })
      }
      case 'round.resync.request': {
        if (payload.reason !== 'POINT_COUNT_MISMATCH') return null
        return withBase(input, 'round.resync.request', {
          reason: payload.reason,
        })
      }
      case 'round.reset': {
        if (!isProductRoundId(payload.nextRoundId) ||
            !isConnectionId(payload.targetConnectionId)) return null
        return withBase(input, 'round.reset', {
          nextRoundId: payload.nextRoundId,
          targetConnectionId: payload.targetConnectionId,
        })
      }
      case 'round.reset.ack': {
        if (!isProductRoundId(payload.nextRoundId)) return null
        return withBase(input, 'round.reset.ack', {
          nextRoundId: payload.nextRoundId,
        })
      }
      case 'transport.ping':
      case 'transport.ack': {
        if (!isBoundedId(payload.pingId, MAX_PING_ID_LENGTH) ||
            !isTimestamp(payload.originSentAtMs)) return null
        return withBase(input, input.type, {
          pingId: payload.pingId,
          originSentAtMs: payload.originSentAtMs,
        })
      }
      default:
        return null
    }
  }
  catch {
    return null
  }
}

export function serializedAsciiBytes(value: unknown): number {
  const text = JSON.stringify(value)
  for (let i = 0; i < text.length; i += 1) {
    if (text.charCodeAt(i) > 127) return Number.POSITIVE_INFINITY
  }
  return text.length
}
