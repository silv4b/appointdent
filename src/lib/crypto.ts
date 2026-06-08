import crypto from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.APP_CONFIG_ENCRYPTION_KEY
  if (!hex) throw new Error("APP_CONFIG_ENCRYPTION_KEY is not set")
  return Buffer.from(hex, "hex")
}

export interface EncryptedPayload {
  iv: string
  encrypted: string
  tag: string
}

export function encrypt(plaintext: string): EncryptedPayload {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")
  const tag = cipher.getAuthTag().toString("hex")

  return { iv: iv.toString("hex"), encrypted, tag }
}

export function decrypt(payload: EncryptedPayload): string {
  const key = getKey()
  const iv = Buffer.from(payload.iv, "hex")
  const tag = Buffer.from(payload.tag, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let plaintext = decipher.update(payload.encrypted, "hex", "utf8")
  plaintext += decipher.final("utf8")

  return plaintext
}
