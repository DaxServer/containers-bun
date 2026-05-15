import { decryptAccessToken, encryptAccessToken, generateEditGroupId } from '@backend/core/crypto'
import { describe, expect, it } from 'bun:test'

const TEST_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

describe('encryptAccessToken / decryptAccessToken', () => {
  it('round-trips an access token', () => {
    const original: [string, string] = ['test_key_123', 'test_secret_456']
    const ciphertext = encryptAccessToken(original, TEST_KEY)
    expect(typeof ciphertext).toBe('string')
    expect(ciphertext.length).toBeGreaterThan(0)

    const restored = decryptAccessToken(ciphertext, TEST_KEY)
    expect(restored).toEqual(original)
  })

  it('produces different ciphertext each call (random IV)', () => {
    const token: [string, string] = ['key', 'secret']
    const a = encryptAccessToken(token, TEST_KEY)
    const b = encryptAccessToken(token, TEST_KEY)
    expect(a).not.toBe(b)
  })

  it('throws on tampered ciphertext', () => {
    const token: [string, string] = ['k', 's']
    const ciphertext = encryptAccessToken(token, TEST_KEY)
    const tampered = `${ciphertext.slice(0, -4)}XXXX`
    expect(() => decryptAccessToken(tampered, TEST_KEY)).toThrow()
  })
})

describe('generateEditGroupId', () => {
  it('returns a 12-character hex string', () => {
    const id = generateEditGroupId()
    expect(id).toHaveLength(12)
    expect(/^[0-9a-fA-F]+$/.test(id)).toBe(true)
  })
})
