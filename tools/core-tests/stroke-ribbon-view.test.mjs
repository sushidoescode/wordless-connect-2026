import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const fileUrl = new URL(
  '../../Assets/Wordless/Scripts/View/StrokeRibbonView.ts',
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
const meshUrl = new URL(
  '../../Assets/Wordless/Scripts/View/StrokeRibbonMesh.ts',
  import.meta.url,
).href
const protocolUrl = new URL(
  '../../Assets/Wordless/Scripts/Core/Protocol.ts',
  import.meta.url,
).href
const executableSource = output.outputText
  .replaceAll("'./StrokeRibbonMesh'", JSON.stringify(meshUrl))
  .replaceAll('"./StrokeRibbonMesh"', JSON.stringify(meshUrl))
  .replaceAll("'../Core/Protocol'", JSON.stringify(protocolUrl))
  .replaceAll('"../Core/Protocol"', JSON.stringify(protocolUrl))

globalThis.component = (target) => target
globalThis.input = () => undefined
globalThis.MeshTopology = { Triangles: 0 }
globalThis.MeshIndexType = { UInt16: 1 }
globalThis.MeshShadowMode = { None: 0 }
globalThis.MeshBuilder = class {
  constructor() {
    this.mesh = {}
  }

  getMesh() { return this.mesh }
}
globalThis.vec3 = class Vec3 {
  constructor(x, y, z) {
    this.x = x
    this.y = y
    this.z = z
  }

  static zero() { return new Vec3(0, 0, 0) }
  static one() { return new Vec3(1, 1, 1) }
}
globalThis.vec4 = class Vec4 {
  constructor(x, y, z, w) {
    this.x = x
    this.y = y
    this.z = z
    this.w = w
  }
}
globalThis.quat = { quatIdentity: () => ({}) }

const rootObject = {}
globalThis.BaseScriptComponent = class {
  createEvent() {
    return { bind() {} }
  }

  getSceneObject() {
    return rootObject
  }
}
globalThis.global = {
  scene: {
    createSceneObject() {
      const transform = {
        setLocalPosition() {},
        setLocalRotation() {},
        setLocalScale() {},
      }
      return {
        enabled: true,
        setParent() {},
        getTransform: () => transform,
        createComponent: () => ({ mainPass: {} }),
        destroy() {},
      }
    },
  },
}

const { StrokeRibbonView } = await import(
  `data:text/javascript;base64,${Buffer.from(executableSource).toString('base64')}`
)

function material(alpha, captures) {
  return {
    clone() {
      const clone = {
        mainPass: {
          baseColor: new vec4(139 / 255, 92 / 255, 246 / 255, alpha),
        },
      }
      captures.push(clone)
      return clone
    },
  }
}

function colorTuple(materialClone) {
  const color = materialClone.mainPass.baseColor
  return [color.x, color.y, color.z, color.w]
}

test('applies every selected production color to both existing ribbon layers', () => {
  const clones = []
  const view = new StrokeRibbonView()
  view.outerMaterial = material(0.28, clones)
  view.coreMaterial = material(1, clones)
  view.drawHeadVisual = { enabled: true }
  view.onAwake()

  const cases = [
    ['violet', [139 / 255, 92 / 255, 246 / 255]],
    ['lemon', [1, 214 / 255, 90 / 255]],
    ['mint', [115 / 255, 230 / 255, 174 / 255]],
  ]
  for (const [colorId, rgb] of cases) {
    view.setStrokeColor(colorId)
    assert.deepEqual(colorTuple(clones[0]), [...rgb, 0.28], colorId)
    assert.deepEqual(colorTuple(clones[1]), [...rgb, 1], colorId)
  }

  assert.equal(clones.length, 2)
})

test('incorrect coral override restores mint without material recreation', () => {
  const clones = []
  const view = new StrokeRibbonView()
  view.outerMaterial = material(0.28, clones)
  view.coreMaterial = material(1, clones)
  view.drawHeadVisual = { enabled: true }
  view.onAwake()

  view.setStrokeColor('mint')
  assert.deepEqual(colorTuple(clones[0]), [115 / 255, 230 / 255, 174 / 255, 0.28])
  assert.deepEqual(colorTuple(clones[1]), [115 / 255, 230 / 255, 174 / 255, 1])

  view.setIncorrectFeedbackActive(true)
  assert.deepEqual(colorTuple(clones[0]), [1, 120 / 255, 106 / 255, 0.28])
  assert.deepEqual(colorTuple(clones[1]), [1, 120 / 255, 106 / 255, 1])

  view.setIncorrectFeedbackActive(false)
  assert.deepEqual(colorTuple(clones[0]), [115 / 255, 230 / 255, 174 / 255, 0.28])
  assert.deepEqual(colorTuple(clones[1]), [115 / 255, 230 / 255, 174 / 255, 1])
  assert.equal(clones.length, 2)
})
