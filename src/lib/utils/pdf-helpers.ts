import type { jsPDF } from "jspdf"

export function wrap(text: string, maxWidth: number, doc: jsPDF): string[] {
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
