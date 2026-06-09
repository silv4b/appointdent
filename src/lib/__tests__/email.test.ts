import nodemailer from "nodemailer"

const mockSendMail = jest.fn()
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}))

import { sendWelcomeEmail } from "../email"

beforeEach(() => {
  mockSendMail.mockReset()
})

describe("sendWelcomeEmail", () => {
  const params = {
    to: "user@test.com",
    name: "João Silva",
    role: "dentist",
    password: "Temp@123",
    gmailUser: "admin@clinic.com",
    gmailAppPassword: "app-password",
  }

  it("creates transport with Gmail service", async () => {
    await sendWelcomeEmail(params)
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: { user: "admin@clinic.com", pass: "app-password" },
    })
  })

  it("sends email with correct to and subject", async () => {
    await sendWelcomeEmail(params)
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@test.com",
        subject: "Bem-vindo ao AppointDent",
      }),
    )
  })

  it("includes user name and password in HTML body", async () => {
    await sendWelcomeEmail(params)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.html).toContain("João Silva")
    expect(call.html).toContain("Temp@123")
  })

  it("uses correct role label for each role", async () => {
    const roles: Record<string, string> = {
      admin: "Administrador",
      dentist: "Dentista",
      receptionist: "Recepcionista",
    }
    for (const [role, label] of Object.entries(roles)) {
      await sendWelcomeEmail({ ...params, role })
      const call = mockSendMail.mock.calls[0][0]
      expect(call.html).toContain(label)
      mockSendMail.mockClear()
    }
  })

  it("falls back to raw role name for unknown role", async () => {
    await sendWelcomeEmail({ ...params, role: "superadmin" })
    const call = mockSendMail.mock.calls[0][0]
    expect(call.html).toContain("superadmin")
  })

  it("includes warning about temporary password", async () => {
    await sendWelcomeEmail(params)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.html).toContain("senha é temporária")
  })

  it("sets from address to clinic email", async () => {
    await sendWelcomeEmail(params)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.from).toContain("admin@clinic.com")
  })
})
