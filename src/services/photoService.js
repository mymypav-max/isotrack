export const compressPhoto = (file, maxDim = 1600, quality = 0.70) => {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h / w) * maxDim); w = maxDim }
        else       { w = Math.round((w / h) * maxDim); h = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

export const generateThumbnail = (base64DataUrl, maxDim = 300) => {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let w = img.width, h = img.height
      if (w > maxDim || h > maxDim) {
        if (w > h) { h = Math.round((h / w) * maxDim); w = maxDim }
        else       { w = Math.round((w / h) * maxDim); h = maxDim }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.6))
    }
    img.src = base64DataUrl
  })
}