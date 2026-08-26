import {
  clearInterval,
  createClient,
  REALTIME_SUBSCRIBE_STATES,
  setInterval,
  type RealtimeChannel,
  type SupabaseClient,
} from 'SupabaseClient.lspkg/supabase-snapcloud'

import {
  createProbeIdSet,
  parseProbeInbound,
  type ProbePing,
} from './ProbeProtocol'
import { ProbeSendQueue } from './ProbeSendQueue'

const BROADCAST_EVENT = 'wordless-message'
const OUTBOUND_QUEUE_CAPACITY = 8
const POINT_INTERVAL_MS = 100

type ProbeOutbound = { [key: string]: unknown }

@component
export class RelaySpike extends BaseScriptComponent {
  @input supabaseProject: SupabaseProject
  @input channelName: string = 'WAVE42'
  @input statusText: Text
  @input statusVisual: MaterialMeshVisual

  private client: SupabaseClient | null = null
  private channel: RealtimeChannel | null = null
  private sendQueue: ProbeSendQueue<ProbeOutbound> | null = null
  private sequence = 0
  private lastInboundSequence = 0
  private seenGuessIds = createProbeIdSet()
  private subscribed = false
  private terminal = false
  private removalStarted = false
  private pointBatchIndex = 0
  private pointSendInFlight = false
  private pointTimer: ReturnType<typeof setInterval> | null = null

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => {
      void this.initialize().catch(() => this.terminate('CLIENT ERROR'))
    })
    this.createEvent('OnDestroyEvent').bind(() => {
      this.terminal = true
      this.subscribed = false
      if (this.sendQueue) {
        this.sendQueue.stop()
        this.sendQueue = null
      }
      this.stopPointTimer()
      this.removeChannels()
    })
  }

  private async initialize(): Promise<void> {
    if (this.terminal) return
    this.setStatus('CONNECTING', new vec4(1, 0.839216, 0.352941, 1))

    if (!this.supabaseProject || !this.supabaseProject.url ||
        !this.supabaseProject.publicToken) {
      this.terminate('CLIENT ERROR')
      return
    }

    try {
      this.client = createClient(
        this.supabaseProject.url,
        this.supabaseProject.publicToken,
      )
      print('[RelaySpike] CLIENT_CONFIGURED')
      this.openChannel()
    }
    catch {
      this.terminate('CLIENT ERROR')
    }
  }

  private openChannel(): void {
    if (!this.client || this.terminal) return

    try {
      const channel = this.client
        .channel(`wordless-relay:${this.channelName}`, {
          config: { broadcast: { self: false } },
        })
        .on('broadcast', { event: BROADCAST_EVENT }, (message) => {
          this.handleInbound(message.payload)
        })
      this.channel = channel
      this.sendQueue = new ProbeSendQueue(
        (payload) => this.sendPayloadNow(payload),
        OUTBOUND_QUEUE_CAPACITY,
      )
      channel.subscribe((status) => this.handleSubscriptionStatus(status))
    }
    catch {
      this.terminate('CHANNEL_ERROR')
    }
  }

  private handleSubscriptionStatus(status: REALTIME_SUBSCRIBE_STATES): void {
    if (this.terminal) return

    if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
      if (this.subscribed) return
      this.subscribed = true
      this.setStatus(
        'SUBSCRIBED',
        new vec4(0.450980, 0.901961, 0.682353, 1),
      )
      print('[RelaySpike] CHANNEL SUBSCRIBED')
      this.startPointTimer()
      return
    }

    if (status === REALTIME_SUBSCRIBE_STATES.CLOSED ||
        status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR ||
        status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
      this.terminate(status)
    }
  }

  private handleInbound(payload: unknown): void {
    if (this.terminal || !this.subscribed) return

    const message = parseProbeInbound(
      payload,
      this.channelName,
      this.lastInboundSequence,
      this.seenGuessIds,
    )

    if (!message) {
      print('[RelaySpike] REJECTED')
      return
    }

    this.lastInboundSequence = message.seq
    if (message.kind === 'guess') {
      this.seenGuessIds[message.guessId] = true
      print('[RelaySpike] RX_GUESS')
      if (message.choiceIndex === 2) {
        this.setStatus(
          'CORRECT',
          new vec4(0.450980, 0.901961, 0.682353, 1),
        )
      }
      else {
        this.setStatus(
          'TRY AGAIN',
          new vec4(1, 0.470588, 0.415686, 1),
        )
      }
      return
    }

    void this.sendAck(message)
  }

  private async sendAck(ping: ProbePing): Promise<void> {
    await this.sendPayload({
      v: 1,
      kind: 'ack',
      sessionId: this.channelName,
      seq: this.nextSequence(),
      pingId: ping.pingId,
      sentAtMs: ping.sentAtMs,
    })
  }

  private startPointTimer(): void {
    if (this.pointTimer || this.terminal) return
    this.pointTimer = setInterval(() => {
      void this.sendPointBatch()
    }, POINT_INTERVAL_MS)
  }

  private stopPointTimer(): void {
    if (!this.pointTimer) return
    clearInterval(this.pointTimer)
    this.pointTimer = null
  }

  private async sendPointBatch(): Promise<void> {
    if (!this.subscribed || this.terminal || this.pointSendInFlight) return
    this.pointSendInFlight = true

    const x = (this.pointBatchIndex * 37) % 901
    this.pointBatchIndex += 1
    try {
      await this.sendPayload({
        v: 1,
        kind: 'points',
        sessionId: this.channelName,
        seq: this.nextSequence(),
        points: [
          [x, 360],
          [x + 50, 500],
          [x + 100, 640],
        ],
        sentAtMs: Date.now(),
      })
    }
    finally {
      this.pointSendInFlight = false
    }
  }

  private async sendPayload(payload: ProbeOutbound): Promise<void> {
    const queue = this.sendQueue
    if (!queue || !this.subscribed || this.terminal) return

    const sent = await queue.enqueue(payload)
    if (!sent && !this.terminal) this.terminate('CHANNEL_ERROR')
  }

  private async sendPayloadNow(payload: ProbeOutbound): Promise<boolean> {
    const channel = this.channel
    if (!channel || !this.subscribed || this.terminal) return false

    try {
      const result = await channel.send({
        type: 'broadcast',
        event: BROADCAST_EVENT,
        payload,
      })
      return result === 'ok'
    }
    catch {
      return false
    }
  }

  private nextSequence(): number {
    this.sequence += 1
    return this.sequence
  }

  private terminate(status: string): void {
    if (this.terminal) return
    this.terminal = true
    this.subscribed = false
    if (this.sendQueue) {
      this.sendQueue.stop()
      this.sendQueue = null
    }
    this.stopPointTimer()
    this.setStatus(status, new vec4(1, 0.470588, 0.415686, 1))
    print(`[RelaySpike] CHANNEL ${status}`)
    this.removeChannels()
  }

  private removeChannels(): void {
    if (!this.client || this.removalStarted) return
    this.removalStarted = true
    void this.client.removeAllChannels().catch(() => {
      print('[RelaySpike] CHANNEL REMOVE_FAILED')
    })
  }

  private setStatus(label: string, color: vec4): void {
    if (this.statusText) this.statusText.text = label
    if (this.statusVisual && this.statusVisual.mainPass) {
      this.statusVisual.mainPass.baseColor = color
    }
  }
}
