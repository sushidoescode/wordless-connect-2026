import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadPainterPaletteController() {
  const fileUrl = new URL(
    '../../Assets/Wordless/Scripts/Input/PainterPaletteController.ts',
    import.meta.url,
  )
  const source = await readFile(fileUrl, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: true,
      useDefineForClassFields: false,
    },
    fileName: fileUrl.pathname,
  })

  const protocolUrl = new URL('../Core/Protocol.ts', fileUrl).href
  const targetingModeUrl =
    'data:text/javascript,export const TargetingMode={Indirect:%22Indirect%22}'
  const executableSource = output.outputText
    .replaceAll("'../Core/Protocol'", JSON.stringify(protocolUrl))
    .replaceAll('"../Core/Protocol"', JSON.stringify(protocolUrl))
    .replaceAll(
      "'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor'",
      JSON.stringify(targetingModeUrl),
    )
    .replaceAll(
      '"SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"',
      JSON.stringify(targetingModeUrl),
    )

  globalThis.component = (target) => target
  globalThis.input = () => undefined
  globalThis.vec3 = class Vec3 {
    constructor(x, y, z) {
      this.x = x
      this.y = y
      this.z = z
    }
  }
  globalThis.BaseScriptComponent = class {
    constructor() {
      this.testEvents = new Map()
    }

    createEvent(name) {
      return {
        bind: (callback) => this.testEvents.set(name, callback),
      }
    }
  }
  return import(
    `data:text/javascript;base64,${Buffer.from(executableSource).toString('base64')}`
  )
}

const {
  PainterPaletteController,
  PainterPaletteGate,
} = await loadPainterPaletteController()

function signal(unsubscribeCounts) {
  const listeners = []
  return {
    add(listener) {
      listeners.push(listener)
      return () => {
        unsubscribeCounts.count += 1
        const index = listeners.indexOf(listener)
        if (index >= 0) listeners.splice(index, 1)
      }
    },
    emit(event = {}) {
      for (const listener of listeners.slice()) listener(event)
    },
  }
}

function swatch(unsubscribeCounts) {
  const scales = []
  const root = {
    getTransform() {
      return {
        setLocalScale(scale) {
          scales.push([scale.x, scale.y, scale.z])
        },
      }
    },
  }
  const interactable = {
    enabled: true,
    targetingMode: null,
    onTriggerStart: signal(unsubscribeCounts),
    onHoverEnter: signal(unsubscribeCounts),
    onHoverExit: signal(unsubscribeCounts),
  }
  return {
    root,
    ring: { enabled: false },
    collider: { enabled: true },
    interactable,
    scales,
  }
}

function bindController(controller, swatches) {
  controller.violetRoot = swatches.violet.root
  controller.lemonRoot = swatches.lemon.root
  controller.mintRoot = swatches.mint.root
  controller.violetRing = swatches.violet.ring
  controller.lemonRing = swatches.lemon.ring
  controller.mintRing = swatches.mint.ring
  controller.violetCollider = swatches.violet.collider
  controller.lemonCollider = swatches.lemon.collider
  controller.mintCollider = swatches.mint.collider
  controller.violetInteractable = swatches.violet.interactable
  controller.lemonInteractable = swatches.lemon.interactable
  controller.mintInteractable = swatches.mint.interactable
}

test('gate emits intent without changing the authoritative rendered selection', () => {
  const gate = new PainterPaletteGate()
  gate.render('violet', false)

  assert.equal(gate.request('lemon'), 'lemon')
  assert.equal(gate.getSelectedColorId(), 'violet')

  gate.render('lemon', true)
  assert.equal(gate.request('mint'), null)
  assert.equal(gate.getSelectedColorId(), 'lemon')
  assert.equal(gate.isInputLocked(), true)
})

test('gate rejects values outside the shared stroke color enum', () => {
  const gate = new PainterPaletteGate()
  gate.render('mint', false)
  gate.render('coral', true)

  assert.equal(gate.getSelectedColorId(), 'mint')
  assert.equal(gate.isInputLocked(), false)
  assert.equal(gate.request('coral'), null)
})

test('runtime selection is snapshot-driven, hover-safe, and disabled on lock', () => {
  const unsubscribeCounts = { count: 0 }
  const swatches = {
    violet: swatch(unsubscribeCounts),
    lemon: swatch(unsubscribeCounts),
    mint: swatch(unsubscribeCounts),
  }
  const controller = new PainterPaletteController()
  bindController(controller, swatches)
  const intents = []
  controller.setListener({
    onPaletteColorSelected(colorId) {
      intents.push(colorId)
    },
  })
  controller.onAwake()
  controller.render('violet', false)
  controller.testEvents.get('OnStartEvent')()

  assert.deepEqual(swatches.violet.scales.at(-1), [1.15, 1.15, 1.15])
  assert.deepEqual(swatches.lemon.scales.at(-1), [1, 1, 1])
  assert.deepEqual(swatches.mint.scales.at(-1), [1, 1, 1])
  assert.equal(swatches.violet.ring.enabled, true)
  assert.equal(swatches.lemon.ring.enabled, false)
  assert.equal(swatches.mint.ring.enabled, false)

  swatches.lemon.interactable.onHoverEnter.emit()
  assert.deepEqual(swatches.lemon.scales.at(-1), [1.08, 1.08, 1.08])
  swatches.lemon.interactable.onTriggerStart.emit()
  assert.deepEqual(intents, ['lemon'])
  assert.deepEqual(swatches.violet.scales.at(-1), [1.15, 1.15, 1.15])
  assert.equal(swatches.violet.ring.enabled, true)

  controller.render('lemon', true)
  assert.deepEqual(swatches.lemon.scales.at(-1), [1.15, 1.15, 1.15])
  assert.equal(swatches.violet.ring.enabled, false)
  assert.equal(swatches.lemon.ring.enabled, true)
  assert.equal(swatches.mint.ring.enabled, false)
  for (const colorId of ['violet', 'lemon', 'mint']) {
    assert.equal(swatches[colorId].collider.enabled, false, colorId)
    assert.equal(swatches[colorId].interactable.enabled, false, colorId)
    assert.equal(swatches[colorId].interactable.targetingMode, 'Indirect')
  }

  swatches.mint.interactable.onHoverEnter.emit()
  swatches.mint.interactable.onTriggerStart.emit()
  assert.deepEqual(swatches.mint.scales.at(-1), [1, 1, 1])
  assert.deepEqual(intents, ['lemon'])

  controller.testEvents.get('OnDestroyEvent')()
  assert.equal(unsubscribeCounts.count, 9)
  controller.render('mint', false)
  swatches.mint.interactable.onTriggerStart.emit()
  assert.deepEqual(intents, ['lemon'])
})

test('runtime controller rejects an incomplete explicit binding set', () => {
  const controller = new PainterPaletteController()
  assert.throws(
    () => controller.onAwake(),
    /requires three roots, rings, colliders, and interactables/i,
  )
})
