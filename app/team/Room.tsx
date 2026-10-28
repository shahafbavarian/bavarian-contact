// The showroom backdrop: wall, glossy floor, ceiling light strips.
export default function Room() {
  return (
    <div className="sr-room" aria-hidden="true">
      <div className="sr-ceiling"><i className="sr-lamp" /><i className="sr-lamp" /><i className="sr-lamp" /></div>
      <div className="sr-sheen" />
    </div>
  )
}
