import { jsPDF } from "jspdf"

interface ExportField {
  label: string
  content: string
}

interface ExportData {
  patientName: string
  patientPhone: string | null
  dentistName: string
  sessionTitle: string
  createdAt: string
  fields: ExportField[]
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function wrap(text: string, maxWidth: number, doc: jsPDF): string[] {
  const lines: string[] = []
  const words = text.split(" ")
  let line = ""
  for (const word of words) {
    const test = line ? line + " " + word : word
    if (doc.getTextWidth(test) > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

export function generateAnamnesePdf(data: ExportData): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const titleFontSize = 16
  const subtitleFontSize = 10
  const bodyFontSize = 9
  const labelFontSize = 8
  function addText(
    text: string,
    fontSize: number,
    options?: { bold?: boolean; color?: [number, number, number] },
  ) {
    doc.setFontSize(fontSize)
    doc.setFont("helvetica", options?.bold ? "bold" : "normal")
    if (options?.color) {
      doc.setTextColor(options.color[0], options.color[1], options.color[2])
    } else {
      doc.setTextColor(0)
    }
    const lines = wrap(text, maxWidth, doc)
    for (const line of lines) {
      if (y + fontSize > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += fontSize * 0.35 + 1
    }
  }

  function addDivider() {
    if (y + 3 > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
    y += 2
    doc.setDrawColor(200)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 4
  }

  function addFieldContent(content: string) {
    const lines = stripHtml(content).split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) {
        y += 2
        continue
      }
      const wrapped = wrap(trimmed, maxWidth, doc)
      for (const w of wrapped) {
        if (y + bodyFontSize > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage()
          y = margin
        }
        doc.text(w, margin, y)
        y += bodyFontSize * 0.35 + 1
      }
    }
  }

  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  doc.setTextColor(30, 64, 175)
  doc.text("Anamnese", margin, y)
  y += 8

  addDivider()

  addText(`Paciente: ${data.patientName}`, titleFontSize, { bold: true })
  if (data.patientPhone) {
    addText(`Telefone: ${data.patientPhone}`, subtitleFontSize, {
      color: [100, 100, 100],
    })
  }
  addText(`Dentista: ${data.dentistName}`, subtitleFontSize, {
    color: [100, 100, 100],
  })
  addText(
    `Data: ${new Date(data.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`,
    subtitleFontSize,
    { color: [100, 100, 100] },
  )

  addDivider()

  addText(data.sessionTitle, 13, { bold: true })
  y += 3

  addDivider()

  if (data.fields.length === 0) {
    addText("Nenhum campo preenchido.", bodyFontSize, {
      color: [150, 150, 150],
    })
  } else {
    for (const field of data.fields) {
      if (y + 10 > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(labelFontSize)
      doc.setTextColor(100)
      doc.text(field.label.toUpperCase(), margin, y)
      y += labelFontSize * 0.35 + 2

      doc.setFont("helvetica", "normal")
      doc.setFontSize(bodyFontSize)
      doc.setTextColor(50)
      addFieldContent(field.content)

      y += 4
    }
  }

  addDivider()

  doc.setFontSize(7)
  doc.setTextColor(180)
  doc.text(
    "Documento gerado por AppointDent",
    margin,
    doc.internal.pageSize.getHeight() - margin,
  )

  const safeTitle = data.sessionTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  const safePatient = data.patientName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  doc.save(`anamnese-${safePatient}-${safeTitle}.pdf`)
}
