// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../src/render'
import type { WebRoundSnapshot } from '../src/web-round-store'

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

function snapshot(
  overrides: Partial<WebRoundSnapshot> = {},
): WebRoundSnapshot {
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
    ...overrides,
  }
}

function activeSnapshot(
  overrides: Partial<WebRoundSnapshot> = {},
): WebRoundSnapshot {
  return snapshot({
    connection: 'live',
    phase: 'ACTIVE',
    roundId: 'round-1',
    roundGeneration: 1,
    choices: ['SNAKE', 'RIVER', 'ROPE', 'WAVE'],
    remainingMs: 18_400,
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
