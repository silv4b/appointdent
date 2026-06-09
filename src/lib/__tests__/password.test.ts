import { generatePassword } from "../utils/password"

describe("generatePassword", () => {
  it("generates a password with the exact default length of 12", () => {
    const pw = generatePassword()
    expect(pw).toHaveLength(12)
  })

  it("generates a password with the given length", () => {
    const pw = generatePassword(20)
    expect(pw).toHaveLength(20)
  })

  it("generates a password with length 8", () => {
    const pw = generatePassword(8)
    expect(pw).toHaveLength(8)
  })

  it("contains at least one uppercase letter", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword()
      expect(pw).toMatch(/[A-Z]/)
    }
  })

  it("contains at least one lowercase letter", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword()
      expect(pw).toMatch(/[a-z]/)
    }
  })

  it("contains at least one digit", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword()
      expect(pw).toMatch(/[0-9]/)
    }
  })

  it("contains at least one special character", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword()
      expect(pw).toMatch(/[!@#$%^&*()]/)
    }
  })

  it("contains only allowed characters", () => {
    const allowed = /^[A-Za-z0-9!@#$%^&*()]+$/
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword()
      expect(pw).toMatch(allowed)
    }
  })

  it("generates different passwords on subsequent calls", () => {
    const seen = new Set<string>()
    for (let i = 0; i < 20; i++) {
      seen.add(generatePassword())
    }
    expect(seen.size).toBeGreaterThan(15)
  })
})
