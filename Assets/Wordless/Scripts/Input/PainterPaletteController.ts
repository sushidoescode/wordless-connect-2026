import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor'
import type { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable'
import type { unsubscribe } from 'SpectaclesInteractionKit.lspkg/Utils/Event'

import { PAINTER_COLOR_IDS, isStrokeColorId } from '../Core/Protocol'
import type { StrokeColorId } from '../Core/Protocol'

export interface PaletteSelectionListener {
  onPaletteColorSelected(colorId: StrokeColorId): void
}

const NORMAL_SCALE = 1
const HOVER_SCALE = 1.08
const SELECTED_SCALE = 1.15
const SWATCH_COUNT = PAINTER_COLOR_IDS.length

function createHoverState(): Record<StrokeColorId, boolean> {
  const state = {} as Record<StrokeColorId, boolean>
  for (const colorId of PAINTER_COLOR_IDS) state[colorId] = false
  return state
}

export class PainterPaletteGate {
  private selectedColorId: StrokeColorId = 'violet'
  private inputLocked = true

  render(colorId: StrokeColorId, inputLocked: boolean): void {
    if (!isStrokeColorId(colorId)) return
    this.selectedColorId = colorId
    this.inputLocked = inputLocked
  }

  request(colorId: StrokeColorId): StrokeColorId | null {
    if (this.inputLocked || !isStrokeColorId(colorId)) return null
    return colorId
  }

  getSelectedColorId(): StrokeColorId {
    return this.selectedColorId
  }

  isInputLocked(): boolean {
    return this.inputLocked
  }
}

/**
 * Data-driven controller over the eight canonical swatches. Every binding
 * array is ordered exactly by PAINTER_COLOR_IDS; startup fails closed on a
 * missing, duplicate, or miscounted binding so a half-wired palette can never
 * silently drop a color.
 */
@component
export class PainterPaletteController extends BaseScriptComponent {
  @input swatchRoots: SceneObject[]
  @input swatchRings: SceneObject[]
  @input swatchColliders: ColliderComponent[]
  @input swatchInteractables: Interactable[]

  private readonly gate = new PainterPaletteGate()
  private readonly hovered: Record<StrokeColorId, boolean> = createHoverState()
  private readonly unsubscribeBag: unsubscribe[] = []
  private listener: PaletteSelectionListener | null = null
  private interactablesStarted = false
  private destroyed = false

  onAwake(): void {
    this.assertBindings()
    this.applyVisualState()
    this.createEvent('OnStartEvent').bind(() => this.onStart())
    this.createEvent('OnDestroyEvent').bind(() => this.onDestroy())
  }

  setListener(listener: PaletteSelectionListener | null): void {
    if (this.destroyed) {
      this.listener = null
      return
    }
    this.listener = listener
  }

  render(colorId: StrokeColorId, inputLocked: boolean): void {
    if (this.destroyed || !isStrokeColorId(colorId)) return
    this.gate.render(colorId, inputLocked)
    if (inputLocked) this.clearHoverState()
    this.applyVisualState()
  }

  private onStart(): void {
    if (this.interactablesStarted || this.destroyed) return
    PAINTER_COLOR_IDS.forEach((colorId, index) => {
      const interactable = this.swatchInteractables[index]
      this.subscribeSwatch(colorId, interactable)
      interactable.targetingMode = TargetingMode.Indirect
    })
    this.interactablesStarted = true
    this.applyVisualState()
  }

  private subscribeSwatch(
    colorId: StrokeColorId,
    interactable: Interactable,
  ): void {
    this.unsubscribeBag.push(
      interactable.onTriggerStart.add(() => this.onTrigger(colorId)),
      interactable.onHoverEnter.add(() => this.onHover(colorId, true)),
      interactable.onHoverExit.add(() => this.onHover(colorId, false)),
    )
  }

  private onTrigger(colorId: StrokeColorId): void {
    if (this.destroyed) return
    const requestedColorId = this.gate.request(colorId)
    if (requestedColorId === null) return
    this.listener?.onPaletteColorSelected(requestedColorId)
  }

  private onHover(colorId: StrokeColorId, hovered: boolean): void {
    if (this.destroyed || this.gate.isInputLocked()) return
    this.hovered[colorId] = hovered
    this.applyVisualState()
  }

  private applyVisualState(): void {
    PAINTER_COLOR_IDS.forEach((colorId, index) => {
      this.applySwatchVisual(
        colorId,
        this.swatchRoots[index],
        this.swatchRings[index],
      )
    })

    const enabled = this.interactablesStarted &&
      !this.gate.isInputLocked() &&
      !this.destroyed
    for (let index = 0; index < SWATCH_COUNT; index += 1) {
      this.swatchColliders[index].enabled = enabled
      if (this.interactablesStarted) {
        this.swatchInteractables[index].enabled = enabled
      }
    }
  }

  private applySwatchVisual(
    colorId: StrokeColorId,
    root: SceneObject,
    ring: SceneObject,
  ): void {
    const selected = colorId === this.gate.getSelectedColorId()
    const scale = selected
      ? SELECTED_SCALE
      : this.hovered[colorId] && !this.gate.isInputLocked()
        ? HOVER_SCALE
        : NORMAL_SCALE
    root.getTransform().setLocalScale(new vec3(scale, scale, scale))
    ring.enabled = selected
  }

  private clearHoverState(): void {
    for (const colorId of PAINTER_COLOR_IDS) this.hovered[colorId] = false
  }

  private onDestroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    while (this.unsubscribeBag.length > 0) {
      this.unsubscribeBag.pop()?.()
    }
    this.listener = null
    this.clearHoverState()
    this.applyVisualState()
    this.interactablesStarted = false
  }

  private assertBindings(): void {
    const failClosed = (): never => {
      throw new Error(
        'PainterPaletteController requires eight ordered swatch bindings: ' +
        'roots, rings, colliders, and interactables in canonical palette order',
      )
    }
    const arrays: readonly (readonly unknown[])[] = [
      this.swatchRoots,
      this.swatchRings,
      this.swatchColliders,
      this.swatchInteractables,
    ]
    for (const bindings of arrays) {
      if (!bindings || bindings.length !== SWATCH_COUNT) failClosed()
      const seen: unknown[] = []
      for (const binding of bindings) {
        if (!binding || seen.indexOf(binding) !== -1) failClosed()
        seen.push(binding)
      }
    }
    // Roots and rings must also be disjoint across indices — a ring aliased
    // to any root object would let one scene object play two visual roles.
    const rootsAndRings: unknown[] = []
    for (const binding of this.swatchRoots) rootsAndRings.push(binding)
    for (const binding of this.swatchRings) {
      if (rootsAndRings.indexOf(binding) !== -1) failClosed()
      rootsAndRings.push(binding)
    }
  }
}
