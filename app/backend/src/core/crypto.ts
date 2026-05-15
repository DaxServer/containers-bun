import { config } from '@backend/config'
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

function fernetEncrypt(key: Buffer, plaintext: string): string {
  const signingKey = key.subarray(0, 16)
  const encKey = key.subarray(16, 32)

  const iv = randomBytes(16)
  const ts = Buffer.allocUnsafe(8)
  ts.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000)))

  const cipher = createCipheriv('aes-128-cbc', encKey, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

  const prefix = Buffer.concat([Buffer.from([0x80]), ts, iv, ct])
  const hmac = createHmac('sha256', signingKey).update(prefix).digest()

  return Buffer.concat([prefix, hmac]).toString('base64url')
}

function fernetDecrypt(key: Buffer, token: string): string {
  const signingKey = key.subarray(0, 16)
  const encKey = key.subarray(16, 32)

  const data = Buffer.from(token, 'base64url')
  if (data.length < 73 || data[0] !== 0x80) throw new Error('Invalid token')

  const iv = data.subarray(9, 25)
  const ct = data.subarray(25, -32)
  const hmac = data.subarray(-32)

  const expected = createHmac('sha256', signingKey).update(data.subarray(0, -32)).digest()
  if (!timingSafeEqual(hmac, expected)) throw new Error('Invalid token signature')

  const decipher = createDecipheriv('aes-128-cbc', encKey, iv)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

export function encryptAccessToken(token: [string, string], keyOverride?: string): string {
  const key = Buffer.from(keyOverride ?? config.tokenEncryptionKey, 'base64url')
  if (key.length !== 32) throw new Error('Invalid encryption key length (expected 32 bytes)')
  return fernetEncrypt(key, JSON.stringify(token))
}

export function decryptAccessToken(ciphertext: string, keyOverride?: string): [string, string] {
  const key = Buffer.from(keyOverride ?? config.tokenEncryptionKey, 'base64url')
  if (key.length !== 32) throw new Error('Invalid encryption key length (expected 32 bytes)')
  return JSON.parse(fernetDecrypt(key, ciphertext)) as [string, string]
}

export function generateEditGroupId(): string {
  return randomBytes(6).toString('hex')
}
