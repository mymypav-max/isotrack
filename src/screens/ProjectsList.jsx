import { useState, useEffect } from 'react'
import { Engine } from '../services/syncEngine'
import { compressPhoto } from '../services/photoService'
import { CropModal } from '../components/CropModal'

const CONSTRUCTION_TYPES = [
  'Pétrochimie / Raffinage', 'Industrie chimique',
  'Industrie pharmaceutique', 'Agroalimentaire',
  'Énergie / Nucléaire', 'Offshore', 'Infrastructure',
  'Bâtiment industriel', 'Naval', 'Autre',
]

const EMPTY = {
  name: '', client: '', address: '',
  constructionType: '', description: '', photoData: null,
}

export default function ProjectsList({ onSelect }) {
  const [projects,  setProjects]  = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [preview,   setPreview]   = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [cropSrc,     setCropSrc]     = useState(null)
  const [pendingPhoto, setPendingPhoto] = useState(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    const list = await Engine.getProjects()
    setProjects(list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)))
  }

  const openCreate = () => {
    setEditing(null); setForm(EMPTY); setPreview(null); setShowForm(true)
  }
  const openEdit = (p) => {
    setEditing(p)
    setForm({
      name: p.name, client: p.client || '', address: p.address || '',
      constructionType: p.constructionType || '',
      description: p.description || '', photoData: p.photoData || null,
    })
    setPreview(p.photoData || null)
    setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditing(null); setForm(EMPTY); setPreview(null) }
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handlePhoto = (e) => {
  const file = e.target.files[0]
  if (!file) return
  e.target.value = ''
  const url = URL.createObjectURL(file)
  setPendingPhoto(file)
  setCropSrc(url)
}

const handleCropApply = (croppedBase64) => {
  URL.revokeObjectURL(cropSrc)
  setCropSrc(null)
  setPendingPhoto(null)
  setPreview(croppedBase64)
  set('photoData', croppedBase64)
}

const handleCropCancel = () => {
  URL.revokeObjectURL(cropSrc)
  setCropSrc(null)
  setPendingPhoto(null)
}

  const save = async () => {
    if (!form.name.trim()) return
    setLoading(true)
    try {
      const data = { ...form, name: form.name.trim() }
      if (editing) {
        await Engine.updateProject(editing.id, data)
      } else {
        await Engine.createProject(data)
      }
      cancel(); load()
    } finally { setLoading(false) }
  }

  const deleteProject = async (id) => {
    await Engine.deleteProject(id); load()
  }

  return (
  <>
    {cropSrc && (
      <CropModal
        src={cropSrc}
        onApply={handleCropApply}
        onCancel={handleCropCancel}
      />
    )}
    <div className="app">
      {/* TopBar */}
      <div className="topbar">
        <div className="topbar-title"><h1>IsoTrack</h1><p>Projets</p></div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Nouveau projet</button>
      </div>

      {/* Formulaire */}
      {showForm && (
  <div className="form-panel" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 64px)' }}>
          <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 14 }}>

            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>
              {editing ? 'Modifier le projet' : 'Nouveau projet'}
            </p>

            {/* Photo */}
            <div className="form-field">
              <label className="form-label">Photo du chantier</label>
              {preview ? (
                <div style={{ position: 'relative', marginBottom: 8 }}>
  <div style={{
    width: '100%',
    aspectRatio: '1 / 1',
    background: '#1E293B',
    borderRadius: 10,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <img src={preview} alt="Aperçu"
      style={{
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain',
        display: 'block',
      }} />
  </div>
  <button
    onClick={() => { setPreview(null); set('photoData', null) }}
    style={{
      position: 'absolute', top: 8, right: 8,
      background: 'rgba(0,0,0,0.55)', color: 'white',
      border: 'none', borderRadius: '50%', width: 28, height: 28,
      cursor: 'pointer', fontSize: 16, lineHeight: '28px', textAlign: 'center',
    }}>×</button>
</div>
              ) : (
                <label style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, height: 100, border: '2px dashed var(--border)',
                  borderRadius: 10, cursor: 'pointer', color: 'var(--muted)',
                  fontSize: 13, background: 'var(--concrete-bg)',
                }}>
                  📷 Ajouter une photo
                  <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                </label>
              )}
            </div>

            {/* Nom + Client */}
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label">Nom du projet <span className="form-required">*</span></label>
                <input placeholder="Unité de distillation DA-201" value={form.name}
                  onChange={e => set('name', e.target.value)} autoFocus />
              </div>
              <div className="form-field">
                <label className="form-label">Client / Maître d'ouvrage</label>
                <input placeholder="TotalEnergies, BASF..." value={form.client}
                  onChange={e => set('client', e.target.value)} />
              </div>
            </div>

            {/* Adresse + Type */}
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label">Adresse du chantier</label>
                <input placeholder="ZI de Grandpuits, 77720 Mormant" value={form.address}
                  onChange={e => set('address', e.target.value)} />
              </div>
              <div className="form-field">
                <label className="form-label">Type de construction</label>
                <select value={form.constructionType}
                  onChange={e => set('constructionType', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {CONSTRUCTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea placeholder="Contexte du projet, périmètre d'intervention..."
                value={form.description} onChange={e => set('description', e.target.value)}
                style={{ minHeight: 80 }} />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={!form.name.trim() || loading}>
                {loading ? 'Enregistrement...' : (editing ? 'Enregistrer' : 'Créer le projet')}
              </button>
              <button className="btn btn-outline btn-sm" onClick={cancel}>Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="scroll">
        <div className="page-content">
          {projects.length === 0 && !showForm && (
            <div className="empty-state">
              <p className="empty-state-title">Aucun projet</p>
              <p className="empty-state-sub">Crée ton premier projet pour démarrer.</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={openCreate}>
                + Créer un projet
              </button>
            </div>
          )}

          {projects.map(p => (
            <div key={p.id} className="card"
              style={{ marginBottom: 12, padding: 0, overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => onSelect(p)}>

              {/* Photo ou bande de couleur */}
              {p.photoData ? (
                <img src={p.photoData} alt={p.name}
                  style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{
                  height: 6, background: 'var(--orange)',
                  background: 'linear-gradient(90deg, #EA580C, #F97316)',
                }} />
              )}

              <div style={{ padding: '12px 16px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{p.name}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', fontSize: 12, color: 'var(--muted)' }}>
                      {p.client        && <span>👤 {p.client}</span>}
                      {p.constructionType && <span>🏭 {p.constructionType}</span>}
                      {p.address       && <span>📍 {p.address}</span>}
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-xs btn-outline" onClick={() => openEdit(p)}>✏️</button>
                    <button className="btn btn-xs btn-danger" onClick={() => deleteProject(p.id)}>🗑</button>
                  </div>
                </div>
                {p.description && (
                  <p style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 8, lineHeight: 1.5,
                    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' }}>
                    {p.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
  )
}