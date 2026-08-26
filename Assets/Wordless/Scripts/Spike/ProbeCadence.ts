// Point releases stay phase-locked to their nominal 100 ms deadlines.
const POINT_INTERVAL_MS = 100
const UPDATE_GAP_WINDOW_MS = 10_000

export interface ProbeCadenceBatch {
  dueTicks: number
  overflowed: boolean
}

export interface PreparedProbePointSend {
  wirePayload: { [key: string]: unknown }
  telemetry: string
}

export interface ProbeUpdateGapReport {
  sampleCount: number
  maxGapMs: number
  spanMs: number
}

export interface ProbeUpdateGapObservation {
  invalid: boolean
  report: ProbeUpdateGapReport | null
}

export function formatProbeUpdateGapReport(
  report: ProbeUpdateGapReport,
): string {
  return '[RelaySpike] UPDATE_GAP_MAX ' +
    `sampleCount=${report.sampleCount} ` +
    `maxGapMs=${Math.ceil(report.maxGapMs)} ` +
    `spanMs=${Math.round(report.spanMs)}`
}

export function prepareProbePointSend(
  draft: { [key: string]: unknown },
  ordinal: number,
  monotonicMs: number,
  sentAtMs: number,
  updateGapMaxMs: number,
): PreparedProbePointSend {
  return {
    wirePayload: { ...draft, sentAtMs },
    telemetry: '[RelaySpike] POINT_START ' +
      `ordinal=${ordinal} monotonicMs=${Math.round(monotonicMs)} ` +
      `updateGapMaxMs=${Math.ceil(updateGapMaxMs)}`,
  }
}

export class ProbeWireSequencer {
  private sequence = 0

  stamp(
    draft: { [key: string]: unknown },
  ): { [key: string]: unknown } {
    this.sequence += 1
    return { ...draft, seq: this.sequence }
  }
}

export class ProbeUpdateGapSampler {
  private active = false
  private firstUpdateMs: number | null = null
  private lastUpdateMs: number | null = null
  private sampleCount = 0
  private maxGapMs = 0

  start(nowMs: number): boolean {
    this.active = false
    this.firstUpdateMs = null
    this.lastUpdateMs = null
    this.sampleCount = 0
    this.maxGapMs = 0
    if (!Number.isFinite(nowMs)) return false

    this.active = true
    this.firstUpdateMs = nowMs
    this.lastUpdateMs = nowMs
    return true
  }

  observe(nowMs: number): ProbeUpdateGapObservation {
    if (!this.active) return { invalid: false, report: null }
    if (!Number.isFinite(nowMs) ||
        (this.lastUpdateMs !== null && nowMs < this.lastUpdateMs)) {
      this.active = false
      return { invalid: true, report: null }
    }

    const gapMs = nowMs - (this.lastUpdateMs as number)
    this.lastUpdateMs = nowMs
    this.sampleCount += 1
    this.maxGapMs = Math.max(this.maxGapMs, gapMs)
    const spanMs = nowMs - this.firstUpdateMs
    if (spanMs < UPDATE_GAP_WINDOW_MS) {
      return { invalid: false, report: null }
    }

    this.active = false
    return {
      invalid: false,
      report: {
        sampleCount: this.sampleCount,
        maxGapMs: this.maxGapMs,
        spanMs,
      },
    }
  }
}

export class ProbeUpdateGapTracker {
  private active = false
  private lastUpdateMs: number | null = null
  private maxGapMs = 0

  start(nowMs: number): boolean {
    this.active = false
    this.lastUpdateMs = null
    this.maxGapMs = 0
    if (!Number.isFinite(nowMs)) return false

    this.active = true
    this.lastUpdateMs = nowMs
    return true
  }

  observe(nowMs: number): boolean {
    const lastUpdateMs = this.lastUpdateMs
    if (!this.active || lastUpdateMs === null) return false
    if (!Number.isFinite(nowMs) || nowMs < lastUpdateMs) {
      this.active = false
      this.lastUpdateMs = null
      return false
    }

    const gapMs = nowMs - lastUpdateMs
    if (!Number.isFinite(gapMs)) {
      this.active = false
      this.lastUpdateMs = null
      return false
    }
    this.lastUpdateMs = nowMs
    this.maxGapMs = Math.max(this.maxGapMs, gapMs)
    return true
  }

  drainMaxGapMs(): number | null {
    if (!this.active || this.lastUpdateMs === null) return null

    const maxGapMs = this.maxGapMs
    this.maxGapMs = 0
    return maxGapMs
  }
}

export class ProbeCadence {
  private nextDeadlineMs: number | null = null

  start(nowMs: number): ProbeCadenceBatch {
    if (!Number.isFinite(nowMs)) {
      this.nextDeadlineMs = null
      return { dueTicks: 0, overflowed: true }
    }
    this.nextDeadlineMs = nowMs + POINT_INTERVAL_MS
    return { dueTicks: 1, overflowed: false }
  }

  poll(nowMs: number): ProbeCadenceBatch {
    const deadlineMs = this.nextDeadlineMs
    if (deadlineMs === null) {
      return { dueTicks: 0, overflowed: false }
    }
    if (!Number.isFinite(nowMs)) {
      this.nextDeadlineMs = null
      return { dueTicks: 0, overflowed: true }
    }
    if (nowMs < deadlineMs) return { dueTicks: 0, overflowed: false }

    if (nowMs - deadlineMs >= POINT_INTERVAL_MS) {
      this.nextDeadlineMs = nowMs + POINT_INTERVAL_MS
    }
    else {
      this.nextDeadlineMs = deadlineMs + POINT_INTERVAL_MS
    }
    return { dueTicks: 1, overflowed: false }
  }

  stop(): void {
    this.nextDeadlineMs = null
  }
}

export class ProbePointStartGate {
  private readonly cadence = new ProbeCadence()
  private started = false
  private stopped = false

  tryStart(nowMs: number): ProbeCadenceBatch {
    if (this.stopped) return { dueTicks: 0, overflowed: false }
    if (this.started) return this.cadence.poll(nowMs)

    const batch = this.cadence.start(nowMs)
    if (!batch.overflowed) this.started = true
    return batch
  }

  stop(): void {
    this.stopped = true
    this.started = false
    this.cadence.stop()
  }
}
