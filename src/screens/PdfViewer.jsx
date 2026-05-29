import { useState, useEffect, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import { Engine } from '../services/syncEngine'
import { local } from '../services/localDb'
import { Pill } from './ProjectDetail'
import { STATUS, CRITICALITY } from '../constants'

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

const LONG_PRESS_MS  = 650
const MOVE_THRESHOLD = 12

export default function PdfViewer({
  document, project, lots, observations,
  onBack, onNewObsAtPin, onObsSelect,
}) {
  const canvasRef    = useRef(null)
  const containerRef = useRef(null)
  const renderTask   = useRef(null)
  const timerRef     = useRef(null)
  const touchStart   = useRef(null)

  const [pdfDoc,     setPdfDoc]     = useState(null)
  const [pageNum,    setPageNum]    = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale,      setScale]      = useState(1)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const [pins,       setPins]       = useState([])
  const [selPin,     setSelPin]     = useState(null)
  const [placing,    setPlacing]    = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [localObs,   setLocalObs]   = useState([])

  // ── Chargement observations locales ─────────────────────────
  useEffect(() => {
    if (!project?.id) return
    local.observations.getByProject(project.id).then(setLocalObs)
  }, [project?.id, pins])

  // ── Chargement PDF ──────────────────────────────────────────
  useEffect(() => {
    if (!document?.id) return
    setLoading(true)
    setError(null)
    setPdfDoc(null)
    let cancelled = false
    Engine.getDocumentFile(document).then(fileData => {
  if (cancelled || !fileData) {
    if (!fileData) setError('Fichier introuvable.')
    return
  }
  // Copie l'ArrayBuffer pour éviter le bug iOS (detached buffer)
  let buffer
  try {
    if (fileData instanceof ArrayBuffer) {
      buffer = fileData.slice(0)
    } else if (ArrayBuffer.isView(fileData)) {
      buffer = fileData.buffer.slice(fileData.byteOffset, fileData.byteOffset + fileData.byteLength)
    } else {
      setError('Format de fichier non supporté.')
      return
    }
  } catch(e) {
    setError('Impossible de lire ce fichier PDF.')
    return
  }
  const data = new Uint8Array(buffer)
  const task = pdfjsLib.getDocument({ data })
      task.promise
        .then(pdf => {
          if (!cancelled) {
            setPdfDoc(pdf)
            setTotalPages(pdf.numPages)
            setPageNum(1)
          }
        })
        .catch(e => { if (!cancelled) setError(`PDF: ${e?.name} — ${e?.message}`) })
    })
    return () => { cancelled = true }
  }, [document?.id])

  // ── Chargement pins ─────────────────────────────────────────
  useEffect(() => {
    if (!document?.id) return
    Engine.getPins(document.id).then(setPins).catch(() => setPins([]))
  }, [document?.id])

  // ── Auto-échelle ────────────────────────────────────────────
  useEffect(() => {
  if (!pdfDoc || !containerRef.current) return
  pdfDoc.getPage(1).then(page => {
    const vp  = page.getViewport({ scale: 1 })
    const w   = containerRef.current.clientWidth - 48
    let s     = Math.min(+(w / vp.width).toFixed(2), 1.5)
    // Limite iOS Safari : canvas max ~4096px
    const MAX = 3000
    if (vp.width  * s > MAX) s = MAX / vp.width
    if (vp.height * s > MAX) s = Math.min(s, MAX / vp.height)
    setScale(Math.max(0.25, +s.toFixed(2)))
  })
}, [pdfDoc])

  // ── Rendu page ──────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || scale === 1) return
    renderPage()
  }, [pdfDoc, pageNum, scale])

  const renderPage = async () => {
  try {
    const page     = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale })
    const canvas   = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    if (!ctx) { setError('Canvas non disponible sur cet appareil.'); return }
    canvas.width   = Math.floor(viewport.width)
    canvas.height  = Math.floor(viewport.height)
    setCanvasSize({ w: canvas.width, h: canvas.height })
    if (renderTask.current) renderTask.current.cancel()
    renderTask.current = page.render({ canvasContext: ctx, viewport })
    await renderTask.current.promise
    setLoading(false)
  } catch (e) {
    if (e?.name !== 'RenderingCancelledException') {
  console.error('Render error:', e)
  setError(`Erreur: ${e?.name} — ${e?.message}`)
}
  }
}
  // ── Long press ──────────────────────────────────────────────
  const startPress = (x, y) => {
    timerRef.current = setTimeout(() => {
      setPlacing(true)
      setTimeout(() => setPlacing(false), 400)
      onNewObsAtPin(
        +(x / canvasSize.w).toFixed(4),
        +(y / canvasSize.h).toFixed(4),
        pageNum - 1,
      )
    }, LONG_PRESS_MS)
  }

  const cancelPress = () => clearTimeout(timerRef.current)

  const onMouseDown = (e) => {
    if (e.button !== 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    startPress(e.clientX - rect.left, e.clientY - rect.top)
  }

  const onTouchStart = (e) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
    const rect = canvasRef.current.getBoundingClientRect()
    startPress(t.clientX - rect.left, t.clientY - rect.top)
  }

  const onTouchMove = (e) => {
    if (!touchStart.current) return
    const t  = e.touches[0]
    const dx = Math.abs(t.clientX - touchStart.current.x)
    const dy = Math.abs(t.clientY - touchStart.current.y)
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) cancelPress()
  }

  // ── Helpers pins ────────────────────────────────────────────
  const pinPos = (pin) => ({
    x: pin.normalizedX * canvasSize.w,
    y: pin.normalizedY * canvasSize.h,
  })

  const getPinColor = (pin) => {
    const allObs = localObs.length > 0 ? localObs : observations
    const obs = allObs.find(o => o.id === pin.observationId)
    if (!obs?.lotId) return '#9CA3AF'
    const lot = lots.find(l => l.id === obs.lotId)
    return lot?.color || '#9CA3AF'
  }

  const getPinObs = (pin) => {
    const allObs = localObs.length > 0 ? localObs : observations
    return allObs.find(o => o.id === pin.observationId)
  }

  const pagePins = pins.filter(p => p.pageIndex === pageNum - 1)

  // ── Render ──────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* TopBar */}
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>← Docs</button>
        <div className="topbar-divider" />
        <div className="topbar-title">
          <h1>{document.name}</h1>
          {totalPages > 0 && <p>{totalPages} page{totalPages > 1 ? 's' : ''} · {(document.fileSize / 1024 / 1024).toFixed(1)} Mo</p>}
        </div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {totalPages > 1 && <>
            <button className="btn btn-ghost btn-xs" disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)}>‹</button>
            <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, minWidth: 40, textAlign: 'center' }}>{pageNum}/{totalPages}</span>
            <button className="btn btn-ghost btn-xs" disabled={pageNum >= totalPages} onClick={() => setPageNum(p => p + 1)}>›</button>
          </>}
          <button className="btn btn-ghost btn-xs" onClick={() => setScale(s => Math.min(+(s + 0.25).toFixed(2), 4))}>＋</button>
          <span style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, minWidth: 34, textAlign: 'center' }}>{Math.round(scale * 100)}%</span>
          <button className="btn btn-ghost btn-xs" onClick={() => setScale(s => Math.max(+(s - 0.25).toFixed(2), 0.25))}>－</button>
        </div>
      </div>

      {/* Hint */}
      <div style={{
        background: placing ? 'var(--orange)' : 'var(--orange-bg)',
        borderBottom: '1px solid var(--orange-light)',
        padding: '7px 16px', fontSize: 12,
        color: placing ? 'white' : 'var(--orange-hover)',
        flexShrink: 0, transition: 'background 0.2s',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>{placing ? '📍 Placement en cours...' : 'Maintenez appuyé sur le plan pour placer une observation'}</span>
        <span style={{ opacity: 0.7 }}>{pagePins.length} pin{pagePins.length !== 1 ? 's' : ''} sur cette page</span>
      </div>

      {/* Zone principale */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* PDF + pins */}
        <div
          ref={containerRef}
          style={{
            flex: 1, overflow: 'auto',
            background: '#525659',
            display: 'flex', justifyContent: 'center',
            alignItems: 'flex-start', padding: 24,
          }}
        >
          {loading && !error && (
            <div style={{ color: 'rgba(255,255,255,.6)', marginTop: 60, fontSize: 15 }}>Chargement...</div>
          )}
          {error && (
            <div style={{ color: '#FCA5A5', marginTop: 60, fontSize: 15 }}>⚠️ {error}</div>
          )}

          <div style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}>
            <canvas
              ref={canvasRef}
              onMouseDown={onMouseDown}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={onTouchStart}
              onTouchEnd={cancelPress}
              onTouchMove={onTouchMove}
              style={{
                display: 'block',
                cursor: 'crosshair',
                boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
              }}
            />

            {/* ── PINS ── */}
            {canvasSize.w > 0 && pagePins.map(pin => {
              const obs   = getPinObs(pin)
              const color = getPinColor(pin)
              const pos   = pinPos(pin)
              const isSel = selPin?.id === pin.id

              return (
                <div
                  key={pin.id}
                  onClick={e => { e.stopPropagation(); setSelPin(isSel ? null : pin) }}
                  style={{
                    position: 'absolute',
                    left: pos.x - 15,
                    top:  pos.y - 34,
                    cursor: 'pointer',
                    zIndex: isSel ? 20 : 10,
                    transform: isSel ? 'scale(1.25)' : 'scale(1)',
                    transition: 'transform 0.1s',
                    filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))',
                  }}
                >
                  <div style={{
                    width: 30,
                    height: 30,
                    background: color,
                    border: '2.5px solid white',
                    borderRadius: '50% 50% 50% 0',
                    transform: 'rotate(-45deg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                  }}>
                    <span style={{
                      transform: 'rotate(45deg)',
                      color: 'white',
                      fontSize: (obs?.number ?? 0) > 99 ? 9 : 11,
                      fontWeight: 700,
                      lineHeight: 1,
                    }}>
                      {obs?.number ?? '?'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panneau latéral */}
        {selPin && (() => {
          const obs   = getPinObs(selPin)
          const color = getPinColor(selPin)
          if (!obs) return null
          const lot = obs.lotId ? lots.find(l => l.id === obs.lotId) : null
          return (
            <div style={{
              width: 268, flexShrink: 0,
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column',
            }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                    {obs.number}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Obs. #{obs.number}</span>
                </div>
                <button onClick={() => setSelPin(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--muted)', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                  <Pill config={STATUS[obs.status]} small />
                  <Pill config={CRITICALITY[obs.criticality]} small />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{obs.title}</p>
                {obs.description && <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 10 }}>{obs.description}</p>}
                {lot && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    {lot.name}{lot.company ? ` — ${lot.company}` : ''}
                  </div>
                )}
                {obs.dueDate && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Délai : {obs.dueDate}</p>}
              </div>
              <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => onObsSelect(obs)}
                >
                  Ouvrir la fiche →
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}