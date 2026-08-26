import './styles.css'
import {
  appendGate0DisplayPoints,
  ProbeRttTracker,
  RelayProbe,
  type ProbeSequenceGap,
  type ProbeStatus,
} from './relay-probe'
import type { ProbeMessage } from './probe-protocol'

declare global {
  interface Window {
    wordlessProbe?: RelayProbe
  }
}

const connection = requiredElement<HTMLParagraphElement>('connection')
const canvas = requiredElement<HTMLCanvasElement>('stroke')
const guessWrong = requiredElement<HTMLButtonElement>('guess-wrong')
const guessCorrect = requiredElement<HTMLButtonElement>('guess-correct')
const pingButton = requiredElement<HTMLButtonElement>('ping')
const metrics = requiredElement<HTMLPreElement>('metrics')
const context = requiredCanvasContext(canvas)

let receivedMessages = 0
let receivedBytes = 0
const receivedPoints: [number, number][] = []
const encoder = new TextEncoder()
const rttTracker = new ProbeRttTracker()

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`missing element: ${id}`)
  return element as T
}

function requiredCanvasContext(element: HTMLCanvasElement): CanvasRenderingContext2D {
  const value = element.getContext('2d')
  if (!value) throw new Error('2D canvas unavailable')
  return value
}

function setControlsDisabled(disabled: boolean): void {
  guessWrong.disabled = disabled
  guessCorrect.disabled = disabled
  pingButton.disabled = disabled
}

function renderStroke(): void {
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (receivedPoints.length === 0) return

  context.beginPath()
  context.moveTo(receivedPoints[0][0], receivedPoints[0][1] * 0.6)
  for (const [x, y] of receivedPoints.slice(1)) context.lineTo(x, y * 0.6)
  context.strokeStyle = '#8B5CF6'
  context.lineWidth = 12
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.stroke()
}

function milliseconds(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)} ms`
}

function renderMetrics(): void {
  const rtt = rttTracker.snapshot()
  metrics.textContent = [
    `RECEIVED MESSAGES: ${receivedMessages}`,
    `RECEIVED BYTES: ${receivedBytes}`,
    `RTT SAMPLES: ${rtt.sampleCount}`,
    `RTT MEDIAN: ${milliseconds(rtt.medianMs)}`,
    `RTT P95: ${milliseconds(rtt.p95Ms)}`,
    `RTT MAX: ${milliseconds(rtt.maxMs)}`,
  ].join('\n')
}

function receive(message: ProbeMessage): void {
  receivedMessages += 1
  receivedBytes += encoder.encode(JSON.stringify(message)).byteLength

  if (message.kind === 'points') {
    appendGate0DisplayPoints(receivedPoints, message.points)
    renderStroke()
  }
  else if (message.kind === 'ack') {
    rttTracker.acceptAck(message)
  }

  renderMetrics()
}

function updateStatus(status: ProbeStatus, detail: string): void {
  connection.textContent = detail
  connection.dataset.status = status
  setControlsDisabled(status !== 'subscribed' && status !== 'live')
}

function reportSequenceGap(gap: ProbeSequenceGap): void {
  updateStatus(
    'sequence-gap',
    `SEQUENCE GAP: EXPECTED ${gap.expectedSeq}, RECEIVED ${gap.receivedSeq}`,
  )
}

async function reportSend(action: () => Promise<void>): Promise<void> {
  try {
    await action()
  }
  catch (error) {
    updateStatus('failed', `SEND FAILED: ${String(error)}`)
  }
}

function start(): void {
  renderMetrics()
  setControlsDisabled(true)

  const url = import.meta.env.VITE_SUPABASE_URL
  const publicKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY
  const sessionId = import.meta.env.VITE_RELAY_SESSION_ID
  const missing = [
    ['VITE_SUPABASE_URL', url],
    ['VITE_SUPABASE_PUBLIC_KEY', publicKey],
    ['VITE_RELAY_SESSION_ID', sessionId],
  ].filter(([, value]) => !value).map(([name]) => name)

  if (missing.length > 0) {
    updateStatus('failed', `MISSING CONFIGURATION: ${missing.join(', ')}`)
    return
  }

  const probe = new RelayProbe(
    url,
    publicKey,
    sessionId,
    receive,
    updateStatus,
    reportSequenceGap,
  )

  guessWrong.addEventListener('click', () => {
    void reportSend(async () => { await probe.sendGuess(1) })
  })
  guessCorrect.addEventListener('click', () => {
    void reportSend(async () => { await probe.sendGuess(2) })
  })
  pingButton.addEventListener('click', () => {
    void reportSend(async () => {
      await probe.sendPing(rttTracker)
    })
  })
  window.addEventListener('beforeunload', () => { void probe.close() })

  if (import.meta.env.DEV) window.wordlessProbe = probe
  probe.connect()
}

start()
