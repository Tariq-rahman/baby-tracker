import { describe, it, expect } from 'vitest'
import { urlBase64ToUint8Array } from './push'

describe('urlBase64ToUint8Array', () => {
  it.each([
    // base64url, expected bytes
    ['', []],
    ['AAAA', [0, 0, 0]], // 4 chars, no padding needed -> 3 bytes
    ['_w', [255]], // "_w==" -> 0xFF; base64url '_' maps to '/'
    ['-_8', [251, 255]], // '-' -> '+', '_' -> '/'; padded to "-_8=" -> 0xFB 0xFF
  ])('decodes %j to the right bytes', (input, expected) => {
    expect(Array.from(urlBase64ToUint8Array(input))).toEqual(expected)
  })

  it('returns a Uint8Array of the decoded length', () => {
    const result = urlBase64ToUint8Array('AAAA')
    expect(result).toBeInstanceOf(Uint8Array)
    expect(result).toHaveLength(3)
  })

  it('round-trips a realistic 65-byte VAPID key length', () => {
    // A P-256 public key is 65 bytes; its base64url is 87 chars (no padding).
    const bytes = Array.from({ length: 65 }, (_, i) => i % 256)
    const b64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(Array.from(urlBase64ToUint8Array(b64))).toEqual(bytes)
  })
})
