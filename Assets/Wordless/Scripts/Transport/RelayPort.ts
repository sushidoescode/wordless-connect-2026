import type { RelayMessage, RelayMessageDraft } from '../Core/Protocol'

export type RelayStatus =
  | 'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED'
  | 'COUNTERPART_TIMED_OUT'
  | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED'

export interface RelayDiagnostics {
  readonly activeChannels: number
  readonly activeTimers: number
  readonly messageListeners: number
}

export type RelayControlEvent =
  | {
      readonly type: 'SEQUENCE_GAP'
      readonly senderId: string
      readonly observedSequence: number
    }
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

export interface RelayPort {
  connect(): Promise<void>
  send(draft: RelayMessageDraft): Promise<void>
  invalidateApplicationGeneration(): void
  close(): Promise<void>
  onMessage(listener: (message: RelayMessage) => void): () => void
  onStatus(listener: (status: RelayStatus, detail: string) => void): () => void
  onControl(listener: (event: RelayControlEvent) => void): () => void
  setLocalRound(roundId: string): void
  completeLocalResync(senderId: string): void
  getConfirmedPeerConnectionId(): string | null
  getDiagnostics(): RelayDiagnostics
}
