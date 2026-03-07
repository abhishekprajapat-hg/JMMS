import jsPDF from 'jspdf'
import { numberToIndianWords } from './amountWords'
import { formatCurrency, formatDate } from './validation'

export function createReceiptPdf({
  transaction,
  familyName,
  mandirProfile,
  munimName,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const amountInWords = numberToIndianWords(transaction.amount)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(mandirProfile.letterhead, 40, 50)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(mandirProfile.address, 40, 68)
  doc.text(`PAN: ${mandirProfile.pan}   80G Regn: ${mandirProfile.reg80G}`, 40, 84)
  doc.text(`Trust Registration: ${mandirProfile.trustNumber}`, 40, 100)

  doc.setDrawColor(30, 58, 78)
  doc.setLineWidth(1)
  doc.line(40, 112, 555, 112)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('Donation Receipt (80G Compliant)', 40, 138)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  const donorLabel = transaction.type === 'Gupt Daan' ? 'Anonymous (Gupt Daan)' : familyName || 'Unknown'

  const lines = [
    `Receipt No: ${transaction.id}`,
    `Date: ${formatDate(transaction.createdAt)}`,
    `Received From: ${donorLabel}`,
    `Donation Type: ${transaction.type}`,
    `Fund Category: ${transaction.fundCategory}`,
    `Amount: ${formatCurrency(transaction.amount)}`,
    `Amount in Words: ${amountInWords}`,
    `Status: ${transaction.status}`,
    `Processed By (Munim): ${munimName}`,
  ]

  let y = 168
  lines.forEach((line) => {
    doc.text(line, 40, y)
    y += 24
  })

  doc.setLineWidth(0.5)
  doc.line(40, y + 14, 250, y + 14)
  doc.text(`Digital Signature: ${munimName}`, 40, y + 32)

  doc.setFontSize(10)
  doc.text(
    'This receipt is system generated and valid under Section 80G subject to trust compliance records.',
    40,
    y + 66,
  )

  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  const fileName = `${transaction.id}.pdf`

  return { url, fileName }
}

