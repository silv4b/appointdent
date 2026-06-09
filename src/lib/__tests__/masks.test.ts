import { maskPhone, maskCnpj } from "../utils/masks"

describe("maskPhone", () => {
  it("returns empty for empty input", () => {
    expect(maskPhone("")).toBe("(")
  })
  it("formats just DDD (2 digits)", () => {
    expect(maskPhone("11")).toBe("(11")
  })
  it("formats DDD + partial number (7 digits)", () => {
    expect(maskPhone("1199999")).toBe("(11) 99999")
  })
  it("formats complete 10-digit fixed line", () => {
    expect(maskPhone("1199999999")).toBe("(11) 99999-999")
  })
  it("formats complete 11-digit mobile", () => {
    expect(maskPhone("11999999999")).toBe("(11) 99999-9999")
  })
  it("truncates beyond 11 digits", () => {
    expect(maskPhone("11999999999123")).toBe("(11) 99999-9999")
  })
  it("strips non-digit characters", () => {
    expect(maskPhone("(11) 99999-9999")).toBe("(11) 99999-9999")
  })
  it("handles raw 11-digit input without formatting", () => {
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321")
  })
  it("returns partial for 3 digits", () => {
    expect(maskPhone("119")).toBe("(11) 9")
  })
})

describe("maskCnpj", () => {
  it("returns empty for empty input", () => {
    expect(maskCnpj("")).toBe("")
  })
  it("returns up to 2 digits as-is", () => {
    expect(maskCnpj("12")).toBe("12")
  })
  it("formats up to 5 digits", () => {
    expect(maskCnpj("12345")).toBe("12.345")
  })
  it("formats up to 8 digits", () => {
    expect(maskCnpj("12345678")).toBe("12.345.678")
  })
  it("formats up to 12 digits", () => {
    expect(maskCnpj("123456789012")).toBe("12.345.678/9012")
  })
  it("formats complete 14-digit CNPJ", () => {
    expect(maskCnpj("12345678901234")).toBe("12.345.678/9012-34")
  })
  it("truncates beyond 14 digits", () => {
    expect(maskCnpj("1234567890123456")).toBe("12.345.678/9012-34")
  })
  it("strips non-digit characters", () => {
    expect(maskCnpj("12.345.678/9012-34")).toBe("12.345.678/9012-34")
  })
  it("formats 6 digits", () => {
    expect(maskCnpj("123456")).toBe("12.345.6")
  })
  it("formats 10 digits", () => {
    expect(maskCnpj("1234567890")).toBe("12.345.678/90")
  })
})
