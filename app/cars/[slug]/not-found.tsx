import Link from 'next/link'
import './car.css'

// A listing that is no longer here (spec §14): a plain message and the two
// ways on — the stock and the home page
export default function CarNotFound() {
  return (
    <main className="cv cv-doc cv-gone" dir="rtl">
      <h1>המודעה אינה זמינה</h1>
      <p>ייתכן שהרכב כבר נמכר או שהמודעה הוסרה.</p>
      <div className="cv-gone-act">
        <Link href="/showroom/cars" className="cv-btn cv-primary">לכל הרכבים במלאי</Link>
        <Link href="/showroom" className="cv-btn">לדף הבית</Link>
      </div>
    </main>
  )
}
