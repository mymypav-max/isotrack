import { useState, useEffect } from 'react'
import { Engine, getNextObsNumber } from '../services/syncEngine'
import { CRITICALITY, DISCIPLINES, VISIT_TYPE, LOT_COLORS } from '../constants'

const LOT_LABEL = Object.fromEntries(LOT_COLORS.map(c => [c.value, c.label]))

export default function ObservationForm({ project, lots, activeVisit, observation, pinContext, onSave, onBack }) {
  const isEdit = !!observation

  const [form, setForm] = useState({
    title: '',
    description: '',
    criticality: 'major',
    discipline: DISCIPLINES[0],
    lotId: null,
    dueDate: '',
  })

  useEffect(() => {
    if (observation) {
      setForm({
        title:       observation.title || '',
        description: observation.description || '',
        criticality: observation.criticality || 'major',
        discipline:  observation.discipline || DISCIPLINES[0],
        lotId:       observation.lotId || null,
        dueDate:     observation.dueDate || '',
      })
    }
  }, [observation])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim()) return
    const lot = form.lotId ? lots.find(l => l.id === form.lotId) : null
    const responsible = lot ? `${lot.name}${lot.company ? ' — ' + lot.company : ''}` : ''

    if (isEdit) {
      await Engine.updateObservation(observation.id, {
        title:       form.title.trim(),
        description: form.description.trim(),
        criticality: form.criticality,
        discipline:  form.discipline,
        lotId:       form.lotId,
        responsible,
        dueDate:     form.dueDate || null,
        updatedAt:   new Date(),
      })
      onSave()
    } else {
      const number = await getNextObsNumber(project.id)
      const id = await Engine.createObservation({
        projectId:         project.id,
        creationVisitId:   activeVisit?.id || null,
        creationVisitType: activeVisit?.type || null,
        number,
        title:       form.title.trim(),
        description: form.description.trim(),
        status:      'open',
        criticality: form.criticality,
        discipline:  form.discipline,
        lotId:       form.lotId,
        responsible,
        dueDate:     form.dueDate || null,
        createdAt:   new Date(),
        closedAt:    null,
      })
      onSave(id)
    }
  }

  const selectedLot = form.lotId ? lots.find(l => l.id === form.lotId) : null

  return (
    <div className="app">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>← Annuler</button>
        <div className="topbar-divider" />
        <div className="topbar-title">
          <h1>{isEdit ? `Modifier obs. #${observation.number}` : 'Nouvelle observation'}</h1>
          {activeVisit && !isEdit && (
            <p>{VISIT_TYPE[activeVisit.type]?.label} — {activeVisit.title}</p>
          )}
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={save}
          disabled={!form.title.trim()}
        >
          {isEdit ? 'Enregistrer' : 'Créer'}
        </button>
      </div>

      <div className="scroll">
        <div className="page-content" style={{ maxWidth: 680 }}>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="form-field">
              <label className="form-label">Titre <span className="form-required">*</span></label>
              <input
                placeholder="Décrivez brièvement l'observation ou la réserve..."
                value={form.title}
                onChange={e => set('title', e.target.value)}
                autoFocus
                style={{ fontSize: 15, fontWeight: 500 }}
              />
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="form-field">
              <label className="form-label">Criticité</label>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 6 }}>
                {Object.entries(CRITICALITY).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => set('criticality', k)}
                    className="pill"
                    style={{
                      background: form.criticality === k ? v.color : v.bg,
                      color:      form.criticality === k ? 'white' : v.color,
                      border:     `1.5px solid ${v.color}`,
                      cursor:     'pointer',
                      opacity:    form.criticality === k ? 1 : 0.65,
                      transition: 'all 0.1s',
                      padding:    '6px 14px',
                      fontSize:   13,
                    }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="form-field">
              <label className="form-label">Lot responsable — détermine la couleur du pin sur plan</label>
              {lots.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>
                  Aucun lot défini. Rends-toi dans l'onglet "Lots de travaux" pour en créer.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 8 }}>
                    <button
                      onClick={() => set('lotId', null)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 13,
                        background: !form.lotId ? '#F1F5F9' : 'white',
                        border: `1.5px solid ${!form.lotId ? '#475569' : 'var(--border)'}`,
                        color: !form.lotId ? '#334155' : 'var(--muted)',
                        fontWeight: !form.lotId ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      Sans lot
                    </button>
                    {lots.map(lot => (
                      <button
                        key={lot.id}
                        onClick={() => set('lotId', lot.id)}
                        style={{
                          padding: '7px 14px', borderRadius: 8, fontSize: 13,
                          display: 'flex', alignItems: 'center', gap: 7,
                          background: form.lotId === lot.id ? lot.color : 'white',
                          color:      form.lotId === lot.id ? 'white' : 'var(--text)',
                          border:     `1.5px solid ${lot.color}`,
                          fontWeight: form.lotId === lot.id ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.12s',
                        }}
                      >
                        <span style={{
                          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                          background: form.lotId === lot.id ? 'rgba(255,255,255,0.75)' : lot.color,
                        }} />
                        {lot.name}
                        {lot.company && (
                          <span style={{ opacity: 0.7, fontSize: 11 }}>— {lot.company}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedLot && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', background: selectedLot.color + '14', borderRadius: 8, border: `1px solid ${selectedLot.color}30` }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedLot.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: selectedLot.color, fontWeight: 600 }}>
                        Pin affiché en {LOT_LABEL[selectedLot.color] || 'cette couleur'} sur les documents
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 14 }}>
            <div className="form-grid-2" style={{ gap: 14 }}>
              <div className="form-field">
                <label className="form-label">Discipline</label>
                <select value={form.discipline} onChange={e => set('discipline', e.target.value)}>
                  {DISCIPLINES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Délai de levée</label>
                <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea
                placeholder="Décrivez le problème constaté, la non-conformité, les détails de la réserve..."
                value={form.description}
                onChange={e => set('description', e.target.value)}
                style={{ minHeight: 100 }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}