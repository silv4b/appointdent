import { jsPDF } from "jspdf"
import { maskPhone, maskCnpj } from "@/lib/utils/masks"
import { wrap } from "@/lib/utils/pdf-helpers"

interface MedicationExport {
  medicamento: string
  dosagem: string
  observacao: string
}

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

interface PrescriptionExportData {
  patientName: string
  dentistName: string
  dentistSpecialty: string | null
  dentistCro: string | null
  title: string
  createdAt: string
  medications: MedicationExport[]
  generalObservations: string
  clinic: ClinicExportData | null
}

interface HtmlSegment {
  text: string
  bold: boolean
}

function parseHtml(html: string): HtmlSegment[] {
  const segments: HtmlSegment[] = []

  // Normalize line breaks
  const content = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[\/]?(strong|b)>/gi, "\x00bold\x00")

  // Split by bold markers
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

    // Bold segments are at odd indices (between <strong> and </strong>)
    const isBold = i % 2 === 1
    segments.push({ text, bold: isBold })
  }

  return segments
}

export function generatePrescriptionPdf(data: PrescriptionExportData): jsPDF {
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
  const headerTextX = margin
  const headerRightEdge = pageWidth - margin
  const receitaY = y

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(25, 60, 150)
  doc.text("RECEITUÁRIO", headerTextX, y)
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

  // Logo on the right — sized to match the header block height
  if (data.clinic?.logo) {
    try {
      const receituarioCap = 20 * 0.7
      const headerVisualTop = receitaY - receituarioCap
      const logoHeight = y - headerVisualTop
      const logoWidth = logoHeight
      doc.addImage(data.clinic.logo, "PNG", headerRightEdge - logoWidth, headerVisualTop, logoWidth, logoHeight)
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

  // ── MEDICATIONS ──
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.text("Rp.", margin, y)
  y += 7

  for (const med of data.medications) {
    checkPage(20)

    const bullet = `\u2022  `
    const medName = med.medicamento
    const dosageText = med.dosagem ? med.dosagem : ""
    const lineStart = margin
    const rightEdge = pageWidth - margin

    // Measure medication name (bold 10)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    const bulletWidth = doc.getTextWidth(bullet)
    const medWidth = doc.getTextWidth(medName)

    // Measure dosage (italic 9 — same as rendering)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(9)
    const dosageWidth = dosageText ? doc.getTextWidth(` ${dosageText}`) : 0

    // Measure dot character (normal 8 — same as rendering)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    const dotWidth = doc.getTextWidth(".")

    const afterMedEndX = lineStart + bulletWidth + medWidth
    const gapEndX = rightEdge - dosageWidth
    const gapWidth = gapEndX - afterMedEndX

    if (dosageText && gapWidth >= dotWidth * 5) {
      const dotCount = Math.floor(gapWidth / dotWidth)
      const dots = ".".repeat(dotCount)
      const dotsEndX = afterMedEndX + dotCount * dotWidth

      // Bullet + medication (bold 10)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      doc.text(bullet, lineStart, y)
      doc.text(medName, lineStart + bulletWidth, y)

      // Dots (normal 8)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(180, 180, 180)
      doc.text(dots, afterMedEndX, y)

      // Dosage (italic 9) — colado nos dots
      doc.setFont("helvetica", "italic")
      doc.setFontSize(9)
      doc.setTextColor(70, 70, 70)
      doc.text(` ${dosageText}`, dotsEndX, y)
    } else {
      // Full line for medication name
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      doc.text(`${bullet}${medName}`, lineStart, y)
      y += 5

      if (dosageText) {
        doc.setFont("helvetica", "italic")
        doc.setFontSize(9)
        doc.setTextColor(70, 70, 70)
        const dosageLines = wrap(dosageText, maxWidth - bulletWidth, doc)
        for (const line of dosageLines) {
          checkPage(5)
          doc.text(line, lineStart + bulletWidth, y)
          y += 4
        }
      }
    }

    y += 5

    // Observation
    if (med.observacao) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      doc.setTextColor(130, 130, 130)
      const obsLines = wrap(med.observacao, maxWidth - bulletWidth, doc)
      for (const line of obsLines) {
        checkPage(5)
        doc.text(line, lineStart + bulletWidth, y)
        y += 5
      }
    }

    y += 5
  }

  // ── GENERAL OBSERVATIONS ──
  if (data.generalObservations) {
    const segments = parseHtml(data.generalObservations)
    if (segments.length > 0) {
      checkPage(20)
      addDivider([200, 200, 200])

      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.text("Observa\u00E7\u00F5es", margin, y)
      y += 5

      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)

      // Flatten segments into paragraphs separated by newlines
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
              const p = paragraphs[paragraphs.length - 1]
              p.push({ text: word, bold: seg.bold })
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

        // Word-wrap into lines
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
        if (currentLine.length > 0) {
          lines.push(currentLine)
        }

        // Render
        for (const line of lines) {
          checkPage(5)
          let cx = margin
          for (let i = 0; i < line.length; i++) {
            if (i > 0) {
              cx += doc.getTextWidth(" ")
            }
            doc.setFont("helvetica", line[i].bold ? "bold" : "normal")
            doc.text(line[i].text, cx, y)
            cx += doc.getTextWidth(line[i].text)
          }
          y += 4
        }
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

  // Ensure footer doesn't overlap
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

  doc.setProperties({ title: `receita-${safePatient}-${safeTitle}` })

  return doc
}
