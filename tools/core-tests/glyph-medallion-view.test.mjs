import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

async function loadDecoratedTypeScript(relativePath) {
  const fileUrl = new URL(relativePath, import.meta.url)
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
  const executableSource = output.outputText
    .replaceAll("'../Core/Protocol'", JSON.stringify(protocolUrl))
    .replaceAll('"../Core/Protocol"', JSON.stringify(protocolUrl))

  globalThis.component = (target) => target
  globalThis.input = () => undefined
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
  return import(`data:text/javascript;base64,${Buffer.from(executableSource).toString('base64')}`)
}

const {
  GlyphMedallionView,
  buildMedallionFrameGeometry,
  buildGlyphMeshGeometry,
  layoutGlyphPoints,
} = await loadDecoratedTypeScript(
  '../../Assets/Wordless/Scripts/View/GlyphMedallionView.ts',
)

test('builds a thin circular frame outside every possible 34 cm glyph vertex', () => {
  const geometry = buildMedallionFrameGeometry()

  assert.equal(geometry.segmentCount, 64)
  assert.equal(geometry.vertices.length, 128)
  assert.equal(geometry.indices.length, 384)
  for (const [x, y, z] of geometry.vertices) {
    const radius = Math.sqrt(x * x + y * y)
    assert.ok(radius >= 24.999999 && radius <= 27.000001)
    assert.equal(z, 0)
  }

  const farthestGlyphCorner = Math.sqrt(17 * 17 + 17 * 17)
  assert.ok(farthestGlyphCorner < 25)
})

test('empty glyph input produces an empty local layout', () => {
  assert.deepEqual(layoutGlyphPoints([]), [])
})

test('a single sampled point remains one point centered in the medallion', () => {
  assert.deepEqual(layoutGlyphPoints([[237, 811]]), [[0, 0]])
})

test('degenerate horizontal and vertical paths keep exact count and order', () => {
  assert.deepEqual(layoutGlyphPoints([
    [1000, 250],
    [0, 250],
    [500, 250],
  ]), [
    [15.8, 0],
    [-15.8, 0],
    [0, 0],
  ])
  assert.deepEqual(layoutGlyphPoints([
    [250, 1000],
    [250, 0],
    [250, 500],
  ]), [
    [0, -15.8],
    [0, 15.8],
    [0, 0],
  ])
})

test('uniformly reserves stroke width inside the final 34 cm mesh bounds', () => {
  const source = [
    [0, 250],
    [500, 500],
    [1000, 750],
  ]

  const layout = layoutGlyphPoints(source)

  assert.deepEqual(layout, [
    [-15.8, 7.9],
    [0, 0],
    [15.8, -7.9],
  ])
  assert.equal(layout.length, source.length)
  assert.equal(Math.max(...layout.map(([x]) => x)) - Math.min(...layout.map(([x]) => x)), 31.6)
  assert.equal(Math.max(...layout.map(([, y]) => y)) - Math.min(...layout.map(([, y]) => y)), 15.8)
})

test('rejects malformed quantized glyph points instead of dropping them', () => {
  const sparse = Array(2)
  sparse[0] = [0, 0]
  const throwing = new Proxy([[0, 0]], {
    get() { throw new Error('untrusted collection') },
  })
  const invalid = [
    null,
    {},
    sparse,
    [[0]],
    [[0, 0, 0]],
    [[Number.NaN, 0]],
    [[0, Number.POSITIVE_INFINITY]],
    [[0.5, 0]],
    [[-1, 0]],
    [[0, 1001]],
    [['0', 0]],
    Array.from({ length: 129 }, () => [0, 0]),
    throwing,
  ]

  for (const value of invalid) {
    assert.throws(
      () => layoutGlyphPoints(value),
      /invalid quantized glyph points/i,
    )
  }
})

test('builds one original flat ribbon quad per ordered path segment', () => {
  const geometry = buildGlyphMeshGeometry([
    [-17, 0],
    [17, 0],
  ], 2.4)

  assert.equal(geometry.segmentCount, 1)
  assert.deepEqual(geometry.vertices.map((vertex) => vertex.slice(0, 3)), [
    [-17, -1.2, 0],
    [-17, 1.2, 0],
    [17, -1.2, 0],
    [17, 1.2, 0],
  ])
  assert.deepEqual(geometry.indices, [0, 2, 1, 1, 2, 3])
})

test('renders a single exact point as one centered primitive', () => {
  const geometry = buildGlyphMeshGeometry([[0, 0]], 2.4)

  assert.equal(geometry.segmentCount, 0)
  assert.deepEqual(geometry.vertices.map((vertex) => vertex.slice(0, 3)), [
    [-1.2, -1.2, 0],
    [-1.2, 1.2, 0],
    [1.2, -1.2, 0],
    [1.2, 1.2, 0],
  ])
  assert.deepEqual(geometry.indices, [0, 2, 1, 1, 2, 3])
})

test('keeps every final horizontal, vertical, diagonal, and point vertex inside 34 cm', () => {
  const cases = [
    ['horizontal', [[0, 500], [1000, 500]]],
    ['vertical', [[500, 0], [500, 1000]]],
    ['diagonal', [[0, 0], [1000, 1000]]],
    ['point', [[500, 500]]],
  ]

  for (const [name, source] of cases) {
    const geometry = buildGlyphMeshGeometry(layoutGlyphPoints(source), 2.4)
    const positions = geometry.vertices.map((vertex) => vertex.slice(0, 2))
    assert.ok(positions.length > 0, `${name} has visible geometry`)
    for (const [x, y] of positions) {
      assert.ok(x >= -17 && x <= 17, `${name} x=${x}`)
      assert.ok(y >= -17 && y <= 17, `${name} y=${y}`)
    }
  }
})

test('rejects invalid glyph stroke widths', () => {
  for (const width of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => buildGlyphMeshGeometry([[0, 0]], width),
      /glyph stroke width/i,
    )
  }
})

test('runtime view reuses authored ivory and violet resources without allocation churn', () => {
  const builders = []
  globalThis.MeshTopology = { Triangles: 0 }
  globalThis.MeshIndexType = { UInt16: 1 }
  globalThis.MeshShadowMode = { None: 0 }
  globalThis.MeshBuilder = class {
    constructor(layout) {
      this.layout = layout
      this.vertices = []
      this.indices = []
      this.mesh = { owner: this }
      this.updateCount = 0
      builders.push(this)
    }

    getMesh() { return this.mesh }
    getVerticesCount() { return this.vertices.length / 8 }
    getIndicesCount() { return this.indices.length }
    eraseVertices() { this.vertices = [] }
    eraseIndices() { this.indices = [] }
    appendVerticesInterleaved(vertices) { this.vertices.push(...vertices) }
    appendIndices(indices) { this.indices.push(...indices) }
    isValid() { return true }
    updateMesh() { this.updateCount += 1 }
  }

  const view = new GlyphMedallionView()
  view.medallionRoot = { enabled: true }
  view.glyphVisual = { enabled: true, mesh: null, meshShadowMode: null }
  view.frameVisual = { mainMaterial: null, mesh: null, meshShadowMode: null }
  view.revealedWordLabel = { text: 'STALE' }
  view.ivoryFrameMaterial = { name: 'ivory-frame' }
  view.violetGlyphMaterial = { name: 'violet-glyph' }
  view.onAwake()

  assert.equal(builders.length, 2)
  assert.equal(view.medallionRoot.enabled, false)
  assert.equal(view.glyphVisual.enabled, false)
  assert.equal(view.revealedWordLabel.text, '')
  assert.strictEqual(view.frameVisual.mainMaterial, view.ivoryFrameMaterial)
  assert.strictEqual(view.glyphVisual.mainMaterial, view.violetGlyphMaterial)
  assert.strictEqual(view.frameVisual.mesh, builders[1].mesh)
  assert.equal(view.frameVisual.meshShadowMode, 0)
  assert.equal(view.glyphVisual.meshShadowMode, 0)
  assert.deepEqual(view.getOwnedResourceCounts(), {
    sceneObjects: 4,
    materials: 2,
  })

  const originalMesh = view.glyphVisual.mesh
  view.render([[100, 100], [900, 900]], 'SNAKE')
  assert.equal(view.medallionRoot.enabled, true)
  assert.equal(view.glyphVisual.enabled, true)
  assert.equal(view.glyphVisual.mesh, originalMesh)
  assert.equal(view.revealedWordLabel.text, 'SNAKE')
  assert.equal(builders[0].vertices.length, 32)
  assert.equal(builders[0].indices.length, 6)
  assert.equal(builders[0].updateCount, 1)
  assert.equal(builders[1].vertices.length, 1024)
  assert.equal(builders[1].indices.length, 384)
  assert.equal(builders[1].updateCount, 1)

  view.render([], 'SNAKE')
  assert.equal(view.medallionRoot.enabled, true)
  assert.equal(view.glyphVisual.enabled, false)
  assert.equal(view.glyphVisual.mesh, originalMesh)
  assert.equal(builders.length, 2)
  view.hide()
  assert.equal(view.medallionRoot.enabled, false)
  assert.equal(view.glyphVisual.enabled, false)
  assert.equal(view.revealedWordLabel.text, '')
})

test('runtime view rejects an incomplete authored medallion binding set', () => {
  const view = new GlyphMedallionView()
  assert.throws(
    () => view.onAwake(),
    /requires root, frame, glyph, word, and two material bindings/i,
  )
})
