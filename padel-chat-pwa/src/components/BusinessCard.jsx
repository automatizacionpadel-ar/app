export default function BusinessCard({ negocio }) {
  return (
    <div
      className="business-card"
      style={{
        background: `linear-gradient(135deg, ${negocio.color_primario}, ${negocio.color_dark})`,
      }}
    >
      <div className="business-card-label">Horarios de atención</div>
      <div className="business-card-hours">{negocio.horarios}</div>
      <div className="business-card-actions">
        <button className="business-card-btn" type="button">📞 Llamar</button>
        <button className="business-card-btn" type="button">📍 Ubicación</button>
      </div>
    </div>
  )
}
