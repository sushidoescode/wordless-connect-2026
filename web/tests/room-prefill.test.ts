import { describe, expect, it } from 'vitest'

import { resolveRoomPrefill } from '../src/room-prefill'

describe('resolveRoomPrefill', () => {
  it('uses exactly one valid room query value, normalized', () => {
    expect(resolveRoomPrefill('?room=abc123', undefined)).toBe('ABC123')
    expect(resolveRoomPrefill('?room=WAVE42', undefined)).toBe('WAVE42')
    expect(resolveRoomPrefill('?room=%20wave42%20', undefined)).toBe('WAVE42')
  })

  it('ignores malformed query values without reflecting them', () => {
    expect(resolveRoomPrefill('?room=abc12', undefined)).toBe('')
    expect(resolveRoomPrefill('?room=abc1234', undefined)).toBe('')
    expect(resolveRoomPrefill('?room=ab%21123', undefined)).toBe('')
    expect(resolveRoomPrefill('?room=', undefined)).toBe('')
  })

  it('ignores duplicate room parameters even when one is valid', () => {
    expect(resolveRoomPrefill('?room=ABC123&room=XYZ789', undefined)).toBe('')
    expect(resolveRoomPrefill('?room=ABC123&room=bad', undefined)).toBe('')
  })

  it('prefers a valid query over the environment fallback', () => {
    expect(resolveRoomPrefill('?room=abc123', 'WAVE42')).toBe('ABC123')
  })

  it('falls back to a valid normalized environment value', () => {
    expect(resolveRoomPrefill('', 'wave42')).toBe('WAVE42')
    expect(resolveRoomPrefill('?other=1', ' wave42 ')).toBe('WAVE42')
    expect(resolveRoomPrefill('?room=bad', 'WAVE42')).toBe('WAVE42')
  })

  it('returns blank when neither source is valid', () => {
    expect(resolveRoomPrefill('', undefined)).toBe('')
    expect(resolveRoomPrefill('', 'not-a-code')).toBe('')
    expect(resolveRoomPrefill('?room=bad', '')).toBe('')
  })
})
