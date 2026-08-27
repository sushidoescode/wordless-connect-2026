import assert from 'node:assert/strict'
import test from 'node:test'

import { parseRelayMessage } from '../../Assets/Wordless/Scripts/Core/Protocol.ts'
import { ReceivePolicy } from '../../Assets/Wordless/Scripts/Core/ReceivePolicy.ts'

const SESSION = 'ABC123'
const OTHER_SESSION = 'XYZ789'
const LENS_LOCAL = 'LENS0001'
const LENS_NEXT = 'LENS0002'
const BROWSER_LOCAL = 'BROW0001'
const BROWSER_OLD = 'BROW0000'
const BROWSER_NEW = 'BROW0002'
const GUESS_CONN_A = 'GUES0001'
const GUESS_CONN_B = 'GUES0002'
const GUESS_CONN_D = 'GUES0004'
const PAINT_CONN_A = 'PAIN0001'
const PAINT_CONN_B = 'PAIN0002'
const ROUND_A = 'round-a'
const ROUND_B = 'round-b'
const ROUND_C = 'round-c'

const ACCEPT = Object.freeze({ accepted: true, peerTransition: null })

function accepted(peerTransition = null) {
  return { accepted: true, peerTransition }
}

function rejected(reason) {
  return { accepted: false, reason }
}

function message(
  type,
  {
    senderId,
    sequence,
    roundId,
    payload,
    sessionId = SESSION,
  },
) {
  const parsed = parseRelayMessage({
    v: 1,
    type,
    sessionId,
    roundId,
    senderId,
    sequence,
    sentAtMs: sequence * 10,
    payload,
  })
  assert.notEqual(parsed, null, `test fixture must parse: ${type}`)
  return parsed
}

function ready(
  senderId,
  connectionId,
  sequence,
  role,
  sessionId = SESSION,
) {
  return message('presence.ready', {
    senderId,
    sequence,
    sessionId,
    roundId: 'lobby',
    payload: { role, connectionId },
  })
}

function presenceAck(
  senderId,
  connectionId,
  targetConnectionId,
  sequence,
  role,
  sessionId = SESSION,
) {
  return message('presence.ack', {
    senderId,
    sequence,
    sessionId,
    roundId: 'lobby',
    payload: {
      role,
      connectionId,
      acknowledgedConnectionId: targetConnectionId,
    },
  })
}

function ping(senderId, sequence) {
  return message('transport.ping', {
    senderId,
    sequence,
    roundId: 'lobby',
    payload: { pingId: `ping-${sequence}`, originSentAtMs: sequence },
  })
}

function guess(senderId, sequence, roundId = ROUND_A) {
  return message('guess.submit', {
    senderId,
    sequence,
    roundId,
    payload: { guessId: `guess-${sequence}`, choiceIndex: 1 },
  })
}

function result(senderId, sequence, roundId = ROUND_A) {
  return message('round.result', {
    senderId,
    sequence,
    roundId,
    payload: {
      outcome: 'incorrect',
      guessId: `guess-${sequence}`,
      choiceIndex: 1,
    },
  })
}

function strokeBegin(senderId, sequence, roundId = ROUND_A) {
  return message('stroke.begin', {
    senderId,
    sequence,
    roundId,
    payload: { strokeId: `stroke-${sequence}` },
  })
}

function roundStart(
  senderId,
  sequence,
  roundId,
  targetConnectionId = BROWSER_LOCAL,
) {
  return message('round.start', {
    senderId,
    sequence,
    roundId,
    payload: {
      choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
      durationMs: 20_000,
      targetConnectionId,
    },
  })
}

function roundReset(
  senderId,
  sequence,
  oldRoundId,
  nextRoundId,
  targetConnectionId = BROWSER_LOCAL,
) {
  return message('round.reset', {
    senderId,
    sequence,
    roundId: oldRoundId,
    payload: { nextRoundId, targetConnectionId },
  })
}

function resetAck(senderId, sequence, roundId) {
  return message('round.reset.ack', {
    senderId,
    sequence,
    roundId,
    payload: { nextRoundId: roundId },
  })
}

function resync(senderId, sequence, roundId) {
  return message('round.resync.request', {
    senderId,
    sequence,
    roundId,
    payload: { reason: 'POINT_COUNT_MISMATCH' },
  })
}

function painterPolicy(localConnectionId = LENS_LOCAL) {
  const policy = new ReceivePolicy(SESSION, 'painter')
  policy.beginLocalSubscription(localConnectionId, false)
  return policy
}

function guesserPolicy(localConnectionId = BROWSER_LOCAL) {
  const policy = new ReceivePolicy(SESSION, 'guesser')
  policy.beginLocalSubscription(localConnectionId, false)
  return policy
}

test('unbound correct-role ready establishes any positive baseline and the next message is contiguous', () => {
  const caseA = painterPolicy()
  assert.deepEqual(
    caseA.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser')),
    ACCEPT,
  )
  assert.deepEqual(caseA.evaluate(ping('guesser-a', 2)), ACCEPT)

  const caseB = painterPolicy()
  assert.deepEqual(
    caseB.evaluate(ready('guesser-a', GUESS_CONN_A, 2, 'guesser')),
    ACCEPT,
  )
  assert.deepEqual(caseB.evaluate(ping('guesser-a', 3)), ACCEPT)
})

test('only a targeted presence ack for the current local connection confirms the tuple', () => {
  const policy = painterPolicy()
  policy.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser'))
  assert.equal(policy.getConfirmedPeerConnectionId(), null)

  assert.deepEqual(
    policy.evaluate(
      presenceAck('guesser-a', GUESS_CONN_A, LENS_LOCAL, 2, 'guesser'),
    ),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), GUESS_CONN_A)
  assert.deepEqual(
    policy.evaluate(
      presenceAck('guesser-a', GUESS_CONN_A, LENS_NEXT, 3, 'guesser'),
    ),
    rejected('STALE_CONNECTION'),
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), GUESS_CONN_A)
  assert.deepEqual(policy.evaluate(ping('guesser-a', 4)), ACCEPT)
})

test('the open handshake accepts ready retries and targeted ack across missing lobby controls', () => {
  const policy = painterPolicy()
  assert.deepEqual(
    policy.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser')),
    ACCEPT,
  )
  // Sequence 2 was sent but not delivered.
  assert.deepEqual(
    policy.evaluate(ready('guesser-a', GUESS_CONN_A, 3, 'guesser')),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(
      presenceAck('guesser-a', GUESS_CONN_A, LENS_LOCAL, 4, 'guesser'),
    ),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), GUESS_CONN_A)
})

test('a current-target ack bridges missed peer sequences after local reconnect', () => {
  const policy = painterPolicy()
  policy.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser'))
  policy.evaluate(
    presenceAck('guesser-a', GUESS_CONN_A, LENS_LOCAL, 2, 'guesser'),
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), GUESS_CONN_A)

  policy.beginLocalSubscription(LENS_NEXT, true)
  assert.equal(policy.getConfirmedPeerConnectionId(), null)
  assert.deepEqual(
    policy.evaluate(
      presenceAck('guesser-a', GUESS_CONN_A, LENS_NEXT, 7, 'guesser'),
    ),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), GUESS_CONN_A)
  assert.deepEqual(policy.evaluate(ping('guesser-a', 8)), ACCEPT)
})

test('duplicate and stale sequence input never advances the bound peer high-water', () => {
  const duplicate = painterPolicy()
  duplicate.evaluate(ready('guesser-a', GUESS_CONN_A, 2, 'guesser'))
  assert.deepEqual(
    duplicate.evaluate(ping('guesser-a', 2)),
    rejected('DUPLICATE_SEQUENCE'),
  )
  assert.deepEqual(duplicate.evaluate(ping('guesser-a', 3)), ACCEPT)

  const stale = painterPolicy()
  stale.evaluate(ready('guesser-a', GUESS_CONN_A, 40, 'guesser'))
  assert.deepEqual(
    stale.evaluate(ping('guesser-a', 1)),
    rejected('STALE_SEQUENCE'),
  )
  assert.deepEqual(stale.evaluate(ping('guesser-a', 41)), ACCEPT)
})

test('contiguous wrong-round and wrong-authority messages reject but consume high-water', () => {
  const wrongRound = painterPolicy()
  wrongRound.setLocalRound(ROUND_A)
  wrongRound.evaluate(ready('guesser-a', GUESS_CONN_A, 40, 'guesser'))
  assert.deepEqual(
    wrongRound.evaluate(guess('guesser-a', 41, ROUND_B)),
    rejected('WRONG_ROUND'),
  )
  assert.deepEqual(wrongRound.evaluate(guess('guesser-a', 42)), ACCEPT)

  const wrongAuthority = painterPolicy()
  wrongAuthority.setLocalRound(ROUND_A)
  wrongAuthority.evaluate(ready('guesser-a', GUESS_CONN_A, 40, 'guesser'))
  assert.deepEqual(
    wrongAuthority.evaluate(result('guesser-a', 41)),
    rejected('WRONG_AUTHORITY'),
  )
  assert.deepEqual(wrongAuthority.evaluate(guess('guesser-a', 42)), ACCEPT)
})

test('a real gap quarantines ordinary traffic and local resync advances through the maximum observation', () => {
  const policy = painterPolicy()
  policy.setLocalRound(ROUND_A)
  policy.evaluate(ready('guesser-a', GUESS_CONN_A, 40, 'guesser'))
  assert.deepEqual(
    policy.evaluate(guess('guesser-a', 42)),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(guess('guesser-a', 43)),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(guess('guesser-a', 44)),
    rejected('SEQUENCE_GAP'),
  )

  policy.completeLocalResync('someone-else')
  policy.completeLocalResync('guesser-a')
  assert.deepEqual(policy.evaluate(guess('guesser-a', 45)), ACCEPT)
  assert.deepEqual(
    policy.evaluate(guess('guesser-a', 44)),
    rejected('STALE_SEQUENCE'),
  )
})

test('new sender and same-sender new connection emit exact structural peer transitions', () => {
  const replacement = painterPolicy()
  replacement.evaluate(ready('guesser-a', GUESS_CONN_A, 40, 'guesser'))
  assert.deepEqual(
    replacement.evaluate(ready('guesser-b', GUESS_CONN_B, 1, 'guesser')),
    accepted({
      type: 'PEER_REPLACED',
      previousSenderId: 'guesser-a',
      nextSenderId: 'guesser-b',
      previousConnectionId: GUESS_CONN_A,
      nextConnectionId: GUESS_CONN_B,
    }),
  )
  assert.equal(replacement.getConfirmedPeerConnectionId(), null)

  const rejoin = painterPolicy()
  rejoin.evaluate(ready('guesser-c', GUESS_CONN_A, 37, 'guesser'))
  assert.deepEqual(
    rejoin.evaluate(ready('guesser-c', GUESS_CONN_D, 38, 'guesser')),
    accepted({
      type: 'PEER_REJOINED',
      senderId: 'guesser-c',
      previousConnectionId: GUESS_CONN_A,
      nextConnectionId: GUESS_CONN_D,
    }),
  )
  assert.deepEqual(
    rejoin.evaluate(ready('guesser-c', GUESS_CONN_D, 39, 'guesser')),
    ACCEPT,
  )
  assert.deepEqual(
    rejoin.evaluate(ready('guesser-c', GUESS_CONN_B, 38, 'guesser')),
    rejected('STALE_SEQUENCE'),
  )
})

test('wrong-session, wrong-role presence, and unbound product input cannot bind or advance', () => {
  const policy = painterPolicy()
  assert.deepEqual(
    policy.evaluate(
      ready('guesser-a', GUESS_CONN_A, 50, 'guesser', OTHER_SESSION),
    ),
    rejected('WRONG_SESSION'),
  )
  assert.deepEqual(
    policy.evaluate(ready('painter-a', PAINT_CONN_A, 20, 'painter')),
    rejected('WRONG_AUTHORITY'),
  )
  assert.deepEqual(
    policy.evaluate(guess('guesser-a', 30)),
    rejected('UNKNOWN_SENDER'),
  )
  assert.deepEqual(
    policy.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser')),
    ACCEPT,
  )
  assert.deepEqual(policy.evaluate(ping('guesser-a', 2)), ACCEPT)
})

test('wrong-session input from a bound peer does not consume its sequence', () => {
  const policy = painterPolicy()
  policy.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser'))
  assert.deepEqual(
    policy.evaluate(
      presenceAck(
        'guesser-a',
        GUESS_CONN_A,
        LENS_LOCAL,
        2,
        'guesser',
        OTHER_SESSION,
      ),
    ),
    rejected('WRONG_SESSION'),
  )
  assert.deepEqual(policy.evaluate(ping('guesser-a', 2)), ACCEPT)
})

test('lobby traffic is round-exempt and terminal-round mismatch resync is policy-routable', () => {
  const policy = painterPolicy()
  policy.setLocalRound(ROUND_A)
  policy.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser'))
  assert.deepEqual(policy.evaluate(ping('guesser-a', 2)), ACCEPT)
  assert.deepEqual(policy.evaluate(resync('guesser-a', 3, ROUND_A)), ACCEPT)
  assert.deepEqual(
    policy.evaluate(resync('guesser-a', 4, ROUND_B)),
    rejected('WRONG_ROUND'),
  )
  assert.deepEqual(policy.evaluate(ping('guesser-a', 5)), ACCEPT)
})

test('browser initial start bridges missed lobby control, binds the round, and makes later ack idempotent', () => {
  const policy = guesserPolicy()
  assert.deepEqual(
    policy.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter')),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), null)
  // Painter-authored targeted ack sequence 2 was lost.
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 3, ROUND_A)),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), PAINT_CONN_A)
  assert.deepEqual(
    policy.evaluate(
      presenceAck('painter-a', PAINT_CONN_A, BROWSER_LOCAL, 4, 'painter'),
    ),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 5, ROUND_A)),
    ACCEPT,
  )
})

test('stale-target initial start consumes only a contiguous sequence and cannot bind or confirm', () => {
  const policy = guesserPolicy(BROWSER_NEW)
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter'))
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 2, ROUND_A, BROWSER_OLD)),
    rejected('STALE_CONNECTION'),
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), null)
  assert.deepEqual(
    policy.evaluate(
      presenceAck('painter-a', PAINT_CONN_A, BROWSER_NEW, 3, 'painter'),
    ),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), PAINT_CONN_A)
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 4, ROUND_B, BROWSER_NEW)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 5, ROUND_B)),
    ACCEPT,
  )
})

test('accepted old-to-new reset switches authorization and only the next-round start succeeds', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter'))
  policy.evaluate(roundStart('painter-a', 2, ROUND_A))
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 3, ROUND_A, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 4, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 5, ROUND_A)),
    rejected('WRONG_ROUND'),
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 6, ROUND_B)),
    ACCEPT,
  )
})

test('fresh browser rejects stale-target reset without binding, then current ready and reset recover', () => {
  const policy = guesserPolicy(BROWSER_NEW)
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter'))
  assert.deepEqual(
    policy.evaluate(
      roundReset('painter-a', 2, ROUND_A, ROUND_B, BROWSER_OLD),
    ),
    rejected('STALE_CONNECTION'),
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), null)
  assert.deepEqual(
    policy.evaluate(ready('painter-a', PAINT_CONN_A, 3, 'painter')),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(
      roundReset('painter-a', 4, ROUND_A, ROUND_B, BROWSER_NEW),
    ),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), PAINT_CONN_A)
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 5, ROUND_B, BROWSER_NEW)),
    ACCEPT,
  )
})

test('current-target reset is an authorized barrier when it is the first gapped message', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 39, 'painter'))
  policy.evaluate(roundStart('painter-a', 40, ROUND_A))
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 42, ROUND_A, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 43, ROUND_B)),
    ACCEPT,
  )
})

test('later reset retry must reach the latest gap observation before releasing quarantine', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 39, 'painter'))
  policy.evaluate(roundStart('painter-a', 40, ROUND_A))
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 42, ROUND_A)),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 43, ROUND_A)),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 42, ROUND_A, ROUND_B)),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 44, ROUND_A, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 45, ROUND_B)),
    ACCEPT,
  )
})

test('cached previous-to-current reset retries are accepted idempotently', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter'))
  policy.evaluate(roundStart('painter-a', 2, ROUND_A))
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 3, ROUND_A, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 4, ROUND_A, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 5, ROUND_B)),
    ACCEPT,
  )
})

test('wrong sender and unrelated resets cannot release an existing gap', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 39, 'painter'))
  policy.evaluate(roundStart('painter-a', 40, ROUND_A))
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 42, ROUND_A)),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(roundReset('painter-b', 500, ROUND_A, ROUND_B)),
    rejected('UNKNOWN_SENDER'),
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 43, ROUND_A)),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 44, ROUND_C, ROUND_B)),
    rejected('WRONG_ROUND'),
  )
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 45, ROUND_A, ROUND_B)),
    ACCEPT,
  )
})

test('matching pending reset ack can bridge the first guesser gap and clear quarantine', () => {
  const policy = painterPolicy()
  policy.setLocalRound(ROUND_A)
  policy.evaluate(ready('guesser-a', GUESS_CONN_A, 39, 'guesser'))
  policy.evaluate(
    presenceAck('guesser-a', GUESS_CONN_A, LENS_LOCAL, 40, 'guesser'),
  )
  policy.setLocalRound(ROUND_B)
  assert.deepEqual(
    policy.evaluate(resetAck('guesser-a', 42, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(policy.evaluate(guess('guesser-a', 43, ROUND_B)), ACCEPT)
})

test('immediate previous/current resync routes before and after reset ack while older rounds reject', () => {
  const policy = painterPolicy()
  policy.setLocalRound(ROUND_A)
  policy.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser'))
  policy.evaluate(
    presenceAck('guesser-a', GUESS_CONN_A, LENS_LOCAL, 2, 'guesser'),
  )
  policy.setLocalRound(ROUND_B)

  assert.deepEqual(policy.evaluate(resync('guesser-a', 3, ROUND_A)), ACCEPT)
  assert.deepEqual(policy.evaluate(resync('guesser-a', 4, ROUND_B)), ACCEPT)
  assert.deepEqual(policy.evaluate(resetAck('guesser-a', 5, ROUND_B)), ACCEPT)
  assert.deepEqual(policy.evaluate(resync('guesser-a', 6, ROUND_A)), ACCEPT)
  assert.deepEqual(
    policy.evaluate(resync('guesser-a', 7, ROUND_C)),
    rejected('WRONG_ROUND'),
  )
  assert.deepEqual(policy.evaluate(resync('guesser-a', 8, ROUND_B)), ACCEPT)
})

test('stale-target reset consumes when contiguous but cannot act as a gapped barrier', () => {
  const policy = guesserPolicy(BROWSER_LOCAL)
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 39, 'painter'))
  policy.evaluate(roundStart('painter-a', 40, ROUND_A, BROWSER_LOCAL))
  policy.beginLocalSubscription(BROWSER_NEW, true)

  assert.deepEqual(
    policy.evaluate(
      presenceAck('painter-a', PAINT_CONN_A, BROWSER_NEW, 41, 'painter'),
    ),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 42, ROUND_A, BROWSER_NEW)),
    rejected('WRONG_ROUND'),
  )
  assert.deepEqual(
    policy.evaluate(
      roundReset('painter-a', 43, ROUND_A, ROUND_B, BROWSER_LOCAL),
    ),
    rejected('STALE_CONNECTION'),
  )
  assert.deepEqual(
    policy.evaluate(
      roundReset('painter-a', 45, ROUND_A, ROUND_B, BROWSER_LOCAL),
    ),
    rejected('SEQUENCE_GAP'),
  )
  assert.deepEqual(
    policy.evaluate(
      roundReset('painter-a', 46, ROUND_A, ROUND_B, BROWSER_NEW),
    ),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), PAINT_CONN_A)
})

test('browser peer replacement clears old product authorization and starts a fresh epoch', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter'))
  policy.evaluate(roundStart('painter-a', 2, ROUND_A))

  assert.deepEqual(
    policy.evaluate(ready('painter-b', PAINT_CONN_B, 50, 'painter')),
    accepted({
      type: 'PEER_REPLACED',
      previousSenderId: 'painter-a',
      nextSenderId: 'painter-b',
      previousConnectionId: PAINT_CONN_A,
      nextConnectionId: PAINT_CONN_B,
    }),
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 3, ROUND_A)),
    rejected('UNKNOWN_SENDER'),
  )
  assert.deepEqual(
    policy.evaluate(roundStart('painter-b', 51, ROUND_B)),
    ACCEPT,
  )
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-b', 52, ROUND_B)),
    ACCEPT,
  )
})

test('same-sender peer rejoin retains the prior round solely for an authorized reset', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter'))
  policy.evaluate(roundStart('painter-a', 2, ROUND_A))
  assert.deepEqual(
    policy.evaluate(ready('painter-a', PAINT_CONN_B, 3, 'painter')),
    accepted({
      type: 'PEER_REJOINED',
      senderId: 'painter-a',
      previousConnectionId: PAINT_CONN_A,
      nextConnectionId: PAINT_CONN_B,
    }),
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), null)
  assert.deepEqual(
    policy.evaluate(strokeBegin('painter-a', 4, ROUND_A)),
    rejected('WRONG_ROUND'),
  )
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 5, ROUND_A, ROUND_B)),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), PAINT_CONN_B)
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 6, ROUND_B)),
    ACCEPT,
  )
})

test('browser can bind a noninitial reset from a present painter when no product round exists', () => {
  const policy = guesserPolicy()
  policy.evaluate(ready('painter-a', PAINT_CONN_A, 8, 'painter'))
  assert.deepEqual(
    policy.evaluate(roundReset('painter-a', 10, ROUND_A, ROUND_B)),
    ACCEPT,
  )
  assert.equal(policy.getConfirmedPeerConnectionId(), PAINT_CONN_A)
  assert.deepEqual(
    policy.evaluate(roundStart('painter-a', 11, ROUND_B)),
    ACCEPT,
  )
})

test('authority is role-directed after binding and rejected contiguous traffic is consumed', () => {
  const painter = painterPolicy()
  painter.setLocalRound(ROUND_A)
  painter.evaluate(ready('guesser-a', GUESS_CONN_A, 1, 'guesser'))
  assert.deepEqual(painter.evaluate(guess('guesser-a', 2)), ACCEPT)
  assert.deepEqual(
    painter.evaluate(strokeBegin('guesser-a', 3)),
    rejected('WRONG_AUTHORITY'),
  )
  assert.deepEqual(painter.evaluate(ping('guesser-a', 4)), ACCEPT)

  const guesser = guesserPolicy()
  guesser.evaluate(ready('painter-a', PAINT_CONN_A, 1, 'painter'))
  guesser.evaluate(roundStart('painter-a', 2, ROUND_A))
  assert.deepEqual(guesser.evaluate(result('painter-a', 3)), ACCEPT)
  assert.deepEqual(
    guesser.evaluate(guess('painter-a', 4)),
    rejected('WRONG_AUTHORITY'),
  )
  assert.deepEqual(guesser.evaluate(ping('painter-a', 5)), ACCEPT)
})
