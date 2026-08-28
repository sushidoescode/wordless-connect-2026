import type {
  ChoiceIndex,
  ChoiceTuple,
  QuantizedPoint,
  RoundPhase,
  StrokeColorId,
  WorldPoint,
} from './Protocol'

export interface LensRoundState {
  readonly phase: RoundPhase
  readonly roundId: string
  readonly promptWord: string | null
  readonly choices: ChoiceTuple
  readonly durationMs: number
  readonly startedAtMs: number
  readonly remainingMs: number
  readonly worldPoints: readonly WorldPoint[]
  readonly publicPoints: readonly QuantizedPoint[]
  readonly guessedIndices: readonly ChoiceIndex[]
  readonly lastOutcome: 'none' | 'incorrect' | 'correct' | 'timeout'
  readonly revealedWord: string | null
  readonly glyph: readonly QuantizedPoint[]
  readonly counterpartReady: boolean
  readonly strokeComplete: boolean
  readonly strokeColorId: StrokeColorId
  readonly paletteInputLocked: boolean
}

export type RoundStoreListener = (snapshot: LensRoundState) => void

interface PendingReplacement {
  readonly snapshot: LensRoundState
  readonly listeners: readonly RoundStoreListener[]
}

function freezeChoices(choices: ChoiceTuple): ChoiceTuple {
  return Object.freeze([
    choices[0],
    choices[1],
    choices[2],
    choices[3],
  ]) as ChoiceTuple
}

function freezeWorldPoints(points: readonly WorldPoint[]): readonly WorldPoint[] {
  return Object.freeze(points.map((point) => Object.freeze({
    x: point.x,
    y: point.y,
    z: point.z,
  })))
}

function freezeQuantizedPoints(
  points: readonly QuantizedPoint[],
): readonly QuantizedPoint[] {
  return Object.freeze(points.map((point) => Object.freeze([
    point[0],
    point[1],
  ]) as QuantizedPoint))
}

function freezeState(next: LensRoundState): LensRoundState {
  return Object.freeze({
    phase: next.phase,
    roundId: next.roundId,
    promptWord: next.promptWord,
    choices: freezeChoices(next.choices),
    durationMs: next.durationMs,
    startedAtMs: next.startedAtMs,
    remainingMs: next.remainingMs,
    worldPoints: freezeWorldPoints(next.worldPoints),
    publicPoints: freezeQuantizedPoints(next.publicPoints),
    guessedIndices: Object.freeze(next.guessedIndices.slice()),
    lastOutcome: next.lastOutcome,
    revealedWord: next.revealedWord,
    glyph: freezeQuantizedPoints(next.glyph),
    counterpartReady: next.counterpartReady,
    strokeComplete: next.strokeComplete,
    strokeColorId: next.strokeColorId,
    paletteInputLocked: next.paletteInputLocked,
  })
}

const INITIAL_STATE = freezeState({
  phase: 'DISCONNECTED',
  roundId: '',
  promptWord: null,
  choices: ['', '', '', ''],
  durationMs: 0,
  startedAtMs: 0,
  remainingMs: 0,
  worldPoints: [],
  publicPoints: [],
  guessedIndices: [],
  lastOutcome: 'none',
  revealedWord: null,
  glyph: [],
  counterpartReady: false,
  strokeComplete: false,
  strokeColorId: 'violet',
  paletteInputLocked: true,
})

export class RoundStore {
  private snapshot: LensRoundState = INITIAL_STATE
  private readonly listeners: RoundStoreListener[] = []
  private readonly pendingReplacements: PendingReplacement[] = []
  private replacing = false

  getSnapshot(): LensRoundState {
    return this.snapshot
  }

  replace(next: LensRoundState): void {
    this.pendingReplacements.push({
      snapshot: freezeState(next),
      listeners: this.listeners.slice(),
    })
    if (this.replacing) return

    this.replacing = true
    try {
      while (this.pendingReplacements.length > 0) {
        const replacement = this.pendingReplacements.shift()
        if (!replacement) continue
        this.snapshot = replacement.snapshot
        for (const listener of replacement.listeners) {
          try {
            listener(replacement.snapshot)
          }
          catch {
            // View failures are isolated from authoritative state transitions.
          }
        }
      }
    }
    finally {
      this.replacing = false
    }
  }

  subscribe(listener: RoundStoreListener): () => void {
    this.listeners.push(listener)
    let active = true
    return () => {
      if (!active) return
      active = false
      const index = this.listeners.indexOf(listener)
      if (index >= 0) this.listeners.splice(index, 1)
    }
  }

  listenerCountForDiagnostics(): number {
    return this.listeners.length
  }
}
