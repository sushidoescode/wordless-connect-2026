import {
  createClient,
  REALTIME_SUBSCRIBE_STATES,
  type RealtimeChannel,
  type SupabaseClient,
} from 'SupabaseClient.lspkg/supabase-snapcloud'

import {
  formatProbeUpdateGapReport,
  prepareProbePointSend,
  ProbeCadence,
  ProbePointStartGate,
  ProbeUpdateGapSampler,
  ProbeUpdateGapTracker,
  ProbeWireSequencer,
  type ProbeCadenceBatch,
} from './ProbeCadence'
import {
  createProbeIdSet,
  parseProbeInbound,
  type ProbePing,
} from './ProbeProtocol'
import { ProbeSendQueue } from './ProbeSendQueue'

const BROADCAST_EVENT = 'wordless-message'
const OUTBOUND_QUEUE_CAPACITY = 8
const CURSOR_MIN_X = -22
const CURSOR_MAX_X = 22
const POINT_X_CYCLE_MAX = 900

type ProbeOutbound = { [key: string]: unknown }

@component
export class RelaySpike extends BaseScriptComponent {
  @input supabaseProject: SupabaseProject
  @input channelName: string = 'WAVE42'
  @input statusText: Text
  @input statusVisual: MaterialMeshVisual
  @input pointCursor: SceneObject

  private client: SupabaseClient | null = null
  private channel: RealtimeChannel | null = null
  private sendQueue: ProbeSendQueue<ProbeOutbound> | null = null
  private readonly wireSequencer = new ProbeWireSequencer()
  private lastInboundSequence = 0
  private seenGuessIds = createProbeIdSet()
  private subscribed = false
  private terminal = false
  private removalStarted = false
  private pointBatchIndex = 0
  private pointSendOrdinal = 0
  private outboundQueueDepth = 0
  private readonly pointCadence = new ProbeCadence()
  private readonly pointStartGate = new ProbePointStartGate()
  private readonly updateGapSampler = new ProbeUpdateGapSampler()
  private readonly updateGapTracker = new ProbeUpdateGapTracker()
  private pointStartResolve: ((released: boolean) => void) | null = null

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => {
      void this.initialize().catch(() => this.terminate('CLIENT ERROR'))
    })
    this.createEvent('UpdateEvent').bind(() => {
      if (!this.subscribed || this.terminal) return
      const nowMs = getTime() * 1_000
      const gapObservation = this.updateGapSampler.observe(nowMs)
      const gapTracked = this.updateGapTracker.observe(nowMs)
      if (gapObservation.invalid || !gapTracked) {
        print('[RelaySpike] UPDATE_GAP_INVALID')
        this.terminate('CHANNEL_ERROR')
        return
      }
      this.releaseWaitingPointStart(nowMs)
      if (!this.terminal) {
        this.enqueuePointTicks(this.pointCadence.poll(nowMs))
      }
      if (!this.terminal && gapObservation.report) {
        print(formatProbeUpdateGapReport(gapObservation.report))
      }
    })
    this.createEvent('OnDestroyEvent').bind(() => {
      this.terminal = true
      this.subscribed = false
      this.pointCadence.stop()
      this.stopPointStarts()
      if (this.sendQueue) {
        this.sendQueue.stop()
        this.sendQueue = null
      }
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
      const nowMs = getTime() * 1_000
      const gapSamplerStarted = this.updateGapSampler.start(nowMs)
      const gapTrackerStarted = this.updateGapTracker.start(nowMs)
      if (!gapSamplerStarted || !gapTrackerStarted) {
        print('[RelaySpike] UPDATE_GAP_INVALID')
        this.terminate('CHANNEL_ERROR')
        return
      }
      this.enqueuePointTicks(this.pointCadence.start(nowMs))
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
      pingId: ping.pingId,
      sentAtMs: ping.sentAtMs,
    })
  }

  private enqueuePointTicks(batch: ProbeCadenceBatch): void {
    if (batch.overflowed) {
      print('[RelaySpike] SEND CADENCE_OVERFLOW')
      this.terminate('CHANNEL_ERROR')
      return
    }

    for (let count = 0; count < batch.dueTicks; count += 1) {
      void this.sendPointBatch()
    }
  }

  private async sendPointBatch(): Promise<void> {
    if (!this.subscribed || this.terminal) return

    const x = (this.pointBatchIndex * 37) % 901
    this.pointBatchIndex += 1
    const sent = await this.sendPayload({
      v: 1,
      kind: 'points',
      sessionId: this.channelName,
      points: [
        [x, 360],
        [x + 50, 500],
        [x + 100, 640],
      ],
    })
    if (sent) this.movePointCursor(x)
  }

  private async sendPayload(payload: ProbeOutbound): Promise<boolean> {
    const queue = this.sendQueue
    if (!queue || !this.subscribed || this.terminal) return false
    if (this.outboundQueueDepth >= OUTBOUND_QUEUE_CAPACITY) {
      print('[RelaySpike] SEND QUEUE_REJECTED')
      this.terminate('CHANNEL_ERROR')
      return false
    }

    this.outboundQueueDepth += 1
    const sent = await queue.enqueue(payload)
    this.outboundQueueDepth -= 1
    if (!sent && !this.terminal) this.terminate('CHANNEL_ERROR')
    return sent
  }

  private async sendPayloadNow(payload: ProbeOutbound): Promise<boolean> {
    if (!this.channel || !this.subscribed || this.terminal) return false

    try {
      if (payload.kind === 'points') {
        const mayStart = await this.waitForPointStart()
        if (!mayStart) return false
      }
      const channel = this.channel
      if (!channel || !this.subscribed || this.terminal) return false
      let updateGapMaxMs = 0
      if (payload.kind === 'points') {
        const trackedMaxGapMs = this.updateGapTracker.drainMaxGapMs()
        if (trackedMaxGapMs === null) {
          print('[RelaySpike] UPDATE_GAP_INVALID')
          this.terminate('CHANNEL_ERROR')
          return false
        }
        updateGapMaxMs = trackedMaxGapMs
      }
      let wirePayload = this.wireSequencer.stamp(payload)
      if (payload.kind === 'points') {
        this.pointSendOrdinal += 1
        const prepared = prepareProbePointSend(
          wirePayload,
          this.pointSendOrdinal,
          getTime() * 1_000,
          Date.now(),
          updateGapMaxMs,
        )
        wirePayload = prepared.wirePayload
        print(prepared.telemetry)
      }
      const result = await channel.send({
        type: 'broadcast',
        event: BROADCAST_EVENT,
        payload: wirePayload,
      })
      if (result !== 'ok') print('[RelaySpike] SEND CHANNEL_NON_OK')
      return result === 'ok'
    }
    catch {
      print('[RelaySpike] SEND CHANNEL_THROW')
      return false
    }
  }

  private waitForPointStart(): Promise<boolean> {
    if (this.terminal || !this.subscribed) return Promise.resolve(false)

    const batch = this.pointStartGate.tryStart(getTime() * 1_000)
    if (batch.overflowed) {
      print('[RelaySpike] SEND CADENCE_OVERFLOW')
      this.terminate('CHANNEL_ERROR')
      return Promise.resolve(false)
    }
    if (batch.dueTicks === 1) return Promise.resolve(true)
    if (this.pointStartResolve) {
      print('[RelaySpike] SEND CADENCE_CONFLICT')
      this.terminate('CHANNEL_ERROR')
      return Promise.resolve(false)
    }

    return new Promise((resolve) => {
      this.pointStartResolve = resolve
    })
  }

  private releaseWaitingPointStart(nowMs: number): void {
    const resolve = this.pointStartResolve
    if (!resolve) return

    const batch = this.pointStartGate.tryStart(nowMs)
    if (batch.overflowed) {
      this.pointStartResolve = null
      resolve(false)
      print('[RelaySpike] SEND CADENCE_OVERFLOW')
      this.terminate('CHANNEL_ERROR')
      return
    }
    if (batch.dueTicks === 0) return

    this.pointStartResolve = null
    resolve(true)
  }

  private stopPointStarts(): void {
    this.pointStartGate.stop()
    const resolve = this.pointStartResolve
    this.pointStartResolve = null
    if (resolve) resolve(false)
  }

  private movePointCursor(transportedX: number): void {
    if (!this.pointCursor) return

    const transform = this.pointCursor.getTransform()
    const position = transform.getLocalPosition()
    const cursorX = CURSOR_MIN_X +
      (transportedX / POINT_X_CYCLE_MAX) * (CURSOR_MAX_X - CURSOR_MIN_X)
    transform.setLocalPosition(new vec3(cursorX, position.y, position.z))
  }

  private terminate(status: string): void {
    if (this.terminal) return
    this.terminal = true
    this.subscribed = false
    this.pointCadence.stop()
    this.stopPointStarts()
    if (this.sendQueue) {
      this.sendQueue.stop()
      this.sendQueue = null
    }
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
