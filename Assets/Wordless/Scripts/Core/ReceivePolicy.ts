import type { RelayMessage } from './Protocol'

export type ReceiveRole = 'painter' | 'guesser'

export type ReceiveRejectReason =
  | 'WRONG_SESSION'
  | 'WRONG_ROUND'
  | 'WRONG_AUTHORITY'
  | 'UNKNOWN_SENDER'
  | 'DUPLICATE_SEQUENCE'
  | 'STALE_SEQUENCE'
  | 'SEQUENCE_GAP'
  | 'STALE_CONNECTION'

export type ReceivePeerTransition =
  | {
      readonly type: 'PEER_REPLACED'
      readonly previousSenderId: string
      readonly nextSenderId: string
      readonly previousConnectionId: string
      readonly nextConnectionId: string
    }
  | {
      readonly type: 'PEER_REJOINED'
      readonly senderId: string
      readonly previousConnectionId: string
      readonly nextConnectionId: string
    }

export type ReceiveDecision =
  | {
      readonly accepted: true
      readonly peerTransition: ReceivePeerTransition | null
    }
  | { readonly accepted: false; readonly reason: ReceiveRejectReason }

type PresenceMessage = Extract<
  RelayMessage,
  { type: 'presence.ready' | 'presence.ack' }
>

type RoundResetMessage = Extract<RelayMessage, { type: 'round.reset' }>
type RoundStartMessage = Extract<RelayMessage, { type: 'round.start' }>
type ResetAckMessage = Extract<RelayMessage, { type: 'round.reset.ack' }>

interface SequenceGap {
  readonly senderId: string
  observedSequence: number
}

const ACCEPTED: ReceiveDecision = Object.freeze({
  accepted: true,
  peerTransition: null,
})

function accept(
  peerTransition: ReceivePeerTransition | null = null,
): ReceiveDecision {
  if (peerTransition === null) return ACCEPTED
  return { accepted: true, peerTransition }
}

function reject(reason: ReceiveRejectReason): ReceiveDecision {
  return { accepted: false, reason }
}

function isPresence(message: RelayMessage): message is PresenceMessage {
  return message.type === 'presence.ready' || message.type === 'presence.ack'
}

function isLobbyControl(message: RelayMessage): boolean {
  return isPresence(message) ||
    message.type === 'transport.ping' ||
    message.type === 'transport.ack'
}

/**
 * Pure receive-side routing policy shared by Lens and browser transports.
 * Inputs must already have passed Protocol.parseRelayMessage.
 */
export class ReceivePolicy {
  private readonly sessionId: string
  private readonly localRole: ReceiveRole

  private localConnectionId: string | null = null
  private peerSenderId: string | null = null
  private peerConnectionId: string | null = null
  private tupleConfirmed = false
  private highWater = 0
  private gapPending: SequenceGap | null = null

  private currentRoundId: string | null = null
  private previousRoundId: string | null = null
  private resetPending = false
  private browserRoundRequiresReset = false

  public constructor(sessionId: string, localRole: ReceiveRole) {
    this.sessionId = sessionId
    this.localRole = localRole
  }

  public beginLocalSubscription(
    connectionId: string,
    isReconnect: boolean,
  ): void {
    this.localConnectionId = connectionId
    this.tupleConfirmed = false
    this.gapPending = null
    if (this.localRole === 'guesser' &&
        isReconnect &&
        this.currentRoundId !== null) {
      this.browserRoundRequiresReset = true
    }
  }

  public evaluate(message: RelayMessage): ReceiveDecision {
    if (message.sessionId !== this.sessionId) {
      return reject('WRONG_SESSION')
    }

    if (isPresence(message)) {
      return this.evaluatePresence(message)
    }

    if (message.senderId !== this.peerSenderId) {
      return reject('UNKNOWN_SENDER')
    }

    return this.evaluateFromBoundPeer(message)
  }

  public setLocalRound(roundId: string): void {
    if (roundId === this.currentRoundId) return

    if (this.currentRoundId === null) {
      this.currentRoundId = roundId
      this.previousRoundId = null
      this.resetPending = false
      this.browserRoundRequiresReset = false
      return
    }

    this.previousRoundId = this.currentRoundId
    this.currentRoundId = roundId
    this.resetPending = true
  }

  public completeLocalResync(senderId: string): void {
    const gap = this.gapPending
    if (!gap || gap.senderId !== senderId || senderId !== this.peerSenderId) {
      return
    }
    if (gap.observedSequence > this.highWater) {
      this.highWater = gap.observedSequence
    }
    this.gapPending = null
  }

  public getConfirmedPeerConnectionId(): string | null {
    return this.tupleConfirmed ? this.peerConnectionId : null
  }

  private evaluatePresence(message: PresenceMessage): ReceiveDecision {
    if (message.payload.role !== this.expectedPeerRole()) {
      if (message.senderId === this.peerSenderId) {
        return this.evaluateFromBoundPeer(message)
      }
      return reject('WRONG_AUTHORITY')
    }

    const connectionId = message.payload.connectionId
    const targetIsCurrent = message.type === 'presence.ready' ||
      message.payload.acknowledgedConnectionId === this.localConnectionId

    if (message.senderId !== this.peerSenderId) {
      if (!targetIsCurrent) return reject('STALE_CONNECTION')
      return this.bindReplacementPeer(message, connectionId)
    }

    if (connectionId !== this.peerConnectionId) {
      if (!targetIsCurrent) {
        return this.evaluateFromBoundPeer(message)
      }
      return this.bindRejoinedPeer(message, connectionId)
    }

    return this.evaluateFromBoundPeer(message)
  }

  private bindReplacementPeer(
    message: PresenceMessage,
    connectionId: string,
  ): ReceiveDecision {
    const previousSenderId = this.peerSenderId
    const previousConnectionId = this.peerConnectionId

    this.peerSenderId = message.senderId
    this.peerConnectionId = connectionId
    this.highWater = message.sequence
    this.gapPending = null
    this.tupleConfirmed = message.type === 'presence.ack'

    if (previousSenderId !== null && previousConnectionId !== null) {
      if (this.localRole === 'guesser') {
        this.currentRoundId = null
        this.previousRoundId = null
        this.resetPending = false
        this.browserRoundRequiresReset = false
      }
      return accept({
        type: 'PEER_REPLACED',
        previousSenderId,
        nextSenderId: message.senderId,
        previousConnectionId,
        nextConnectionId: connectionId,
      })
    }

    return ACCEPTED
  }

  private bindRejoinedPeer(
    message: PresenceMessage,
    connectionId: string,
  ): ReceiveDecision {
    if (message.sequence === this.highWater) {
      return reject('DUPLICATE_SEQUENCE')
    }
    if (message.sequence < this.highWater) {
      return reject('STALE_SEQUENCE')
    }

    const previousConnectionId = this.peerConnectionId
    if (previousConnectionId === null) {
      return this.bindReplacementPeer(message, connectionId)
    }

    this.peerConnectionId = connectionId
    this.highWater = message.sequence
    this.gapPending = null
    this.tupleConfirmed = message.type === 'presence.ack'
    if (this.localRole === 'guesser' && this.currentRoundId !== null) {
      this.browserRoundRequiresReset = true
    }

    return accept({
      type: 'PEER_REJOINED',
      senderId: message.senderId,
      previousConnectionId,
      nextConnectionId: connectionId,
    })
  }

  private evaluateFromBoundPeer(message: RelayMessage): ReceiveDecision {
    if (message.sequence === this.highWater) {
      return reject('DUPLICATE_SEQUENCE')
    }
    if (message.sequence < this.highWater) {
      return reject('STALE_SEQUENCE')
    }

    if (this.gapPending !== null || message.sequence > this.highWater + 1) {
      return this.evaluateGap(message)
    }

    this.highWater = message.sequence
    return this.evaluateSemantics(message)
  }

  private evaluateGap(message: RelayMessage): ReceiveDecision {
    if (this.gapPending === null) {
      this.gapPending = {
        senderId: message.senderId,
        observedSequence: message.sequence,
      }
    }
    else if (message.sequence > this.gapPending.observedSequence) {
      this.gapPending.observedSequence = message.sequence
    }

    const observation = this.gapPending.observedSequence
    if (message.sequence < observation) {
      return reject('SEQUENCE_GAP')
    }

    if (this.isHandshakeBarrier(message)) {
      return this.acceptBarrier(message)
    }

    if (this.localRole === 'guesser' &&
        message.type === 'round.start' &&
        this.currentRoundId === null) {
      const startReason = this.initialStartBarrierReason(message)
      if (startReason === null) return this.acceptBarrier(message)
      return reject('SEQUENCE_GAP')
    }

    if (this.localRole === 'guesser' && message.type === 'round.reset') {
      const resetReason = this.browserResetReason(message)
      if (resetReason === null) return this.acceptBarrier(message)
      if (resetReason === 'WRONG_ROUND') return reject(resetReason)
      return reject('SEQUENCE_GAP')
    }

    if (this.localRole === 'painter' && message.type === 'round.reset.ack') {
      if (this.resetPending && this.resetAckMatches(message)) {
        return this.acceptBarrier(message)
      }
      if (!this.resetAckMatches(message)) return reject('WRONG_ROUND')
    }

    return reject('SEQUENCE_GAP')
  }

  private acceptBarrier(message: RelayMessage): ReceiveDecision {
    this.highWater = message.sequence
    this.gapPending = null
    return this.evaluateSemantics(message)
  }

  private isHandshakeBarrier(message: RelayMessage): boolean {
    if (this.tupleConfirmed || !isPresence(message)) return false
    if (message.payload.role !== this.expectedPeerRole() ||
        message.payload.connectionId !== this.peerConnectionId) {
      return false
    }
    if (message.type === 'presence.ready') return true
    return message.payload.acknowledgedConnectionId === this.localConnectionId
  }

  private evaluateSemantics(message: RelayMessage): ReceiveDecision {
    if (!this.hasPeerAuthority(message)) {
      return reject('WRONG_AUTHORITY')
    }

    if (message.type === 'presence.ready') return ACCEPTED

    if (message.type === 'presence.ack') {
      if (message.payload.acknowledgedConnectionId !== this.localConnectionId) {
        return reject('STALE_CONNECTION')
      }
      this.tupleConfirmed = true
      return ACCEPTED
    }

    if (isLobbyControl(message)) return ACCEPTED

    if (this.localRole === 'guesser') {
      return this.evaluateBrowserProduct(message)
    }
    return this.evaluateLensProduct(message)
  }

  private evaluateBrowserProduct(message: RelayMessage): ReceiveDecision {
    if (message.type === 'round.start') {
      const reason = this.browserStartReason(message)
      if (reason !== null) return reject(reason)
      if (this.currentRoundId === null) {
        this.currentRoundId = message.roundId
        this.previousRoundId = null
      }
      this.tupleConfirmed = true
      return ACCEPTED
    }

    if (message.type === 'round.reset') {
      const reason = this.browserResetReason(message)
      if (reason !== null) return reject(reason)
      this.acceptBrowserReset(message)
      return ACCEPTED
    }

    if (this.browserRoundRequiresReset) return reject('WRONG_ROUND')
    if (message.roundId !== this.currentRoundId) {
      return reject('WRONG_ROUND')
    }
    return ACCEPTED
  }

  private evaluateLensProduct(message: RelayMessage): ReceiveDecision {
    if (message.type === 'round.resync.request') {
      if (message.roundId === this.currentRoundId ||
          message.roundId === this.previousRoundId) {
        return ACCEPTED
      }
      return reject('WRONG_ROUND')
    }

    if (message.type === 'round.reset.ack') {
      if (!this.resetAckMatches(message)) return reject('WRONG_ROUND')
      this.resetPending = false
      return ACCEPTED
    }

    if (message.roundId !== this.currentRoundId) {
      return reject('WRONG_ROUND')
    }
    return ACCEPTED
  }

  private initialStartBarrierReason(
    message: RoundStartMessage,
  ): ReceiveRejectReason | null {
    if (!this.hasPeerAuthority(message)) return 'WRONG_AUTHORITY'
    if (message.payload.targetConnectionId !== this.localConnectionId) {
      return 'STALE_CONNECTION'
    }
    if (this.currentRoundId !== null) return 'WRONG_ROUND'
    return null
  }

  private browserStartReason(
    message: RoundStartMessage,
  ): ReceiveRejectReason | null {
    if (message.payload.targetConnectionId !== this.localConnectionId) {
      return 'STALE_CONNECTION'
    }
    if (this.browserRoundRequiresReset) return 'WRONG_ROUND'
    if (this.currentRoundId !== null && message.roundId !== this.currentRoundId) {
      return 'WRONG_ROUND'
    }
    return null
  }

  private browserResetReason(
    message: RoundResetMessage,
  ): ReceiveRejectReason | null {
    if (!this.hasPeerAuthority(message)) return 'WRONG_AUTHORITY'
    if (message.payload.targetConnectionId !== this.localConnectionId) {
      return 'STALE_CONNECTION'
    }
    if (message.payload.nextRoundId === message.roundId) {
      return 'WRONG_ROUND'
    }

    if (this.currentRoundId === null) return null
    const isTransition = message.roundId === this.currentRoundId &&
      message.payload.nextRoundId !== this.currentRoundId
    const isRetry = message.roundId === this.previousRoundId &&
      message.payload.nextRoundId === this.currentRoundId
    return isTransition || isRetry ? null : 'WRONG_ROUND'
  }

  private acceptBrowserReset(message: RoundResetMessage): void {
    const isRetry = message.roundId === this.previousRoundId &&
      message.payload.nextRoundId === this.currentRoundId
    if (!isRetry) {
      this.previousRoundId = message.roundId
      this.currentRoundId = message.payload.nextRoundId
    }
    this.browserRoundRequiresReset = false
    this.tupleConfirmed = true
  }

  private resetAckMatches(message: ResetAckMessage): boolean {
    return this.currentRoundId !== null &&
      message.roundId === this.currentRoundId &&
      message.payload.nextRoundId === this.currentRoundId
  }

  private hasPeerAuthority(message: RelayMessage): boolean {
    if (isPresence(message)) {
      return message.payload.role === this.expectedPeerRole()
    }

    if (message.type === 'transport.ping' ||
        message.type === 'transport.ack') {
      return true
    }

    if (this.localRole === 'painter') {
      return message.type === 'guess.submit' ||
        message.type === 'round.resync.request' ||
        message.type === 'round.reset.ack'
    }

    return message.type === 'round.start' ||
      message.type === 'stroke.begin' ||
      message.type === 'stroke.points' ||
      message.type === 'stroke.end' ||
      message.type === 'round.result' ||
      message.type === 'guess.rejected' ||
      message.type === 'round.timeout' ||
      message.type === 'round.reset'
  }

  private expectedPeerRole(): ReceiveRole {
    return this.localRole === 'painter' ? 'guesser' : 'painter'
  }
}
