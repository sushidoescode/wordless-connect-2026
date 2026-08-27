import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import ts from 'typescript'

const moduleUrl = new URL(
  '../../Assets/Wordless/Scripts/View/LensHudView.ts',
  import.meta.url,
)
const source = readFileSync(moduleUrl, 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    experimentalDecorators: true,
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2021,
    useDefineForClassFields: false,
  },
}).outputText

globalThis.component = (constructor) => constructor
globalThis.input = () => undefined
globalThis.BaseScriptComponent = class {}
globalThis.TextFillMode = { Solid: 'solid' }
globalThis.vec4 = class Vec4 {
  constructor(x, y, z, w) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }
}

const {
  LensHudView,
  mapLensHudPresentation,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

const CHOICES = ['SNAKE', 'RIVER', 'ROPE', 'WAVE']

function snapshot(changes = {}) {
  return {
    phase: 'READY',
    roundId: 'r-A1B2C3D4-1',
    promptWord: 'SNAKE',
    choices: CHOICES,
    durationMs: 20_000,
    startedAtMs: 0,
    remainingMs: 20_000,
    worldPoints: [],
    publicPoints: [],
    guessedIndices: [],
    lastOutcome: 'none',
    revealedWord: null,
    glyph: [],
    counterpartReady: false,
    strokeComplete: false,
    ...changes,
  }
}

test('maps authoritative phase and stroke completion to painter-facing labels', () => {
  const cases = [
    ['DISCONNECTED', false, 'OFFLINE'],
    ['JOINING', false, 'JOINING'],
    ['READY', false, 'READY'],
    ['ACTIVE', false, 'DRAW'],
    ['ACTIVE', true, 'WAIT FOR GUESS'],
    ['CORRECT', true, 'CORRECT'],
    ['GLYPH_LOCKED', true, 'SOLVED'],
    ['TIMED_OUT', true, "TIME'S UP"],
  ]

  for (const [phase, strokeComplete, want] of cases) {
    assert.equal(
      mapLensHudPresentation(snapshot({ phase, strokeComplete })).phaseText,
      want,
    )
  }
})

test('renders only the authoritative Lens-local prompt and hides stale prompts offline', () => {
  assert.equal(
    mapLensHudPresentation(snapshot({ phase: 'ACTIVE' })).promptText,
    'DRAW: SNAKE',
  )
  assert.equal(
    mapLensHudPresentation(snapshot({
      phase: 'ACTIVE',
      promptWord: null,
      choices: CHOICES,
    })).promptText,
    'DRAW: —',
  )
  assert.equal(
    mapLensHudPresentation(snapshot({
      phase: 'DISCONNECTED',
      promptWord: 'SNAKE',
    })).promptText,
    '',
  )
})

test('ceil-formats the authoritative remaining duration without negative time', () => {
  const cases = [
    [20_000, '0:20'],
    [19_001, '0:20'],
    [19_000, '0:19'],
    [1_001, '0:02'],
    [1, '0:01'],
    [0, '0:00'],
    [-1, '0:00'],
    [60_001, '1:01'],
    [Number.NaN, '0:00'],
  ]

  for (const [remainingMs, want] of cases) {
    assert.equal(
      mapLensHudPresentation(snapshot({ remainingMs })).timerText,
      want,
    )
  }
})

test('reports literal local and counterpart connection truth', () => {
  const cases = [
    [{ phase: 'DISCONNECTED', counterpartReady: true }, 'DISCONNECTED', 'coral'],
    [{ phase: 'JOINING', counterpartReady: true }, 'CONNECTING', 'lemon'],
    [{ phase: 'READY', counterpartReady: false }, 'WAITING FOR GUESSER', 'lemon'],
    [{ phase: 'ACTIVE', counterpartReady: false }, 'WAITING FOR GUESSER', 'lemon'],
    [{ phase: 'ACTIVE', counterpartReady: true }, 'CONNECTED', 'mint'],
    [{ phase: 'GLYPH_LOCKED', counterpartReady: true }, 'CONNECTED', 'mint'],
  ]

  for (const [changes, text, tone] of cases) {
    const presentation = mapLensHudPresentation(snapshot(changes))
    assert.equal(presentation.connectionText, text)
    assert.equal(presentation.connectionTone, tone)
  }
})

test('shows incorrect, revealed correct, and timeout results without pre-reveal fallback', () => {
  assert.deepEqual(
    mapLensHudPresentation(snapshot({
      phase: 'ACTIVE',
      lastOutcome: 'incorrect',
    })).result,
    { visible: true, text: '× TRY AGAIN', tone: 'coral' },
  )
  assert.deepEqual(
    mapLensHudPresentation(snapshot({
      phase: 'CORRECT',
      lastOutcome: 'correct',
      revealedWord: 'SNAKE',
    })).result,
    { visible: true, text: '✓ SNAKE!', tone: 'mint' },
  )
  assert.deepEqual(
    mapLensHudPresentation(snapshot({
      phase: 'GLYPH_LOCKED',
      lastOutcome: 'correct',
      revealedWord: 'SNAKE',
    })).result,
    { visible: true, text: '✓ SNAKE!', tone: 'mint' },
  )
  assert.deepEqual(
    mapLensHudPresentation(snapshot({
      phase: 'TIMED_OUT',
      lastOutcome: 'timeout',
    })).result,
    { visible: true, text: "× TIME'S UP", tone: 'coral' },
  )

  const unrevealed = mapLensHudPresentation(snapshot({
    phase: 'CORRECT',
    promptWord: null,
    choices: CHOICES,
    lastOutcome: 'correct',
    revealedWord: null,
  }))
  assert.deepEqual(unrevealed.result, {
    visible: false,
    text: '',
    tone: null,
  })
  assert.equal(JSON.stringify(unrevealed).includes('SNAKE'), false)
})

function makeText() {
  return {
    enabled: true,
    text: 'stale',
    textFill: { color: null, mode: null },
    dropshadowSettings: { enabled: true },
    backgroundSettings: { enabled: true },
  }
}

function colorTuple(color) {
  return [color.x, color.y, color.z, color.w]
}

function makeBoundView() {
  const view = new LensHudView()
  view.roleText = makeText()
  view.phaseText = makeText()
  view.promptText = makeText()
  view.timerText = makeText()
  view.connectionText = makeText()
  view.resultText = makeText()
  view.connectionDot = { enabled: false }
  view.connectionDotVisual = { mainMaterial: null }
  view.resultMarker = { enabled: true }
  view.resultMarkerVisual = { mainMaterial: null }
  view.lemonMaterial = { name: 'lemon' }
  view.mintMaterial = { name: 'mint' }
  view.coralMaterial = { name: 'coral' }
  return view
}

test('writes presentation into authored resources with additive-safe palette', () => {
  const view = makeBoundView()
  view.onAwake()
  view.render(snapshot({
    phase: 'ACTIVE',
    counterpartReady: true,
    remainingMs: 15_001,
    lastOutcome: 'incorrect',
  }))

  assert.equal(view.roleText.text, 'PAINTER')
  assert.equal(view.phaseText.text, 'DRAW')
  assert.equal(view.promptText.text, 'DRAW: SNAKE')
  assert.equal(view.timerText.text, '0:16')
  assert.equal(view.connectionText.text, 'CONNECTED')
  assert.equal(view.resultText.text, '× TRY AGAIN')
  assert.equal(view.resultText.enabled, true)
  assert.equal(view.connectionDot.enabled, true)
  assert.equal(view.resultMarker.enabled, true)
  assert.strictEqual(view.connectionDotVisual.mainMaterial, view.mintMaterial)
  assert.strictEqual(view.resultMarkerVisual.mainMaterial, view.coralMaterial)

  assert.deepEqual(colorTuple(view.roleText.textFill.color), [1, 246 / 255, 232 / 255, 1])
  assert.deepEqual(colorTuple(view.timerText.textFill.color), [1, 214 / 255, 90 / 255, 1])
  assert.deepEqual(colorTuple(view.connectionText.textFill.color), [115 / 255, 230 / 255, 174 / 255, 1])
  assert.deepEqual(colorTuple(view.resultText.textFill.color), [1, 120 / 255, 106 / 255, 1])
  for (const text of [
    view.roleText,
    view.phaseText,
    view.promptText,
    view.timerText,
    view.connectionText,
    view.resultText,
  ]) {
    assert.equal(text.textFill.mode, 'solid')
    assert.equal(text.dropshadowSettings.enabled, false)
    assert.equal(text.backgroundSettings.enabled, false)
  }
})

test('clears hidden result resources and exposes stable authored-resource counts', () => {
  const view = makeBoundView()
  view.onAwake()

  assert.deepEqual(view.getOwnedResourceCounts(), {
    sceneObjects: 8,
    materials: 3,
  })
  view.render(snapshot())
  assert.equal(view.resultText.text, '')
  assert.equal(view.resultText.enabled, false)
  assert.equal(view.resultMarker.enabled, false)
  assert.deepEqual(view.getOwnedResourceCounts(), {
    sceneObjects: 8,
    materials: 3,
  })
})

test('rejects an incompletely authored HUD binding set', () => {
  const view = makeBoundView()
  view.coralMaterial = null

  assert.throws(
    () => view.onAwake(),
    /LensHudView requires 6 Text, 2 marker, and 3 material bindings/,
  )
})
