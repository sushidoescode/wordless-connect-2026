export type RecoveryLocalFailureReason =
  | 'COUNTERPART_TIMED_OUT'
  | 'CHANNEL_ERROR'
  | 'TIMED_OUT'
  | 'CLOSED'
  | 'DISCONNECTED'
  | 'AMBIGUOUS_SEND'

export type RecoveryPeerTransition = 'PEER_REPLACED' | 'PEER_REJOINED'

export interface RecoveryPeerTuple {
  readonly senderId: string
  readonly peerConnectionId: string
  readonly localConnectionId: string
}

export interface RecoveryPeerIdentity {
  readonly senderId: string
  readonly peerConnectionId: string
}

export interface RecoveryResetTransition {
  readonly previousRoundId: string
  readonly nextRoundId: string
}

export type RecoveryEvent =
  | {
      readonly type: 'LOCAL_FAILURE'
      readonly reason: RecoveryLocalFailureReason
    }
  | {
      readonly type: 'LOCAL_SUBSCRIBED'
    }
  | {
      readonly type: 'LOCAL_CLOSE_SETTLED'
      readonly tokenId: string
      readonly status: 'CLOSED' | 'DISCONNECTED'
    }
  | ({
      readonly type: 'PEER_TRANSITION'
      readonly transition: RecoveryPeerTransition
    } & RecoveryPeerIdentity)
  | ({ readonly type: 'PEER_READY' } & RecoveryPeerIdentity)
  | ({ readonly type: 'PEER_TUPLE_ACK' } & RecoveryPeerTuple)
  | {
      readonly type: 'RESET_PENDING'
      readonly tokenId?: string
      readonly transition: RecoveryResetTransition
    }
  | {
      readonly type: 'RESET_SENT'
      readonly tokenId: string
      readonly nextRoundId: string
    }
  | {
      readonly type: 'RESET_SEND_CANCELLED'
      readonly tokenId: string
      readonly nextRoundId: string
    }
  | ({
      readonly type: 'RESET_ACK'
      readonly tokenId: string
      readonly nextRoundId: string
    } & RecoveryPeerTuple)
  | {
      readonly type: 'RESET_RETRY_DUE'
      readonly tokenId: string
      readonly nextRoundId: string
    }
  | {
      readonly type: 'RESET_RETRY_EXHAUSTED'
      readonly tokenId: string
      readonly nextRoundId: string
    }
  | { readonly type: 'SEQUENCE_GAP'; readonly senderId: string }
  | { readonly type: 'TEARDOWN' }

interface TokenAction<T extends string> {
  readonly type: T
  readonly tokenId: string
}

export type RecoveryAction =
  | TokenAction<'INVALIDATE_APPLICATION'>
  | TokenAction<'DISCONNECT_ENGINE'>
  | TokenAction<'CLOSE_LOCAL'>
  | TokenAction<'CONNECT_LOCAL'>
  | (TokenAction<'APPLY_ROUND'> & {
      readonly reason: 'local-failure' | 'peer-transition' | 'sequence-gap' |
        'carryover-successor'
    })
  | (TokenAction<'SEND_RESET' | 'RESEND_RESET'> & {
      readonly transition: RecoveryResetTransition
      readonly targetConnectionId: string
      readonly attempt: number
    })
  | (TokenAction<'START_ROUND'> & {
      readonly roundId: string
      readonly targetConnectionId: string
    })
  | (TokenAction<'COMPLETE_LOCAL_RESYNC'> & {
      readonly senderId: string
    })
  | (TokenAction<'SHOW_RECOVERY_ERROR'> & {
      readonly reason: 'RESET_RETRY_EXHAUSTED'
    })

export type RecoveryState =
  | 'IDLE'
  | 'AWAITING_LOCAL_CLOSE'
  | 'AWAITING_LOCAL_SUBSCRIPTION'
  | 'AWAITING_PEER_ACK'
  | 'AWAITING_RESET'
  | 'AWAITING_RESET_ACK'
  | 'FAILED'
  | 'CLOSED'

export interface RecoveryTokenApplyCount {
  readonly tokenId: string
  readonly count: number
}

export interface RecoveryDiagnostics {
  readonly state: RecoveryState
  readonly activeTokenId: string | null
  readonly tokenCount: number
  readonly tokenApplyCounts: readonly RecoveryTokenApplyCount[]
  readonly expectedLocalClose: boolean
  readonly localLifecycleIssued: boolean
  readonly carryoverSettlementOnly: boolean
  readonly successorRequired: boolean
  readonly pendingReset: RecoveryResetTransition | null
  readonly resetAttempts: number
  readonly peerTupleConfirmed: RecoveryPeerTuple | null
}

type ApplyReason = Extract<
  RecoveryAction,
  { type: 'APPLY_ROUND' }
>['reason']

interface RecoveryToken {
  readonly id: string
  readonly initialReason: ApplyReason | 'external-reset' | 'teardown'
  applyIssued: boolean
  engineDisconnected: boolean
  localLifecycleIssued: boolean
  connectIssued: boolean
  subscriptionObserved: boolean
  expectedPeer: RecoveryPeerIdentity | null
  peerExpectationOpen: boolean
  carryoverSettlementOnly: boolean
  successorRequired: boolean
  pendingReset: RecoveryResetTransition | null
  resetAttempts: number
  resetSendInFlight: boolean
  pendingAttempt: number
  resetTargetConnectionId: string | null
  resyncSenderId: string | null
  resyncCompletionInFlight: boolean
  earlyResetAck: RecoveryPeerTuple | null
}

const MAX_RESET_ATTEMPTS = 3

function isNonempty(value: string): boolean {
  return value.length > 0
}

function freezeTuple(tuple: RecoveryPeerTuple): RecoveryPeerTuple {
  return Object.freeze({
    senderId: tuple.senderId,
    peerConnectionId: tuple.peerConnectionId,
    localConnectionId: tuple.localConnectionId,
  })
}

function freezePeerIdentity(
  peer: RecoveryPeerIdentity,
): RecoveryPeerIdentity {
  return Object.freeze({
    senderId: peer.senderId,
    peerConnectionId: peer.peerConnectionId,
  })
}

function freezeTransition(
  transition: RecoveryResetTransition,
): RecoveryResetTransition {
  return Object.freeze({
    previousRoundId: transition.previousRoundId,
    nextRoundId: transition.nextRoundId,
  })
}

function sameTuple(
  left: RecoveryPeerTuple | null,
  right: RecoveryPeerTuple,
): boolean {
  return left !== null &&
    left.senderId === right.senderId &&
    left.peerConnectionId === right.peerConnectionId &&
    left.localConnectionId === right.localConnectionId
}

function samePeer(
  left: RecoveryPeerIdentity | null,
  right: RecoveryPeerIdentity,
): boolean {
  return left !== null &&
    left.senderId === right.senderId &&
    left.peerConnectionId === right.peerConnectionId
}

function sameTransition(
  left: RecoveryResetTransition | null,
  right: RecoveryResetTransition,
): boolean {
  return left !== null &&
    left.previousRoundId === right.previousRoundId &&
    left.nextRoundId === right.nextRoundId
}

function frozenActions(
  actions: readonly RecoveryAction[],
): readonly RecoveryAction[] {
  return Object.freeze(actions.map((action) => Object.freeze(action)))
}

/**
 * Pure Lens recovery admission state machine. It returns semantic commands;
 * the composition root remains responsible for executing and sequencing them.
 */
export class RecoveryCoordinator {
  private state: RecoveryState = 'IDLE'
  private tokenOrdinal = 0
  private active: RecoveryToken | null = null
  private readonly applyCounts = new Map<string, number>()
  private currentLocalConnectionId: string | null = null
  private confirmedPeer: RecoveryPeerTuple | null = null
  private expectedLocalClose = false
  private closed = false

  public handle(event: RecoveryEvent): readonly RecoveryAction[] {
    if (this.closed) return frozenActions([])

    switch (event.type) {
      case 'LOCAL_FAILURE':
        return this.handleLocalFailure(event.reason)
      case 'LOCAL_CLOSE_SETTLED':
        return this.handleLocalCloseSettled(event.tokenId, event.status)
      case 'LOCAL_SUBSCRIBED':
        return this.handleLocalSubscribed()
      case 'PEER_TRANSITION':
        return this.handlePeerTransition(event)
      case 'PEER_READY':
        return this.handlePeerReady(event)
      case 'PEER_TUPLE_ACK':
        return this.handlePeerTupleAck(event)
      case 'RESET_PENDING':
        return this.handleResetPending(
          event.transition,
          event.tokenId,
        )
      case 'RESET_SENT':
        return this.handleResetSent(event.tokenId, event.nextRoundId)
      case 'RESET_SEND_CANCELLED':
        return this.handleResetSendCancelled(
          event.tokenId,
          event.nextRoundId,
        )
      case 'RESET_ACK':
        return this.handleResetAck(event)
      case 'RESET_RETRY_DUE':
        return this.handleResetRetryDue(event.tokenId, event.nextRoundId)
      case 'RESET_RETRY_EXHAUSTED':
        return this.handleResetRetryExhausted(
          event.tokenId,
          event.nextRoundId,
        )
      case 'SEQUENCE_GAP':
        return this.handleSequenceGap(event.senderId)
      case 'TEARDOWN':
        return this.handleTeardown()
    }
  }

  public getDiagnostics(): RecoveryDiagnostics {
    const applyCounts = Object.freeze(
      [...this.applyCounts].map(([tokenId, count]) => Object.freeze({
        tokenId,
        count,
      })),
    )
    const active = this.active
    return Object.freeze({
      state: this.state,
      activeTokenId: active?.id ?? null,
      tokenCount: this.tokenOrdinal,
      tokenApplyCounts: applyCounts,
      expectedLocalClose: this.expectedLocalClose,
      localLifecycleIssued: active?.localLifecycleIssued ?? false,
      carryoverSettlementOnly:
        active?.carryoverSettlementOnly ?? false,
      successorRequired: active?.successorRequired ?? false,
      pendingReset: active?.pendingReset
        ? freezeTransition(active.pendingReset)
        : null,
      resetAttempts: active?.resetAttempts ?? 0,
      peerTupleConfirmed: this.confirmedPeer
        ? freezeTuple(this.confirmedPeer)
        : null,
    })
  }

  private handleLocalFailure(
    reason: RecoveryLocalFailureReason,
  ): readonly RecoveryAction[] {
    if ((reason === 'CLOSED' || reason === 'DISCONNECTED') &&
        this.expectedLocalClose) {
      return frozenActions([])
    }

    let token = this.active
    if (token === null) {
      token = this.createToken('local-failure')
      this.active = token
    }
    if (token.localLifecycleIssued) return frozenActions([])

    if (token.subscriptionObserved) {
      token.engineDisconnected = false
      token.subscriptionObserved = false
    }
    if (token.pendingReset !== null || token.applyIssued) {
      this.markCarryover(token)
      token.resetSendInFlight = false
      token.pendingAttempt = 0
      token.resyncCompletionInFlight = false
    }
    token.earlyResetAck = null
    token.localLifecycleIssued = true
    token.connectIssued = false
    token.peerExpectationOpen = true
    token.expectedPeer = null
    token.resetSendInFlight = false
    token.pendingAttempt = 0
    token.resyncCompletionInFlight = false
    this.currentLocalConnectionId = null
    this.confirmedPeer = null
    this.expectedLocalClose = true
    this.state = 'AWAITING_LOCAL_CLOSE'

    const actions: RecoveryAction[] = []
    this.addInvalidationActions(token, actions)
    actions.push({ type: 'CLOSE_LOCAL', tokenId: token.id })
    return frozenActions(actions)
  }

  private handleLocalCloseSettled(
    tokenId: string,
    status: 'CLOSED' | 'DISCONNECTED',
  ): readonly RecoveryAction[] {
    const token = this.active
    if (token === null || token.id !== tokenId ||
        !token.localLifecycleIssued || !this.expectedLocalClose ||
        token.connectIssued) {
      return frozenActions([])
    }
    if (status === 'DISCONNECTED') return frozenActions([])
    token.connectIssued = true
    this.state = 'AWAITING_LOCAL_SUBSCRIPTION'
    return frozenActions([{
      type: 'CONNECT_LOCAL',
      tokenId: token.id,
    }])
  }

  private handleLocalSubscribed(): readonly RecoveryAction[] {
    const token = this.active
    if (token === null || !token.localLifecycleIssued ||
        !token.connectIssued || token.subscriptionObserved) {
      return frozenActions([])
    }

    token.subscriptionObserved = true
    token.localLifecycleIssued = false
    this.currentLocalConnectionId = null
    this.confirmedPeer = null
    this.expectedLocalClose = false
    this.state = 'AWAITING_PEER_ACK'
    return frozenActions([])
  }

  private handlePeerTransition(
    event: Extract<RecoveryEvent, { type: 'PEER_TRANSITION' }>,
  ): readonly RecoveryAction[] {
    if (!this.validPeerIdentity(event)) return frozenActions([])
    const incoming = freezePeerIdentity(event)
    const existing = this.active
    if (existing !== null && samePeer(existing.expectedPeer, incoming)) {
      return frozenActions([])
    }

    let token = existing
    if (token === null) {
      token = this.createToken('peer-transition')
      this.active = token
    }
    if (token.pendingReset !== null || token.applyIssued) {
      this.markCarryover(token)
      token.resetSendInFlight = false
      token.pendingAttempt = 0
      token.resyncCompletionInFlight = false
    }
    token.earlyResetAck = null

    token.expectedPeer = incoming
    token.peerExpectationOpen = false
    this.confirmedPeer = null
    this.state = 'AWAITING_PEER_ACK'
    const actions: RecoveryAction[] = []
    this.addInvalidationActions(token, actions)

    return frozenActions(actions)
  }

  private handlePeerTupleAck(
    event: Extract<RecoveryEvent, { type: 'PEER_TUPLE_ACK' }>,
  ): readonly RecoveryAction[] {
    if (!this.validTuple(event)) return frozenActions([])
    const token = this.active
    if (token === null) {
      this.currentLocalConnectionId = event.localConnectionId
      this.confirmedPeer = freezeTuple(event)
      return frozenActions([])
    }
    if (!this.tupleAllowed(token, event)) return frozenActions([])

    if (token.peerExpectationOpen) {
      token.expectedPeer = freezePeerIdentity(event)
      token.peerExpectationOpen = false
    }
    this.currentLocalConnectionId = event.localConnectionId
    this.confirmedPeer = freezeTuple(event)
    const actions: RecoveryAction[] = []
    this.releasePeerGate(token, actions)
    return frozenActions(actions)
  }

  private handlePeerReady(
    event: Extract<RecoveryEvent, { type: 'PEER_READY' }>,
  ): readonly RecoveryAction[] {
    const token = this.active
    if (token === null || token.pendingReset === null ||
        !this.validPeerIdentity(event) ||
        !samePeer(this.confirmedPeer, event) ||
        token.resetSendInFlight ||
        token.resetAttempts >= MAX_RESET_ATTEMPTS ||
        this.state === 'FAILED') {
      return frozenActions([])
    }
    const actions: RecoveryAction[] = []
    this.issueReset(token, 'RESEND_RESET', actions)
    return frozenActions(actions)
  }

  private handleResetPending(
    transition: RecoveryResetTransition,
    tokenId: string | undefined,
  ): readonly RecoveryAction[] {
    if (!this.validTransition(transition)) return frozenActions([])
    let token = this.active
    if (token === null) {
      if (tokenId !== undefined) return frozenActions([])
      token = this.createToken('external-reset')
      this.active = token
    }
    else if (tokenId !== undefined && token.id !== tokenId) {
      return frozenActions([])
    }

    if (token.pendingReset !== null) {
      if (!sameTransition(token.pendingReset, transition)) {
        return frozenActions([])
      }
      return frozenActions([])
    }

    token.pendingReset = freezeTransition(transition)
    this.state = this.confirmedPeer === null
      ? 'AWAITING_PEER_ACK'
      : 'AWAITING_RESET_ACK'
    const actions: RecoveryAction[] = []
    if (this.confirmedPeer !== null) {
      this.issueReset(
        token,
        token.carryoverSettlementOnly ? 'RESEND_RESET' : 'SEND_RESET',
        actions,
      )
    }
    return frozenActions(actions)
  }

  private handleResetSent(
    tokenId: string,
    nextRoundId: string,
  ): readonly RecoveryAction[] {
    const token = this.active
    if (token === null || token.id !== tokenId ||
        token.pendingReset?.nextRoundId !== nextRoundId ||
        !token.resetSendInFlight) {
      return frozenActions([])
    }
    const completesResync = token.resyncCompletionInFlight
    token.resetAttempts = token.pendingAttempt
    token.pendingAttempt = 0
    token.resetSendInFlight = false
    token.resyncCompletionInFlight = false
    this.state = 'AWAITING_RESET_ACK'
    const actions: RecoveryAction[] = []
    if (completesResync && token.resyncSenderId !== null) {
      actions.push({
        type: 'COMPLETE_LOCAL_RESYNC',
        tokenId: token.id,
        senderId: token.resyncSenderId,
      })
      token.resyncSenderId = null
    }
    else if (token.resyncSenderId !== null && this.confirmedPeer !== null) {
      this.issueReset(token, 'RESEND_RESET', actions)
    }
    this.releaseEarlyResetAck(token, actions)
    return frozenActions(actions)
  }

  private handleResetSendCancelled(
    tokenId: string,
    nextRoundId: string,
  ): readonly RecoveryAction[] {
    const token = this.active
    if (token === null || token.id !== tokenId ||
        token.pendingReset?.nextRoundId !== nextRoundId ||
        !token.resetSendInFlight) {
      return frozenActions([])
    }

    token.pendingAttempt = 0
    token.resetSendInFlight = false
    token.resyncCompletionInFlight = false
    const actions: RecoveryAction[] = []
    if (token.resyncSenderId !== null && this.confirmedPeer !== null) {
      this.issueReset(token, 'RESEND_RESET', actions)
    }
    return frozenActions(actions)
  }

  private handleResetAck(
    event: Extract<RecoveryEvent, { type: 'RESET_ACK' }>,
  ): readonly RecoveryAction[] {
    const token = this.active
    const pending = token?.pendingReset
    if (token === null || pending === null ||
        token.id !== event.tokenId ||
        pending.nextRoundId !== event.nextRoundId ||
        this.state === 'FAILED' ||
        !sameTuple(this.confirmedPeer, event) ||
        token.resetTargetConnectionId !== event.peerConnectionId) {
      return frozenActions([])
    }

    if (token.resetSendInFlight || token.resetAttempts < 1 ||
        token.resyncSenderId !== null) {
      token.earlyResetAck = freezeTuple(event)
      return frozenActions([])
    }

    const actions: RecoveryAction[] = []
    this.settleResetAck(token, event, actions)
    return frozenActions(actions)
  }

  private handleResetRetryDue(
    tokenId: string,
    nextRoundId: string,
  ): readonly RecoveryAction[] {
    const token = this.active
    if (token === null || token.id !== tokenId ||
        token.pendingReset?.nextRoundId !== nextRoundId ||
        this.confirmedPeer === null || token.resetSendInFlight ||
        token.resetAttempts >= MAX_RESET_ATTEMPTS ||
        this.state === 'FAILED') {
      return frozenActions([])
    }
    const actions: RecoveryAction[] = []
    this.issueReset(token, 'RESEND_RESET', actions)
    return frozenActions(actions)
  }

  private handleResetRetryExhausted(
    tokenId: string,
    nextRoundId: string,
  ): readonly RecoveryAction[] {
    const token = this.active
    if (token === null || token.id !== tokenId ||
        token.pendingReset?.nextRoundId !== nextRoundId ||
        token.resetAttempts < MAX_RESET_ATTEMPTS ||
        this.state === 'FAILED') {
      return frozenActions([])
    }
    this.state = 'FAILED'
    return frozenActions([{
      type: 'SHOW_RECOVERY_ERROR',
      tokenId: token.id,
      reason: 'RESET_RETRY_EXHAUSTED',
    }])
  }

  private handleSequenceGap(senderId: string): readonly RecoveryAction[] {
    if (!isNonempty(senderId) || this.state === 'FAILED') {
      return frozenActions([])
    }
    let token = this.active
    if (token === null) {
      token = this.createToken('sequence-gap')
      this.active = token
    }
    const actions: RecoveryAction[] = [{
      type: 'INVALIDATE_APPLICATION',
      tokenId: token.id,
    }]

    if (token.pendingReset !== null) {
      if (token.resyncSenderId === null) token.resyncSenderId = senderId
      if (!token.resetSendInFlight && this.confirmedPeer !== null) {
        this.issueReset(token, 'RESEND_RESET', actions)
      }
      return frozenActions(actions)
    }

    if (token.resyncSenderId === null) token.resyncSenderId = senderId
    if (!token.applyIssued) {
      this.issueApply(token, 'sequence-gap', actions)
    }
    return frozenActions(actions)
  }

  private handleTeardown(): readonly RecoveryAction[] {
    let token = this.active
    if (token === null) {
      token = this.createToken('teardown')
      this.active = token
    }
    const actions: RecoveryAction[] = []
    this.addInvalidationActions(token, actions)
    if (!token.localLifecycleIssued || token.connectIssued) {
      token.localLifecycleIssued = true
      actions.push({ type: 'CLOSE_LOCAL', tokenId: token.id })
    }
    this.expectedLocalClose = true
    this.state = 'CLOSED'
    this.closed = true
    return frozenActions(actions)
  }

  private createToken(initialReason: RecoveryToken['initialReason']): RecoveryToken {
    const id = `recovery-${++this.tokenOrdinal}`
    this.applyCounts.set(id, 0)
    return {
      id,
      initialReason,
      applyIssued: false,
      engineDisconnected: false,
      localLifecycleIssued: false,
      connectIssued: false,
      subscriptionObserved: false,
      expectedPeer: null,
      peerExpectationOpen: initialReason === 'local-failure',
      carryoverSettlementOnly: false,
      successorRequired: false,
      pendingReset: null,
      resetAttempts: 0,
      resetSendInFlight: false,
      pendingAttempt: 0,
      resetTargetConnectionId: null,
      resyncSenderId: null,
      resyncCompletionInFlight: false,
      earlyResetAck: null,
    }
  }

  private addInvalidationActions(
    token: RecoveryToken,
    actions: RecoveryAction[],
  ): void {
    if (token.engineDisconnected) return
    token.engineDisconnected = true
    actions.push(
      { type: 'INVALIDATE_APPLICATION', tokenId: token.id },
      { type: 'DISCONNECT_ENGINE', tokenId: token.id },
    )
  }

  private markCarryover(token: RecoveryToken): void {
    token.carryoverSettlementOnly = true
    token.successorRequired = true
  }

  private releasePeerGate(
    token: RecoveryToken,
    actions: RecoveryAction[],
  ): void {
    if (token.pendingReset !== null) {
      if (!token.resetSendInFlight &&
          token.resetAttempts < MAX_RESET_ATTEMPTS) {
        this.issueReset(
          token,
          token.carryoverSettlementOnly ? 'RESEND_RESET' : 'SEND_RESET',
          actions,
        )
      }
      return
    }
    if (!token.applyIssued) {
      this.issueApply(
        token,
        token.initialReason === 'sequence-gap'
          ? 'sequence-gap'
          : token.initialReason === 'peer-transition'
            ? 'peer-transition'
            : token.initialReason === 'carryover-successor'
              ? 'carryover-successor'
              : 'local-failure',
        actions,
      )
    }
  }

  private issueApply(
    token: RecoveryToken,
    reason: ApplyReason,
    actions: RecoveryAction[],
  ): void {
    if (token.applyIssued) return
    token.applyIssued = true
    token.engineDisconnected = false
    this.applyCounts.set(token.id, 1)
    this.state = 'AWAITING_RESET'
    actions.push({
      type: 'APPLY_ROUND',
      tokenId: token.id,
      reason,
    })
  }

  private issueReset(
    token: RecoveryToken,
    type: 'SEND_RESET' | 'RESEND_RESET',
    actions: RecoveryAction[],
  ): void {
    const transition = token.pendingReset
    const peer = this.confirmedPeer
    if (transition === null || peer === null || token.resetSendInFlight ||
        token.resetAttempts >= MAX_RESET_ATTEMPTS) {
      return
    }
    const attempt = token.resetAttempts + 1
    token.resetSendInFlight = true
    token.pendingAttempt = attempt
    token.resetTargetConnectionId = peer.peerConnectionId
    token.resyncCompletionInFlight = token.resyncSenderId !== null
    this.state = 'AWAITING_RESET_ACK'
    actions.push({
      type,
      tokenId: token.id,
      transition: freezeTransition(transition),
      targetConnectionId: peer.peerConnectionId,
      attempt,
    })
  }

  private releaseEarlyResetAck(
    token: RecoveryToken,
    actions: RecoveryAction[],
  ): void {
    const ack = token.earlyResetAck
    if (ack === null || this.active !== token ||
        token.resetSendInFlight || token.resetAttempts < 1 ||
        token.resyncSenderId !== null || this.state === 'FAILED' ||
        !sameTuple(this.confirmedPeer, ack) ||
        token.resetTargetConnectionId !== ack.peerConnectionId) {
      return
    }
    token.earlyResetAck = null
    this.settleResetAck(token, ack, actions)
  }

  private settleResetAck(
    token: RecoveryToken,
    tuple: RecoveryPeerTuple,
    actions: RecoveryAction[],
  ): void {
    const pending = token.pendingReset
    if (pending === null) return

    if (token.carryoverSettlementOnly) {
      this.active = null
      const successor = this.createToken('carryover-successor')
      this.active = successor
      this.issueApply(successor, 'carryover-successor', actions)
      return
    }

    this.active = null
    this.state = 'IDLE'
    actions.push({
      type: 'START_ROUND',
      tokenId: token.id,
      roundId: pending.nextRoundId,
      targetConnectionId: tuple.peerConnectionId,
    })
  }

  private tupleAllowed(
    token: RecoveryToken,
    tuple: RecoveryPeerTuple,
  ): boolean {
    if (this.currentLocalConnectionId !== null &&
        tuple.localConnectionId !== this.currentLocalConnectionId) {
      return false
    }
    if (token.peerExpectationOpen) return true
    return token.expectedPeer === null || samePeer(token.expectedPeer, tuple)
  }

  private validPeerIdentity(peer: RecoveryPeerIdentity): boolean {
    return isNonempty(peer.senderId) && isNonempty(peer.peerConnectionId)
  }

  private validTuple(tuple: RecoveryPeerTuple): boolean {
    return isNonempty(tuple.senderId) &&
      isNonempty(tuple.peerConnectionId) &&
      isNonempty(tuple.localConnectionId)
  }

  private validTransition(transition: RecoveryResetTransition): boolean {
    return isNonempty(transition.previousRoundId) &&
      isNonempty(transition.nextRoundId) &&
      transition.previousRoundId !== transition.nextRoundId
  }
}
