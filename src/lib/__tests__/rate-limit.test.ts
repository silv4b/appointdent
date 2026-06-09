import { checkEmailRateLimit } from "../utils/rate-limit"

jest.mock("../supabase/server", () => ({
  createClient: jest.fn(),
}))

const mockRpc = jest.fn()

jest.mock("../supabase/server", () => ({
  createClient: jest.fn(() => ({
    rpc: mockRpc,
  })),
}))

beforeEach(() => {
  mockRpc.mockReset()
})

describe("checkEmailRateLimit", () => {
  it("returns true when RPC reports rate not exceeded", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    const result = await checkEmailRateLimit("test@example.com", "login")
    expect(result).toBe(true)
  })

  it("returns false when RPC reports rate exceeded", async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })
    const result = await checkEmailRateLimit("test@example.com", "login")
    expect(result).toBe(false)
  })

  it("returns true (fail open) when RPC returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "RPC error" } })
    const result = await checkEmailRateLimit("test@example.com", "login")
    expect(result).toBe(true)
  })

  it("calls RPC with correct arguments", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    await checkEmailRateLimit("user@test.com", "password_change", 3, 10)
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit_by_email", {
      p_email: "user@test.com",
      p_action: "password_change",
      p_max_attempts: 3,
      p_window_minutes: 10,
    })
  })

  it("uses default maxAttempts (5) and windowMinutes (15) when not provided", async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    await checkEmailRateLimit("user@test.com", "login")
    expect(mockRpc).toHaveBeenCalledWith("check_rate_limit_by_email", {
      p_email: "user@test.com",
      p_action: "login",
      p_max_attempts: 5,
      p_window_minutes: 15,
    })
  })
})
