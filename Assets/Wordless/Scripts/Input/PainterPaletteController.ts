import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor'
import type { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable'
import type { unsubscribe } from 'SpectaclesInteractionKit.lspkg/Utils/Event'

import { isStrokeColorId } from '../Core/Protocol'
import type { StrokeColorId } from '../Core/Protocol'

export interface PaletteSelectionListener {
  onPaletteColorSelected(colorId: StrokeColorId): void
}

const NORMAL_SCALE = 1
const HOVER_SCALE = 1.08
const SELECTED_SCALE = 1.15

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

@component
export class PainterPaletteController extends BaseScriptComponent {
  @input violetRoot: SceneObject
  @input lemonRoot: SceneObject
  @input mintRoot: SceneObject
  @input violetRing: SceneObject
  @input lemonRing: SceneObject
  @input mintRing: SceneObject
  @input violetCollider: ColliderComponent
  @input lemonCollider: ColliderComponent
  @input mintCollider: ColliderComponent
  @input violetInteractable: Interactable
  @input lemonInteractable: Interactable
  @input mintInteractable: Interactable

  private readonly gate = new PainterPaletteGate()
  private readonly hovered: Record<StrokeColorId, boolean> = {
    violet: false,
    lemon: false,
    mint: false,
  }
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
    this.subscribeSwatch('violet', this.violetInteractable)
    this.subscribeSwatch('lemon', this.lemonInteractable)
    this.subscribeSwatch('mint', this.mintInteractable)
    this.violetInteractable.targetingMode = TargetingMode.Indirect
    this.lemonInteractable.targetingMode = TargetingMode.Indirect
    this.mintInteractable.targetingMode = TargetingMode.Indirect
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
    const selectedColorId = this.gate.getSelectedColorId()
    this.applySwatchVisual('violet', this.violetRoot, this.violetRing)
    this.applySwatchVisual('lemon', this.lemonRoot, this.lemonRing)
    this.applySwatchVisual('mint', this.mintRoot, this.mintRing)
    this.violetRing.enabled = selectedColorId === 'violet'
    this.lemonRing.enabled = selectedColorId === 'lemon'
    this.mintRing.enabled = selectedColorId === 'mint'

    const enabled = this.interactablesStarted &&
      !this.gate.isInputLocked() &&
      !this.destroyed
    this.violetCollider.enabled = enabled
    this.lemonCollider.enabled = enabled
    this.mintCollider.enabled = enabled
    if (this.interactablesStarted) {
      this.violetInteractable.enabled = enabled
      this.lemonInteractable.enabled = enabled
      this.mintInteractable.enabled = enabled
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
    this.hovered.violet = false
    this.hovered.lemon = false
    this.hovered.mint = false
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
    if (!this.violetRoot || !this.lemonRoot || !this.mintRoot ||
        !this.violetRing || !this.lemonRing || !this.mintRing ||
        !this.violetCollider || !this.lemonCollider || !this.mintCollider ||
        !this.violetInteractable || !this.lemonInteractable ||
        !this.mintInteractable) {
      throw new Error(
        'PainterPaletteController requires three roots, rings, colliders, and interactables',
      )
    }
  }
}
