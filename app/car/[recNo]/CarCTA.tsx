'use client'

import { useState } from 'react'
import FormModal from '@/app/components/FormModal'

const WHATSAPP_NUMBER = '97299561906'
const PHONE_NUMBER = '099561906'

export default function CarCTA({ carName, recNo }: { carName: string; recNo: string }) {
  const [showModal, setShowModal] = useState(false)
  const utmSource = carName
  const utmCampaign = `https://bavarian-motors.co.il/He/Car?recNo=${recNo}`

  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        padding: '8px 0 0',
      }}>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '9px 6px',
            background: 'rgba(37,211,102,0.14)',
            border: '1px solid rgba(37,211,102,0.35)',
            borderRadius: 12, textDecoration: 'none',
            color: '#25D366', cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="currentColor" />
            <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.979-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: 500 }}>WhatsApp</span>
        </a>

        <a
          href={`tel:+972${PHONE_NUMBER}`}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '9px 6px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 12, textDecoration: 'none',
            color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: 500 }}>שיחה</span>
        </a>

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 4, padding: '9px 6px',
            background: 'rgba(200,169,110,0.14)',
            border: '1px solid rgba(200,169,110,0.35)',
            borderRadius: 12,
            color: 'rgba(200,169,110,0.9)', cursor: 'pointer',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontFamily: 'var(--font-inter)', fontSize: 10, fontWeight: 500 }}>השאר פרטים</span>
        </button>
      </div>

      {showModal && (
        <FormModal
          onClose={() => setShowModal(false)}
          utmSource={utmSource}
          utmCampaign={utmCampaign}
        />
      )}
    </>
  )
}
