const fs = require('node:fs')
const path = require('node:path')
const PDFDocument = require('pdfkit')
const { numberToIndianWords } = require('../utils/amountWords')
const { getReceiptDirPath } = require('../store/db')

let QRCode = null
try {
  // Optional dependency. If unavailable, receipt still includes verification URL text.
  // eslint-disable-next-line global-require
  QRCode = require('qrcode')
} catch (_error) {}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0)
}

function formatDate(value) {
  const date = new Date(value)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

async function generateReceiptPdf({ transaction, familyName, mandirProfile, munimName, verificationUrl = '' }) {
  const fileName = `${transaction.id}.pdf`
  const absolutePath = path.join(getReceiptDirPath(), fileName)
  const amountInWords = numberToIndianWords(transaction.amount)
  const receiptNo = transaction.receiptNumber || transaction.id
  let qrImageBuffer = null

  if (QRCode && verificationUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
        margin: 1,
        width: 120,
      })
      const base64 = qrDataUrl.split(',')[1]
      qrImageBuffer = Buffer.from(base64, 'base64')
    } catch (_error) {
      qrImageBuffer = null
    }
  }

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 })
    const stream = fs.createWriteStream(absolutePath)
    stream.on('finish', resolve)
    stream.on('error', reject)
    doc.pipe(stream)

    doc.fontSize(18).font('Helvetica-Bold').text(mandirProfile.letterhead)
    doc.moveDown(0.2)
    doc.fontSize(11).font('Helvetica')
    doc.text(mandirProfile.address)
    doc.text(`PAN: ${mandirProfile.pan}   80G Regn: ${mandirProfile.reg80G}`)
    doc.text(`Trust Registration: ${mandirProfile.trustNumber}`)
    doc.moveDown(0.5)
    doc.strokeColor('#1e3a4e').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke()
    doc.moveDown(0.8)

    doc.fontSize(14).font('Helvetica-Bold').text('Donation Receipt (80G Compliant)')
    doc.moveDown(0.7)

    doc.font('Helvetica').fontSize(12)
    const lines = [
      `Receipt No: ${receiptNo}`,
      `Date: ${formatDate(transaction.createdAt)}`,
      `Received From: ${familyName || 'Unknown'}`,
      `Donation Type: ${transaction.type}`,
      `Fund Category: ${transaction.fundCategory}`,
      `Amount: ${formatCurrency(transaction.amount)}`,
      `Amount in Words: ${amountInWords}`,
      `Status: ${transaction.status}`,
      `Processed By (Munim): ${munimName}`,
    ]

    lines.forEach((line) => {
      doc.text(line, { lineGap: 6 })
    })

    if (verificationUrl) {
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#0f172a').text(`Verify Receipt: ${verificationUrl}`)
      doc.fillColor('#000000')
    }

    if (qrImageBuffer) {
      const qrTop = Math.max(doc.y + 8, 200)
      doc.image(qrImageBuffer, 430, qrTop, { fit: [120, 120] })
      doc.fontSize(9).text('QR Verification', 430, qrTop + 124, {
        width: 120,
        align: 'center',
      })
      doc.moveDown(0.3)
    }

    doc.moveDown(0.9)
    doc.lineWidth(0.5).moveTo(40, doc.y).lineTo(260, doc.y).stroke()
    doc.moveDown(0.2)
    doc.text(`Digital Signature: ${munimName}`)
    doc.moveDown(0.6)
    doc
      .fontSize(10)
      .text(
        'This receipt is system generated and valid under Section 80G subject to trust compliance records.',
      )

    doc.end()
  })

  return {
    receiptPath: `/receipts/${fileName}`,
    receiptFileName: fileName,
  }
}

module.exports = { generateReceiptPdf }
