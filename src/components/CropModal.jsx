import { useState, useRef } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

const getCroppedImg = (image, crop) => {
  const canvas  = document.createElement('canvas')
  const scaleX  = image.naturalWidth  / image.width
  const scaleY  = image.naturalHeight / image.height
  const MAX     = 2048

  let cw = Math.round(crop.width  * scaleX)
  let ch = Math.round(crop.height * scaleY)

  // Limite iOS
  if (cw > MAX || ch > MAX) {
    const r = Math.min(MAX/cw, MAX/ch)
    cw = Math.round(cw * r); ch = Math.round(ch * r)
  }

  canvas.width = cw; canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, cw, ch)
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, cw, ch
  )
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function CropModal({ src, onApply, onCancel }) {
  const imgRef       = useRef(null)
  const [crop,       setCrop]       = useState()
  const [completed,  setCompleted]  = useState()

  const onImageLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget
    const c = centerCrop(
      makeAspectCrop({ unit:'%', width:90 }, 4/3, w, h),
      w, h
    )
    setCrop(c)
    setCompleted(c)
  }

  const apply = () => {
    if (imgRef.current && completed?.width && completed?.height) {
      onApply(getCroppedImg(imgRef.current, completed))
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
      zIndex: 2000, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'white', borderRadius: 14, overflow: 'hidden',
        width: '100%', maxWidth: 640,
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
      }}>

        {/* Header */}
        <div style={{
          padding: '13px 18px', display: 'flex', alignItems: 'center',
          gap: 10, borderBottom: '1px solid #e5e7eb',
        }}>
          <span style={{ fontSize: 18 }}>✂️</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>Rogner la photo</span>
          <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 4 }}>
            Déplace ou redimensionne le cadre
          </span>
        </div>

        {/* Zone crop */}
        <div style={{
          flex: 1, overflow: 'auto',
          background: '#111827',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, minHeight: 280,
        }}>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompleted(c)}
            aspect={4/3}
            style={{ maxWidth: '100%' }}
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={onImageLoad}
              style={{ maxWidth: '100%', maxHeight: '58vh', display: 'block' }}
            />
          </ReactCrop>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid #e5e7eb',
          display: 'flex', gap: 10,
        }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '11px', borderRadius: 8,
            border: '1.5px solid #e5e7eb', background: 'white',
            cursor: 'pointer', fontSize: 14, fontWeight: 500,
          }}>
            Annuler
          </button>
          <button onClick={apply} style={{
            flex: 1, padding: '11px', borderRadius: 8,
            border: 'none', background: '#EA580C',
            color: 'white', cursor: 'pointer',
            fontSize: 14, fontWeight: 700,
          }}>
            Appliquer
          </button>
        </div>
      </div>
    </div>
  )
}