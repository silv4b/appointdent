import { formatToBRL } from "../utils/format"

describe("formatToBRL", () => {
  it("formats zero", () => {
    expect(formatToBRL(0)).toBe("R$ 0,00")
  })
  it("formats integer", () => {
    expect(formatToBRL(150)).toBe("R$ 150,00")
  })
  it("formats with cents", () => {
    expect(formatToBRL(150.5)).toBe("R$ 150,50")
  })
  it("formats with 3 decimal places rounding down", () => {
    expect(formatToBRL(1.999)).toBe("R$ 2,00")
  })
  it("formats large value with thousands separator", () => {
    expect(formatToBRL(1234567.89)).toBe("R$ 1.234.567,89")
  })
  it("formats 1 real", () => {
    expect(formatToBRL(1)).toBe("R$ 1,00")
  })
  it("formats 10 centavos", () => {
    expect(formatToBRL(0.1)).toBe("R$ 0,10")
  })
  it("formats 1 centavo", () => {
    expect(formatToBRL(0.01)).toBe("R$ 0,01")
  })
  it("formats 1 milhao", () => {
    expect(formatToBRL(1000000)).toBe("R$ 1.000.000,00")
  })
  it("handles negative value", () => {
    expect(formatToBRL(-50)).toBe("-R$ 50,00")
  })
})
