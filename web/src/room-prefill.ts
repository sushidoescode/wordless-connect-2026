import { isValidRoomCode, normalizeRoomCode } from '@wordless/core/RoomCode'

/**
 * Computes the initial join-form value. Precedence: exactly one valid
 * normalized `?room=` query value, else one valid optional development
 * fallback, else blank. Malformed or duplicate query values are ignored and
 * never reflected into the page; a prefill never joins on its own.
 */
export function resolveRoomPrefill(
  search: string,
  envFallback: string | undefined,
): string {
  const roomValues = new URLSearchParams(search).getAll('room')
  if (roomValues.length === 1) {
    const normalized = normalizeRoomCode(roomValues[0])
    if (isValidRoomCode(normalized)) return normalized
  }
  if (typeof envFallback === 'string') {
    const normalized = normalizeRoomCode(envFallback)
    if (isValidRoomCode(normalized)) return normalized
  }
  return ''
}
