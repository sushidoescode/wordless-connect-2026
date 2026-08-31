/**
 * Room-code coordination helper. Generated codes use an unambiguous
 * 32-character alphabet (no I, O, 0, 1) so a code read aloud or from the HUD
 * survives retyping; validation deliberately keeps the wider six-character
 * [A-Z0-9] public contract so manually supplied legacy codes stay parseable.
 * A room code is probabilistic coordination and light concealment — never
 * authentication, privacy, or a security boundary.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' as const
export const ROOM_CODE_LENGTH = 6

const PUBLIC_ROOM_CODE_PATTERN = /^[A-Z0-9]{6}$/

export function generateRoomCode(
  randomSource: () => number = Math.random,
): string {
  let code = ''
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const randomValue = randomSource()
    if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue >= 1) {
      throw new Error('room code random source must return [0, 1)')
    }
    code += ROOM_CODE_ALPHABET[
      Math.floor(randomValue * ROOM_CODE_ALPHABET.length)
    ]
  }
  return code
}

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase()
}

export function isValidRoomCode(value: unknown): value is string {
  return typeof value === 'string' && PUBLIC_ROOM_CODE_PATTERN.test(value)
}
