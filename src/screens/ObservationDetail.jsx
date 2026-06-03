import { useState, useEffect } from 'react'
import { Engine } from '../services/syncEngine'
import { STATUS, CRITICALITY, STATUS_TRANSITIONS } from '../constants'
import { Pill } from './ProjectDetail'
import { ActionMenu } from '../components/ActionMenu'
import { compressPhoto } from '../services/photoService'
import { CropModal } from '../components/CropModal'

export default function ObservationDetail({ observation, lots, onBack, onEdit, onDeleted, onReload }) {
  const [obs, setObs]           = useState(observation)
  const [comments, setComments] = useState([])
  const [photos, setPhotos]     = useState([])
  const [newComment, setNewComment] = useState('')
  const [fullPhoto, setFullPhoto]   = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [cropSrc,     setCropSrc]     = useState(null)
  const [pendingFile, setPendingFile] = useState(null)

  const lot      = obs.lotId ? lots.find(l => l.id === obs.lotId) : null
  const pinColor = lot?.color || '#9CA3AF'
  const transitions = STATUS_TRANSITIONS[obs.status] || []

  useEffect(() => { loadData() }, [obs.id])

  const loadData = async () => {
    const [cmts, phs] = await Promise.all([
      Engine.getComments(obs.id),
      Engine.getPhotos(obs.id),
    ])
    setComments(cmts)
    setPhotos(phs)
  }

  const refreshObs = async () => {
    const updated = await Engine.getObservation(obs.id)
    setObs(updated)
    onReload?.()
  }

  const changeStatus = async (newStatus) => {
    await Engine.updateObservation(obs.id, {
      status: newStatus,
      updatedAt: new Date(),
      ...(newStatus === 'closed' ? { closedAt: new Date() } : { closedAt: null }),
    })
    refreshObs()
  }

  const addComment = async () => {
    if (!newComment.trim()) return
    await Engine.createComment({
      observationId: obs.id,
      author: localStorage.getItem('isotrack-user') || 'Moi',
      text: newComment.trim(),
      createdAt: new Date(),
    })
    setNewComment('')
    loadData()
  }

  const deleteComment = async (id) => {
    await Engine.deleteComment(id)
    loadData()
  }

  const addPhoto = (e) => {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''
  const url = URL.createObjectURL(file)
  setPendingFile(file)
  setCropSrc(url)
}

const handleCropApply = async (croppedBase64) => {
  URL.revokeObjectURL(cropSrc)
  setCropSrc(null)
  setCompressing(true)
  try {
    await Engine.createPhoto(obs.id, croppedBase64, pendingFile?.name || 'photo.jpg')
    await loadData()
  } catch(err) {
    console.error('Photo error:', err)
  } finally {
    setCompressing(false)
    setPendingFile(null)
  }
}

const handleCropCancel = () => {
  URL.revokeObjectURL(cropSrc)
  setCropSrc(null)
  setPendingFile(null)
}

  const deletePhoto = async (id) => {
    await Engine.deletePhoto(id)
    loadData()
  }

  const deleteObservation = async () => {
  await Engine.deleteObservation(obs.id)
  onDeleted()
  }

  const fmt = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

  return (
    <div className="app">
      {/* Photo plein écran */}
      {fullPhoto && (
        <div
          onClick={() => setFullPhoto(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <img src={fullPhoto} style={{ maxWidth: '95vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button style={{ position: 'fixed', top: 18, right: 18, background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
      )}
{cropSrc && (
  <CropModal
    src={cropSrc}
    onApply={handleCropApply}
    onCancel={handleCropCancel}
  />
)}
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>← Observations</button>
        <div className="topbar-divider" />
        <div className="topbar-title">
          <h1>Observation #{obs.number}</h1>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>✏️ Modifier</button>
          <ActionMenu onDelete={deleteObservation} />
        </div>
      </div>

      <div className="scroll">
        <div className="page-content" style={{ maxWidth: 680 }}>

          {/* En-tête */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 50, height: 50, borderRadius: 10,
                background: pinColor, color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, flexShrink: 0,
              }}>
                {obs.number}
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.4 }}>{obs.title}</h2>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Pill config={STATUS[obs.status]} />
                  <Pill config={CRITICALITY[obs.criticality]} />
                  {lot && (
                    <span className="pill" style={{ background: pinColor + '18', color: pinColor, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: pinColor, flexShrink: 0 }} />
                      {lot.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {obs.description && (
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                {obs.description}
              </p>
            )}
          </div>

          {/* Métadonnées */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                ['Discipline',  obs.discipline || '—'],
                ['Responsable', lot ? `${lot.name}${lot.company ? ' — ' + lot.company : ''}` : obs.responsible || '—'],
                ['Délai',       obs.dueDate || '—'],
                ['Créée le',    fmt(obs.createdAt)],
                ...(obs.closedAt ? [['Fermée le', fmt(obs.closedAt)]] : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--subtle)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Changement de statut */}
          {transitions.length > 0 && (
            <div className="card" style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
                Faire avancer
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                {transitions.map(s => {
                  const d = STATUS[s]
                  return (
                    <button key={s}
                      className="btn btn-sm"
                      style={{ background: d.bg, color: d.color, border: `1.5px solid ${d.color}`, fontWeight: 600 }}
                      onClick={() => changeStatus(s)}
                    >
                      → {d.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Photos */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700 }}>Photos ({photos.length}/5)</p>
              {photos.length < 5 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <label className="btn btn-outline btn-xs" style={{ cursor: 'pointer' }}>
                    📷 Caméra
                    <input type="file" accept="image/*" capture="environment" onChange={addPhoto} style={{ display: 'none' }} />
                  </label>
                  <label className="btn btn-outline btn-xs" style={{ cursor: 'pointer' }}>
                    🖼 Galerie
                    <input type="file" accept="image/*" onChange={addPhoto} style={{ display: 'none' }} />
                  </label>
                </div>
              )}
            </div>
            {compressing && <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>⏳ Compression...</p>}
            {photos.length === 0 && !compressing && (
              <p style={{ fontSize: 13, color: 'var(--subtle)' }}>Aucune photo. Utilise les boutons ci-dessus.</p>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {photos.map(photo => (
                <div key={photo.id} style={{ position: 'relative' }}>
                  <img
                    src={photo.data}
                    onClick={() => setFullPhoto(photo.data)}
                    style={{ width: 90, height: 70, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', display: 'block' }}
                  />
                  <button
                    onClick={() => deletePhoto(photo.id)}
                    style={{ position: 'absolute', top: -7, right: -7, width: 22, height: 22, borderRadius: '50%', background: '#DC2626', color: 'white', border: '2px solid white', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                  >×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Commentaires */}
          <div className="card">
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Commentaires ({comments.length})</p>
            {comments.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--subtle)', marginBottom: 12 }}>Aucun commentaire.</p>
            )}
            {comments.map(c => (
              <div key={c.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>{c.author}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--subtle)' }}>{fmt(c.createdAt)}</span>
                    <button onClick={() => deleteComment(c.id)} style={{ fontSize: 15, color: 'var(--subtle)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                  </div>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5 }}>{c.text}</p>
              </div>
            ))}
            <textarea
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) addComment() }}
              style={{ minHeight: 60, marginBottom: 8 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary btn-sm" onClick={addComment} disabled={!newComment.trim()}>
                Ajouter
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}