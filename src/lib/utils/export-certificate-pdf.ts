import { jsPDF } from "jspdf"
import { maskPhone, maskCnpj } from "@/lib/utils/masks"
import { wrap } from "@/lib/utils/pdf-helpers"

interface ClinicExportData {
  name: string
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  email: string
  phone1: string
  phone2: string
  cnpj: string
  logo: string | null
}

interface CertificateExportData {
  patientName: string
  dentistName: string
  dentistSpecialty: string | null
  dentistCro: string | null
  title: string
  createdAt: string
  content: string
  generalObservations: string
  clinic: ClinicExportData | null
}

interface HtmlSegment {
  text: string
  bold: boolean
}

function parseHtml(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = []

  const content = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[\/]?(strong|b)>/gi, "\x00bold\x00")

  const parts = content.split("\x00bold\x00")
  for (let i = 0; i < parts.length; i++) {
    const text = parts[i]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")

    if (!text) continue
    const isBold = i % 2 === 1
    segments.push({ text, bold: isBold })
  }

  return segments
}

export function generateCertificatePdf(data: CertificateExportData): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 22
  const maxWidth = pageWidth - margin * 2
  let y = margin

  const addDivider = (color?: [number, number, number]) => {
    y += 2
    doc.setDrawColor(color?.[0] ?? 210, color?.[1] ?? 210, color?.[2] ?? 210)
    doc.setLineWidth(0.6)
    doc.line(margin, y, pageWidth - margin, y)
    y += 5
  }

  const checkPage = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  // ── HEADER ──
  const receitaY = y

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(25, 60, 150)
  doc.text("ATESTADO", margin, y)
  y += 8

  // Clinic info
  if (data.clinic) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(50, 50, 50)
    doc.text(data.clinic.name, margin, y)
    y += 5

    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(90, 90, 90)
    const addrLine = `${data.clinic.street}, ${data.clinic.number} - ${data.clinic.neighborhood}, ${data.clinic.city} - ${data.clinic.state}`
    doc.text(addrLine, margin, y)
    y += 4

    const phones = [`Tel: ${maskPhone(data.clinic.phone1)}`]
    if (data.clinic.phone2) phones.push(maskPhone(data.clinic.phone2))
    const contactLine = phones.join(" / ")
    doc.text(contactLine, margin, y)
    y += 4

    const infoParts = [`E-mail: ${data.clinic.email}`]
    if (data.clinic.cnpj) infoParts.push(`CNPJ: ${maskCnpj(data.clinic.cnpj)}`)
    doc.text(infoParts.join(" | "), margin, y)
    y += 5
  }

  if (data.clinic?.logo) {
    try {
      const headerVisualTop = receitaY - 14
      const headerHeight = y - headerVisualTop
      const logoWidth = headerHeight
      doc.addImage(data.clinic.logo, "PNG", pageWidth - margin - logoWidth, headerVisualTop, logoWidth, headerHeight)
    } catch {
      // Silently ignore if image is invalid
    }
  }

  doc.setDrawColor(25, 60, 150)
  doc.setLineWidth(1)
  doc.line(margin, y, pageWidth - margin, y)
  y += 7

  // Dentist info
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.setTextColor(30, 30, 30)
  doc.text(data.dentistName, margin, y)
  y += 5

  const croSpecParts: string[] = []
  if (data.dentistSpecialty) croSpecParts.push(data.dentistSpecialty)
  if (data.dentistCro) croSpecParts.push(`CRO ${data.dentistCro}`)
  if (croSpecParts.length > 0) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(90, 90, 90)
    doc.text(croSpecParts.join(" | "), margin, y)
    y += 5
  }

  addDivider([200, 200, 200])

  // Patient info row
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)

  const patientLabelWidth = doc.getTextWidth("Paciente: ")
  doc.setFont("helvetica", "bold")
  doc.setTextColor(60, 60, 60)
  doc.text("Paciente:", margin, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(30, 30, 30)
  doc.text(data.patientName, margin + patientLabelWidth, y)

  const dateStr = new Date(data.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
  const dateLabelWidth = doc.getTextWidth("Data: ")
  doc.setFont("helvetica", "bold")
  doc.setTextColor(60, 60, 60)
  doc.text("Data:", pageWidth - margin - doc.getTextWidth(dateStr) - dateLabelWidth, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(30, 30, 30)
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), y)

  y += 8

  addDivider([200, 200, 200])

  // ── TITLE ──
  checkPage(10)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text(data.title, margin, y)
  y += 8

  // ── CONTENT ──
  checkPage(20)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)

  const segments = parseHtml(data.content)
  if (segments.length > 0) {
    type StyledWord = { text: string; bold: boolean }
    const paragraphs: StyledWord[][] = [[]]

    for (const seg of segments) {
      const parts = seg.text.split(/(\n+)/)
      for (const part of parts) {
        if (!part) continue
        if (/^\n+$/.test(part)) {
          for (let i = 0; i < part.length; i++) {
            paragraphs.push([])
          }
        } else {
          const words = part.split(/\s+/)
          for (const word of words) {
            if (!word) continue
            paragraphs[paragraphs.length - 1].push({ text: word, bold: seg.bold })
          }
        }
      }
    }

    for (const para of paragraphs) {
      if (para.length === 0) {
        checkPage(4)
        y += 4
        continue
      }

      type LineItem = { text: string; bold: boolean }
      const lines: LineItem[][] = []
      let currentLine: LineItem[] = []
      let lineWidth = 0

      for (const w of para) {
        doc.setFont("helvetica", w.bold ? "bold" : "normal")
        const wordWidth = doc.getTextWidth(w.text)
        const spaceWidth = currentLine.length > 0 ? doc.getTextWidth(" ") : 0

        if (lineWidth + spaceWidth + wordWidth > maxWidth && currentLine.length > 0) {
          lines.push(currentLine)
          currentLine = [w]
          lineWidth = wordWidth
        } else {
          currentLine.push(w)
          lineWidth += spaceWidth + wordWidth
        }
      }
      if (currentLine.length > 0) lines.push(currentLine)

      for (const line of lines) {
        checkPage(5)
        let cx = margin
        for (let i = 0; i < line.length; i++) {
          if (i > 0) cx += doc.getTextWidth(" ")
          doc.setFont("helvetica", line[i].bold ? "bold" : "normal")
          doc.text(line[i].text, cx, y)
          cx += doc.getTextWidth(line[i].text)
        }
        y += 4
      }
    }
  } else {
    const contentLines = wrap(data.content, maxWidth, doc)
    for (const line of contentLines) {
      checkPage(5)
      doc.text(line, margin, y)
      y += 5
    }
  }

  // ── GENERAL OBSERVATIONS ──
  if (data.generalObservations) {
    checkPage(20)
    addDivider([200, 200, 200])

    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text("Observações", margin, y)
    y += 5

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)

    const obsSegments = parseHtml(data.generalObservations)
    if (obsSegments.length > 0) {
      type StyledWord = { text: string; bold: boolean }
      const obsParagraphs: StyledWord[][] = [[]]

      for (const seg of obsSegments) {
        const parts = seg.text.split(/(\n+)/)
        for (const part of parts) {
          if (!part) continue
          if (/^\n+$/.test(part)) {
            for (let i = 0; i < part.length; i++) {
              obsParagraphs.push([])
            }
          } else {
            const words = part.split(/\s+/)
            for (const word of words) {
              if (!word) continue
              obsParagraphs[obsParagraphs.length - 1].push({ text: word, bold: seg.bold })
            }
          }
        }
      }

      for (const para of obsParagraphs) {
        if (para.length === 0) {
          checkPage(4)
          y += 4
          continue
        }

        type LineItem = { text: string; bold: boolean }
        const lines: LineItem[][] = []
        let currentLine: LineItem[] = []
        let lineWidth = 0

        for (const w of para) {
          doc.setFont("helvetica", w.bold ? "bold" : "normal")
          const wordWidth = doc.getTextWidth(w.text)
          const spaceWidth = currentLine.length > 0 ? doc.getTextWidth(" ") : 0

          if (lineWidth + spaceWidth + wordWidth > maxWidth && currentLine.length > 0) {
            lines.push(currentLine)
            currentLine = [w]
            lineWidth = wordWidth
          } else {
            currentLine.push(w)
            lineWidth += spaceWidth + wordWidth
          }
        }
        if (currentLine.length > 0) lines.push(currentLine)

        for (const line of lines) {
          checkPage(5)
          let cx = margin
          for (let i = 0; i < line.length; i++) {
            if (i > 0) cx += doc.getTextWidth(" ")
            doc.setFont("helvetica", line[i].bold ? "bold" : "normal")
            doc.text(line[i].text, cx, y)
            cx += doc.getTextWidth(line[i].text)
          }
          y += 4
        }
      }
    } else {
      const obsLines = wrap(data.generalObservations, maxWidth, doc)
      for (const line of obsLines) {
        checkPage(5)
        doc.text(line, margin, y)
        y += 5
      }
    }
  }

  // ── SIGNATURE ──
  checkPage(50)
  y += 18
  addDivider([180, 180, 180])

  const sigLineLen = 100
  const sigX = (pageWidth - sigLineLen) / 2
  const sigLineY = y + 14
  doc.setDrawColor(60, 60, 60)
  doc.setLineWidth(0.8)
  doc.line(sigX, sigLineY, sigX + sigLineLen, sigLineY)
  y = sigLineY + 5

  const nameWidth = doc.getTextWidth(data.dentistName)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text(data.dentistName, (pageWidth - nameWidth) / 2, y)

  const footerY = doc.internal.pageSize.getHeight() - margin
  if (y + 8 > footerY) {
    doc.addPage()
    y = margin
  }

  // ── FOOTER ──
  doc.setFontSize(7)
  doc.setTextColor(170, 170, 170)
  doc.text(
    "Documento gerado por AppointDent",
    margin,
    doc.internal.pageSize.getHeight() - margin,
  )

  const safeTitle = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  const safePatient = data.patientName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  doc.setProperties({ title: `atestado-${safePatient}-${safeTitle}` })

  return doc
}
