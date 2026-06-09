import { ok, err } from "../utils/action-response"

describe("ok", () => {
  it("returns data when called with value", () => {
    const r = ok({ id: "123" })
    expect(r).toEqual({ data: { id: "123" } })
  })
  it("returns data when called with null", () => {
    const r = ok(null)
    expect(r).toEqual({ data: null })
  })
  it("returns empty object when called without args", () => {
    const r = ok()
    expect(r).toEqual({})
  })
  it("does not have error property", () => {
    const r = ok("value")
    expect((r as any).error).toBeUndefined()
  })
})

describe("err", () => {
  it("returns error object", () => {
    const r = err("Algo deu errado")
    expect(r).toEqual({ error: "Algo deu errado" })
  })
  it("does not have data property", () => {
    const r = err("erro")
    expect((r as any).data).toBeUndefined()
  })
})
