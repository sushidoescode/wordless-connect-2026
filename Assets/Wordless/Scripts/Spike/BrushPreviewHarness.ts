import { MAX_STROKE_POINTS } from '../Core/Protocol'
import type { QuantizedPoint, WorldPoint } from '../Core/Protocol'
import {
  BrushController,
  type BrushListener,
} from '../Input/BrushController'
import { StrokeRibbonView } from '../View/StrokeRibbonView'

const LOCAL_PREVIEW_ROUND_ID = 'r-TASK1000-1'

@component
export class BrushPreviewHarness extends BaseScriptComponent
  implements BrushListener {
  @input brush: BrushController
  @input ribbon: StrokeRibbonView

  private worldPoints: WorldPoint[] = []

  onAwake(): void {
    this.createEvent('OnStartEvent').bind(() => {
      this.brush.setListener(this)
      this.ribbon.render([])
      this.brush.armForRound(LOCAL_PREVIEW_ROUND_ID)
    })
    this.createEvent('OnDestroyEvent').bind(() => {
      this.brush.setListener(null)
      this.worldPoints = []
    })
  }

  onStrokeStart(strokeId: string): void {
    this.worldPoints = []
    this.ribbon.render(this.worldPoints)
    print(`[WordlessBrush] START stroke=${strokeId}`)
  }

  onStrokePoint(world: WorldPoint, _normalized: QuantizedPoint): void {
    if (this.worldPoints.length >= MAX_STROKE_POINTS) return
    this.worldPoints.push({ x: world.x, y: world.y, z: world.z })
    this.ribbon.render(this.worldPoints)
  }

  onStrokeEnd(strokeId: string): void {
    const diagnostics = this.brush.getStrokeDiagnostics()
    const minimumSpacing = diagnostics.minimumSpacingCm === null
      ? 'n/a'
      : diagnostics.minimumSpacingCm.toFixed(3)
    print(
      `[WordlessBrush] END stroke=${strokeId}` +
      ` count=${diagnostics.acceptedCount}` +
      ` maxAbsLocalZ=${diagnostics.maxAbsLocalZ.toFixed(3)}` +
      ` minimumSpacingCm=${minimumSpacing}` +
      ` endCount=${diagnostics.endCount}` +
      ` capReached=${diagnostics.capReached}`,
    )
  }
}
