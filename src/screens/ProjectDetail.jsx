import { useState, useEffect } from 'react'
import { Engine, getProjectStats } from '../services/syncEngine'
import { STATUS, CRITICALITY, VISIT_TYPE, DISCIPLINES, CONTACT_ROLES, LOT_COLORS } from '../constants'
import { ActionMenu } from '../components/ActionMenu'
import ObservationsTab from './ObservationsTab'
import ObservationForm from './ObservationForm'
import ObservationDetail from './ObservationDetail'
import PdfViewer from './PdfViewer'
import { generateReport } from '../services/exportService'
import { VisitSelectModal } from "../components/VisitSelectModal"
import { LayoutDashboard, Layers, CalendarCheck, FileText, ClipboardList, Users } from 'lucide-react'

const LOT_LABEL = Object.fromEntries(LOT_COLORS.map(c => [c.value, c.label]))

// ── Pill ─────────────────────────────────────────────────────
export function Pill({ config, small }) {
  return (
    <span className={`pill ${small ? 'pill-sm' : ''}`}
      style={{ background: config.bg, color: config.color }}>
      {config.label}
    </span>
  )
}

// ── TopBar ────────────────────────────────────────────────────
function TopBar({ title, subtitle, onBack, right }) {
  return (
    <div className="topbar">
      {onBack && <>
        <button className="topbar-back" onClick={onBack}>← Projets</button>
        <div className="topbar-divider" />
      </>}
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────
function Sidebar({ tab, onChange }) {
  const items = [
    { key: 'dashboard',    Icon: LayoutDashboard, label: 'Tableau de bord' },
    { key: 'lots',         Icon: Layers,           label: 'Lots de travaux' },
    { key: 'visits',       Icon: CalendarCheck,    label: 'Visites'         },
    { key: 'documents',    Icon: FileText,         label: 'Documents'       },
    { key: 'observations', Icon: ClipboardList,    label: 'Observations'    },
    { key: 'contacts',     Icon: Users,            label: 'Contacts'        },
  ]
  return (
    <div className="icon-sidebar">
      {/* Logo pin */}
      <svg width="28" height="34" viewBox="0 0 32 38" fill="none" style={{ marginBottom: 10 }} aria-hidden="true">
        <path d="M16 2C8 2 4 9 4 14C4 22 10 29 16 36C22 29 28 22 28 14C28 9 24 2 16 2Z" fill="#EA580C"/>
        <circle cx="16" cy="13" r="5.5" stroke="white" strokeWidth="2" fill="none"/>
        <circle cx="16" cy="13" r="2" fill="white"/>
      </svg>
      <div className="icon-sidebar-divider" />
      {items.map(({ key, Icon, label }) => (
        <button key={key}
          className={`icon-sidebar-item ${tab === key ? 'active' : ''}`}
          onClick={() => onChange(key)}
          title={label}>
          <Icon size={20} strokeWidth={1.8} />
          <span className="tooltip">{label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────
function DashboardTab({ stats, observations, onNav }) {
  const recent = [...observations]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
  return (
    <div className="scroll">
      <div className="page-content">
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { val: stats.total ?? 0,        label: 'Total',       color: null },
            { val: stats.open ?? 0,         label: 'Ouvertes',    color: '#DC2626' },
            { val: stats.inProgress ?? 0,   label: 'En cours',    color: '#EA580C' },
            { val: stats.readyToCheck ?? 0, label: 'À contrôler', color: '#475569' },
            { val: stats.closed ?? 0,       label: 'Fermées',     color: '#16A34A' },
            { val: stats.blocking ?? 0,     label: 'Bloquantes',  color: '#DC2626' },
          ].map(s => (
            <div key={s.label} className="stat" style={{ minWidth: 80 }}>
              <div className="stat-value" style={{ color: s.color || 'var(--text)' }}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="form-grid-2" style={{ gap: 14 }}>
          <div className="card">
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 }}>Par criticité</p>
            {['blocking','major','minor','remark'].map(c => {
              const cnt = observations.filter(o => o.criticality === c && o.status !== 'closed').length
              const d = CRITICALITY[c]
              return (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="pill pill-sm" style={{ background: d.bg, color: d.color, width: 88, textAlign: 'center' }}>{d.label}</span>
                  <div style={{ flex: 1, height: 6, background: 'var(--concrete-bg)', borderRadius: 4, overflow: 'hidden' }}>
                    {cnt > 0 && <div style={{ width: `${(cnt / Math.max(observations.length, 1)) * 100}%`, height: '100%', background: d.color, borderRadius: 4 }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: 'right' }}>{cnt}</span>
                </div>
              )
            })}
          </div>
          <div className="card">
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 }}>Dernières observations</p>
            {recent.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--subtle)' }}>Aucune observation.</p>
              : recent.map(o => (
                <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)', width: 28, flexShrink: 0 }}>#{o.number}</span>
                  <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.title}</span>
                  <Pill config={STATUS[o.status]} small />
                </div>
              ))}
            {observations.length > 0 && (
              <button onClick={() => onNav('observations')}
                style={{ marginTop: 10, color: 'var(--orange)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}>
                Voir toutes →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Lots ──────────────────────────────────────────────────────
const EMPTY_LOT = { name: '', company: '', contact: '', color: LOT_COLORS[0].value, notes: '' }

function ColorPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
      {LOT_COLORS.map(c => (
        <button key={c.value} title={c.label} onClick={() => onChange(c.value)}
          style={{ width: 30, height: 30, borderRadius: '50%', background: c.value, border: 'none', cursor: 'pointer',
            outline: value === c.value ? `3px solid ${c.value}` : '3px solid transparent',
            outlineOffset: 2, transform: value === c.value ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.1s' }} />
      ))}
    </div>
  )
}

function LotsTab({ project, lots, observations, onReload }) {
  const [showForm, setShowForm] = useState(false)
  const [editingLot, setEditingLot] = useState(null)
  const [form, setForm] = useState(EMPTY_LOT)

  const openCreate = () => { setEditingLot(null); setForm(EMPTY_LOT); setShowForm(true) }
  const openEdit = (lot) => {
    setEditingLot(lot)
    setForm({ name: lot.name, company: lot.company || '', contact: lot.contact || '', color: lot.color, notes: lot.notes || '' })
    setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditingLot(null); setForm(EMPTY_LOT) }

  const save = async () => {
    if (!form.name.trim()) return
    const data = { name: form.name.trim(), company: form.company.trim(), contact: form.contact.trim(), color: form.color, notes: form.notes.trim(), projectId: project.id }
    if (editingLot) {
      await Engine.updateLot(editingLot.id, data)
    } else {
      await Engine.createLot(data)
    }
    cancel(); onReload()
  }

  const deleteLot = async (id) => {
    for (const obs of observations.filter(o => o.lotId === id)) {
      await Engine.updateObservation(obs.id, { lotId: null })
    }
    await Engine.deleteLot(id)
    onReload()
  }

  return (
    <div className="scroll">
      {showForm && (
        <div className="form-panel">
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{editingLot ? 'Modifier le lot' : 'Nouveau lot'}</p>
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label">Nom <span className="form-required">*</span></label>
                <input placeholder="Tuyauterie..." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="form-field">
                <label className="form-label">Entreprise</label>
                <input placeholder="Entreprise ABC" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Responsable</label>
                <input placeholder="M. Dupont" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Notes</label>
                <input placeholder="..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Couleur du lot — couleur des pins sur plan</label>
              <ColorPicker value={form.color} onChange={c => setForm(f => ({ ...f, color: c }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={save}>{editingLot ? 'Enregistrer' : 'Créer le lot'}</button>
              <button className="btn btn-outline btn-sm" onClick={cancel}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div className="page-content">
        <div className="section-header">
          <span className="section-title">Lots de travaux</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Nouveau lot</button>
        </div>
        {lots.length === 0 && <div className="empty-state"><p className="empty-state-title">Aucun lot défini</p><p className="empty-state-sub">Crée les lots pour les associer aux observations et colorier les pins.</p></div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lots.map(lot => (
            <div key={lot.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: lot.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 18 }}>📌</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{lot.name}</div>
                {lot.company && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{lot.company}{lot.contact && <span style={{ color: 'var(--subtle)' }}> — {lot.contact}</span>}</div>}
              </div>
              <div style={{ flexShrink: 0, textAlign: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: lot.color, margin: '0 auto 3px' }} />
                <div style={{ fontSize: 10, color: 'var(--subtle)' }}>{LOT_LABEL[lot.color] || ''}</div>
              </div>
              <ActionMenu onEdit={() => openEdit(lot)} onDelete={() => deleteLot(lot.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Visites ───────────────────────────────────────────────────
const EMPTY_VISIT = { type: 'opr', title: '', date: new Date().toISOString().split('T')[0], notes: '' }

function VisitsTab({ project, visits, onReload }) {
  const [showForm, setShowForm] = useState(false)
  const [editingVisit, setEditingVisit] = useState(null)
  const [form, setForm] = useState(EMPTY_VISIT)

  const openCreate = () => { setEditingVisit(null); setForm(EMPTY_VISIT); setShowForm(true) }
  const openEdit = (v) => {
    setEditingVisit(v)
    setForm({ type: v.type, title: v.title, date: v.date, notes: v.notes || '' })
    setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditingVisit(null); setForm(EMPTY_VISIT) }

  const save = async () => {
    if (!form.title.trim()) return
    if (editingVisit) {
      await Engine.updateVisit(editingVisit.id, { ...form, title: form.title.trim(), projectId: project.id })
    } else {
      await Engine.createVisit({ ...form, title: form.title.trim(), projectId: project.id, status: 'active', participants: [] })
    }
    cancel(); onReload()
  }

  const deleteVisit = async (id) => { await Engine.deleteVisit(id); onReload() }
  const closeVisit  = async (id) => { await Engine.updateVisit(id, { status: 'completed', projectId: project.id }); onReload() }

  return (
    <div className="scroll">
      {showForm && (
        <div className="form-panel">
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{editingVisit ? 'Modifier la visite' : 'Nouvelle visite'}</p>
            <div className="form-grid-3">
              <div className="form-field">
                <label className="form-label">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(VISIT_TYPE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Titre <span className="form-required">*</span></label>
                <input placeholder="OPR Tuyauterie — Zone D4" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={save}>{editingVisit ? 'Enregistrer' : 'Démarrer'}</button>
              <button className="btn btn-outline btn-sm" onClick={cancel}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div className="page-content">
        <div className="section-header">
          <span className="section-title">Visites chantier</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Nouvelle visite</button>
        </div>
        {visits.length === 0 && <div className="empty-state"><p className="empty-state-sub">Aucune visite enregistrée.</p></div>}
        {visits.map(v => (
          <div key={v.id} className="card" style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <Pill config={VISIT_TYPE[v.type]} />
                  {v.status === 'active' && (
                    <span className="pill pill-sm" style={{ background: '#FFF7ED', color: '#C2410C', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#EA580C', display: 'inline-block' }} />En cours
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{v.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{v.date}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {v.status === 'active' && <button className="btn btn-xs btn-danger" onClick={() => closeVisit(v.id)}>Clôturer</button>}
                <ActionMenu onEdit={() => openEdit(v)} onDelete={() => deleteVisit(v.id)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Documents ─────────────────────────────────────────────────
const DOC_LABELS = { isometric: 'Isométrique', pid: 'P&ID', system: 'Système', ga: 'Plan GA', equipment: 'Équipement', line: 'Ligne' }
const EMPTY_DOC  = { name: '', type: 'isometric' }

function DocumentsTab({ project, documents, onOpenViewer, onReload }) {
  const [showForm,   setShowForm]   = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [form,       setForm]       = useState(EMPTY_DOC)
  const [file,       setFile]       = useState(null)

  const openCreate = () => { setEditingDoc(null); setForm(EMPTY_DOC); setFile(null); setShowForm(true) }
  const openEdit   = (doc) => { setEditingDoc(doc); setForm({ name: doc.name, type: doc.type }); setShowForm(true) }
  const cancel     = () => { setShowForm(false); setEditingDoc(null); setForm(EMPTY_DOC); setFile(null) }

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f)
    if (!form.name) setForm(p => ({ ...p, name: f.name.replace('.pdf', '') }))
  }

  const save = async () => {
    if (editingDoc) {
      if (!form.name.trim()) return
      await Engine.updateDocument(editingDoc.id, { name: form.name.trim(), type: form.type })
    } else {
      if (!file || !form.name.trim()) return
      const ab = await file.arrayBuffer()
      await Engine.createDocument({ projectId: project.id, name: form.name.trim(), type: form.type, fileName: file.name, fileSize: file.size }, ab)
    }
    cancel(); onReload()
  }

  const deleteDoc = async (id) => { await Engine.deleteDocument(id); onReload() }

  return (
    <div className="scroll">
      {showForm && (
        <div className="form-panel">
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{editingDoc ? 'Modifier le document' : 'Importer un document'}</p>
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label">Nom <span className="form-required">*</span></label>
                <input placeholder="ISO-TUY-001-Rev2" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="form-field">
                <label className="form-label">Type</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {Object.entries(DOC_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            {!editingDoc && (
              <div className="form-field">
                <label className="form-label">Fichier PDF <span className="form-required">*</span></label>
                <input type="file" accept=".pdf" onChange={handleFile} style={{ padding: '6px' }} />
                {file && <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>📄 {file.name} — {(file.size/1024/1024).toFixed(1)} Mo</span>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={save} disabled={editingDoc ? !form.name.trim() : (!file || !form.name.trim())}>
                {editingDoc ? 'Enregistrer' : 'Importer'}
              </button>
              <button className="btn btn-outline btn-sm" onClick={cancel}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div className="page-content">
        <div className="section-header">
          <span className="section-title">Documents techniques</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Importer</button>
        </div>
        {documents.length === 0 && <div className="empty-state"><p className="empty-state-sub">Aucun document importé.</p></div>}
        {documents.map(doc => (
          <div key={doc.id} className="row-item">
            <div style={{ flex: 1, minWidth: 0 }} onClick={() => onOpenViewer(doc)}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{doc.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                <span style={{ background: 'var(--concrete-bg)', color: 'var(--stone-dark)', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{DOC_LABELS[doc.type] || doc.type}</span>
                {doc.fileSize && ` ${(doc.fileSize/1024/1024).toFixed(1)} Mo`}
              </div>
            </div>
            <ActionMenu onEdit={() => openEdit(doc)} onDelete={() => deleteDoc(doc.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contacts ──────────────────────────────────────────────────
const EMPTY_CONTACT  = { name: '', company: '', role: 'moe', phone: '', email: '' }
const AVATAR_COLORS  = ['#EA580C','#374151','#16A34A','#DC2626','#475569']

function ContactsTab({ project, contacts, onReload }) {
  const [showForm,        setShowForm]        = useState(false)
  const [editingContact,  setEditingContact]  = useState(null)
  const [form,            setForm]            = useState(EMPTY_CONTACT)

  const openCreate = () => { setEditingContact(null); setForm(EMPTY_CONTACT); setShowForm(true) }
  const openEdit   = (c) => {
    setEditingContact(c)
    setForm({ name: c.name, company: c.company||'', role: c.role, phone: c.phone||'', email: c.email||'' })
    setShowForm(true)
  }
  const cancel = () => { setShowForm(false); setEditingContact(null); setForm(EMPTY_CONTACT) }

  const save = async () => {
    if (!form.name.trim()) return
    const data = { ...form, name: form.name.trim(), company: form.company.trim(), projectId: project.id }
    if (editingContact) {
      await Engine.updateContact(editingContact.id, data)
    } else {
      await Engine.createContact(data)
    }
    cancel(); onReload()
  }

  const deleteContact = async (id) => { await Engine.deleteContact(id); onReload() }
  const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="scroll">
      {showForm && (
        <div className="form-panel">
          <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--orange)' }}>{editingContact ? 'Modifier le contact' : 'Nouveau contact'}</p>
            <div className="form-grid-2">
              <div className="form-field">
                <label className="form-label">Nom <span className="form-required">*</span></label>
                <input placeholder="Jean Martin" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div className="form-field">
                <label className="form-label">Société</label>
                <input placeholder="Bureau d'études ABC" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Rôle</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  {Object.entries(CONTACT_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Téléphone</label>
                <input placeholder="06 12 34 56 78" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-field" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Email</label>
                <input placeholder="jean.martin@societe.fr" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={save}>{editingContact ? 'Enregistrer' : 'Ajouter'}</button>
              <button className="btn btn-outline btn-sm" onClick={cancel}>Annuler</button>
            </div>
          </div>
        </div>
      )}
      <div className="page-content">
        <div className="section-header">
          <span className="section-title">Contacts projet</span>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Ajouter</button>
        </div>
        {contacts.length === 0 && <div className="empty-state"><p className="empty-state-sub">Aucun contact enregistré.</p></div>}
        {contacts.map((c, i) => (
          <div key={c.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: AVATAR_COLORS[i % AVATAR_COLORS.length] + '1A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: AVATAR_COLORS[i % AVATAR_COLORS.length], flexShrink: 0 }}>
              {initials(c.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</span>
                <span className="pill pill-sm" style={{ background: 'var(--concrete-bg)', color: 'var(--stone-dark)' }}>{CONTACT_ROLES[c.role] || c.role}</span>
              </div>
              {c.company && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 1 }}>{c.company}</div>}
            </div>
            <div style={{ textAlign: 'right', fontSize: 12, flexShrink: 0 }}>
              {c.phone && <div style={{ color: 'var(--muted)' }}>{c.phone}</div>}
              {c.email && <div style={{ color: 'var(--orange)' }}>{c.email}</div>}
            </div>
            <ActionMenu onEdit={() => openEdit(c)} onDelete={() => deleteContact(c.id)} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Écran principal ───────────────────────────────────────────
export default function ProjectDetail({ project, onBack }) {
  const [tab,          setTab]          = useState('dashboard')
  const [observations, setObservations] = useState([])
  const [visits,       setVisits]       = useState([])
  const [documents,    setDocuments]    = useState([])
  const [contacts,     setContacts]     = useState([])
  const [lots,         setLots]         = useState([])
  const [stats,        setStats]        = useState({})
  const [activeVisit,  setActiveVisit]  = useState(null)
  const [subScreen,    setSubScreen]    = useState('main')
  const [activeDoc,    setActiveDoc]    = useState(null)
  const [activeObs,    setActiveObs]    = useState(null)
  const [obsSubMode,   setObsSubMode]   = useState('list')
  const [pendingPin,   setPendingPin]   = useState(null)
  const [exporting, setExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [showVisitSelect, setShowVisitSelect] = useState(false)

  useEffect(() => { loadAll() }, [project])

  const loadAll = async () => {
    const data = await Engine.getProjectData(project.id)
    setObservations(data.observations)
    setVisits(data.visits)
    setDocuments(data.documents)
    setContacts(data.contacts)
    setLots(data.lots)
    setActiveVisit(data.visits.find(v => v.status === 'active') || null)
    setStats(await getProjectStats(project.id))
  }

  // Ouvre le modal au clic sur le bouton
const handleExportClick = () => {
  setShowVisitSelect(true)
}

// Lancé après sélection d'une visite dans le modal
const handleExport = async (selectedVisit) => {
  setShowVisitSelect(false)
  setExporting(true)
  try {
    const pdf = await generateReport(
      { project, visits, observations, lots, documents, contacts, selectedVisit },
      (pct, msg) => setExportProgress(`${Math.round(pct)}% — ${msg}`)
    )

    const projectName = (project?.name ?? 'projet').replace(/\s+/g, '-')
    const visitTitle = (selectedVisit?.title ?? 'visite').replace(/\s+/g, '-')
    pdf.save(`${projectName}_${visitTitle}_rapport.pdf`)

  } catch (e) {
    console.error('Export error:', e)
    alert('Erreur lors de la génération du rapport.')
  } finally {
    setExporting(false)
    setExportProgress('')
  }
}

  // Sub-screens
  if (subScreen === 'pdf-viewer' && activeDoc) {
    return (
      <PdfViewer
        document={activeDoc}
        project={project}
        lots={lots}
        observations={observations}
        onBack={() => setSubScreen('main')}
        onNewObsAtPin={(nx, ny, pageIdx) => {
          setPendingPin({ normalizedX: nx, normalizedY: ny, pageIndex: pageIdx, documentId: activeDoc.id })
          setSubScreen('obs-form-from-pin')
        }}
        onObsSelect={(obs) => { setActiveObs(obs); setSubScreen('obs-detail-from-viewer') }}
      />
    )
  }
  if (subScreen === 'obs-form-from-pin') {
    return (
      <ObservationForm
        project={project} lots={lots} activeVisit={activeVisit} observation={null} pinContext={pendingPin}
        onSave={async (newId) => {
          if (pendingPin) {
            await Engine.createPin({ observationId: newId, documentId: pendingPin.documentId, pageIndex: pendingPin.pageIndex, normalizedX: pendingPin.normalizedX, normalizedY: pendingPin.normalizedY })
            setPendingPin(null)
          }
          await loadAll()
          setSubScreen('pdf-viewer')
        }}
        onBack={() => { setPendingPin(null); setSubScreen('pdf-viewer') }}
      />
    )
  }
  if (subScreen === 'obs-detail-from-viewer') {
    return (
      <ObservationDetail
        observation={activeObs} lots={lots}
        onBack={() => setSubScreen('pdf-viewer')}
        onEdit={() => setSubScreen('obs-edit-from-viewer')}
        onDeleted={() => { loadAll(); setSubScreen('pdf-viewer') }}
        onReload={loadAll}
      />
    )
  }
  if (subScreen === 'obs-edit-from-viewer') {
    return (
      <ObservationForm
        project={project} lots={lots} activeVisit={activeVisit} observation={activeObs}
        onSave={async () => {
          const updated = await Engine.getObservation(activeObs.id)
          setActiveObs(updated)
          await loadAll()
          setSubScreen('obs-detail-from-viewer')
        }}
        onBack={() => setSubScreen('obs-detail-from-viewer')}
      />
    )
  }

  return (
    <div className="app">
      <TopBar
        title={project.name} subtitle={project.client} onBack={onBack}
        right={
          <div style={{ display:'flex', gap:6 }}>
            {exporting
              ? <span style={{ fontSize:12, color:'rgba(255,255,255,.6)', alignSelf:'center' }}>{exportProgress}</span>
              : <button className="btn btn-ghost btn-sm" onClick={handleExportClick}>⬇ Export PDF</button>
            }
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setTab('observations'); setObsSubMode('form-new') }}>
              + Obs.
            </button>
          </div>
        }
      />

      {activeVisit && (
        <div className="visit-banner">
          <div className="visit-banner-dot" />
          <div className="visit-banner-text">
            <strong>{VISIT_TYPE[activeVisit.type]?.label}</strong> en cours — {activeVisit.title}
          </div>
          <button className="btn btn-xs btn-danger"
            onClick={async () => { await Engine.updateVisit(activeVisit.id, { status: 'completed', projectId: project.id }); loadAll() }}>
            Clôturer
          </button>
        </div>
      )}

      <div className="split">
        <Sidebar tab={tab} onChange={setTab} />
        <div className="content">
          {tab === 'dashboard'    && <DashboardTab stats={stats} observations={observations} onNav={setTab} />}
          {tab === 'lots'         && <LotsTab project={project} lots={lots} observations={observations} onReload={loadAll} />}
          {tab === 'visits'       && <VisitsTab project={project} visits={visits} onReload={loadAll} />}
          {tab === 'documents'    && <DocumentsTab project={project} documents={documents} onOpenViewer={doc => { setActiveDoc(doc); setSubScreen('pdf-viewer') }} onReload={loadAll} />}
          {tab === 'observations' && obsSubMode === 'list' && (
            <ObservationsTab observations={observations} lots={lots}
              onSelect={obs => { setActiveObs(obs); setObsSubMode('detail') }}
              onNew={() => setObsSubMode('form-new')} />
          )}
          {tab === 'observations' && obsSubMode === 'detail' && activeObs && (
            <ObservationDetail observation={activeObs} lots={lots}
              onBack={() => { setObsSubMode('list'); loadAll() }}
              onEdit={() => setObsSubMode('form-edit')}
              onDeleted={() => { setObsSubMode('list'); loadAll() }}
              onReload={loadAll} />
          )}
          {tab === 'observations' && obsSubMode === 'form-new' && (
            <ObservationForm project={project} lots={lots} activeVisit={activeVisit} observation={null}
              onSave={async (newId) => { await loadAll(); const newObs = await Engine.getObservation(newId); setActiveObs(newObs); setObsSubMode('detail') }}
              onBack={() => setObsSubMode('list')} />
          )}
          {tab === 'observations' && obsSubMode === 'form-edit' && activeObs && (
            <ObservationForm project={project} lots={lots} activeVisit={activeVisit} observation={activeObs}
              onSave={async () => { const updated = await Engine.getObservation(activeObs.id); setActiveObs(updated); setObsSubMode('detail'); loadAll() }}
              onBack={() => setObsSubMode('detail')} />
          )}
          {tab === 'contacts' && <ContactsTab project={project} contacts={contacts} onReload={loadAll} />}
        </div>
      </div>
            {showVisitSelect && (
        <VisitSelectModal
          visits={visits}
          onSelect={handleExport}
          onCancel={() => setShowVisitSelect(false)}
        />
      )}

    </div>
  )
}