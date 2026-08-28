// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  glyphTransitionFrame,
  layoutGlyphTransitionPaths,
  render,
} from '../src/render'
import type { WebRoundSnapshot } from '../src/web-round-store'
import type { StrokeColorId } from '@wordless/core/Protocol'

type CanvasCall = readonly [string, ...unknown[]]

let canvasCalls: CanvasCall[]
let canvasContexts: WeakMap<HTMLCanvasElement, TestCanvasContext>

interface PaintedCircle {
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly color: string
}

interface TestCanvasContext {
  clearRect(...args: number[]): void
  beginPath(): void
  moveTo(...args: number[]): void
  lineTo(...args: number[]): void
  stroke(): void
  arc(...args: number[]): void
  fill(): void
  resetTransform(): void
  scale(...args: number[]): void
  getImageData(x: number, y: number, width: number, height: number): ImageData
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  lineWidth: number
  strokeStyle: string
  fillStyle: string
}

function createTestContext(): TestCanvasContext {
  let scaleX = 1
  let scaleY = 1
  let pendingCircle: Omit<PaintedCircle, 'color'> | null = null
  let paintedCircles: PaintedCircle[] = []
  const context: TestCanvasContext = {
    clearRect: (...args) => {
      canvasCalls.push(['clearRect', ...args])
      paintedCircles = []
    },
    beginPath: () => canvasCalls.push(['beginPath']),
    moveTo: (...args) => canvasCalls.push(['moveTo', ...args]),
    lineTo: (...args) => canvasCalls.push(['lineTo', ...args]),
    stroke: () => canvasCalls.push(['stroke']),
    arc: (...args) => {
      canvasCalls.push(['arc', ...args])
      pendingCircle = {
        x: args[0] * scaleX,
        y: args[1] * scaleY,
        radius: args[2] * Math.min(scaleX, scaleY),
      }
    },
    fill: () => {
      canvasCalls.push(['fill'])
      if (pendingCircle !== null) {
        paintedCircles.push({ ...pendingCircle, color: context.fillStyle })
      }
    },
    resetTransform: () => {
      canvasCalls.push(['resetTransform'])
      scaleX = 1
      scaleY = 1
    },
    scale: (...args) => {
      canvasCalls.push(['scale', ...args])
      scaleX *= args[0]
      scaleY *= args[1]
    },
    getImageData: (x, y, width, height) => {
      const circle = paintedCircles.find((paint) =>
        Math.hypot(x - paint.x, y - paint.y) <= paint.radius)
      const channels = circle?.color.toUpperCase() === '#8B5CF6'
        ? [139, 92, 246, 255]
        : [0, 0, 0, 0]
      return {
        data: new Uint8ClampedArray(channels),
        width,
        height,
        colorSpace: 'srgb',
      } as ImageData
    },
    lineCap: 'butt',
    lineJoin: 'miter',
    lineWidth: 1,
    strokeStyle: '#000000',
    fillStyle: '#000000',
  }
  return context
}

type PaletteSnapshot = WebRoundSnapshot & {
  readonly strokeColorId: StrokeColorId | null
}

function snapshot(
  overrides: Partial<WebRoundSnapshot> = {},
): PaletteSnapshot {
  return {
    connection: 'waiting',
    phase: 'JOINING',
    sessionId: 'WAVE42',
    roundId: '',
    roundGeneration: 0,
    choices: null,
    points: [],
    pendingChoice: null,
    pendingGuessId: null,
    pendingDeadlineAtMs: null,
    wrongChoices: [],
    correctChoice: null,
    revealedWord: null,
    finalPointCount: null,
    glyph: [],
    remainingMs: 0,
    strokeColorId: null,
    ...overrides,
  }
}

function activeSnapshot(
  overrides: Partial<WebRoundSnapshot> = {},
): PaletteSnapshot {
  return snapshot({
    connection: 'live',
    phase: 'ACTIVE',
    roundId: 'round-1',
    roundGeneration: 1,
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
    remainingMs: 18_400,
    strokeColorId: 'violet',
    ...overrides,
  })
}

function installMarkup(): void {
  document.body.innerHTML = `
    <main class="app-shell">
      <header class="brand-row">
        <div>
          <span class="eyebrow">WORDLESS RELAY</span>
          <span class="role-label">GUESSER</span>
          <h1>GUESS THE CLUE</h1>
        </div>
        <p id="connection" role="status"><span aria-hidden="true"></span> CONNECTING</p>
      </header>
      <p id="timer" aria-label="Time remaining"></p>
      <section class="play-field" aria-labelledby="play-title">
        <h2 id="play-title" class="visually-hidden">Live clue from the painter</h2>
        <canvas id="stroke-canvas" width="1000" height="620" aria-label="Live clue drawing"></canvas>
        <div id="glyph-medallion" hidden aria-label="Solved clue glyph"></div>
      </section>
      <section id="choices" class="choice-grid" aria-label="Answer choices"></section>
      <p id="result" aria-live="assertive"></p>
    </main>
  `
}

beforeEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  installMarkup()
  canvasCalls = []
  canvasContexts = new WeakMap()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    let context = canvasContexts.get(this)
    if (context === undefined) {
      context = createTestContext()
      canvasContexts.set(this, context)
    }
    return context as unknown as CanvasRenderingContext2D
  })
})

describe('render', () => {
  it('maps every ordered glyph point from the exact canvas position to the exact medallion position', () => {
    const layout = layoutGlyphTransitionPaths(
      [[0, 0], [500, 1_000], [1_000, 500]],
      [[100, 200], [500, 800], [900, 300]],
      { left: 10, top: 20, width: 160, height: 90 },
      { left: 30, top: 40, width: 100, height: 50 },
      { left: 110, top: 70, width: 40, height: 20 },
    )

    expect(glyphTransitionFrame(layout, 0)).toEqual([
      [20, 20],
      [70, 70],
      [120, 45],
    ])
    expect(glyphTransitionFrame(layout, 1)).toEqual([
      [104, 54],
      [120, 66],
      [136, 56],
    ])
    expect(glyphTransitionFrame(layout, 0.5)).toHaveLength(3)
  })

  it('renders CORRECT at the exact source path then yields to the final locked medallion', () => {
    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    })
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if ((this as Element).classList.contains('play-field')) return rect(10, 20, 160, 90)
      if ((this as Element).id === 'glyph-transition-canvas') return rect(10, 20, 160, 90)
      if ((this as Element).id === 'stroke-canvas') return rect(30, 40, 100, 50)
      if ((this as Element).parentElement?.id === 'glyph-medallion') {
        return rect(110, 70, 40, 20)
      }
      return rect(0, 0, 0, 0)
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
      return this.id === 'glyph-transition-canvas' ? 160 : 0
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'clientHeight', 'get').mockImplementation(function () {
      return this.id === 'glyph-transition-canvas' ? 90 : 0
    })
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 7))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const correct = activeSnapshot({
      phase: 'CORRECT',
      correctChoice: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 3,
      points: [[0, 0], [500, 1_000], [1_000, 500]],
      glyph: [[100, 200], [500, 800], [900, 300]],
      remainingMs: 0,
    })
    render(correct)

    const transition = document.querySelector<HTMLCanvasElement>('#glyph-transition-canvas')
    expect(transition?.dataset.pointCount).toBe('3')
    expect(transition?.dataset.progress).toBe('0')
    expect(document.querySelector('#glyph-medallion')?.classList).toContain('is-transitioning')
    expect(canvasCalls).toContainEqual(['moveTo', 20, 20])
    expect(canvasCalls).toContainEqual(['lineTo', 70, 70])
    expect(canvasCalls).toContainEqual(['lineTo', 120, 45])

    render({ ...correct, phase: 'GLYPH_LOCKED' })

    expect(document.querySelector('#glyph-transition-canvas')).toBeNull()
    expect(document.querySelector('#glyph-medallion')?.classList).not.toContain('is-transitioning')
  })

  it('preserves progress and remaps the glyph endpoint after a resize', () => {
    const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    })
    let destinationLeft = 110
    let destinationTop = 70
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function () {
      if ((this as Element).id === 'glyph-transition-canvas') return rect(10, 20, 160, 90)
      if ((this as Element).id === 'stroke-canvas') return rect(30, 40, 100, 50)
      if ((this as Element).parentElement?.id === 'glyph-medallion') {
        return rect(destinationLeft, destinationTop, 40, 20)
      }
      return rect(0, 0, 0, 0)
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
      return this.id === 'glyph-transition-canvas' ? 160 : 0
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'clientHeight', 'get').mockImplementation(function () {
      return this.id === 'glyph-transition-canvas' ? 90 : 0
    })
    vi.spyOn(globalThis.performance, 'now').mockReturnValue(100)
    const frames: FrameRequestCallback[] = []
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('requestAnimationFrame', requestFrame)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const correct = activeSnapshot({
      phase: 'CORRECT',
      correctChoice: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 3,
      points: [[0, 0], [500, 1_000], [1_000, 500]],
      glyph: [[100, 200], [500, 800], [900, 300]],
      remainingMs: 0,
    })

    render(correct)
    const firstCanvas = document.querySelector<HTMLCanvasElement>('#glyph-transition-canvas')!
    frames[0]!(325)
    expect(firstCanvas.dataset.progress).toBe('0.5')
    expect(requestFrame).toHaveBeenCalledTimes(2)

    render(correct)

    expect(document.querySelector('#glyph-transition-canvas')).toBe(firstCanvas)
    expect(firstCanvas.dataset.progress).toBe('0.5')
    expect(requestFrame).toHaveBeenCalledTimes(2)

    destinationLeft = 210
    destinationTop = 170
    frames[1]!(549)
    expect(Number(firstCanvas.dataset.progress)).toBeLessThan(1)
    expect(requestFrame).toHaveBeenCalledTimes(3)
    frames[2]!(550)
    expect(firstCanvas.dataset.progress).toBe('1')
    expect(canvasCalls.filter(([name]) => name === 'moveTo').at(-1))
      .toEqual(['moveTo', 204, 154])
    expect(canvasCalls.filter(([name]) => name === 'lineTo').slice(-2)).toEqual([
      ['lineTo', 220, 166],
      ['lineTo', 236, 156],
    ])
    expect(requestFrame).toHaveBeenCalledTimes(3)
    render({ ...correct, phase: 'GLYPH_LOCKED' })
  })

  it('animates each newly wrong or correct card only on its first rendered state', () => {
    const wrong = activeSnapshot({ wrongChoices: [1] })

    render(wrong)
    const wrongButton = document.querySelector('[data-choice-index="1"]')
    expect(wrongButton?.classList)
      .toContain('is-newly-incorrect')

    render(wrong)
    expect(document.querySelector('[data-choice-index="1"]')).toBe(wrongButton)
    expect(wrongButton?.classList).toContain('is-newly-incorrect')

    const correct = activeSnapshot({
      phase: 'CORRECT',
      wrongChoices: [1],
      correctChoice: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 1,
      points: [[500, 500]],
      glyph: [[500, 500]],
      remainingMs: 0,
    })
    render(correct)
    const correctButton = document.querySelector('[data-choice-index="0"]')
    expect(correctButton?.classList)
      .toContain('is-newly-correct')

    render({ ...correct, phase: 'GLYPH_LOCKED' })
    expect(document.querySelector('[data-choice-index="0"]')).toBe(correctButton)
    expect(correctButton?.classList).toContain('is-newly-correct')
  })

  it('preserves the focused answer node across display ticks', () => {
    const active = activeSnapshot()
    render(active)
    const first = document.querySelector<HTMLButtonElement>('[data-choice-index="0"]')!
    first.focus()

    render({ ...active, remainingMs: active.remainingMs - 100 })

    expect(document.querySelector('[data-choice-index="0"]')).toBe(first)
    expect(document.activeElement).toBe(first)
  })

  it('fades connection feedback only when the transport state changes', () => {
    render(snapshot({ connection: 'waiting' }))
    const connection = document.querySelector<HTMLElement>('#connection')!
    expect(connection.classList).not.toContain('is-changing')

    render(snapshot({ connection: 'waiting' }))
    expect(connection.classList).not.toContain('is-changing')

    render(snapshot({ connection: 'live', phase: 'READY' }))
    expect(connection.classList).toContain('is-changing')

    render(snapshot({ connection: 'live', phase: 'ACTIVE' }))
    expect(connection.classList).toContain('is-changing')
  })

  it('shows WAITING FOR PAINTER before counterpart readiness', () => {
    render(snapshot())

    expect(document.querySelector('[role="status"]')?.textContent).toContain(
      'WAITING FOR PAINTER',
    )
  })

  it('keeps GUESSER and GUESS THE CLUE visible during a round', () => {
    render(activeSnapshot())

    expect(document.body.textContent).toContain('GUESSER')
    expect(document.querySelector('h1')?.textContent).toBe('GUESS THE CLUE')
  })

  it('renders exactly four answer targets with a 48 CSS pixel minimum height', () => {
    render(activeSnapshot())

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('#choices button')]
    expect(buttons).toHaveLength(4)
    for (const button of buttons) {
      expect(Number.parseFloat(button.style.minHeight)).toBeGreaterThanOrEqual(48)
    }
  })

  it('disables every answer while pending and labels only the selected card SUBMITTED', () => {
    render(activeSnapshot({
      pendingChoice: 2,
      pendingGuessId: 'guess-1',
      pendingDeadlineAtMs: 4_000,
    }))

    const buttons = [...document.querySelectorAll<HTMLButtonElement>('#choices button')]
    expect(buttons.every((button) => button.disabled)).toBe(true)
    expect(buttons.filter((button) => button.textContent?.includes('SUBMITTED'))).toHaveLength(1)
    expect(buttons[2]?.textContent).toContain('SUBMITTED')
  })

  it('keeps a newer same-choice retry labeled SUBMITTED after a late incorrect result', () => {
    render(activeSnapshot({
      wrongChoices: [1],
      pendingChoice: 1,
      pendingGuessId: 'guess-newer',
      pendingDeadlineAtMs: 7_000,
    }))

    const retried = document.querySelector<HTMLButtonElement>('[data-choice-index="1"]')
    expect(retried?.textContent).toContain('SUBMITTED')
    expect(retried?.textContent).not.toContain('TRY AGAIN')
  })

  it('communicates an incorrect answer with text and an icon in addition to coral state', () => {
    render(activeSnapshot({ wrongChoices: [1] }))

    const wrong = document.querySelector<HTMLButtonElement>('[data-choice-index="1"]')
    expect(wrong?.classList.contains('is-incorrect')).toBe(true)
    expect(wrong?.textContent).toContain('×')
    expect(wrong?.textContent).toContain('TRY AGAIN')
    expect(wrong?.disabled).toBe(true)
  })

  it.each([
    ['violet', '#8B5CF6'],
    ['lemon', '#FFD65A'],
    ['mint', '#73E6AE'],
  ] as const)('renders a %s live path with its fixed production paint', (colorId, color) => {
    const canvas = document.querySelector<HTMLCanvasElement>('#stroke-canvas')!

    render(activeSnapshot({
      points: [[100, 200], [900, 800]],
      strokeColorId: colorId,
    }))

    expect(canvas.getContext('2d')!.strokeStyle).toBe(color)
  })

  it('uses coral only as the temporary ACTIVE wrong-answer override, then restores mint', () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#stroke-canvas')!
    const observedPaints: string[] = []

    render(activeSnapshot({
      points: [[100, 200], [900, 800]],
      strokeColorId: 'mint',
    }))
    observedPaints.push(canvas.getContext('2d')!.strokeStyle)

    render(activeSnapshot({
      points: [[100, 200], [900, 800]],
      strokeColorId: 'mint',
      wrongChoices: [2],
    }))
    observedPaints.push(canvas.getContext('2d')!.strokeStyle)

    render(activeSnapshot({
      phase: 'CORRECT',
      correctChoice: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 2,
      points: [[100, 200], [900, 800]],
      glyph: [[100, 200], [900, 800]],
      remainingMs: 0,
      strokeColorId: 'mint',
    }))
    const glyphCanvas = document.querySelector<HTMLCanvasElement>('#glyph-medallion canvas')!
    const transitionCanvas = document.querySelector<HTMLCanvasElement>('#glyph-transition-canvas')!
    observedPaints.push(glyphCanvas.getContext('2d')!.strokeStyle)

    expect(observedPaints).toEqual(['#73E6AE', '#FF786A', '#73E6AE'])
    expect(transitionCanvas.getContext('2d')!.strokeStyle).toBe('#73E6AE')
  })

  it('does not paint an unsafe ACTIVE path fixture without an authoritative color binding', () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#stroke-canvas')!

    render(activeSnapshot({
      points: [[100, 200], [900, 800]],
      strokeColorId: null,
    }))

    expect(canvasCalls.filter(([name]) => name === 'stroke')).toEqual([])
  })

  it('reveals the authoritative correct word and draws an accessible exact-path glyph canvas', () => {
    render(activeSnapshot({
      phase: 'CORRECT',
      correctChoice: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 3,
      glyph: [[100, 200], [500, 800], [900, 300]],
      remainingMs: 0,
    }))

    const correct = document.querySelector<HTMLButtonElement>('[data-choice-index="0"]')
    const medallion = document.querySelector<HTMLElement>('#glyph-medallion')
    const glyphCanvas = medallion?.querySelector('canvas')
    expect(correct?.classList.contains('is-correct')).toBe(true)
    expect(correct?.textContent).toContain('✓')
    expect(document.querySelector('#result')?.textContent).toContain('SNAKE')
    expect(medallion?.hidden).toBe(false)
    expect(glyphCanvas?.getAttribute('aria-label')).toBe('Solved clue glyph drawing')
    expect(canvasCalls).toContainEqual(['moveTo', 22, 44])
    expect(canvasCalls).toContainEqual(['lineTo', 110, 176])
    expect(canvasCalls).toContainEqual(['lineTo', 198, 66])
  })

  it('paints a visible violet pixel for an authoritative one-point solved glyph', () => {
    render(activeSnapshot({
      phase: 'CORRECT',
      correctChoice: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 1,
      glyph: [[500, 500]],
      remainingMs: 0,
    }))

    const glyphCanvas = document.querySelector<HTMLCanvasElement>('#glyph-medallion canvas')
    const context = glyphCanvas?.getContext('2d')
    expect(glyphCanvas).not.toBeNull()
    expect([...context!.getImageData(110, 110, 1, 1).data]).toEqual([139, 92, 246, 255])
  })

  it('uses devicePixelRatio for backing pixels while preserving CSS-coordinate geometry', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const canvas = document.querySelector<HTMLCanvasElement>('#stroke-canvas')!
    Object.defineProperties(canvas, {
      clientWidth: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 50 },
    })

    render(activeSnapshot({ points: [[100, 200], [900, 800]] }))

    expect(canvas.width).toBe(200)
    expect(canvas.height).toBe(100)
    expect(canvasCalls).toContainEqual(['scale', 2, 2])
    expect(canvasCalls).toContainEqual(['moveTo', 10, 10])
    expect(canvasCalls).toContainEqual(['lineTo', 90, 40])
  })

  it('leaves solved glyph CSS sizing responsive while backing its current client box at DPR', () => {
    vi.stubGlobal('devicePixelRatio', 2)
    vi.spyOn(HTMLCanvasElement.prototype, 'clientWidth', 'get').mockReturnValue(80)
    vi.spyOn(HTMLCanvasElement.prototype, 'clientHeight', 'get').mockReturnValue(70)

    render(activeSnapshot({
      phase: 'CORRECT',
      correctChoice: 0,
      revealedWord: 'SNAKE',
      finalPointCount: 2,
      glyph: [[100, 100], [900, 900]],
      remainingMs: 0,
    }))

    const glyph = document.querySelector<HTMLCanvasElement>('#glyph-medallion canvas')!
    expect(glyph.style.width).toBe('')
    expect(glyph.style.height).toBe('')
    expect(glyph.width).toBe(160)
    expect(glyph.height).toBe(140)
  })

  it('keeps the live canvas accessible', () => {
    render(activeSnapshot({ points: [[100, 200], [900, 700]] }))

    expect(document.querySelector('#stroke-canvas')?.getAttribute('aria-label')).toBe(
      'Live clue drawing',
    )
  })

  it('reports allowlisted network failure text without exposing credential-shaped details', () => {
    render(snapshot({ connection: 'failed', phase: 'DISCONNECTED' }))

    const status = document.querySelector<HTMLElement>('[role="status"]')
    expect(status?.textContent).toContain('CONNECTION FAILED')
    expect(status?.textContent).not.toMatch(/https?:\/\/|service_role|eyJ/)
  })
})
