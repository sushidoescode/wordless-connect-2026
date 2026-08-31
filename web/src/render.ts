import type { ChoiceIndex, QuantizedPoint, StrokeColorId } from '@wordless/core/Protocol'
import { PAINTER_COLOR_IDS, painterColorHex } from '@wordless/core/Palette'
import {
  easeOutCubic,
  interpolatePath,
  type GlyphTransitionPoint,
} from '@wordless/core/GlyphTransition'
import type { WebRoundSnapshot } from './web-round-store'

const CORAL = '#FF786A'
const GLYPH_SIZE_PX = 220
const GLYPH_TRANSITION_MS = 450

function buildStrokeColors(): Readonly<Record<StrokeColorId, string>> {
  const colors = {} as Record<StrokeColorId, string>
  for (const colorId of PAINTER_COLOR_IDS) {
    colors[colorId] = painterColorHex(colorId)
  }
  return colors
}

const STROKE_COLORS: Readonly<Record<StrokeColorId, string>> = buildStrokeColors()

interface ActiveGlyphTransition {
  readonly key: string
  readonly canvas: HTMLCanvasElement
  frameHandle: number | null
}

let activeGlyphTransition: ActiveGlyphTransition | null = null

export interface SurfaceRect {
  readonly left: number
  readonly top: number
  readonly width: number
  readonly height: number
}

export interface GlyphTransitionLayout {
  readonly from: readonly GlyphTransitionPoint[]
  readonly to: readonly GlyphTransitionPoint[]
}

function baseStrokeColor(snapshot: WebRoundSnapshot): string | null {
  return snapshot.strokeColorId === null
    ? null
    : STROKE_COLORS[snapshot.strokeColorId]
}

function mapPointToSurface(
  point: QuantizedPoint,
  rect: SurfaceRect,
  surface: SurfaceRect,
): GlyphTransitionPoint {
  return [
    rect.left - surface.left + point[0] / 1_000 * rect.width,
    rect.top - surface.top + point[1] / 1_000 * rect.height,
  ]
}

export function layoutGlyphTransitionPaths(
  source: readonly QuantizedPoint[],
  destination: readonly QuantizedPoint[],
  surfaceRect: SurfaceRect,
  sourceRect: SurfaceRect,
  destinationRect: SurfaceRect,
): GlyphTransitionLayout {
  if (source.length !== destination.length) throw new Error('path length mismatch')
  return {
    from: source.map((point) => mapPointToSurface(point, sourceRect, surfaceRect)),
    to: destination.map((point) => mapPointToSurface(point, destinationRect, surfaceRect)),
  }
}

export function glyphTransitionFrame(
  layout: GlyphTransitionLayout,
  progress: number,
): readonly GlyphTransitionPoint[] {
  return interpolatePath(layout.from, layout.to, progress)
}

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

interface PreparedCanvas {
  readonly context: CanvasRenderingContext2D
  readonly width: number
  readonly height: number
}

function prepareCanvas(canvas: HTMLCanvasElement): PreparedCanvas {
  const clientWidth = Math.round(canvas.clientWidth)
  const clientHeight = Math.round(canvas.clientHeight)
  const width = clientWidth > 0 ? clientWidth : canvas.width
  const height = clientHeight > 0 ? clientHeight : canvas.height
  const deviceScale = Number.isFinite(globalThis.devicePixelRatio)
    ? Math.max(1, globalThis.devicePixelRatio)
    : 1
  const backingWidth = Math.round(width * deviceScale)
  const backingHeight = Math.round(height * deviceScale)
  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth
    canvas.height = backingHeight
  }
  const context = canvasContext(canvas)
  context.resetTransform()
  context.scale(deviceScale, deviceScale)
  context.clearRect(0, 0, width, height)
  return { context, width, height }
}

function pathLineWidth(width: number, height: number): number {
  return Math.max(5, Math.min(width, height) * 0.018)
}

function paintPath(
  context: CanvasRenderingContext2D,
  points: readonly GlyphTransitionPoint[],
  lineWidth: number,
  color: string,
): void {
  if (points.length === 0) return
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = lineWidth
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  if (points.length === 1) {
    context.arc(points[0][0], points[0][1], lineWidth / 2, 0, Math.PI * 2)
    context.fill()
    return
  }
  context.moveTo(points[0][0], points[0][1])
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1])
  }
  context.stroke()
}

function drawPath(
  canvas: HTMLCanvasElement,
  points: readonly QuantizedPoint[],
  showEndpoint: boolean,
  color: string | null,
): void {
  const { context, width: cssWidth, height: cssHeight } = prepareCanvas(canvas)
  if (points.length === 0 || color === null) return

  const mapX = (value: number) => value / 1_000 * cssWidth
  const mapY = (value: number) => value / 1_000 * cssHeight
  paintPath(
    context,
    points.map((point) => [mapX(point[0]), mapY(point[1])]),
    pathLineWidth(cssWidth, cssHeight),
    color,
  )

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
  context.fillStyle = color
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
  if (snapshot.choices === null) {
    choices.replaceChildren()
    return
  }

  const existing = new Map(
    [...choices.querySelectorAll<HTMLButtonElement>('button[data-choice-index]')]
      .map((button) => [button.dataset.choiceIndex, button] as const),
  )
  const retained = new Set<HTMLButtonElement>()
  snapshot.choices.forEach((word, index) => {
      const choiceIndex = index as ChoiceIndex
      const key = String(choiceIndex)
      const button = existing.get(key) ?? document.createElement('button')
      const wasWrong = button.classList.contains('is-incorrect')
      const wasCorrect = button.classList.contains('is-correct')
      button.type = 'button'
      button.dataset.choiceIndex = key
      button.style.minHeight = '48px'

      const isWrong = snapshot.wrongChoices.includes(choiceIndex)
      const isCorrect = snapshot.correctChoice === choiceIndex &&
        (snapshot.phase === 'CORRECT' || snapshot.phase === 'GLYPH_LOCKED')
      const isSelectedPending = snapshot.pendingChoice === choiceIndex &&
        snapshot.pendingGuessId !== null

      button.classList.toggle('is-correct', isCorrect)
      button.classList.toggle('is-pending', isSelectedPending)
      button.classList.toggle('is-incorrect', isWrong && !isSelectedPending)
      if (isCorrect && !wasCorrect) button.classList.add('is-newly-correct')
      else if (!isCorrect) button.classList.remove('is-newly-correct')
      if (isWrong && !isSelectedPending && !wasWrong) {
        button.classList.add('is-newly-incorrect')
      }
      else if (!isWrong || isSelectedPending) {
        button.classList.remove('is-newly-incorrect')
      }

      if (isCorrect) {
        button.textContent = `✓ ${word} · CORRECT`
      }
      else if (isSelectedPending) {
        button.textContent = `${word} · SUBMITTED`
      }
      else if (isWrong) {
        button.textContent = `× ${word} · TRY AGAIN`
      }
      else {
        button.textContent = word
      }

      button.disabled = snapshot.pendingGuessId !== null || isWrong || isTerminal(snapshot) ||
        snapshot.connection !== 'live' || snapshot.phase !== 'ACTIVE'
      retained.add(button)
      const currentAtIndex = choices.children.item(index)
      if (currentAtIndex !== button) choices.insertBefore(button, currentAtIndex)
  })
  for (const button of choices.querySelectorAll<HTMLButtonElement>('button')) {
    if (!retained.has(button)) button.remove()
  }
}

function renderGlyph(
  snapshot: WebRoundSnapshot,
  transitioning: boolean,
  color: string | null,
): HTMLCanvasElement | null {
  const medallion = requiredElement<HTMLElement>('glyph-medallion')
  medallion.replaceChildren()
  medallion.hidden = snapshot.glyph.length === 0 || color === null
  medallion.classList.toggle('is-transitioning', transitioning)
  if (snapshot.glyph.length === 0 || color === null) return null

  const canvas = document.createElement('canvas')
  canvas.width = GLYPH_SIZE_PX
  canvas.height = GLYPH_SIZE_PX
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Solved clue glyph drawing')
  medallion.append(canvas)
  drawPath(canvas, snapshot.glyph, false, color)
  return canvas
}

function cancelGlyphTransition(): void {
  const transition = activeGlyphTransition
  if (transition !== null && transition.frameHandle !== null &&
      typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(transition.frameHandle)
  }
  transition?.canvas.remove()
  activeGlyphTransition = null
  document.getElementById('glyph-transition-canvas')?.remove()
}

function startGlyphTransition(
  snapshot: WebRoundSnapshot,
  sourceCanvas: HTMLCanvasElement,
  glyphCanvas: HTMLCanvasElement,
  color: string,
): void {
  const playField = sourceCanvas.closest<HTMLElement>('.play-field')
  if (!playField || snapshot.points.length === 0) return

  const transitionCanvas = document.createElement('canvas')
  transitionCanvas.id = 'glyph-transition-canvas'
  transitionCanvas.width = Math.max(1, Math.round(playField.clientWidth))
  transitionCanvas.height = Math.max(1, Math.round(playField.clientHeight))
  transitionCanvas.setAttribute('aria-hidden', 'true')
  playField.append(transitionCanvas)

  const paintFrame = (progress: number): void => {
    const prepared = prepareCanvas(transitionCanvas)
    const surfaceRect = transitionCanvas.getBoundingClientRect()
    const sourceRect = sourceCanvas.getBoundingClientRect()
    const destinationRect = glyphCanvas.getBoundingClientRect()
    const layout = layoutGlyphTransitionPaths(
      snapshot.points,
      snapshot.glyph,
      surfaceRect,
      sourceRect,
      destinationRect,
    )
    const sourceWidth = pathLineWidth(sourceRect.width, sourceRect.height)
    const destinationWidth = pathLineWidth(destinationRect.width, destinationRect.height)
    const eased = easeOutCubic(progress)
    const lineWidth = sourceWidth + (destinationWidth - sourceWidth) * eased
    paintPath(prepared.context, glyphTransitionFrame(layout, progress), lineWidth, color)
    transitionCanvas.dataset.progress = String(Math.max(0, Math.min(1, progress)))
  }

  transitionCanvas.dataset.pointCount = String(snapshot.points.length)
  paintFrame(0)

  const key = `${snapshot.roundId}:${snapshot.roundGeneration}`
  const transition: ActiveGlyphTransition = {
    key,
    canvas: transitionCanvas,
    frameHandle: null,
  }
  activeGlyphTransition = transition
  if (typeof globalThis.requestAnimationFrame !== 'function') return

  const startedAtMs = globalThis.performance.now()
  const step = (nowMs: number): void => {
    if (activeGlyphTransition?.key !== key) return
    const progress = Math.min(1, Math.max(0, (nowMs - startedAtMs) / GLYPH_TRANSITION_MS))
    paintFrame(progress)
    if (progress < 1) {
      transition.frameHandle = globalThis.requestAnimationFrame(step)
    }
    else {
      transition.frameHandle = null
    }
  }
  transition.frameHandle = globalThis.requestAnimationFrame(step)
}

function resultLabel(snapshot: WebRoundSnapshot): string {
  if (snapshot.phase === 'CORRECT' || snapshot.phase === 'GLYPH_LOCKED') {
    return snapshot.revealedWord === null ? 'CORRECT' : `CORRECT · ${snapshot.revealedWord}`
  }
  if (snapshot.phase === 'TIMED_OUT') return 'TIME\u2019S UP · WAIT FOR THE NEXT CLUE'
  if (snapshot.wrongChoices.length > 0) return 'TRY AGAIN'
  return ''
}

export interface RenderOptions {
  readonly reducedMotion?: boolean
}

export function render(snapshot: WebRoundSnapshot, options: RenderOptions = {}): void {
  const transitionKey = snapshot.phase === 'CORRECT' && options.reducedMotion !== true
    ? `${snapshot.roundId}:${snapshot.roundGeneration}`
    : null
  const preserveTransition = transitionKey !== null &&
    activeGlyphTransition?.key === transitionKey &&
    activeGlyphTransition.canvas.isConnected
  if (!preserveTransition) cancelGlyphTransition()
  document.getElementById('join-view')?.remove()
  const appShell = document.querySelector<HTMLElement>('.app-shell')
  appShell?.removeAttribute('hidden')
  if (appShell) appShell.dataset.phase = snapshot.phase

  const connection = requiredElement<HTMLElement>('connection')
  const previousConnection = connection.dataset.status
  if (previousConnection !== undefined && previousConnection !== snapshot.connection) {
    connection.classList.remove('is-changing')
    void connection.offsetWidth
    connection.classList.add('is-changing')
  }
  connection.textContent = connectionLabel(snapshot.connection)
  connection.dataset.status = snapshot.connection

  const timer = requiredElement<HTMLElement>('timer')
  timer.textContent = snapshot.phase === 'ACTIVE'
    ? `${Math.ceil(snapshot.remainingMs / 1_000)}s`
    : ''

  const canvas = requiredElement<HTMLCanvasElement>('stroke-canvas')
  const solved = snapshot.phase === 'CORRECT' || snapshot.phase === 'GLYPH_LOCKED'
  const baseColor = baseStrokeColor(snapshot)
  const livePathColor = baseColor !== null &&
    snapshot.phase === 'ACTIVE' && snapshot.wrongChoices.length > 0
    ? CORAL
    : baseColor
  drawPath(
    canvas,
    solved ? [] : snapshot.points,
    snapshot.phase === 'ACTIVE',
    livePathColor,
  )
  renderChoices(snapshot)
  const shouldTransition = snapshot.phase === 'CORRECT' && options.reducedMotion !== true
  const glyphCanvas = preserveTransition
    ? requiredElement<HTMLElement>('glyph-medallion').querySelector<HTMLCanvasElement>('canvas')
    : renderGlyph(snapshot, shouldTransition, baseColor)
  if (!preserveTransition && shouldTransition && glyphCanvas !== null && baseColor !== null) {
    startGlyphTransition(snapshot, canvas, glyphCanvas, baseColor)
  }
  requiredElement<HTMLElement>('result').textContent = resultLabel(snapshot)
}
