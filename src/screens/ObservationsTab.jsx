import { useState, useMemo } from 'react'
import { STATUS, CRITICALITY } from '../constants'
import { Pill } from './ProjectDetail'

export default function ObservationsTab({ observations, lots, onSelect, onNew }) {
  const [statFilter, setStatFilter] = useState('all')
  const [critFilter, setCritFilter] = useState('all')
  const [lotFilter,  setLotFilter]  = useState('all')

  const filtered = useMemo(() => observations.filter(o =>
    (statFilter === 'all' || o.status === statFilter) &&
    (critFilter === 'all' || o.criticality === critFilter) &&
    (lotFilter  === 'all' || String(o.lotId) === lotFilter)
  ), [observations, statFilter, critFilter, lotFilter])

  const fb = (active, onClick, label, color) => (
    <button
      className={`filter-btn ${active ? 'active' : ''}`}
      onClick={onClick}
      style={active && color ? { background: color, borderColor: color } : {}}
    >{label}</button>
  )

  const getLot = (lotId) => lots.find(l => l.id === lotId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

      {/* Barre de filtres statut */}
      <div className="filter-bar">
        <span className="filter-label">Statut</span>
        {fb(statFilter === 'all', () => setStatFilter('all'), 'Tous')}
        {Object.entries(STATUS).map(([k, v]) => (
  <button key={k}
    className={`filter-btn ${statFilter === k ? 'active' : ''}`}
    onClick={() => setStatFilter(k)}
  >{v.label}</button>
))}
      </div>

      {/* Barre de filtres criticité + lots */}
      <div className="filter-bar" style={{ borderTop: 'none' }}>
        <span className="filter-label">Criticité</span>
        {fb(critFilter === 'all', () => setCritFilter('all'), 'Toutes')}
        {Object.entries(CRITICALITY).map(([k, v]) => (
  <button key={k}
    className={`filter-btn ${critFilter === k ? 'active' : ''}`}
    onClick={() => setCritFilter(k)}
  >{v.label}</button>
))}
        {lots.length > 0 && <>
          <div className="filter-separator" />
          <span className="filter-label">Lot</span>
          {fb(lotFilter === 'all', () => setLotFilter('all'), 'Tous')}
          {lots.map(lot => (
            <button
              key={lot.id}
              className={`filter-btn ${lotFilter === String(lot.id) ? 'active' : ''}`}
              onClick={() => setLotFilter(String(lot.id))}
              style={lotFilter === String(lot.id)
                ? { background: lot.color, borderColor: lot.color, display: 'flex', alignItems: 'center', gap: 5 }
                : { display: 'flex', alignItems: 'center', gap: 5 }
              }
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: lotFilter === String(lot.id) ? 'rgba(255,255,255,0.85)' : lot.color, flexShrink: 0 }} />
              {lot.name}
            </button>
          ))}
        </>}
      </div>

      {/* Compteur + bouton */}
      <div style={{ padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          {filtered.length} observation{filtered.length > 1 ? 's' : ''}
          {observations.length !== filtered.length && ` sur ${observations.length}`}
        </span>
        <button className="btn btn-primary btn-sm" onClick={onNew}>+ Nouvelle</button>
      </div>

      {/* Liste */}
      <div className="scroll">
        <div style={{ padding: '10px 16px' }}>
          {filtered.length === 0 && (
            <div className="empty-state">
              <p className="empty-state-title">
                {observations.length === 0 ? 'Aucune observation' : 'Aucun résultat'}
              </p>
              <p className="empty-state-sub">
                {observations.length === 0
                  ? 'Crée la première observation avec le bouton ci-dessus.'
                  : 'Modifie les filtres pour voir plus de résultats.'}
              </p>
            </div>
          )}

          {filtered.map(obs => {
            const lot = getLot(obs.lotId)
            const pinColor = lot?.color || '#9CA3AF'
            const isOverdue = obs.dueDate && new Date(obs.dueDate) < new Date() && obs.status !== 'closed'

            return (
              <div key={obs.id} className="row-item" onClick={() => onSelect(obs)}>
                {/* Badge numéro coloré par lot */}
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: pinColor, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>
                  {obs.number}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {obs.title}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Pill config={STATUS[obs.status]} small />
                    <Pill config={CRITICALITY[obs.criticality]} small />
                    {obs.discipline && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{obs.discipline}</span>}
                    {lot && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--muted)' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: pinColor, display: 'inline-block', flexShrink: 0 }} />
                        {lot.name}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {obs.dueDate && (
                    <div style={{ fontSize: 11, color: isOverdue ? '#DC2626' : 'var(--muted)', fontWeight: isOverdue ? 600 : 400 }}>
                      {isOverdue ? '⚠ ' : ''}{obs.dueDate}
                    </div>
                  )}
                </div>

                <span style={{ color: 'var(--subtle)', fontSize: 16, flexShrink: 0 }}>›</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}