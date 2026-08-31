import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PAINTER_COLOR_DEFINITIONS,
  PAINTER_COLOR_IDS,
  isStrokeColorId,
  painterColorHex,
  painterColorLabel,
  painterColorNormalizedRgb,
} from '@wordless/core/Palette'

const EXPECTED_ORDER = [
  'scarlet',
  'orange',
  'lemon',
  'lime',
  'cyan',
  'cobalt',
  'violet',
  'magenta',
]

const EXPECTED_TABLE = [
  ['scarlet', 'RED', '#FF3B5C', [255, 59, 92]],
  ['orange', 'ORANGE', '#FF982B', [255, 152, 43]],
  ['lemon', 'YELLOW', '#FFD65A', [255, 214, 90]],
  ['lime', 'GREEN', '#A7F43A', [167, 244, 58]],
  ['cyan', 'CYAN', '#2DE2E6', [45, 226, 230]],
  ['cobalt', 'BLUE', '#3B82F6', [59, 130, 246]],
  ['violet', 'VIOLET', '#8B5CF6', [139, 92, 246]],
  ['magenta', 'MAGENTA', '#F04DD8', [240, 77, 216]],
]

test('registry exposes exactly the eight canonical ids in order', () => {
  assert.deepEqual([...PAINTER_COLOR_IDS], EXPECTED_ORDER)
})

test('ids, labels, and hex values are unique', () => {
  const definitions = PAINTER_COLOR_IDS.map(
    (colorId) => PAINTER_COLOR_DEFINITIONS[colorId],
  )
  assert.equal(new Set(definitions.map((d) => d.colorId)).size, 8)
  assert.equal(new Set(definitions.map((d) => d.label)).size, 8)
  assert.equal(new Set(definitions.map((d) => d.hex)).size, 8)
})

test('every definition matches the approved canonical table', () => {
  for (const [colorId, label, hex, rgb255] of EXPECTED_TABLE) {
    const definition = PAINTER_COLOR_DEFINITIONS[colorId]
    assert.equal(definition.colorId, colorId)
    assert.equal(definition.label, label)
    assert.equal(definition.hex, hex)
    assert.deepEqual([...definition.rgb255], rgb255)
    assert.equal(painterColorHex(colorId), hex)
    assert.equal(painterColorLabel(colorId), label)
  }
})

test('hex encodes the same channels as rgb255', () => {
  for (const colorId of PAINTER_COLOR_IDS) {
    const definition = PAINTER_COLOR_DEFINITIONS[colorId]
    const [red, green, blue] = definition.rgb255
    const encoded = '#' + [red, green, blue]
      .map((channel) => channel.toString(16).padStart(2, '0').toUpperCase())
      .join('')
    assert.equal(definition.hex, encoded)
  }
})

test('normalized rgb divides each channel by 255', () => {
  for (const colorId of PAINTER_COLOR_IDS) {
    const [red, green, blue] = PAINTER_COLOR_DEFINITIONS[colorId].rgb255
    assert.deepEqual(
      [...painterColorNormalizedRgb(colorId)],
      [red / 255, green / 255, blue / 255],
    )
  }
})

test('isStrokeColorId accepts all eight ids', () => {
  for (const colorId of PAINTER_COLOR_IDS) {
    assert.equal(isStrokeColorId(colorId), true)
  }
})

test('isStrokeColorId rejects semantic, removed, and malformed tokens', () => {
  for (const rejected of [
    'mint', 'coral', 'ivory', 'plum',
    '#FF3B5C', 'rgb(255,59,92)', 'SCARLET', 'scarlet ', '',
    1, null, undefined, ['scarlet'], { colorId: 'scarlet' },
  ]) {
    assert.equal(isStrokeColorId(rejected), false)
  }
})
