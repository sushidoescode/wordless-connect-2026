import type { RoundPhase } from '../Core/Protocol'
import type { LensRoundState } from '../Core/RoundStore'

export type LensHudTone = 'ivory' | 'lemon' | 'mint' | 'coral'

export interface LensHudResultPresentation {
  readonly visible: boolean
  readonly text: string
  readonly tone: 'mint' | 'coral' | null
}

export interface LensHudPresentation {
  readonly roleText: 'PAINTER'
  readonly phaseText: string
  readonly promptText: string
  readonly timerText: string
  readonly connectionText: string
  readonly connectionTone: 'lemon' | 'mint' | 'coral'
  readonly result: LensHudResultPresentation
}

export interface LensHudResourceCounts {
  readonly sceneObjects: number
  readonly materials: number
}

const HUD_RESOURCE_COUNTS: LensHudResourceCounts = Object.freeze({
  sceneObjects: 8,
  materials: 3,
})

const WORD_PATTERN = /^[A-Z]{1,12}$/

function phaseText(phase: RoundPhase, strokeComplete: boolean): string {
  switch (phase) {
    case 'DISCONNECTED': return 'OFFLINE'
    case 'JOINING': return 'JOINING'
    case 'READY': return 'READY'
    case 'ACTIVE': return strokeComplete ? 'WAIT FOR GUESS' : 'DRAW'
    case 'CORRECT': return 'CORRECT'
    case 'GLYPH_LOCKED': return 'SOLVED'
    case 'TIMED_OUT': return "TIME'S UP"
  }
}

function timerText(remainingMs: number): string {
  const safeRemainingMs = Number.isFinite(remainingMs)
    ? Math.max(0, remainingMs)
    : 0
  const totalSeconds = Math.ceil(safeRemainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function promptText(snapshot: LensRoundState): string {
  if (snapshot.phase === 'DISCONNECTED' || snapshot.phase === 'JOINING') {
    return ''
  }
  return WORD_PATTERN.test(snapshot.promptWord ?? '')
    ? `DRAW: ${snapshot.promptWord}`
    : 'DRAW: —'
}

function connectionPresentation(snapshot: LensRoundState): {
  readonly text: string
  readonly tone: 'lemon' | 'mint' | 'coral'
} {
  if (snapshot.phase === 'DISCONNECTED') {
    return { text: 'DISCONNECTED', tone: 'coral' }
  }
  if (snapshot.phase === 'JOINING') {
    return { text: 'CONNECTING', tone: 'lemon' }
  }
  if (snapshot.counterpartReady) {
    return { text: 'CONNECTED', tone: 'mint' }
  }
  return { text: 'WAITING FOR GUESSER', tone: 'lemon' }
}

function resultPresentation(
  snapshot: LensRoundState,
): LensHudResultPresentation {
  if (snapshot.phase === 'ACTIVE' && snapshot.lastOutcome === 'incorrect') {
    return { visible: true, text: '× TRY AGAIN', tone: 'coral' }
  }
  if ((snapshot.phase === 'CORRECT' || snapshot.phase === 'GLYPH_LOCKED') &&
      snapshot.lastOutcome === 'correct' &&
      WORD_PATTERN.test(snapshot.revealedWord ?? '')) {
    return {
      visible: true,
      text: `✓ ${snapshot.revealedWord}!`,
      tone: 'mint',
    }
  }
  if (snapshot.phase === 'TIMED_OUT' && snapshot.lastOutcome === 'timeout') {
    return { visible: true, text: "× TIME'S UP", tone: 'coral' }
  }
  return { visible: false, text: '', tone: null }
}

export function mapLensHudPresentation(
  snapshot: LensRoundState,
): LensHudPresentation {
  const connection = connectionPresentation(snapshot)
  return {
    roleText: 'PAINTER',
    phaseText: phaseText(snapshot.phase, snapshot.strokeComplete),
    promptText: promptText(snapshot),
    timerText: timerText(snapshot.remainingMs),
    connectionText: connection.text,
    connectionTone: connection.tone,
    result: resultPresentation(snapshot),
  }
}

function colorForTone(tone: LensHudTone): vec4 {
  switch (tone) {
    case 'ivory': return new vec4(1, 246 / 255, 232 / 255, 1)
    case 'lemon': return new vec4(1, 214 / 255, 90 / 255, 1)
    case 'mint': return new vec4(115 / 255, 230 / 255, 174 / 255, 1)
    case 'coral': return new vec4(1, 120 / 255, 106 / 255, 1)
  }
}

/** Writes authoritative snapshots into the fixed, editor-authored Lens HUD. */
@component
export class LensHudView extends BaseScriptComponent {
  @input roleText: Text
  @input phaseText: Text
  @input promptText: Text
  @input timerText: Text
  @input connectionText: Text
  @input resultText: Text

  @input connectionDot: SceneObject
  @input connectionDotVisual: RenderMeshVisual
  @input resultMarker: SceneObject
  @input resultMarkerVisual: RenderMeshVisual

  @input lemonMaterial: Material
  @input mintMaterial: Material
  @input coralMaterial: Material

  onAwake(): void {
    this.assertBindings()
  }

  render(snapshot: LensRoundState): void {
    this.assertBindings()
    const presentation = mapLensHudPresentation(snapshot)

    this.writeText(this.roleText, presentation.roleText, 'ivory', true)
    this.writeText(this.phaseText, presentation.phaseText, 'ivory', true)
    this.writeText(
      this.promptText,
      presentation.promptText,
      'ivory',
      presentation.promptText.length > 0,
    )
    this.writeText(this.timerText, presentation.timerText, 'lemon', true)
    this.writeText(
      this.connectionText,
      presentation.connectionText,
      presentation.connectionTone,
      true,
    )

    this.connectionDot.enabled = true
    this.connectionDotVisual.mainMaterial = this.materialForTone(
      presentation.connectionTone,
    )

    const resultTone = presentation.result.tone
    this.writeText(
      this.resultText,
      presentation.result.text,
      resultTone ?? 'coral',
      presentation.result.visible,
    )
    this.resultMarker.enabled = presentation.result.visible
    if (resultTone !== null) {
      this.resultMarkerVisual.mainMaterial = this.materialForTone(resultTone)
    }
  }

  getOwnedResourceCounts(): LensHudResourceCounts {
    return HUD_RESOURCE_COUNTS
  }

  private writeText(
    target: Text,
    value: string,
    tone: LensHudTone,
    enabled: boolean,
  ): void {
    target.text = value
    target.enabled = enabled
    target.textFill.mode = TextFillMode.Solid
    target.textFill.color = colorForTone(tone)
    target.dropshadowSettings.enabled = false
    target.backgroundSettings.enabled = false
  }

  private materialForTone(tone: 'lemon' | 'mint' | 'coral'): Material {
    if (tone === 'mint') return this.mintMaterial
    if (tone === 'coral') return this.coralMaterial
    return this.lemonMaterial
  }

  private assertBindings(): void {
    if (!this.roleText || !this.phaseText || !this.promptText ||
        !this.timerText || !this.connectionText || !this.resultText ||
        !this.connectionDot || !this.connectionDotVisual ||
        !this.resultMarker || !this.resultMarkerVisual ||
        !this.lemonMaterial || !this.mintMaterial || !this.coralMaterial) {
      throw new Error(
        'LensHudView requires 6 Text, 2 marker, and 3 material bindings',
      )
    }
  }
}
