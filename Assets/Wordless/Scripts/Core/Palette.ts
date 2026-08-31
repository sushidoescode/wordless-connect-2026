/**
 * Canonical ordered painter palette. This tuple is the single registry from
 * which every color table on both clients derives: the wire enum, the Lens
 * ribbon/glyph/swatch mappings, and the browser CSS map. Order is part of the
 * approved contract; do not add, remove, or reorder entries without a new
 * owner-approved design amendment.
 */
export const PAINTER_COLOR_IDS = Object.freeze([
  'scarlet',
  'orange',
  'lemon',
  'lime',
  'cyan',
  'cobalt',
  'violet',
  'magenta',
] as const)

export type StrokeColorId = (typeof PAINTER_COLOR_IDS)[number]

export interface PainterColorDefinition {
  readonly colorId: StrokeColorId
  readonly label: string
  readonly hex: string
  readonly rgb255: readonly [number, number, number]
}

export const PAINTER_COLOR_DEFINITIONS: Readonly<
  Record<StrokeColorId, PainterColorDefinition>
> = Object.freeze({
  scarlet: Object.freeze({
    colorId: 'scarlet',
    label: 'RED',
    hex: '#FF3B5C',
    rgb255: Object.freeze([255, 59, 92]) as readonly [number, number, number],
  }),
  orange: Object.freeze({
    colorId: 'orange',
    label: 'ORANGE',
    hex: '#FF982B',
    rgb255: Object.freeze([255, 152, 43]) as readonly [number, number, number],
  }),
  lemon: Object.freeze({
    colorId: 'lemon',
    label: 'YELLOW',
    hex: '#FFD65A',
    rgb255: Object.freeze([255, 214, 90]) as readonly [number, number, number],
  }),
  lime: Object.freeze({
    colorId: 'lime',
    label: 'GREEN',
    hex: '#A7F43A',
    rgb255: Object.freeze([167, 244, 58]) as readonly [number, number, number],
  }),
  cyan: Object.freeze({
    colorId: 'cyan',
    label: 'CYAN',
    hex: '#2DE2E6',
    rgb255: Object.freeze([45, 226, 230]) as readonly [number, number, number],
  }),
  cobalt: Object.freeze({
    colorId: 'cobalt',
    label: 'BLUE',
    hex: '#3B82F6',
    rgb255: Object.freeze([59, 130, 246]) as readonly [number, number, number],
  }),
  violet: Object.freeze({
    colorId: 'violet',
    label: 'VIOLET',
    hex: '#8B5CF6',
    rgb255: Object.freeze([139, 92, 246]) as readonly [number, number, number],
  }),
  magenta: Object.freeze({
    colorId: 'magenta',
    label: 'MAGENTA',
    hex: '#F04DD8',
    rgb255: Object.freeze([240, 77, 216]) as readonly [number, number, number],
  }),
})

export function isStrokeColorId(value: unknown): value is StrokeColorId {
  return typeof value === 'string' &&
    (PAINTER_COLOR_IDS as readonly string[]).indexOf(value) !== -1
}

export function painterColorDefinition(
  colorId: StrokeColorId,
): PainterColorDefinition {
  return PAINTER_COLOR_DEFINITIONS[colorId]
}

export function painterColorHex(colorId: StrokeColorId): string {
  return PAINTER_COLOR_DEFINITIONS[colorId].hex
}

export function painterColorLabel(colorId: StrokeColorId): string {
  return PAINTER_COLOR_DEFINITIONS[colorId].label
}

export function painterColorNormalizedRgb(
  colorId: StrokeColorId,
): readonly [number, number, number] {
  const [red, green, blue] = PAINTER_COLOR_DEFINITIONS[colorId].rgb255
  return [red / 255, green / 255, blue / 255]
}
