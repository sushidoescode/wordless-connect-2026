import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

import {
  PAINTER_COLOR_IDS,
  painterColorNormalizedRgb,
} from '../../Assets/Wordless/Scripts/Core/Palette.ts'

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
const paletteUrl = new URL(
  '../../Assets/Wordless/Scripts/Core/Palette.ts',
  import.meta.url,
).href
const executableSource = output.outputText
  .replaceAll("'./StrokeRibbonMesh'", JSON.stringify(meshUrl))
  .replaceAll('"./StrokeRibbonMesh"', JSON.stringify(meshUrl))
  .replaceAll("'../Core/Protocol'", JSON.stringify(protocolUrl))
  .replaceAll('"../Core/Protocol"', JSON.stringify(protocolUrl))
  .replaceAll("'../Core/Palette'", JSON.stringify(paletteUrl))
  .replaceAll('"../Core/Palette"', JSON.stringify(paletteUrl))

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

test('applies every registry painter color to both existing ribbon layers', () => {
  const clones = []
  const view = new StrokeRibbonView()
  view.outerMaterial = material(0.28, clones)
  view.coreMaterial = material(1, clones)
  view.drawHeadVisual = { enabled: true }
  view.onAwake()

  assert.equal(PAINTER_COLOR_IDS.length, 8)
  for (const colorId of PAINTER_COLOR_IDS) {
    view.setStrokeColor(colorId)
    const rgb = painterColorNormalizedRgb(colorId)
    assert.deepEqual(colorTuple(clones[0]), [...rgb, 0.28], colorId)
    assert.deepEqual(colorTuple(clones[1]), [...rgb, 1], colorId)
  }

  assert.equal(clones.length, 2)
})

test('incorrect coral override restores cyan without material recreation', () => {
  const clones = []
  const view = new StrokeRibbonView()
  view.outerMaterial = material(0.28, clones)
  view.coreMaterial = material(1, clones)
  view.drawHeadVisual = { enabled: true }
  view.onAwake()

  view.setStrokeColor('cyan')
  assert.deepEqual(colorTuple(clones[0]), [45 / 255, 226 / 255, 230 / 255, 0.28])
  assert.deepEqual(colorTuple(clones[1]), [45 / 255, 226 / 255, 230 / 255, 1])

  view.setIncorrectFeedbackActive(true)
  assert.deepEqual(colorTuple(clones[0]), [1, 120 / 255, 106 / 255, 0.28])
  assert.deepEqual(colorTuple(clones[1]), [1, 120 / 255, 106 / 255, 1])

  view.setIncorrectFeedbackActive(false)
  assert.deepEqual(colorTuple(clones[0]), [45 / 255, 226 / 255, 230 / 255, 0.28])
  assert.deepEqual(colorTuple(clones[1]), [45 / 255, 226 / 255, 230 / 255, 1])
  assert.equal(clones.length, 2)
})
