import { isProductRoundId } from '../Core/Protocol'
import type { RoundPhase } from '../Core/Protocol'
import type { Interactable } from 'SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable'
import type { unsubscribe } from 'SpectaclesInteractionKit.lspkg/Utils/Event'

export interface ReplayRequestListener {
  onReplayRequested(roundId: string): void
}

export function isReplayAvailablePhase(phase: RoundPhase): boolean {
  return phase === 'GLYPH_LOCKED' || phase === 'TIMED_OUT'
}

export class ReplayRequestGate {
  private boundRoundId: string | null = null
  private consumedRoundId: string | null = null
  private available = false

  setAvailable(roundId: string, available: boolean): boolean {
    if (!isProductRoundId(roundId)) {
      this.boundRoundId = null
      this.available = false
      return false
    }

    if (roundId !== this.boundRoundId) {
      this.boundRoundId = roundId
      this.consumedRoundId = null
    }
    this.available = available && this.consumedRoundId !== roundId
    return this.available
  }

  request(roundId: string): string | null {
    if (!this.available ||
        roundId !== this.boundRoundId ||
        !isProductRoundId(roundId)) {
      return null
    }

    this.available = false
    this.consumedRoundId = roundId
    return roundId
  }

  getBoundRoundId(): string | null {
    return this.boundRoundId
  }
}

@component
export class ReplayController extends BaseScriptComponent {
  @input replayLabel: SceneObject
  @input replayCollider: ColliderComponent
  @input replayInteractable: Interactable

  private readonly gate = new ReplayRequestGate()
  private listener: ReplayRequestListener | null = null
  private unsubscribeTrigger: unsubscribe | null = null
  private desiredAvailable = false
  private interactableStarted = false

  onAwake(): void {
    this.assertBindings()
    this.applyHitAvailability(false)
    this.createEvent('OnStartEvent').bind(() => this.onStart())
    this.createEvent('OnDestroyEvent').bind(() => this.onDestroy())
  }

  setListener(listener: ReplayRequestListener | null): void {
    this.listener = listener
  }

  setAvailable(roundId: string, available: boolean): void {
    this.desiredAvailable = this.gate.setAvailable(roundId, available)
    this.applyDesiredAvailability()
  }

  private onStart(): void {
    if (this.unsubscribeTrigger !== null) return
    this.unsubscribeTrigger = this.replayInteractable.onTriggerStart.add(
      () => this.onTrigger(),
    )
    this.interactableStarted = true
    this.applyDesiredAvailability()
  }

  private onTrigger(): void {
    const boundRoundId = this.gate.getBoundRoundId()
    if (boundRoundId === null) return
    const requestedRoundId = this.gate.request(boundRoundId)
    if (requestedRoundId === null) return

    this.desiredAvailable = false
    this.applyDesiredAvailability()
    this.listener?.onReplayRequested(requestedRoundId)
  }

  private applyDesiredAvailability(): void {
    if (!this.interactableStarted) {
      this.applyHitAvailability(false)
      return
    }
    this.applyHitAvailability(this.desiredAvailable)
    this.replayInteractable.enabled = this.desiredAvailable
  }

  private applyHitAvailability(available: boolean): void {
    this.replayLabel.enabled = available
    this.replayCollider.enabled = available
  }

  private onDestroy(): void {
    this.unsubscribeTrigger?.()
    this.unsubscribeTrigger = null
    this.listener = null
    this.desiredAvailable = false
    if (this.interactableStarted) {
      this.applyDesiredAvailability()
    }
    else {
      this.applyHitAvailability(false)
    }
    this.interactableStarted = false
  }

  private assertBindings(): void {
    if (!this.replayLabel ||
        !this.replayCollider ||
        !this.replayInteractable) {
      throw new Error(
        'ReplayController requires label, collider, and Interactable bindings',
      )
    }
  }
}
