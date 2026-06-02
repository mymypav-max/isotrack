// Lit l'orientation EXIF pour corriger la rotation iOS camera
const getExifOrientation = (file) => new Promise(resolve => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const view = new DataView(e.target.result)
    if (view.getUint16(0, false) !== 0xFFD8) { resolve(1); return }
    const length = view.byteLength
    let offset = 2
    while (offset < length) {
      const marker = view.getUint16(offset, false)
      offset += 2
      if (marker === 0xFFE1) {
        if (view.getUint32(offset += 2, false) !== 0x45786966) { resolve(1); return }
        const little = view.getUint16(offset += 6, false) === 0x4949
        offset += view.getUint32(offset + 4, little)
        const tags = view.getUint16(offset, little)
        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + (i * 12) + 2, little) === 0x0112) {
            resolve(view.getUint16(offset + (i * 12) + 8, little)); return
          }
        }
      } else if ((marker & 0xFF00) !== 0xFF00) break
      else offset += view.getUint16(offset, false)
    }
    resolve(1)
  }
  reader.onerror = () => resolve(1)
  reader.readAsArrayBuffer(file.slice(0, 65536))
})

export const compressPhoto = async (file, maxDim = 1200, quality = 0.78) => {
  // Normalise les arguments (accepte objet ou nombre)
  if (typeof maxDim === 'object') { maxDim = maxDim.maxWidth || 1200 }

  const orientation = await getExifOrientation(file)
  const url = URL.createObjectURL(file)

  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      try {
        let sw = img.naturalWidth  || img.width  || 1
        let sh = img.naturalHeight || img.height || 1

        // Rotation EXIF : swap dimensions si besoin
        const rotated = [5,6,7,8].includes(orientation)
        let w = rotated ? sh : sw
        let h = rotated ? sw : sh

        // Redimensionnement
        const MAX_DIM = Math.min(maxDim, 2048) // iOS safe limit
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round((h / w) * MAX_DIM); w = MAX_DIM }
          else       { w = Math.round((w / h) * MAX_DIM); h = MAX_DIM }
        }

        const canvas = document.createElement('canvas')
        canvas.width  = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Canvas indisponible')); return }

        // Applique la rotation EXIF
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, w, h)
        ctx.save()
        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, w, 0); break
          case 3: ctx.transform(-1, 0, 0, -1, w, h); break
          case 4: ctx.transform(1, 0, 0, -1, 0, h); break
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
          case 6: ctx.transform(0, 1, -1, 0, h, 0); break
          case 7: ctx.transform(0, -1, -1, 0, h, w); break
          case 8: ctx.transform(0, -1, 1, 0, 0, w); break
          default: break
        }
        ctx.drawImage(img, 0, 0, sw, sh)
        ctx.restore()

        const result = canvas.toDataURL('image/jpeg', quality)

        // Vérification que le canvas n'est pas vide (bug iOS)
        if (!result || result.length < 200 || result === 'data:,') {
          // Fallback : lire directement en base64
          const fr = new FileReader()
          fr.onload = e => resolve(e.target.result)
          fr.onerror = reject
          fr.readAsDataURL(file)
          return
        }

        resolve(result)
      } catch(e) {
        // Fallback base64 brut
        const fr = new FileReader()
        fr.onload = ev => resolve(ev.target.result)
        fr.onerror = reject
        fr.readAsDataURL(file)
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      // Fallback
      const fr = new FileReader()
      fr.onload = e => resolve(e.target.result)
      fr.onerror = reject
      fr.readAsDataURL(file)
    }

    img.src = url
  })
}

export const generateThumbnail = (base64DataUrl, maxDim = 300) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let w = img.naturalWidth || img.width
      let h = img.naturalHeight || img.height
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h / w) * maxDim); w = maxDim }
        else       { w = Math.round((w / h) * maxDim); h = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(base64DataUrl); return }
      ctx.drawImage(img, 0, 0, w, h)
      const result = canvas.toDataURL('image/jpeg', 0.6)
      resolve(result.length > 200 ? result : base64DataUrl)
    }
    img.onerror = () => resolve(base64DataUrl)
    img.src = base64DataUrl
  })
}