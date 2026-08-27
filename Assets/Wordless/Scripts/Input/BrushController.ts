import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor'
import { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable'
import {
  InteractableManipulation,
  type TransformEventArg,
} from 'SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation'
import type { unsubscribe } from 'SpectaclesInteractionKit.lspkg/Utils/Event'

import { isProductRoundId } from '../Core/Protocol'
import type { QuantizedPoint, WorldPoint } from '../Core/Protocol'
import {
  BrushStrokeSession,
  constrainToDrawingPlane,
  type BrushStrokeAction,
  type BrushStrokeDiagnostics,
} from './BrushStrokeSession'

export interface BrushListener {
  onStrokeStart(strokeId: string): void
  onStrokePoint(world: WorldPoint, normalized: QuantizedPoint): void
  onStrokeEnd(strokeId: string): void
}

export interface BrushRoundControl {
  armForRound(roundId: string): void
}

const EMPTY_DIAGNOSTICS: BrushStrokeDiagnostics = Object.freeze({
  acceptedCount: 0,
  maxAbsLocalZ: 0,
  minimumSpacingCm: null,
  endCount: 0,
  capReached: false,
})

function plainPoint(value: vec3): WorldPoint {
  return { x: value.x, y: value.y, z: value.z }
}

@component
export class BrushController extends BaseScriptComponent
  implements BrushRoundControl {
  @input drawingAnchor: SceneObject
  @input brushHead: SceneObject

  private listener: BrushListener | null = null
  private session: BrushStrokeSession | null = null
  private interactable: Interactable | null = null
  private interactableStarted = false
  private interactableShouldBeEnabled = false
  private pendingRoundId: string | null = null
  private interactionActive = false
  private readonly unsubscribeBag: unsubscribe[] = []

  onAwake(): void {
    const anchorTransform = this.drawingAnchor.getTransform()
    const brushTransform = this.brushHead.getTransform()
    this.session = new BrushStrokeSession((local) => {
      const world = anchorTransform.getWorldTransform().multiplyPoint(
        new vec3(local.x, local.y, local.z),
      )
      return plainPoint(world)
    })
    if (this.pendingRoundId !== null) {
      if (this.session.armForRound(this.pendingRoundId)) {
        this.interactableShouldBeEnabled = true
      }
      this.pendingRoundId = null
    }

    this.createEvent('OnStartEvent').bind(() => this.onStart())
    this.createEvent('LateUpdateEvent').bind(() => this.onUpdate())
    this.createEvent('OnDestroyEvent').bind(() => this.onDestroy())
  }

  private onStart(): void {
    const brushTransform = this.brushHead.getTransform()
    const interactable = this.brushHead.getComponent(
      Interactable.getTypeName(),
    ) as Interactable
    const manipulation = this.brushHead.getComponent(
      InteractableManipulation.getTypeName(),
    ) as InteractableManipulation
    if (isNull(interactable) || isNull(manipulation)) {
      print('[WordlessBrush] CONFIG_ERROR missing SIK brush components')
      return
    }
    this.interactable = interactable

    this.unsubscribeBag.push(
      manipulation.onManipulationStart.add(
        (_event: TransformEventArg) => this.onManipulationStart(),
      ),
      manipulation.onManipulationEnd.add(
        (_event: TransformEventArg) => this.onManipulationEnd(),
      ),
    )

    interactable.targetingMode = TargetingMode.Indirect
    interactable.ignoreInteractionPlane = true
    interactable.enableInstantDrag = true
    manipulation.setManipulateRoot(brushTransform)
    manipulation.setCanTranslate(true)
    manipulation.setCanRotate(false)
    manipulation.setCanScale(false)
    manipulation.enableXTranslation = true
    manipulation.enableYTranslation = true
    manipulation.enableZTranslation = false
    manipulation.enableStretchZ = false
    manipulation.setNewInteractable(interactable)
    this.interactableStarted = true
    this.applyInteractableEnabled()
  }

  setListener(listener: BrushListener | null): void {
    this.listener = listener
  }

  armForRound(roundId: string): void {
    if (this.session === null) {
      if (isProductRoundId(roundId)) this.pendingRoundId = roundId
      return
    }
    if (this.session.armForRound(roundId)) {
      this.interactableShouldBeEnabled = true
      this.applyInteractableEnabled()
    }
  }

  getStrokeDiagnostics(): BrushStrokeDiagnostics {
    return this.session?.getDiagnostics() ?? EMPTY_DIAGNOSTICS
  }

  private onManipulationStart(): void {
    this.interactionActive = true
    this.dispatch(this.session?.beginManipulation() ?? [])
  }

  private onManipulationEnd(): void {
    this.interactionActive = false
    this.dispatch(this.session?.endManipulation() ?? [])
  }

  private onUpdate(): void {
    if (!this.interactionActive || this.session === null) return

    const anchorTransform = this.drawingAnchor.getTransform()
    const brushTransform = this.brushHead.getTransform()
    const rawLocal = anchorTransform.getInvertedWorldTransform().multiplyPoint(
      brushTransform.getWorldPosition(),
    )
    const constrained = constrainToDrawingPlane(plainPoint(rawLocal))
    if (constrained === null) return

    const constrainedWorld = anchorTransform.getWorldTransform().multiplyPoint(
      new vec3(constrained.x, constrained.y, constrained.z),
    )
    brushTransform.setWorldPosition(constrainedWorld)
    this.dispatch(this.session.sample(constrained))
  }

  private dispatch(actions: readonly BrushStrokeAction[]): void {
    for (const action of actions) {
      switch (action.type) {
        case 'stroke-start':
          this.listener?.onStrokeStart(action.strokeId)
          break
        case 'stroke-point':
          this.listener?.onStrokePoint(action.world, action.normalized)
          break
        case 'stroke-end':
          if (action.reason === 'cap') {
            print(`CAP_REACHED count=${action.pointCount}`)
          }
          try {
            this.listener?.onStrokeEnd(action.strokeId)
          }
          finally {
            this.interactableShouldBeEnabled = false
            this.applyInteractableEnabled()
          }
          break
      }
    }
  }

  private applyInteractableEnabled(): void {
    if (!this.interactableStarted || this.interactable === null) return
    this.interactable.enabled = this.interactableShouldBeEnabled
  }

  private onDestroy(): void {
    while (this.unsubscribeBag.length > 0) {
      const unsubscribeCallback = this.unsubscribeBag.pop()
      if (unsubscribeCallback) unsubscribeCallback()
    }
    this.listener = null
    this.interactableStarted = false
    this.interactableShouldBeEnabled = false
    this.interactable = null
    this.interactionActive = false
  }
}
