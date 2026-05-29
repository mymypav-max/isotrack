import { useState, useEffect, useRef } from 'react'

export function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
        <span style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>Confirmer ?</span>
        <button className="btn btn-xs btn-danger"
          onClick={e => { e.stopPropagation(); onDelete(); setConfirming(false) }}>
          Oui
        </button>
        <button className="btn btn-xs btn-outline"
          onClick={e => { e.stopPropagation(); setConfirming(false) }}>
          Non
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          padding: '5px 10px', borderRadius: 7,
          border: '1px solid var(--border)', fontSize: 18,
          color: 'var(--muted)', cursor: 'pointer', lineHeight: 1,
          background: open ? 'var(--concrete-bg)' : 'none',
        }}
      >⋯</button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 4px)',
          background: 'white', border: '1px solid var(--border)',
          borderRadius: 9, boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          zIndex: 300, overflow: 'hidden', minWidth: 140,
        }}>
          {onEdit && (
            <button
              onClick={() => { setOpen(false); onEdit() }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '11px 14px', fontSize: 14,
                textAlign: 'left', borderBottom: '1px solid var(--border)',
                background: 'none', cursor: 'pointer',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--concrete-bg)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              ✏️ Modifier
            </button>
          )}
          <button
            onClick={() => { setOpen(false); setConfirming(true) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', padding: '11px 14px', fontSize: 14,
              textAlign: 'left', color: 'var(--red)',
              background: 'none', cursor: 'pointer',
            }}
            onMouseOver={e => e.currentTarget.style.background = '#FEF2F2'}
            onMouseOut={e => e.currentTarget.style.background = 'none'}
          >
            🗑 Supprimer
          </button>
        </div>
      )}
    </div>
  )
}