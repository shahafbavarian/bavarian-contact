'use client'

export default function CarScrollEnable() {
  return (
    <style>{`
      html, body {
        overflow: auto !important;
        position: static !important;
        height: auto !important;
        touch-action: auto !important;
        overscroll-behavior: auto !important;
      }
    `}</style>
  )
}
