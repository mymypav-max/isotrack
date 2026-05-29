import { VISIT_TYPE } from "../constants" // adapte le chemin selon ton projet

export function VisitSelectModal({ visits, onSelect, onCancel }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={onCancel} // clic sur le fond = fermeture
    >
      <div
        style={{
          background: "var(--surface, #fff)",
          borderRadius: 14,
          padding: 24,
          width: "100%", maxWidth: 480,
          maxHeight: "80vh",
          display: "flex", flexDirection: "column", gap: 16,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
        onClick={e => e.stopPropagation()} // empêche la fermeture au clic interne
      >
        {/* Header */}
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
            Exporter un rapport
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>
            Sélectionnez la visite à inclure dans le PDF.
          </p>
        </div>

        {/* Liste des visites */}
        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          {visits.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>
              Aucune visite disponible.
            </p>
          )}
          {visits.map(v => (
            <button
              key={v.id}
              className="card"
              onClick={() => onSelect(v)}
              style={{
                textAlign: "left", width: "100%",
                cursor: "pointer", border: "1.5px solid transparent",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--orange)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
            >
              {/* Badges type + statut */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                {VISIT_TYPE[v.type] && (
                  <span
                    className="pill pill-sm"
                    style={{
                      background: VISIT_TYPE[v.type].bg,
                      color: VISIT_TYPE[v.type].color,
                    }}
                  >
                    {VISIT_TYPE[v.type].label}
                  </span>
                )}
                {v.status === "active" && (
                  <span
                    className="pill pill-sm"
                    style={{
                      background: "#FFF7ED", color: "#C2410C",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#EA580C", display: "inline-block" }} />
                    En cours
                  </span>
                )}
              </div>

              {/* Titre + date */}
              <div style={{ fontSize: 14, fontWeight: 600 }}>{v.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{v.date}</div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-outline btn-sm" onClick={onCancel}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}