import assert from 'node:assert/strict'
import test from 'node:test'

import {
  BrushStrokeSession,
} from '../../Assets/Wordless/Scripts/Input/BrushStrokeSession.ts'

const ROUND_A = 'r-A1B2C3D4-1'
const ROUND_B = 'r-A1B2C3D4-2'

const point = (x, y, z = 0) => ({ x, y, z })
const identity = ({ x, y, z }) => ({ x, y, z })

const actionsOfType = (actions, type) =>
  actions.filter((action) => action.type === type)

test('arms only a protocol-valid product round', () => {
  const session = new BrushStrokeSession(identity)

  for (const invalid of ['', 'lobby', 'bad round', 'x'.repeat(33), null]) {
    session.armForRound(invalid)
  }
  assert.deepEqual(session.beginManipulation(), [])
  assert.deepEqual(session.endManipulation(), [])

  session.armForRound(ROUND_A)
  assert.deepEqual(session.beginManipulation(), [{
    type: 'stroke-start',
    strokeId: 'stroke-1',
  }])
})

test('reports acceptance only for a distinct valid round without clearing a hold', () => {
  const session = new BrushStrokeSession(identity)

  assert.equal(session.armForRound('lobby'), false)
  assert.equal(session.armForRound(ROUND_A), true)
  assert.equal(session.armForRound(ROUND_A), false)
  assert.equal(session.beginManipulation()[0]?.strokeId, 'stroke-1')

  assert.equal(session.armForRound(ROUND_B), true)
  assert.deepEqual(session.beginManipulation(), [])
  assert.deepEqual(session.endManipulation(), [])
  assert.equal(session.beginManipulation()[0]?.strokeId, 'stroke-2')
})

test('starts one monotonic stroke for each distinct armed round', () => {
  const session = new BrushStrokeSession(identity)

  session.armForRound(ROUND_A)
  assert.equal(session.beginManipulation()[0]?.strokeId, 'stroke-1')
  assert.deepEqual(session.endManipulation(), [{
    type: 'stroke-end',
    strokeId: 'stroke-1',
    reason: 'manual',
    pointCount: 0,
  }])

  session.armForRound(ROUND_B)
  assert.equal(session.beginManipulation()[0]?.strokeId, 'stroke-2')
})

test('clamps and flattens before mapping and quantizing', () => {
  const session = new BrushStrokeSession((local) => ({
    x: local.x + 10,
    y: local.y - 5,
    z: local.z - 160,
  }))
  session.armForRound(ROUND_A)
  session.beginManipulation()

  assert.deepEqual(session.sample(point(100, -60, 999)), [{
    type: 'stroke-point',
    strokeId: 'stroke-1',
    local: point(90, -55, 0),
    world: point(100, -60, -160),
    normalized: [1000, 1000],
  }])
  assert.deepEqual(session.getDiagnostics(), {
    acceptedCount: 1,
    maxAbsLocalZ: 0,
    minimumSpacingCm: null,
    endCount: 0,
    capReached: false,
  })
})

test('samples from the last accepted world point at the 2.5 cm boundary', () => {
  const session = new BrushStrokeSession(identity)
  session.armForRound(ROUND_A)
  session.beginManipulation()

  assert.equal(actionsOfType(session.sample(point(0, 0)), 'stroke-point').length, 1)
  assert.deepEqual(session.sample(point(2.499, 0)), [])
  assert.equal(actionsOfType(session.sample(point(2.5, 0)), 'stroke-point').length, 1)
  assert.equal(session.getDiagnostics().minimumSpacingCm, 2.5)
})

test('listener mutation of an emitted world point cannot corrupt sampling history', () => {
  const session = new BrushStrokeSession(identity)
  session.armForRound(ROUND_A)
  session.beginManipulation()

  const firstPoint = actionsOfType(
    session.sample(point(0, 0)),
    'stroke-point',
  )[0]
  firstPoint.world.x = 100

  assert.deepEqual(session.sample(point(1, 0)), [])
  assert.deepEqual(session.getDiagnostics(), {
    acceptedCount: 1,
    maxAbsLocalZ: 0,
    minimumSpacingCm: null,
    endCount: 0,
    capReached: false,
  })
  assert.equal(
    actionsOfType(session.sample(point(2.5, 0)), 'stroke-point').length,
    1,
  )
  assert.equal(session.getDiagnostics().minimumSpacingCm, 2.5)
})

test('manual release emits one end and permanently consumes the round', () => {
  const session = new BrushStrokeSession(identity)
  session.armForRound(ROUND_A)
  session.beginManipulation()
  session.sample(point(0, 0))

  assert.deepEqual(session.endManipulation(), [{
    type: 'stroke-end',
    strokeId: 'stroke-1',
    reason: 'manual',
    pointCount: 1,
  }])
  assert.deepEqual(session.endManipulation(), [])
  assert.deepEqual(session.beginManipulation(), [])
  assert.equal(session.getDiagnostics().endCount, 1)
})

test('the 128th point precedes one cap end and quarantines later input', () => {
  const session = new BrushStrokeSession(identity)
  const actions = []
  session.armForRound(ROUND_A)
  actions.push(...session.beginManipulation())

  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 16; column += 1) {
      const orderedColumn = row % 2 === 0 ? column : 15 - column
      const x = -37.5 + orderedColumn * 5
      const y = -17.5 + row * 5
      actions.push(...session.sample(point(x, y)))
    }
  }

  assert.equal(actionsOfType(actions, 'stroke-start').length, 1)
  assert.equal(actionsOfType(actions, 'stroke-point').length, 128)
  assert.deepEqual(actions.slice(-2), [
    {
      type: 'stroke-point',
      strokeId: 'stroke-1',
      local: point(-37.5, 17.5),
      world: point(-37.5, 17.5),
      normalized: [292, 341],
    },
    {
      type: 'stroke-end',
      strokeId: 'stroke-1',
      reason: 'cap',
      pointCount: 128,
    },
  ])
  assert.equal(actionsOfType(actions, 'stroke-end').length, 1)
  assert.deepEqual(session.sample(point(0, 0)), [])
  assert.deepEqual(session.endManipulation(), [])
  assert.deepEqual(session.beginManipulation(), [])
  assert.deepEqual(session.getDiagnostics(), {
    acceptedCount: 128,
    maxAbsLocalZ: 0,
    minimumSpacingCm: 5,
    endCount: 1,
    capReached: true,
  })
})

test('a duplicate arm cannot reopen a closed successor round', () => {
  const session = new BrushStrokeSession(identity)

  session.armForRound(ROUND_A)
  session.armForRound(ROUND_B)
  assert.equal(session.beginManipulation()[0]?.strokeId, 'stroke-1')
  assert.equal(session.endManipulation()[0]?.type, 'stroke-end')

  session.armForRound(ROUND_B)
  assert.deepEqual(session.beginManipulation(), [])
})

test('rearming while held requires release before a new stroke', () => {
  const session = new BrushStrokeSession(identity)

  session.armForRound(ROUND_A)
  assert.equal(session.beginManipulation()[0]?.strokeId, 'stroke-1')
  session.armForRound(ROUND_B)

  assert.deepEqual(session.beginManipulation(), [])
  assert.deepEqual(session.endManipulation(), [])
  assert.equal(session.beginManipulation()[0]?.strokeId, 'stroke-2')
})

test('non-finite local or mapped world points fail closed', () => {
  const session = new BrushStrokeSession((local) => local.x === 7
    ? point(Number.POSITIVE_INFINITY, 0)
    : identity(local))
  session.armForRound(ROUND_A)
  session.beginManipulation()

  assert.deepEqual(session.sample(point(Number.NaN, 0)), [])
  assert.deepEqual(session.sample(point(7, 0)), [])
  assert.equal(actionsOfType(session.sample(point(10, 0)), 'stroke-point').length, 1)
  assert.equal(session.endManipulation()[0]?.pointCount, 1)
})
