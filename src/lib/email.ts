import nodemailer from "nodemailer"

export async function sendWelcomeEmail({
  to,
  name,
  role,
  password,
  gmailUser,
  gmailAppPassword,
}: {
  to: string
  name: string
  role: string
  password: string
  gmailUser: string
  gmailAppPassword: string
}) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailAppPassword },
  })

  const roleLabels: Record<string, string> = {
    admin: "Administrador",
    dentist: "Dentista",
    receptionist: "Recepcionista",
  }

  await transporter.sendMail({
    from: `"AppointDent" <${gmailUser}>`,
    to,
    subject: "Bem-vindo ao AppointDent",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #2563eb; margin-bottom: 16px;">Bem-vindo ao AppointDent!</h2>
        <p style="color: #374151;">Olá <strong>${name}</strong>,</p>
        <p style="color: #374151;">Sua conta foi criada como <strong>${roleLabels[role] || role}</strong>.</p>
        <p style="color: #374151;">Use as credenciais abaixo para acessar o sistema:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; color: #374151;"><strong>Email:</strong> ${to}</p>
          <p style="margin: 0; color: #374151;"><strong>Senha (temporária):</strong> ${password}</p>
        </div>
        <p style="color: #dc2626; font-size: 14px; font-weight: 600;">
          ⚠ Esta senha é temporária. Você será redirecionado para criar uma nova senha no primeiro acesso.
        </p>
      </div>
    `,
  })
}
