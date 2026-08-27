import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RecoveryCoordinator,
} from '../../Assets/Wordless/Scripts/Core/RecoveryCoordinator.ts'

const LOCAL_A = 'LENS0001'
const LOCAL_B = 'LENS0002'
const PEER_A = Object.freeze({
  senderId: 'guesser-a',
  peerConnectionId: 'BROW0001',
  localConnectionId: LOCAL_A,
})
const PEER_B = Object.freeze({
  senderId: 'guesser-a',
  peerConnectionId: 'BROW0002',
  localConnectionId: LOCAL_A,
})
const PEER_B_AFTER_LOCAL_RECOVERY = Object.freeze({
  senderId: 'guesser-a',
  peerConnectionId: 'BROW0002',
  localConnectionId: LOCAL_B,
})
const PEER_C = Object.freeze({
  senderId: 'guesser-b',
  peerConnectionId: 'BROW0003',
  localConnectionId: LOCAL_A,
})
const RESET_AB = Object.freeze({
  previousRoundId: 'round-a',
  nextRoundId: 'round-b',
})
const RESET_BC = Object.freeze({
  previousRoundId: 'round-b',
  nextRoundId: 'round-c',
})

function actionTypes(actions) {
  return actions.map(({ type }) => type)
}

function bindTuple(coordinator, tuple = PEER_A) {
  assert.deepEqual(coordinator.handle({ type: 'PEER_TUPLE_ACK', ...tuple }), [])
}

function registerAppliedReset(
  coordinator,
  applyAction,
  transition = RESET_AB,
) {
  assert.equal(applyAction.type, 'APPLY_ROUND')
  return coordinator.handle({
    type: 'RESET_PENDING',
    tokenId: applyAction.tokenId,
    transition,
  })
}

function markResetSent(coordinator, sendAction) {
  assert.ok(sendAction.type === 'SEND_RESET' || sendAction.type === 'RESEND_RESET')
  assert.deepEqual(coordinator.handle({
    type: 'RESET_SENT',
    tokenId: sendAction.tokenId,
    nextRoundId: sendAction.transition.nextRoundId,
  }), [])
}

function acknowledgeReset(coordinator, sendAction, tuple) {
  return coordinator.handle({
    type: 'RESET_ACK',
    tokenId: sendAction.tokenId,
    nextRoundId: sendAction.transition.nextRoundId,
    ...tuple,
  })
}

test('all unexpected local failures acquire one close/connect flight', async (t) => {
  const reasons = [
    'COUNTERPART_TIMED_OUT',
    'CHANNEL_ERROR',
    'TIMED_OUT',
    'CLOSED',
    'DISCONNECTED',
    'AMBIGUOUS_SEND',
  ]

  for (const reason of reasons) {
    await t.test(reason, () => {
      const coordinator = new RecoveryCoordinator()
      const actions = coordinator.handle({ type: 'LOCAL_FAILURE', reason })

      assert.deepEqual(actionTypes(actions), [
        'INVALIDATE_APPLICATION',
        'DISCONNECT_ENGINE',
        'CLOSE_LOCAL',
      ])
      assert.deepEqual([...new Set(actions.map(({ tokenId }) => tokenId))], [
        'recovery-1',
      ])
      assert.equal(coordinator.getDiagnostics().state, 'AWAITING_LOCAL_CLOSE')
      assert.equal(coordinator.getDiagnostics().expectedLocalClose, true)
      assert.deepEqual(actionTypes(coordinator.handle({
        type: 'LOCAL_CLOSE_SETTLED',
        tokenId: 'recovery-1',
        status: 'CLOSED',
      })), ['CONNECT_LOCAL'])
      assert.equal(
        coordinator.getDiagnostics().state,
        'AWAITING_LOCAL_SUBSCRIPTION',
      )
    })
  }
})

test('teardown between local close and its callback suppresses reconnect', () => {
  const coordinator = new RecoveryCoordinator()
  const failureActions = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  })
  const tokenId = failureActions[0].tokenId

  assert.deepEqual(actionTypes(failureActions), [
    'INVALIDATE_APPLICATION',
    'DISCONNECT_ENGINE',
    'CLOSE_LOCAL',
  ])
  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId,
    status: 'DISCONNECTED',
  }), [])
  assert.deepEqual(actionTypes(coordinator.handle({ type: 'TEARDOWN' })), [])
  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId,
    status: 'CLOSED',
  }), [])
  assert.equal(coordinator.getDiagnostics().state, 'CLOSED')
})

test('teardown while reconnect awaits subscription closes that issued channel', () => {
  const coordinator = new RecoveryCoordinator()
  const [entry] = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  })
  const connect = coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: entry.tokenId,
    status: 'CLOSED',
  })
  assert.deepEqual(actionTypes(connect), ['CONNECT_LOCAL'])
  assert.equal(
    coordinator.getDiagnostics().state,
    'AWAITING_LOCAL_SUBSCRIPTION',
  )

  const teardown = coordinator.handle({ type: 'TEARDOWN' })
  assert.deepEqual(actionTypes(teardown), ['CLOSE_LOCAL'])
  assert.equal(teardown[0].tokenId, entry.tokenId)
  assert.deepEqual(coordinator.handle({ type: 'TEARDOWN' }), [])
  assert.deepEqual(coordinator.handle({ type: 'LOCAL_SUBSCRIBED' }), [])
  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: entry.tokenId,
    status: 'CLOSED',
  }), [])
  assert.equal(coordinator.getDiagnostics().state, 'CLOSED')
})

test('teardown after local resubscription closes the reopened channel once', () => {
  const coordinator = new RecoveryCoordinator()
  const [entry] = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  })
  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: entry.tokenId,
    status: 'CLOSED',
  })), ['CONNECT_LOCAL'])
  assert.deepEqual(coordinator.handle({ type: 'LOCAL_SUBSCRIBED' }), [])

  const teardown = coordinator.handle({ type: 'TEARDOWN' })
  assert.deepEqual(actionTypes(teardown), ['CLOSE_LOCAL'])
  assert.equal(teardown[0].tokenId, entry.tokenId)
  assert.deepEqual(coordinator.handle({ type: 'TEARDOWN' }), [])
  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: entry.tokenId,
    status: 'CLOSED',
  }), [])
  assert.equal(coordinator.getDiagnostics().state, 'CLOSED')
})

test('a reopened local channel can enter one new close flight before peer recovery', () => {
  const coordinator = new RecoveryCoordinator()
  const first = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  })
  const tokenId = first[0].tokenId
  coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId,
    status: 'CLOSED',
  })
  coordinator.handle({ type: 'LOCAL_SUBSCRIBED' })

  const second = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'TIMED_OUT',
  })
  assert.deepEqual(actionTypes(second), [
    'INVALIDATE_APPLICATION',
    'DISCONNECT_ENGINE',
    'CLOSE_LOCAL',
  ])
  assert.ok(second.every((action) => action.tokenId === tokenId))
  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  }), [])
  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId,
    status: 'CLOSED',
  })), ['CONNECT_LOCAL'])
})

test('expected close callbacks and overlapping local failures cannot recurse', () => {
  const coordinator = new RecoveryCoordinator()
  const trace = [
    ...coordinator.handle({ type: 'LOCAL_FAILURE', reason: 'CHANNEL_ERROR' }),
    ...coordinator.handle({ type: 'LOCAL_FAILURE', reason: 'DISCONNECTED' }),
    ...coordinator.handle({ type: 'LOCAL_FAILURE', reason: 'CLOSED' }),
    ...coordinator.handle({
      type: 'LOCAL_CLOSE_SETTLED',
      tokenId: 'recovery-1',
      status: 'DISCONNECTED',
    }),
    ...coordinator.handle({
      type: 'LOCAL_CLOSE_SETTLED',
      tokenId: 'recovery-1',
      status: 'CLOSED',
    }),
    ...coordinator.handle({
      type: 'LOCAL_CLOSE_SETTLED',
      tokenId: 'recovery-1',
      status: 'DISCONNECTED',
    }),
    ...coordinator.handle({ type: 'LOCAL_FAILURE', reason: 'TIMED_OUT' }),
  ]

  assert.equal(trace.filter(({ type }) => type === 'CLOSE_LOCAL').length, 1)
  assert.equal(trace.filter(({ type }) => type === 'CONNECT_LOCAL').length, 1)
  assert.equal(trace.filter(({ type }) => type === 'APPLY_ROUND').length, 0)

  assert.deepEqual(coordinator.handle({ type: 'LOCAL_SUBSCRIBED' }), [])
  assert.equal(coordinator.getDiagnostics().expectedLocalClose, false)
  assert.equal(coordinator.getDiagnostics().state, 'AWAITING_PEER_ACK')
})

test('late close callbacks are token-scoped and a later failure gets a fresh lifecycle', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const firstFailure = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  })
  const firstTokenId = firstFailure[0].tokenId
  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: firstTokenId,
    status: 'CLOSED',
  })), ['CONNECT_LOCAL'])
  coordinator.handle({ type: 'LOCAL_SUBSCRIBED' })
  const [apply] = coordinator.handle({
    type: 'PEER_TUPLE_ACK',
    ...PEER_B_AFTER_LOCAL_RECOVERY,
  })
  const [send] = registerAppliedReset(coordinator, apply)
  markResetSent(coordinator, send)
  assert.equal(
    acknowledgeReset(coordinator, send, PEER_B_AFTER_LOCAL_RECOVERY)[0].type,
    'START_ROUND',
  )

  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: firstTokenId,
    status: 'DISCONNECTED',
  }), [])
  const secondFailure = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'COUNTERPART_TIMED_OUT',
  })
  assert.deepEqual(actionTypes(secondFailure), [
    'INVALIDATE_APPLICATION',
    'DISCONNECT_ENGINE',
    'CLOSE_LOCAL',
  ])
  assert.equal(secondFailure[0].tokenId, 'recovery-2')
  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: firstTokenId,
    status: 'CLOSED',
  }), [])
  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: 'recovery-2',
    status: 'CLOSED',
  })), ['CONNECT_LOCAL'])
})

test('early and duplicate subscribed facts cannot skip or reopen recovery phases', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const failure = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  })
  const tokenId = failure[0].tokenId

  assert.deepEqual(coordinator.handle({ type: 'LOCAL_SUBSCRIBED' }), [])
  assert.equal(coordinator.getDiagnostics().state, 'AWAITING_LOCAL_CLOSE')
  assert.equal(coordinator.getDiagnostics().expectedLocalClose, true)
  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId,
    status: 'CLOSED',
  })), ['CONNECT_LOCAL'])
  assert.deepEqual(coordinator.handle({ type: 'LOCAL_SUBSCRIBED' }), [])
  const [apply] = coordinator.handle({
    type: 'PEER_TUPLE_ACK',
    ...PEER_B_AFTER_LOCAL_RECOVERY,
  })
  const beforeDuplicate = coordinator.getDiagnostics()

  assert.equal(apply.type, 'APPLY_ROUND')
  assert.deepEqual(coordinator.handle({ type: 'LOCAL_SUBSCRIBED' }), [])
  const afterDuplicate = coordinator.getDiagnostics()
  assert.equal(afterDuplicate.state, beforeDuplicate.state)
  assert.deepEqual(
    afterDuplicate.peerTupleConfirmed,
    beforeDuplicate.peerTupleConfirmed,
  )
})

test('a peer rejoin keeps the local channel and waits for its exact tuple ack', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)

  const transitionActions = coordinator.handle({
    type: 'PEER_TRANSITION',
    transition: 'PEER_REJOINED',
    senderId: PEER_B.senderId,
    peerConnectionId: PEER_B.peerConnectionId,
  })
  assert.deepEqual(actionTypes(transitionActions), [
    'INVALIDATE_APPLICATION',
    'DISCONNECT_ENGINE',
  ])
  assert.equal(transitionActions.some(({ type }) => type === 'CLOSE_LOCAL'), false)
  assert.equal(transitionActions.some(({ type }) => type === 'CONNECT_LOCAL'), false)

  assert.deepEqual(coordinator.handle({
    type: 'PEER_TUPLE_ACK',
    ...PEER_B,
    localConnectionId: LOCAL_B,
  }), [])
  assert.deepEqual(coordinator.handle({
    type: 'PEER_TUPLE_ACK',
    ...PEER_B,
    senderId: 'guesser-stale',
  }), [])

  const [apply] = coordinator.handle({ type: 'PEER_TUPLE_ACK', ...PEER_B })
  assert.equal(apply.type, 'APPLY_ROUND')
  assert.equal(apply.tokenId, 'recovery-1')
  assert.equal(apply.reason, 'peer-transition')
  assert.deepEqual(coordinator.handle({ type: 'PEER_TUPLE_ACK', ...PEER_B }), [])

  const [send] = registerAppliedReset(coordinator, apply)
  assert.equal(send.type, 'SEND_RESET')
  assert.deepEqual(send.transition, RESET_AB)
  assert.equal(send.targetConnectionId, PEER_B.peerConnectionId)
  assert.equal(send.attempt, 1)
  markResetSent(coordinator, send)

  assert.deepEqual(acknowledgeReset(coordinator, send, {
    ...PEER_B,
    localConnectionId: LOCAL_B,
  }), [])
  assert.deepEqual(acknowledgeReset(coordinator, send, {
    ...PEER_B,
    peerConnectionId: PEER_A.peerConnectionId,
  }), [])

  const [start] = acknowledgeReset(coordinator, send, PEER_B)
  assert.deepEqual(start, {
    type: 'START_ROUND',
    tokenId: 'recovery-1',
    roundId: RESET_AB.nextRoundId,
    targetConnectionId: PEER_B.peerConnectionId,
  })
  assert.deepEqual(acknowledgeReset(coordinator, send, PEER_B), [])
  assert.equal(coordinator.getDiagnostics().state, 'IDLE')
})

test('replacement control is handled before the following ack releases recovery', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)

  const actions = coordinator.handle({
    type: 'PEER_TRANSITION',
    transition: 'PEER_REPLACED',
    senderId: 'guesser-b',
    peerConnectionId: 'BROW0009',
  })

  assert.deepEqual(actionTypes(actions), [
    'INVALIDATE_APPLICATION',
    'DISCONNECT_ENGINE',
  ])
  assert.equal(actions.some(({ type }) => type === 'CLOSE_LOCAL'), false)
  const [apply] = coordinator.handle({
    type: 'PEER_TUPLE_ACK',
    senderId: 'guesser-b',
    peerConnectionId: 'BROW0009',
    localConnectionId: LOCAL_A,
  })
  assert.equal(apply.type, 'APPLY_ROUND')
  assert.equal(apply.tokenId, actions[0].tokenId)
})

test('local recovery followed by peer rejoin still owns only one local lifecycle', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const actions = [
    ...coordinator.handle({
      type: 'LOCAL_FAILURE',
      reason: 'COUNTERPART_TIMED_OUT',
    }),
    ...coordinator.handle({
      type: 'LOCAL_CLOSE_SETTLED',
      tokenId: 'recovery-1',
      status: 'CLOSED',
    }),
    ...coordinator.handle({ type: 'LOCAL_SUBSCRIBED' }),
    ...coordinator.handle({
      type: 'PEER_TRANSITION',
      transition: 'PEER_REJOINED',
      senderId: PEER_B_AFTER_LOCAL_RECOVERY.senderId,
      peerConnectionId: PEER_B_AFTER_LOCAL_RECOVERY.peerConnectionId,
    }),
    ...coordinator.handle({
      type: 'PEER_TUPLE_ACK',
      ...PEER_B_AFTER_LOCAL_RECOVERY,
    }),
  ]

  assert.equal(actions.filter(({ type }) => type === 'CLOSE_LOCAL').length, 1)
  assert.equal(actions.filter(({ type }) => type === 'CONNECT_LOCAL').length, 1)
  assert.equal(actions.filter(({ type }) => type === 'DISCONNECT_ENGINE').length, 1)
  assert.equal(actions.filter(({ type }) => type === 'APPLY_ROUND').length, 1)
})

test('a same-tuple ready retries only the cached reset without authoring presence', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  coordinator.handle({
    type: 'PEER_TRANSITION',
    transition: 'PEER_REJOINED',
    senderId: PEER_B.senderId,
    peerConnectionId: PEER_B.peerConnectionId,
  })
  const [apply] = coordinator.handle({ type: 'PEER_TUPLE_ACK', ...PEER_B })
  const [send] = registerAppliedReset(coordinator, apply)
  markResetSent(coordinator, send)

  assert.deepEqual(coordinator.handle({
    type: 'PEER_READY',
    senderId: 'guesser-stale',
    peerConnectionId: PEER_B.peerConnectionId,
  }), [])
  const readyActions = coordinator.handle({
    type: 'PEER_READY',
    senderId: PEER_B.senderId,
    peerConnectionId: PEER_B.peerConnectionId,
  })
  assert.deepEqual(actionTypes(readyActions), ['RESEND_RESET'])
  const [retry] = readyActions
  assert.equal(retry.type, 'RESEND_RESET')
  assert.equal(retry.tokenId, send.tokenId)
  assert.deepEqual(retry.transition, send.transition)
  assert.equal(retry.targetConnectionId, send.targetConnectionId)
  assert.equal(retry.attempt, 2)
  assert.deepEqual(coordinator.handle({
    type: 'PEER_READY',
    senderId: PEER_B.senderId,
    peerConnectionId: PEER_B.peerConnectionId,
  }), [])

  markResetSent(coordinator, retry)
  assert.equal(acknowledgeReset(coordinator, retry, PEER_B)[0].type, 'START_ROUND')
})

test('a matching reset ack waits for its sender-side reset settlement', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const [send] = coordinator.handle({
    type: 'RESET_PENDING',
    transition: RESET_AB,
  })

  assert.deepEqual(acknowledgeReset(coordinator, send, PEER_A), [])
  assert.deepEqual(acknowledgeReset(coordinator, send, PEER_A), [])

  const settlement = coordinator.handle({
    type: 'RESET_SENT',
    tokenId: send.tokenId,
    nextRoundId: send.transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(settlement), ['START_ROUND'])
  assert.deepEqual(settlement[0], {
    type: 'START_ROUND',
    tokenId: send.tokenId,
    roundId: RESET_AB.nextRoundId,
    targetConnectionId: PEER_A.peerConnectionId,
  })
  assert.deepEqual(coordinator.handle({
    type: 'RESET_SENT',
    tokenId: send.tokenId,
    nextRoundId: send.transition.nextRoundId,
  }), [])
  assert.deepEqual(acknowledgeReset(coordinator, send, PEER_A), [])
})

test('reset retry exhaustion is terminal and cannot leak a start', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const [apply] = coordinator.handle({
    type: 'SEQUENCE_GAP',
    senderId: PEER_A.senderId,
  }).filter(({ type }) => type === 'APPLY_ROUND')
  let [send] = registerAppliedReset(coordinator, apply)
  assert.equal(send.type, 'SEND_RESET')
  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'RESET_SENT',
    tokenId: send.tokenId,
    nextRoundId: send.transition.nextRoundId,
  })), ['COMPLETE_LOCAL_RESYNC'])

  assert.deepEqual(coordinator.handle({
    type: 'RESET_RETRY_DUE',
    tokenId: 'recovery-stale',
    nextRoundId: send.transition.nextRoundId,
  }), [])

  for (const expectedAttempt of [2, 3]) {
    const [retry] = coordinator.handle({
      type: 'RESET_RETRY_DUE',
      tokenId: send.tokenId,
      nextRoundId: send.transition.nextRoundId,
    })
    assert.equal(retry.type, 'RESEND_RESET')
    assert.equal(retry.attempt, expectedAttempt)
    markResetSent(coordinator, retry)
    send = retry
  }

  assert.deepEqual(coordinator.handle({
    type: 'RESET_RETRY_DUE',
    tokenId: send.tokenId,
    nextRoundId: send.transition.nextRoundId,
  }), [])
  assert.deepEqual(coordinator.handle({
    type: 'RESET_RETRY_EXHAUSTED',
    tokenId: send.tokenId,
    nextRoundId: send.transition.nextRoundId,
  }), [{
    type: 'SHOW_RECOVERY_ERROR',
    tokenId: send.tokenId,
    reason: 'RESET_RETRY_EXHAUSTED',
  }])
  assert.equal(coordinator.getDiagnostics().state, 'FAILED')
  assert.deepEqual(acknowledgeReset(coordinator, send, PEER_A), [])
})

test('local and peer failures adopt a pending reset as carryover in delivered and undelivered cases', async (t) => {
  const cases = [
    { failure: 'local', delivered: false },
    { failure: 'local', delivered: true },
    { failure: 'peer', delivered: false },
    { failure: 'peer', delivered: true },
  ]

  for (const scenario of cases) {
    await t.test(`${scenario.failure} delivered=${scenario.delivered}`, () => {
      const coordinator = new RecoveryCoordinator()
      bindTuple(coordinator)
      const [initialSend] = coordinator.handle({
        type: 'RESET_PENDING',
        transition: RESET_AB,
      })
      assert.equal(initialSend.type, 'SEND_RESET')
      if (scenario.delivered) markResetSent(coordinator, initialSend)

      let recoveryActions
      let recoveryTuple
      if (scenario.failure === 'local') {
        recoveryActions = coordinator.handle({
          type: 'LOCAL_FAILURE',
          reason: 'AMBIGUOUS_SEND',
        })
        assert.deepEqual(actionTypes(recoveryActions), [
          'INVALIDATE_APPLICATION',
          'DISCONNECT_ENGINE',
          'CLOSE_LOCAL',
        ])
        assert.deepEqual(coordinator.handle({
          type: 'LOCAL_FAILURE',
          reason: 'CHANNEL_ERROR',
        }), [])
        assert.deepEqual(actionTypes(coordinator.handle({
          type: 'LOCAL_CLOSE_SETTLED',
          tokenId: initialSend.tokenId,
          status: 'CLOSED',
        })), ['CONNECT_LOCAL'])
        coordinator.handle({ type: 'LOCAL_SUBSCRIBED' })
        recoveryTuple = PEER_B_AFTER_LOCAL_RECOVERY
        recoveryActions = coordinator.handle({
          type: 'PEER_TUPLE_ACK',
          ...recoveryTuple,
        })
      }
      else {
        recoveryTuple = PEER_B
        const transitionActions = coordinator.handle({
          type: 'PEER_TRANSITION',
          transition: 'PEER_REJOINED',
          senderId: recoveryTuple.senderId,
          peerConnectionId: recoveryTuple.peerConnectionId,
        })
        assert.deepEqual(coordinator.handle({
          type: 'PEER_TRANSITION',
          transition: 'PEER_REJOINED',
          senderId: recoveryTuple.senderId,
          peerConnectionId: recoveryTuple.peerConnectionId,
        }), [])
        assert.equal(
          transitionActions.some(({ type }) => type === 'RESEND_RESET'),
          false,
        )
        recoveryActions = coordinator.handle({
          type: 'PEER_TUPLE_ACK',
          ...recoveryTuple,
        })
      }

      const carryoverSend = recoveryActions.find(({ type }) =>
        type === 'RESEND_RESET')
      assert.ok(carryoverSend)
      assert.equal(recoveryActions.some(({ type }) => type === 'APPLY_ROUND'), false)
      assert.equal(recoveryActions.some(({ type }) => type === 'START_ROUND'), false)
      assert.equal(carryoverSend.tokenId, initialSend.tokenId)
      assert.deepEqual(carryoverSend.transition, RESET_AB)
      assert.equal(carryoverSend.attempt, scenario.delivered ? 2 : 1)
      markResetSent(coordinator, carryoverSend)

      const carryoverAckActions = acknowledgeReset(
        coordinator,
        carryoverSend,
        recoveryTuple,
      )
      assert.deepEqual(actionTypes(carryoverAckActions), ['APPLY_ROUND'])
      const successorApply = carryoverAckActions[0]
      assert.equal(successorApply.tokenId, 'recovery-2')
      assert.equal(successorApply.reason, 'carryover-successor')

      const [successorSend] = registerAppliedReset(
        coordinator,
        successorApply,
        RESET_BC,
      )
      assert.equal(successorSend.type, 'SEND_RESET')
      assert.equal(successorSend.tokenId, successorApply.tokenId)
      markResetSent(coordinator, successorSend)
      const successorAckActions = acknowledgeReset(
        coordinator,
        successorSend,
        recoveryTuple,
      )
      assert.deepEqual(actionTypes(successorAckActions), ['START_ROUND'])
      assert.equal(successorAckActions[0].roundId, RESET_BC.nextRoundId)

      const diagnostics = coordinator.getDiagnostics()
      assert.equal(diagnostics.state, 'IDLE')
      assert.deepEqual(diagnostics.tokenApplyCounts, [
        { tokenId: 'recovery-1', count: 0 },
        { tokenId: 'recovery-2', count: 1 },
      ])
      assert.ok(diagnostics.tokenApplyCounts.every(({ count }) => count <= 1))
    })
  }
})

test('an early carryover ack settles only after its resend succeeds', async (t) => {
  for (const delivered of [false, true]) {
    await t.test(`delivered=${delivered}`, () => {
      const coordinator = new RecoveryCoordinator()
      bindTuple(coordinator)
      const [initialSend] = coordinator.handle({
        type: 'RESET_PENDING',
        transition: RESET_AB,
      })
      if (delivered) markResetSent(coordinator, initialSend)

      coordinator.handle({
        type: 'PEER_TRANSITION',
        transition: 'PEER_REJOINED',
        senderId: PEER_B.senderId,
        peerConnectionId: PEER_B.peerConnectionId,
      })
      const [carryoverSend] = coordinator.handle({
        type: 'PEER_TUPLE_ACK',
        ...PEER_B,
      }).filter(({ type }) => type === 'RESEND_RESET')

      assert.deepEqual(
        acknowledgeReset(coordinator, carryoverSend, PEER_B),
        [],
      )
      assert.deepEqual(
        acknowledgeReset(coordinator, carryoverSend, PEER_B),
        [],
      )
      const settlement = coordinator.handle({
        type: 'RESET_SENT',
        tokenId: carryoverSend.tokenId,
        nextRoundId: carryoverSend.transition.nextRoundId,
      })
      assert.deepEqual(actionTypes(settlement), ['APPLY_ROUND'])
      assert.equal(settlement[0].tokenId, 'recovery-2')
      assert.equal(settlement[0].reason, 'carryover-successor')
      assert.equal(settlement.some(({ type }) => type === 'START_ROUND'), false)
      assert.deepEqual(coordinator.handle({
        type: 'RESET_SENT',
        tokenId: carryoverSend.tokenId,
        nextRoundId: carryoverSend.transition.nextRoundId,
      }), [])
      assert.deepEqual(coordinator.getDiagnostics().tokenApplyCounts, [
        { tokenId: 'recovery-1', count: 0 },
        { tokenId: 'recovery-2', count: 1 },
      ])
    })
  }
})

test('a new failure after apply re-invalidates that engine generation once', async (t) => {
  for (const failure of ['peer', 'local']) {
    await t.test(failure, () => {
      const coordinator = new RecoveryCoordinator()
      bindTuple(coordinator)
      coordinator.handle({
        type: 'PEER_TRANSITION',
        transition: 'PEER_REJOINED',
        senderId: PEER_B.senderId,
        peerConnectionId: PEER_B.peerConnectionId,
      })
      const [apply] = coordinator.handle({
        type: 'PEER_TUPLE_ACK',
        ...PEER_B,
      })
      const [pendingSend] = registerAppliedReset(coordinator, apply)

      let failureActions
      let recoveryTuple
      if (failure === 'peer') {
        failureActions = coordinator.handle({
          type: 'PEER_TRANSITION',
          transition: 'PEER_REPLACED',
          senderId: PEER_C.senderId,
          peerConnectionId: PEER_C.peerConnectionId,
        })
        recoveryTuple = PEER_C
        assert.deepEqual(actionTypes(failureActions), [
          'INVALIDATE_APPLICATION',
          'DISCONNECT_ENGINE',
        ])
      }
      else {
        failureActions = coordinator.handle({
          type: 'LOCAL_FAILURE',
          reason: 'CHANNEL_ERROR',
        })
        recoveryTuple = PEER_B_AFTER_LOCAL_RECOVERY
        assert.deepEqual(actionTypes(failureActions), [
          'INVALIDATE_APPLICATION',
          'DISCONNECT_ENGINE',
          'CLOSE_LOCAL',
        ])
        coordinator.handle({
          type: 'LOCAL_CLOSE_SETTLED',
          tokenId: apply.tokenId,
          status: 'CLOSED',
        })
        coordinator.handle({ type: 'LOCAL_SUBSCRIBED' })
      }

      assert.ok(failureActions.every(({ tokenId }) => tokenId === apply.tokenId))
      assert.deepEqual(coordinator.handle({
        type: 'RESET_SENT',
        tokenId: pendingSend.tokenId,
        nextRoundId: pendingSend.transition.nextRoundId,
      }), [])
      const [carryoverSend] = coordinator.handle({
        type: 'PEER_TUPLE_ACK',
        ...recoveryTuple,
      }).filter(({ type }) => type === 'RESEND_RESET')
      markResetSent(coordinator, carryoverSend)
      const settlement = acknowledgeReset(
        coordinator,
        carryoverSend,
        recoveryTuple,
      )
      assert.deepEqual(actionTypes(settlement), ['APPLY_ROUND'])
      assert.equal(settlement[0].tokenId, 'recovery-2')
      assert.deepEqual(coordinator.getDiagnostics().tokenApplyCounts, [
        { tokenId: 'recovery-1', count: 1 },
        { tokenId: 'recovery-2', count: 1 },
      ])
      assert.equal(coordinator.getDiagnostics().tokenCount, 2)
    })
  }
})

test('overlapping carryover failures allocate exactly one successor token', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const [initialSend] = coordinator.handle({
    type: 'RESET_PENDING',
    transition: RESET_AB,
  })
  markResetSent(coordinator, initialSend)

  coordinator.handle({
    type: 'PEER_TRANSITION',
    transition: 'PEER_REJOINED',
    senderId: PEER_B.senderId,
    peerConnectionId: PEER_B.peerConnectionId,
  })
  coordinator.handle({ type: 'LOCAL_FAILURE', reason: 'CHANNEL_ERROR' })
  coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: initialSend.tokenId,
    status: 'CLOSED',
  })
  coordinator.handle({ type: 'LOCAL_SUBSCRIBED' })
  const [carryoverSend] = coordinator.handle({
    type: 'PEER_TUPLE_ACK',
    ...PEER_B_AFTER_LOCAL_RECOVERY,
  }).filter(({ type }) => type === 'RESEND_RESET')
  markResetSent(coordinator, carryoverSend)

  const [successor] = acknowledgeReset(
    coordinator,
    carryoverSend,
    PEER_B_AFTER_LOCAL_RECOVERY,
  )
  assert.equal(successor.type, 'APPLY_ROUND')
  assert.equal(successor.tokenId, 'recovery-2')
  assert.deepEqual(acknowledgeReset(
    coordinator,
    carryoverSend,
    PEER_B_AFTER_LOCAL_RECOVERY,
  ), [])
  assert.equal(coordinator.getDiagnostics().tokenCount, 2)
})

test('a sequence gap with no reset completes resync only after reset send succeeds', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)

  const first = coordinator.handle({
    type: 'SEQUENCE_GAP',
    senderId: PEER_A.senderId,
  })
  assert.deepEqual(actionTypes(first), ['INVALIDATE_APPLICATION', 'APPLY_ROUND'])
  const apply = first[1]
  assert.equal(apply.reason, 'sequence-gap')

  const overlap = coordinator.handle({
    type: 'SEQUENCE_GAP',
    senderId: PEER_A.senderId,
  })
  assert.deepEqual(actionTypes(overlap), ['INVALIDATE_APPLICATION'])

  const sendActions = registerAppliedReset(coordinator, apply)
  assert.deepEqual(actionTypes(sendActions), ['SEND_RESET'])
  assert.equal(sendActions[0].tokenId, apply.tokenId)

  const completionActions = coordinator.handle({
    type: 'RESET_SENT',
    tokenId: sendActions[0].tokenId,
    nextRoundId: sendActions[0].transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(completionActions), ['COMPLETE_LOCAL_RESYNC'])
  assert.equal(completionActions[0].tokenId, apply.tokenId)
  assert.equal(completionActions[0].senderId, PEER_A.senderId)
  assert.deepEqual(coordinator.handle({
    type: 'RESET_SENT',
    tokenId: sendActions[0].tokenId,
    nextRoundId: sendActions[0].transition.nextRoundId,
  }), [])
  assert.equal(coordinator.getDiagnostics().tokenApplyCounts[0].count, 1)
})

test('an early ack for a gap-owned reset releases resync before start on send success', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const [apply] = coordinator.handle({
    type: 'SEQUENCE_GAP',
    senderId: PEER_A.senderId,
  }).filter(({ type }) => type === 'APPLY_ROUND')
  const [send] = registerAppliedReset(coordinator, apply)

  assert.deepEqual(acknowledgeReset(coordinator, send, PEER_A), [])
  const settlement = coordinator.handle({
    type: 'RESET_SENT',
    tokenId: send.tokenId,
    nextRoundId: send.transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(settlement), [
    'COMPLETE_LOCAL_RESYNC',
    'START_ROUND',
  ])
  assert.equal(settlement[0].senderId, PEER_A.senderId)
  assert.equal(settlement[1].roundId, RESET_AB.nextRoundId)
  assert.equal(coordinator.getDiagnostics().state, 'IDLE')
})

test('a sequence gap during a pending reset only reuses that reset and never creates a successor', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const [initialSend] = coordinator.handle({
    type: 'RESET_PENDING',
    transition: RESET_AB,
  })
  markResetSent(coordinator, initialSend)

  const actions = coordinator.handle({
    type: 'SEQUENCE_GAP',
    senderId: PEER_A.senderId,
  })
  assert.deepEqual(actionTypes(actions), [
    'INVALIDATE_APPLICATION',
    'RESEND_RESET',
  ])
  assert.equal(actions.some(({ type }) => type === 'APPLY_ROUND'), false)
  assert.deepEqual(actions[1].transition, RESET_AB)
  assert.equal(actions[1].tokenId, initialSend.tokenId)

  const completionActions = coordinator.handle({
    type: 'RESET_SENT',
    tokenId: actions[1].tokenId,
    nextRoundId: actions[1].transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(completionActions), ['COMPLETE_LOCAL_RESYNC'])
  assert.equal(completionActions[0].senderId, PEER_A.senderId)
  assert.equal(coordinator.getDiagnostics().tokenCount, 1)
  assert.equal(coordinator.getDiagnostics().successorRequired, false)
})

test('a gap observed during a reset send resends and completes only after that send settles', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const [initialSend] = coordinator.handle({
    type: 'RESET_PENDING',
    transition: RESET_AB,
  })

  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'SEQUENCE_GAP',
    senderId: PEER_A.senderId,
  })), ['INVALIDATE_APPLICATION'])
  const settlementActions = coordinator.handle({
    type: 'RESET_SENT',
    tokenId: initialSend.tokenId,
    nextRoundId: initialSend.transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(settlementActions), ['RESEND_RESET'])
  assert.equal(settlementActions[0].tokenId, initialSend.tokenId)
  assert.deepEqual(settlementActions[0].transition, RESET_AB)
  assert.equal(settlementActions[0].attempt, 2)
  assert.equal(settlementActions.some(({ type }) => type === 'APPLY_ROUND'), false)

  const completionActions = coordinator.handle({
    type: 'RESET_SENT',
    tokenId: settlementActions[0].tokenId,
    nextRoundId: settlementActions[0].transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(completionActions), ['COMPLETE_LOCAL_RESYNC'])
  assert.equal(completionActions[0].senderId, PEER_A.senderId)
  assert.equal(coordinator.getDiagnostics().tokenCount, 1)
})

test('an early ack remains gated through the post-gap resend settlement', async (t) => {
  const cases = [
    { initialSendSettled: false },
    { initialSendSettled: true },
  ]

  for (const scenario of cases) {
    await t.test(`initial settled=${scenario.initialSendSettled}`, () => {
      const coordinator = new RecoveryCoordinator()
      bindTuple(coordinator)
      const [initialSend] = coordinator.handle({
        type: 'RESET_PENDING',
        transition: RESET_AB,
      })
      if (scenario.initialSendSettled) markResetSent(coordinator, initialSend)

      const gapActions = coordinator.handle({
        type: 'SEQUENCE_GAP',
        senderId: PEER_A.senderId,
      })
      let resyncSend = gapActions.find(({ type }) => type === 'RESEND_RESET')

      assert.deepEqual(acknowledgeReset(coordinator, initialSend, PEER_A), [])
      if (!scenario.initialSendSettled) {
        const firstSettlement = coordinator.handle({
          type: 'RESET_SENT',
          tokenId: initialSend.tokenId,
          nextRoundId: initialSend.transition.nextRoundId,
        })
        assert.deepEqual(actionTypes(firstSettlement), ['RESEND_RESET'])
        resyncSend = firstSettlement[0]
      }

      assert.ok(resyncSend)
      assert.deepEqual(acknowledgeReset(coordinator, resyncSend, PEER_A), [])
      const resyncSettlement = coordinator.handle({
        type: 'RESET_SENT',
        tokenId: resyncSend.tokenId,
        nextRoundId: resyncSend.transition.nextRoundId,
      })
      assert.deepEqual(actionTypes(resyncSettlement), [
        'COMPLETE_LOCAL_RESYNC',
        'START_ROUND',
      ])
      assert.equal(resyncSettlement[0].senderId, PEER_A.senderId)
      assert.equal(resyncSettlement[1].roundId, RESET_AB.nextRoundId)
      assert.deepEqual(acknowledgeReset(coordinator, resyncSend, PEER_A), [])
      assert.equal(coordinator.getDiagnostics().state, 'IDLE')
    })
  }
})

test('a cancelled reset send is reissued for a pending gap before resync completes', () => {
  const coordinator = new RecoveryCoordinator()
  bindTuple(coordinator)
  const [initialSend] = coordinator.handle({
    type: 'RESET_PENDING',
    transition: RESET_AB,
  })

  assert.deepEqual(actionTypes(coordinator.handle({
    type: 'SEQUENCE_GAP',
    senderId: PEER_A.senderId,
  })), ['INVALIDATE_APPLICATION'])

  const retryActions = coordinator.handle({
    type: 'RESET_SEND_CANCELLED',
    tokenId: initialSend.tokenId,
    nextRoundId: initialSend.transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(retryActions), ['RESEND_RESET'])
  assert.equal(retryActions[0].tokenId, initialSend.tokenId)
  assert.deepEqual(retryActions[0].transition, RESET_AB)
  assert.equal(retryActions[0].targetConnectionId, PEER_A.peerConnectionId)
  assert.equal(retryActions.some(({ type }) => type === 'APPLY_ROUND'), false)
  assert.equal(
    retryActions.some(({ type }) => type === 'COMPLETE_LOCAL_RESYNC'),
    false,
  )

  const completionActions = coordinator.handle({
    type: 'RESET_SENT',
    tokenId: retryActions[0].tokenId,
    nextRoundId: retryActions[0].transition.nextRoundId,
  })
  assert.deepEqual(actionTypes(completionActions), ['COMPLETE_LOCAL_RESYNC'])
  assert.equal(completionActions[0].senderId, PEER_A.senderId)
  assert.equal(coordinator.getDiagnostics().tokenCount, 1)
})

test('teardown closes once and makes every later recovery signal inert', () => {
  const coordinator = new RecoveryCoordinator()
  const actions = coordinator.handle({ type: 'TEARDOWN' })
  assert.deepEqual(actionTypes(actions), [
    'INVALIDATE_APPLICATION',
    'DISCONNECT_ENGINE',
    'CLOSE_LOCAL',
  ])
  assert.equal(actions.some(({ type }) => type === 'CONNECT_LOCAL'), false)

  assert.deepEqual(coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CLOSED',
  }), [])
  assert.deepEqual(coordinator.handle({
    type: 'PEER_TRANSITION',
    transition: 'PEER_REJOINED',
    senderId: PEER_B.senderId,
    peerConnectionId: PEER_B.peerConnectionId,
  }), [])
  assert.equal(coordinator.getDiagnostics().state, 'CLOSED')
})

test('actions and diagnostics are immutable snapshots', () => {
  const coordinator = new RecoveryCoordinator()
  const actions = coordinator.handle({
    type: 'LOCAL_FAILURE',
    reason: 'CHANNEL_ERROR',
  })
  const before = coordinator.getDiagnostics()

  assert.equal(Object.isFrozen(actions), true)
  assert.ok(actions.every(Object.isFrozen))
  assert.equal(Object.isFrozen(before), true)
  assert.equal(Object.isFrozen(before.tokenApplyCounts), true)
  assert.ok(before.tokenApplyCounts.every(Object.isFrozen))
  assert.throws(() => actions.push({ type: 'CONNECT_LOCAL' }), TypeError)
  assert.throws(() => before.tokenApplyCounts.push({
    tokenId: 'forged',
    count: 99,
  }), TypeError)

  coordinator.handle({
    type: 'LOCAL_CLOSE_SETTLED',
    tokenId: actions[0].tokenId,
    status: 'CLOSED',
  })
  coordinator.handle({ type: 'LOCAL_SUBSCRIBED' })
  assert.equal(before.state, 'AWAITING_LOCAL_CLOSE')
  assert.equal(coordinator.getDiagnostics().state, 'AWAITING_PEER_ACK')
})
