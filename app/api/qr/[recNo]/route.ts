import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'

const QR_SIZE = 400
const LOGO_RATIO = 0.30

export async function GET(
  _req: NextRequest,
  { params }: { params: { recNo: string } }
) {
  const { recNo } = params
  if (!/^\d{1,8}$/.test(recNo)) {
    return NextResponse.json({ error: 'invalid recNo' }, { status: 400 })
  }
  const url = `https://contact.bavarian-motors.co.il/car/${recNo}`

  try {
    // Generate QR as PNG buffer
    const qrBuffer = await QRCode.toBuffer(url, {
      errorCorrectionLevel: 'H',
      width: QR_SIZE,
      margin: 2,
      color: {
        dark: '#000000',   // black
        light: '#ffffff',  // white background
      },
    })

    // Load logo
    const logoPath = path.join(process.cwd(), 'public', 'LOGO-black.png')
    let finalBuffer: Buffer

    if (fs.existsSync(logoPath)) {
      const logoSize = Math.round(QR_SIZE * LOGO_RATIO)
      const logoBg = Math.round(logoSize * 1.18)

      // White square behind logo for readability
      const bgSquare = await sharp({
        create: { width: logoBg, height: logoBg, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
      }).png().toBuffer()

      const logoResized = await sharp(logoPath)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer()

      finalBuffer = await sharp(qrBuffer)
        .composite([
          { input: bgSquare, gravity: 'center' },
          { input: logoResized, gravity: 'center' },
        ])
        .png()
        .toBuffer()
    } else {
      finalBuffer = qrBuffer
    }

    return new NextResponse(new Uint8Array(finalBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    console.error('[/api/qr]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
