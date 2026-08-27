import type { ChoiceIndex, QuantizedPoint } from '@wordless/core/Protocol'
import type { WebRoundSnapshot } from './web-round-store'

const VIOLET = '#8B5CF6'
const LEMON = '#FFD65A'
const GLYPH_SIZE_PX = 220

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (!element) throw new Error(`missing element: ${id}`)
  return element as T
}

function canvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2D canvas unavailable')
  return context
}

function drawPath(
  canvas: HTMLCanvasElement,
  points: readonly QuantizedPoint[],
  showEndpoint: boolean,
): void {
  const clientWidth = Math.round(canvas.clientWidth)
  const clientHeight = Math.round(canvas.clientHeight)
  const cssWidth = clientWidth > 0 ? clientWidth : canvas.width
  const cssHeight = clientHeight > 0 ? clientHeight : canvas.height
  const deviceScale = Number.isFinite(globalThis.devicePixelRatio)
    ? Math.max(1, globalThis.devicePixelRatio)
    : 1
  const backingWidth = Math.round(cssWidth * deviceScale)
  const backingHeight = Math.round(cssHeight * deviceScale)
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth
    canvas.height = backingHeight
  }
  const context = canvasContext(canvas)
  context.resetTransform()
  context.scale(deviceScale, deviceScale)
  context.clearRect(0, 0, cssWidth, cssHeight)
  if (points.length === 0) return

  const mapX = (value: number) => value / 1_000 * cssWidth
  const mapY = (value: number) => value / 1_000 * cssHeight
  context.strokeStyle = VIOLET
  context.fillStyle = VIOLET
  context.lineWidth = Math.max(5, Math.min(cssWidth, cssHeight) * 0.018)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  if (points.length === 1) {
    context.arc(
      mapX(points[0][0]),
      mapY(points[0][1]),
      context.lineWidth / 2,
      0,
      Math.PI * 2,
    )
    context.fill()
  }
  else {
    context.moveTo(mapX(points[0][0]), mapY(points[0][1]))
    for (let index = 1; index < points.length; index += 1) {
      context.lineTo(mapX(points[index][0]), mapY(points[index][1]))
    }
    context.stroke()
  }

  if (!showEndpoint) return
  const endpoint = points[points.length - 1]
  context.beginPath()
  context.arc(
    mapX(endpoint[0]),
    mapY(endpoint[1]),
    Math.max(4, Math.min(cssWidth, cssHeight) * 0.012),
    0,
    Math.PI * 2,
  )
  context.fillStyle = LEMON
  context.fill()
}

function connectionLabel(connection: WebRoundSnapshot['connection']): string {
  switch (connection) {
    case 'joining': return 'CONNECTING'
    case 'waiting': return 'WAITING FOR PAINTER'
    case 'live': return 'PAINTER READY'
    case 'reconnecting': return 'RECONNECTING'
    case 'failed': return 'CONNECTION FAILED'
    case 'closed': return 'DISCONNECTED'
  }
}

function isTerminal(snapshot: WebRoundSnapshot): boolean {
  return snapshot.phase === 'CORRECT' ||
    snapshot.phase === 'GLYPH_LOCKED' ||
    snapshot.phase === 'TIMED_OUT'
}

function renderChoices(snapshot: WebRoundSnapshot): void {
  const choices = requiredElement<HTMLElement>('choices')
  const fragment = document.createDocumentFragment()
  if (snapshot.choices !== null) {
    snapshot.choices.forEach((word, index) => {
      const choiceIndex = index as ChoiceIndex
      const button = document.createElement('button')
      button.type = 'button'
      button.dataset.choiceIndex = String(choiceIndex)
      button.style.minHeight = '48px'

      const isWrong = snapshot.wrongChoices.includes(choiceIndex)
      const isCorrect = snapshot.correctChoice === choiceIndex &&
        (snapshot.phase === 'CORRECT' || snapshot.phase === 'GLYPH_LOCKED')
      const isSelectedPending = snapshot.pendingChoice === choiceIndex &&
        snapshot.pendingGuessId !== null

      if (isCorrect) {
        button.classList.add('is-correct')
        button.textContent = `✓ ${word} · CORRECT`
      }
      else if (isSelectedPending) {
        button.classList.add('is-pending')
        button.textContent = `${word} · SUBMITTED`
      }
      else if (isWrong) {
        button.classList.add('is-incorrect')
        button.textContent = `× ${word} · TRY AGAIN`
      }
      else {
        button.textContent = word
      }

      button.disabled = snapshot.pendingGuessId !== null || isWrong || isTerminal(snapshot) ||
        snapshot.connection !== 'live' || snapshot.phase !== 'ACTIVE'
      fragment.append(button)
    })
  }
  choices.replaceChildren(fragment)
}

function renderGlyph(snapshot: WebRoundSnapshot): void {
  const medallion = requiredElement<HTMLElement>('glyph-medallion')
  medallion.replaceChildren()
  medallion.hidden = snapshot.glyph.length === 0
  if (snapshot.glyph.length === 0) return

  const canvas = document.createElement('canvas')
  canvas.width = GLYPH_SIZE_PX
  canvas.height = GLYPH_SIZE_PX
  canvas.setAttribute('aria-label', 'Solved clue glyph drawing')
  medallion.append(canvas)
  drawPath(canvas, snapshot.glyph, false)
}

function resultLabel(snapshot: WebRoundSnapshot): string {
  if (snapshot.phase === 'CORRECT' || snapshot.phase === 'GLYPH_LOCKED') {
    return snapshot.revealedWord === null ? 'CORRECT' : `CORRECT · ${snapshot.revealedWord}`
  }
  if (snapshot.phase === 'TIMED_OUT') return 'TIME\u2019S UP · WAIT FOR THE NEXT CLUE'
  if (snapshot.wrongChoices.length > 0) return 'TRY AGAIN'
  return ''
}

export function render(snapshot: WebRoundSnapshot): void {
  document.getElementById('join-view')?.remove()
  const appShell = document.querySelector<HTMLElement>('.app-shell')
  appShell?.removeAttribute('hidden')
  if (appShell) appShell.dataset.phase = snapshot.phase

  const connection = requiredElement<HTMLElement>('connection')
  connection.textContent = connectionLabel(snapshot.connection)
  connection.dataset.status = snapshot.connection

  const timer = requiredElement<HTMLElement>('timer')
  timer.textContent = snapshot.phase === 'ACTIVE'
    ? `${Math.ceil(snapshot.remainingMs / 1_000)}s`
    : ''

  const canvas = requiredElement<HTMLCanvasElement>('stroke-canvas')
  drawPath(canvas, snapshot.points, snapshot.phase === 'ACTIVE')
  renderChoices(snapshot)
  renderGlyph(snapshot)
  requiredElement<HTMLElement>('result').textContent = resultLabel(snapshot)
}
