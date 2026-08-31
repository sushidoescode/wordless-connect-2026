import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BROADCAST_EVENT,
  CONNECTION_ID_LENGTH,
  INSTANCE_NONCE_LENGTH,
  LOBBY_ROUND_ID,
  MAX_BATCH_POINTS,
  MAX_GUESS_ID_LENGTH,
  MAX_MESSAGE_BYTES,
  MAX_PING_ID_LENGTH,
  MAX_ROUND_ID_LENGTH,
  MAX_SENDER_ID_LENGTH,
  MAX_STROKE_ID_LENGTH,
  MAX_STROKE_POINTS,
  MAX_WORD_LENGTH,
  PAINTER_COLOR_IDS,
  POINT_BATCH_INTERVAL_MS,
  PROTOCOL_VERSION,
  SESSION_ID_LENGTH,
  buildRoundStart,
  createRoundId,
  parseRelayMessage,
  serializedAsciiBytes,
} from '../../Assets/Wordless/Scripts/Core/Protocol.ts'

const base = (type, payload, overrides = {}) => ({
  v: 3,
  type,
  sessionId: 'WAVE42',
  roundId: 'round-1',
  senderId: 'lens-a1',
  sequence: 1,
  sentAtMs: 100,
  payload,
  ...overrides,
})

test('frozen public constants retain the literal wire contract', () => {
  assert.equal(PROTOCOL_VERSION, 3)
  assert.equal(BROADCAST_EVENT, 'wordless-message')
  assert.equal(LOBBY_ROUND_ID, 'lobby')
  assert.equal(MAX_BATCH_POINTS, 8)
  assert.equal(MAX_STROKE_POINTS, 128)
  assert.equal(MAX_MESSAGE_BYTES, 1024)
  assert.equal(POINT_BATCH_INTERVAL_MS, 100)
  assert.equal(SESSION_ID_LENGTH, 6)
  assert.equal(CONNECTION_ID_LENGTH, 8)
  assert.equal(MAX_SENDER_ID_LENGTH, 32)
  assert.equal(MAX_ROUND_ID_LENGTH, 32)
  assert.equal(MAX_STROKE_ID_LENGTH, 32)
  assert.equal(MAX_GUESS_ID_LENGTH, 32)
  assert.equal(MAX_PING_ID_LENGTH, 32)
  assert.equal(MAX_WORD_LENGTH, 12)
  assert.equal(INSTANCE_NONCE_LENGTH, 8)
})

test('stroke begin accepts only the v3 painter color tokens', () => {
  assert.deepEqual([...PAINTER_COLOR_IDS], [
    'scarlet', 'orange', 'lemon', 'lime',
    'cyan', 'cobalt', 'violet', 'magenta',
  ])
  for (const colorId of PAINTER_COLOR_IDS) {
    const parsed = parseRelayMessage(base('stroke.begin', {
      strokeId: 'stroke-1', colorId,
    }, { v: 3 }))
    assert.equal(parsed?.type, 'stroke.begin')
    assert.equal(parsed?.payload.colorId, colorId)
  }

  for (const colorId of [undefined, 'mint', 'coral', 'ivory', 'plum',
    '#8B5CF6', '#FF3B5C', 'rgb(139,92,246)', ['scarlet'], '', 1, null]) {
    assert.equal(parseRelayMessage(base('stroke.begin',
      colorId === undefined
        ? { strokeId: 'stroke-1' }
        : { strokeId: 'stroke-1', colorId },
      { v: 3 },
    )), null)
  }

  for (const staleVersion of [
    PROTOCOL_VERSION - 1,
    PROTOCOL_VERSION - 2,
    PROTOCOL_VERSION + 1,
    '3',
    null,
  ]) {
    assert.equal(parseRelayMessage(base('stroke.begin', {
      strokeId: 'stroke-1', colorId: 'violet',
    }, { v: staleVersion })), null)
  }
})

test('round start exposes choices but no answer index', () => {
  const message = buildRoundStart({
    sessionId: 'WAVE42', roundId: 'round-1', senderId: 'lens-a1', sequence: 1,
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'], durationMs: 20000,
    targetConnectionId: 'BROWSER1',
    sentAtMs: 100,
  })
  assert.equal(message.v, PROTOCOL_VERSION)
  assert.equal(message.payload.targetConnectionId, 'BROWSER1')
  assert.equal('correctIndex' in message.payload, false)
  assert.equal(JSON.stringify(message).includes('correctIndex'), false)
})

test('point batches are bounded, ordered, and copied from caller input', () => {
  assert.equal(MAX_BATCH_POINTS, 8)
  assert.equal(MAX_STROKE_POINTS, 128)
  const firstPoint = [0, 0]
  const input = base('stroke.points', {
    strokeId: 'stroke-1',
    points: [firstPoint, [1000, 1000]],
  }, { sequence: 2 })
  const parsed = parseRelayMessage(input)

  assert.equal(parsed?.type, 'stroke.points')
  assert.deepEqual(parsed?.payload.points, [[0, 0], [1000, 1000]])
  assert.notEqual(parsed, input)
  assert.notEqual(parsed?.payload, input.payload)
  assert.notEqual(parsed?.payload.points, input.payload.points)
  assert.notEqual(parsed?.payload.points[0], firstPoint)
})

test('invalid messages are rejected', () => {
  const invalid = [
    null,
    { v: PROTOCOL_VERSION - 1 },
    base('guess.submit', { guessId: 'guess-1', choiceIndex: 9 }, {
      sessionId: 'BAD',
    }),
    base('stroke.points', { strokeId: 'stroke-1', points: [[-1, 0]] }),
    base('stroke.points', {
      strokeId: 'stroke-1',
      points: Array.from({ length: MAX_BATCH_POINTS + 1 }, () => [0, 0]),
    }),
    base('stroke.points', { strokeId: 'stroke-1', points: [[0.5, 0]] }),
    base('stroke.begin', { strokeId: 'stroke-é' }),
    base('round.start', {
      choices: ['SNAKE', 'SNAKE', 'ROPE', 'WAVE'],
      durationMs: 20_000,
      targetConnectionId: 'BROWSER1',
    }),
    base('round.start', {
      choices: ['SNAKE', 'RIVER', 'ROPE', 'wave'],
      durationMs: 20_000,
      targetConnectionId: 'BROWSER1',
    }),
    base('unknown', {}),
  ]

  for (const value of invalid) assert.equal(parseRelayMessage(value), null)
})

test('ASCII byte accounting is exact and marks non-ASCII as unbounded', () => {
  assert.equal(serializedAsciiBytes({ word: 'SNAKE' }), 16)
  assert.equal(serializedAsciiBytes({ word: 'CAFÉ' }), Number.POSITIVE_INFINITY)
})

test('correct result stays below cap and never carries geometry', () => {
  const message = base('round.result', {
    outcome: 'correct', guessId: 'guess-1', choiceIndex: 0,
    revealedWord: 'SNAKE', finalPointCount: 128,
  }, { sequence: 3 })
  assert.equal('glyph' in message.payload, false)
  assert.ok(serializedAsciiBytes(message) <= 1024)
  assert.equal(parseRelayMessage(message)?.type, 'round.result')

  const callerPayloadWithGeometry = {
    ...message,
    payload: { ...message.payload, glyph: [[0, 0]] },
  }
  const sanitized = parseRelayMessage(callerPayloadWithGeometry)
  assert.equal(sanitized?.type, 'round.result')
  assert.equal('glyph' in sanitized.payload, false)
})

test('terminal point counts and production round IDs are bounded', () => {
  for (const type of ['round.result', 'round.timeout']) {
    for (const finalPointCount of [0, MAX_STROKE_POINTS]) {
      const payload = type === 'round.result'
        ? {
            outcome: 'correct', guessId: 'guess-1', choiceIndex: 0,
            revealedWord: 'SNAKE', finalPointCount,
          }
        : { finalPointCount }
      assert.equal(parseRelayMessage(base(type, payload))?.type, type)
    }
    for (const finalPointCount of [-1, MAX_STROKE_POINTS + 1, 1.5]) {
      const payload = type === 'round.result'
        ? {
            outcome: 'correct', guessId: 'guess-1', choiceIndex: 0,
            revealedWord: 'SNAKE', finalPointCount,
          }
        : { finalPointCount }
      assert.equal(parseRelayMessage(base(type, payload)), null)
    }
  }

  assert.equal(createRoundId('A1B2C3D4', 1), 'r-A1B2C3D4-1')
  assert.notEqual(createRoundId('A1B2C3D4', 1), createRoundId('Z9Y8X7W6', 1))
  assert.ok(createRoundId('A1B2C3D4', Number.MAX_SAFE_INTEGER).length <= MAX_ROUND_ID_LENGTH)
  assert.throws(() => createRoundId(12345678, 1), /invalid/i)
  for (const [nonce, counter] of [
    ['A1B2C3', 1],
    ['a1B2C3D4', 1],
    ['A1B2C3D!', 1],
    ['A1B2C3D4', 0],
    ['A1B2C3D4', -1],
    ['A1B2C3D4', 1.5],
    ['A1B2C3D4', Number.MAX_SAFE_INTEGER + 1],
  ]) {
    assert.throws(() => createRoundId(nonce, counter), /invalid/i)
  }
})

test('wire sequences are positive safe integers', () => {
  const presence = (sequence) => base('presence.ready', {
    role: 'painter', connectionId: 'PAINTER1',
  }, { roundId: LOBBY_ROUND_ID, sequence })

  for (const sequence of [1, Number.MAX_SAFE_INTEGER]) {
    assert.equal(parseRelayMessage(presence(sequence))?.sequence, sequence)
  }
  for (const sequence of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(parseRelayMessage(presence(sequence)), null)
  }
})

test('connection IDs plus start and reset targets are exact and bounded', () => {
  const ready = (connectionId) => base('presence.ready', {
    role: 'guesser', connectionId,
  }, { roundId: LOBBY_ROUND_ID })
  const ack = (connectionId, acknowledgedConnectionId) => base('presence.ack', {
    role: 'painter', connectionId, acknowledgedConnectionId,
  }, { roundId: LOBBY_ROUND_ID })
  const start = (targetConnectionId) => base('round.start', {
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
    durationMs: 20_000,
    targetConnectionId,
  })
  const reset = (targetConnectionId) => base('round.reset', {
    nextRoundId: 'round-2',
    targetConnectionId,
  })

  assert.equal(parseRelayMessage(ready('BROWSER1'))?.type, 'presence.ready')
  assert.equal(parseRelayMessage(ack('PAINTER1', 'BROWSER1'))?.type, 'presence.ack')
  assert.equal(parseRelayMessage(start('BROWSER1'))?.type, 'round.start')
  assert.equal(parseRelayMessage(reset('BROWSER1'))?.type, 'round.reset')

  for (const invalidId of [undefined, 'SHORT1', 'browser1', 'TOOLONG99']) {
    assert.equal(parseRelayMessage(ready(invalidId)), null)
    assert.equal(parseRelayMessage(ack(invalidId, 'BROWSER1')), null)
    assert.equal(parseRelayMessage(ack('PAINTER1', invalidId)), null)
    assert.equal(parseRelayMessage(start(invalidId)), null)
    assert.equal(parseRelayMessage(reset(invalidId)), null)
  }
})

test('snapshots base and nested accessors once before validation and projection', () => {
  let senderReads = 0
  const senderMessage = base('stroke.begin', {
    strokeId: 'stroke-1', colorId: 'violet',
  })
  Object.defineProperty(senderMessage, 'senderId', {
    enumerable: true,
    get() {
      senderReads += 1
      return senderReads <= 2 ? 'lens-a1' : 's'.repeat(2_000)
    },
  })

  let strokeReads = 0
  const changingPayload = new Proxy({}, {
    ownKeys: () => ['strokeId', 'colorId'],
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
    get(_target, property) {
      if (property === 'colorId') return 'violet'
      if (property !== 'strokeId') return undefined
      strokeReads += 1
      return strokeReads <= 2 ? 'stroke-1' : 't'.repeat(2_000)
    },
  })
  const payloadMessage = base('stroke.begin', changingPayload)

  const parsedSender = parseRelayMessage(senderMessage)
  const parsedPayload = parseRelayMessage(payloadMessage)

  assert.equal(senderReads, 1)
  assert.equal(strokeReads, 1)
  assert.equal(parsedSender?.senderId, 'lens-a1')
  assert.equal(parsedPayload?.payload.strokeId, 'stroke-1')
  assert.ok(serializedAsciiBytes(parsedSender) <= MAX_MESSAGE_BYTES)
  assert.ok(serializedAsciiBytes(parsedPayload) <= MAX_MESSAGE_BYTES)
})

test('lobby and product message scopes are exact', () => {
  assert.equal(parseRelayMessage(base('transport.ping', {
    pingId: 'ping-1', originSentAtMs: 50,
  }, { roundId: LOBBY_ROUND_ID }))?.type, 'transport.ping')
  assert.equal(parseRelayMessage(base('transport.ping', {
    pingId: 'ping-1', originSentAtMs: 50,
  })), null)
  assert.equal(parseRelayMessage(base('stroke.begin', {
    strokeId: 'stroke-1', colorId: 'violet',
  }, { roundId: LOBBY_ROUND_ID })), null)
})

test('every maximal legal message variant stays under the wire cap', () => {
  const sessionId = 'A'.repeat(SESSION_ID_LENGTH)
  const connectionId = 'B'.repeat(CONNECTION_ID_LENGTH)
  const acknowledgedConnectionId = 'C'.repeat(CONNECTION_ID_LENGTH)
  const senderId = 's'.repeat(MAX_SENDER_ID_LENGTH)
  const roundId = 'r'.repeat(MAX_ROUND_ID_LENGTH)
  const nextRoundId = 'n'.repeat(MAX_ROUND_ID_LENGTH)
  const strokeId = 't'.repeat(MAX_STROKE_ID_LENGTH)
  const guessId = 'g'.repeat(MAX_GUESS_ID_LENGTH)
  const pingId = 'p'.repeat(MAX_PING_ID_LENGTH)
  const choices = ['A', 'B', 'C', 'D'].map((letter) =>
    letter.repeat(MAX_WORD_LENGTH))
  const common = {
    v: 3,
    sessionId,
    senderId,
    sequence: Number.MAX_SAFE_INTEGER,
    sentAtMs: Number.MAX_VALUE,
  }
  const message = (type, payload, productRound = true) => ({
    ...common,
    type,
    roundId: productRound ? roundId : LOBBY_ROUND_ID,
    payload,
  })
  const variants = [
    message('presence.ready', { role: 'painter', connectionId }, false),
    message('presence.ack', {
      role: 'guesser', connectionId, acknowledgedConnectionId,
    }, false),
    message('round.start', {
      choices, durationMs: Number.MAX_SAFE_INTEGER, targetConnectionId: connectionId,
    }),
    message('stroke.begin', { strokeId, colorId: 'magenta' }),
    message('stroke.points', {
      strokeId,
      points: Array.from({ length: MAX_BATCH_POINTS }, () => [1000, 1000]),
    }),
    message('stroke.end', { strokeId }),
    message('guess.submit', { guessId, choiceIndex: 3 }),
    message('round.result', {
      outcome: 'correct', guessId, choiceIndex: 3,
      revealedWord: 'Z'.repeat(MAX_WORD_LENGTH),
      finalPointCount: MAX_STROKE_POINTS,
    }),
    message('round.result', {
      outcome: 'incorrect', guessId, choiceIndex: 3,
    }),
    message('guess.rejected', {
      guessId, choiceIndex: 3, reason: 'CHOICE_ALREADY_TRIED',
    }),
    message('round.timeout', { finalPointCount: MAX_STROKE_POINTS }),
    message('round.resync.request', { reason: 'POINT_COUNT_MISMATCH' }),
    message('round.reset', { nextRoundId, targetConnectionId: connectionId }),
    message('round.reset.ack', { nextRoundId }),
    message('transport.ping', {
      pingId, originSentAtMs: Number.MAX_VALUE,
    }, false),
    message('transport.ack', {
      pingId, originSentAtMs: Number.MAX_VALUE,
    }, false),
  ]

  assert.equal(INSTANCE_NONCE_LENGTH, 8)
  assert.equal(variants.length, 16)
  for (const candidate of variants) {
    const parsed = parseRelayMessage(candidate)
    assert.equal(parsed?.type, candidate.type, candidate.type)
    assert.ok(
      serializedAsciiBytes(candidate) <= MAX_MESSAGE_BYTES,
      `${candidate.type} serialized to ${serializedAsciiBytes(candidate)} bytes`,
    )
  }
})

test('oversized, non-ASCII, unserializable, and non-finite messages fail closed', () => {
  const oversized = base('stroke.begin', {
    strokeId: 'stroke-1',
  }, { padding: 'x'.repeat(MAX_MESSAGE_BYTES) })
  const circular = {}
  circular.self = circular

  assert.equal(parseRelayMessage(oversized), null)
  assert.equal(parseRelayMessage(base('stroke.begin', {
    strokeId: 'stroke-1',
  }, { senderId: 'lens-é' })), null)
  assert.equal(parseRelayMessage(base('stroke.begin', {
    strokeId: 'stroke-1',
  }, { sentAtMs: Number.POSITIVE_INFINITY })), null)
  assert.equal(parseRelayMessage(circular), null)
  assert.equal(parseRelayMessage({ value: 1n }), null)
})
