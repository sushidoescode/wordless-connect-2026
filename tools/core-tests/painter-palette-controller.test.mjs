import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

import { PAINTER_COLOR_IDS } from '@wordless/core/Palette'

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

const REJECTED_COLOR_VALUES = [
  'mint',
  'coral',
  'ivory',
  'plum',
  '#2DE2E6',
  'rgb(45,226,230)',
  '',
  1,
  null,
]

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

function buildSwatches(unsubscribeCounts) {
  const byColor = {}
  for (const colorId of PAINTER_COLOR_IDS) {
    byColor[colorId] = swatch(unsubscribeCounts)
  }
  return byColor
}

function bindController(controller, swatches) {
  controller.swatchRoots = PAINTER_COLOR_IDS.map(
    (colorId) => swatches[colorId].root,
  )
  controller.swatchRings = PAINTER_COLOR_IDS.map(
    (colorId) => swatches[colorId].ring,
  )
  controller.swatchColliders = PAINTER_COLOR_IDS.map(
    (colorId) => swatches[colorId].collider,
  )
  controller.swatchInteractables = PAINTER_COLOR_IDS.map(
    (colorId) => swatches[colorId].interactable,
  )
}

function boundController(unsubscribeCounts = { count: 0 }) {
  const swatches = buildSwatches(unsubscribeCounts)
  const controller = new PainterPaletteController()
  bindController(controller, swatches)
  return { controller, swatches }
}

test('gate emits intent without changing the authoritative rendered selection', () => {
  const gate = new PainterPaletteGate()
  assert.equal(gate.getSelectedColorId(), 'violet')
  assert.equal(gate.isInputLocked(), true)
  assert.equal(gate.request('violet'), null)

  gate.render('violet', false)
  assert.equal(gate.request('lemon'), 'lemon')
  assert.equal(gate.getSelectedColorId(), 'violet')

  gate.render('lemon', true)
  assert.equal(gate.request('cyan'), null)
  assert.equal(gate.getSelectedColorId(), 'lemon')
  assert.equal(gate.isInputLocked(), true)
})

test('gate accepts exactly the eight canonical stroke color ids', () => {
  const gate = new PainterPaletteGate()
  gate.render('violet', false)

  assert.equal(PAINTER_COLOR_IDS.length, 8)
  for (const colorId of PAINTER_COLOR_IDS) {
    assert.equal(gate.request(colorId), colorId)
    gate.render(colorId, false)
    assert.equal(gate.getSelectedColorId(), colorId)
  }
})

test('gate rejects values outside the shared stroke color enum', () => {
  const gate = new PainterPaletteGate()
  gate.render('cyan', false)

  for (const rejected of REJECTED_COLOR_VALUES) {
    assert.equal(gate.request(rejected), null, String(rejected))
    gate.render(rejected, true)
    assert.equal(gate.getSelectedColorId(), 'cyan', String(rejected))
    assert.equal(gate.isInputLocked(), false, String(rejected))
  }
})

test('runtime selection is snapshot-driven, hover-safe, and disabled on lock', () => {
  const unsubscribeCounts = { count: 0 }
  const { controller, swatches } = boundController(unsubscribeCounts)
  const intents = []
  controller.setListener({
    onPaletteColorSelected(colorId) {
      intents.push(colorId)
    },
  })
  controller.onAwake()
  controller.render('violet', false)

  for (const colorId of PAINTER_COLOR_IDS) {
    assert.equal(swatches[colorId].collider.enabled, false, colorId)
    assert.equal(swatches[colorId].interactable.enabled, true, colorId)
    assert.equal(swatches[colorId].interactable.targetingMode, null, colorId)
  }

  controller.testEvents.get('OnStartEvent')()

  assert.deepEqual(swatches.violet.scales.at(-1), [1.15, 1.15, 1.15])
  for (const colorId of PAINTER_COLOR_IDS) {
    if (colorId !== 'violet') {
      assert.deepEqual(swatches[colorId].scales.at(-1), [1, 1, 1], colorId)
    }
    assert.equal(swatches[colorId].ring.enabled, colorId === 'violet', colorId)
    assert.equal(swatches[colorId].collider.enabled, true, colorId)
    assert.equal(swatches[colorId].interactable.enabled, true, colorId)
    assert.equal(
      swatches[colorId].interactable.targetingMode,
      'Indirect',
      colorId,
    )
  }

  swatches.cyan.interactable.onHoverEnter.emit()
  assert.deepEqual(swatches.cyan.scales.at(-1), [1.08, 1.08, 1.08])
  swatches.cyan.interactable.onTriggerStart.emit()
  assert.deepEqual(intents, ['cyan'])
  assert.deepEqual(swatches.violet.scales.at(-1), [1.15, 1.15, 1.15])
  assert.equal(swatches.violet.ring.enabled, true)

  controller.render('cyan', true)
  assert.deepEqual(swatches.cyan.scales.at(-1), [1.15, 1.15, 1.15])
  assert.equal(swatches.violet.ring.enabled, false)
  assert.equal(swatches.cyan.ring.enabled, true)
  for (const colorId of PAINTER_COLOR_IDS) {
    if (colorId !== 'cyan') {
      assert.deepEqual(swatches[colorId].scales.at(-1), [1, 1, 1], colorId)
      assert.equal(swatches[colorId].ring.enabled, false, colorId)
    }
    assert.equal(swatches[colorId].collider.enabled, false, colorId)
    assert.equal(swatches[colorId].interactable.enabled, false, colorId)
  }

  swatches.magenta.interactable.onHoverEnter.emit()
  swatches.magenta.interactable.onTriggerStart.emit()
  assert.deepEqual(swatches.magenta.scales.at(-1), [1, 1, 1])
  assert.deepEqual(intents, ['cyan'])

  controller.testEvents.get('OnDestroyEvent')()
  assert.equal(unsubscribeCounts.count, 24)
  controller.render('lime', false)
  swatches.lime.interactable.onTriggerStart.emit()
  assert.deepEqual(intents, ['cyan'])
  for (const colorId of PAINTER_COLOR_IDS) {
    assert.equal(swatches[colorId].collider.enabled, false, colorId)
  }
})

test('lock clears hover so unlock does not resurrect a stale hover scale', () => {
  const { controller, swatches } = boundController()
  controller.onAwake()
  controller.render('violet', false)
  controller.testEvents.get('OnStartEvent')()

  swatches.lemon.interactable.onHoverEnter.emit()
  assert.deepEqual(swatches.lemon.scales.at(-1), [1.08, 1.08, 1.08])

  controller.render('violet', true)
  assert.deepEqual(swatches.lemon.scales.at(-1), [1, 1, 1])

  controller.render('violet', false)
  assert.deepEqual(swatches.lemon.scales.at(-1), [1, 1, 1])
})

test('runtime render with an id outside the enum is a strict no-op', () => {
  const { controller, swatches } = boundController()
  controller.onAwake()
  controller.render('violet', false)
  controller.testEvents.get('OnStartEvent')()

  for (const rejected of REJECTED_COLOR_VALUES) {
    controller.render(rejected, true)
    assert.equal(swatches.violet.ring.enabled, true, String(rejected))
    for (const colorId of PAINTER_COLOR_IDS) {
      assert.equal(swatches[colorId].collider.enabled, true, colorId)
      assert.equal(swatches[colorId].interactable.enabled, true, colorId)
    }
  }
})

test('runtime controller fails closed on entirely missing binding arrays', () => {
  const controller = new PainterPaletteController()
  assert.throws(
    () => controller.onAwake(),
    /requires eight ordered swatch bindings/i,
  )
})

test('runtime controller fails closed on a seven-length binding array', () => {
  const { controller } = boundController()
  controller.swatchInteractables = controller.swatchInteractables.slice(0, 7)
  assert.throws(
    () => controller.onAwake(),
    /requires eight ordered swatch bindings/i,
  )
})

test('runtime controller fails closed on a duplicated root binding', () => {
  const { controller } = boundController()
  controller.swatchRoots[3] = controller.swatchRoots[0]
  assert.throws(
    () => controller.onAwake(),
    /requires eight ordered swatch bindings/i,
  )
})

test('runtime controller fails closed when a ring is bound to its own root', () => {
  const { controller } = boundController()
  controller.swatchRings[2] = controller.swatchRoots[2]
  assert.throws(
    () => controller.onAwake(),
    /requires eight ordered swatch bindings/i,
  )
})
