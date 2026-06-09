import { encrypt, decrypt } from "../crypto"

const ORIGINAL_KEY = process.env.APP_CONFIG_ENCRYPTION_KEY

beforeAll(() => {
  process.env.APP_CONFIG_ENCRYPTION_KEY = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"
})

afterAll(() => {
  process.env.APP_CONFIG_ENCRYPTION_KEY = ORIGINAL_KEY
})

describe("encrypt / decrypt", () => {
  it("decrypt(encrypt(x)) returns x", () => {
    const payload = encrypt("minha-senha-super-secreta")
    const plain = decrypt(payload)
    expect(plain).toBe("minha-senha-super-secreta")
  })

  it("produces different IV on each call for same plaintext", () => {
    const a = encrypt("same")
    const b = encrypt("same")
    expect(a.iv).not.toBe(b.iv)
  })

  it("produces different ciphertext on each call with same plaintext", () => {
    const a = encrypt("same")
    const b = encrypt("same")
    expect(a.encrypted).not.toBe(b.encrypted)
  })

  it("throws on tampered encrypted payload", () => {
    const payload = encrypt("confidencial")
    const tampered = { ...payload, encrypted: "00" + payload.encrypted.slice(2) }
    expect(() => decrypt(tampered)).toThrow()
  })

  it("throws on tampered IV", () => {
    const payload = encrypt("confidencial")
    const tampered = { ...payload, iv: "00" + payload.iv.slice(2) }
    expect(() => decrypt(tampered)).toThrow()
  })

  it("throws on tampered auth tag", () => {
    const payload = encrypt("confidencial")
    const tampered = { ...payload, tag: "00" + payload.tag.slice(2) }
    expect(() => decrypt(tampered)).toThrow()
  })

  it("encrypts and decrypts empty string", () => {
    const payload = encrypt("")
    const plain = decrypt(payload)
    expect(plain).toBe("")
  })

  it("encrypts and decrypts unicode characters", () => {
    const original = "senhaç•€®†™日本語"
    const payload = encrypt(original)
    const plain = decrypt(payload)
    expect(plain).toBe(original)
  })

  it("encrypts and decrypts long string (5000 chars)", () => {
    const original = "a".repeat(5000)
    const payload = encrypt(original)
    const plain = decrypt(payload)
    expect(plain).toBe(original)
  })

  it("throws when APP_CONFIG_ENCRYPTION_KEY is not set", () => {
    delete process.env.APP_CONFIG_ENCRYPTION_KEY
    expect(() => encrypt("x")).toThrow("APP_CONFIG_ENCRYPTION_KEY is not set")
  })

  it("throws when key has wrong length", () => {
    process.env.APP_CONFIG_ENCRYPTION_KEY = "tooshort"
    expect(() => encrypt("x")).toThrow("must be 64 hex characters")
  })
})
