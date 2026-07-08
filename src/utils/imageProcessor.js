/** API-based background removal via Baidu portrait segmentation */
export function yieldToUI() { return new Promise(r => setTimeout(r, 0)) }

function blobToBitmap(blob, opts) { return createImageBitmap(blob, opts || { resizeQuality: 'high' }) }
function blobToImage(blob) { return new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob); const img = new Image()
  img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
  img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }; img.src = url
})}

export function blobToDataURL(blob) {
  return new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob) })
}

async function callBaiduAPI(imageBlob) {
  const dataUrl = await blobToDataURL(imageBlob)
  const res = await fetch('/api/remove-bg', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl })
  })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  // Decode base64 directly instead of fetch(dataUrl)
  const raw = json.foreground.replace(/^data:image\/\w+;base64,/, '')
  const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
  return new Blob([bytes], { type: 'image/png' })
}

export async function detectBackgroundType() { return { isSolid: false, avgColor: [255,255,255] } }

async function downscaleImage(blob, maxDim) {
  const bitmap = await blobToBitmap(blob)
  if (Math.max(bitmap.width, bitmap.height) <= maxDim) { bitmap.close(); return blob }
  const s = maxDim / Math.max(bitmap.width, bitmap.height)
  const c = document.createElement('canvas'); c.width = Math.round(bitmap.width * s); c.height = Math.round(bitmap.height * s)
  c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height); bitmap.close()
  return new Promise(r => c.toBlob(r, 'image/jpeg', 0.92))
}

export async function removeImageBackgroundFast(blob, onProgress) {
  if (onProgress) onProgress({ remaining: 1, total: 2 })
  const small = await downscaleImage(blob, 512)
  if (onProgress) onProgress({ remaining: 0, total: 2 })
  return await callBaiduAPI(small)
}

export async function removeImageBackground(blob, onProgress) {
  if (onProgress) onProgress({ remaining: 1, total: 2 })
  const small = await downscaleImage(blob, 1024)
  if (onProgress) onProgress({ remaining: 0, total: 2 })
  return await callBaiduAPI(small)
}

export async function fastReplaceBackground(blob, hex, avg) {
  // fallback: just call API
  return await removeImageBackground(blob)
}

export async function getPersonBounds(fgBlob) {
  const bitmap = await blobToBitmap(fgBlob)
  const s = Math.min(1, 200 / bitmap.width)
  const sw = Math.round(bitmap.width * s); const sh = Math.round(bitmap.height * s)
  const c = document.createElement('canvas'); c.width = sw; c.height = sh
  c.getContext('2d').drawImage(bitmap, 0, 0, sw, sh); bitmap.close()
  const d = c.getContext('2d').getImageData(0, 0, sw, sh).data
  let mx = sw, my = sh, Mx = 0, My = 0, found = false
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    if (d[(y * sw + x) * 4 + 3] > 20) { mx = Math.min(mx, x); my = Math.min(my, y); Mx = Math.max(Mx, x); My = Math.max(My, y); found = true }
  }
  if (!found) return { x: 0, y: 0, width: 300, height: 400 }
  const inv = 1 / s
  return { x: Math.round(mx * inv), y: Math.round(my * inv), width: Math.round((Mx - mx) * inv), height: Math.round((My - my) * inv) }
}

export function calcSmartCrop(bounds, tw, th) {
  const { x, y, width: w, height: h } = bounds
  const pa = w / h; const ta = tw / th
  if (pa < ta * 0.65) { const idealH = Math.round(w / ta); const topPad = Math.round(idealH * 0.12); const startY = Math.max(0, y - topPad); return { sx: x, sy: startY, sw: w, sh: Math.min(idealH + topPad, h + (y - startY)) } }
  if (pa > ta * 1.35) { const cw = Math.round(h * ta); return { sx: x + Math.round((w - cw) / 2), sy: y, sw: cw, sh: h } }
  if (pa > ta) { const cw = Math.round(h * ta); return { sx: x + Math.round((w - cw) / 2), sy: y, sw: cw, sh: h } }
  const ch = Math.round(w / ta); return { sx: x, sy: y, sw: w, sh: Math.min(ch, h) }
}

export async function compositeAndResize(fg, bg, tw, th) {
  const bm = await blobToBitmap(fg); const b = await getPersonBounds(fg); const c = calcSmartCrop(b, tw, th)
  const cv = document.createElement('canvas'); cv.width = tw; cv.height = th
  const ctx = cv.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, tw, th)
  ctx.drawImage(bm, c.sx, c.sy, c.sw, c.sh, 0, 0, tw, th); bm.close()
  return new Promise(r => cv.toBlob(r, 'image/jpeg', 0.95))
}

export async function compositePreview(fg, bg) {
  const bm = await blobToBitmap(fg); const b = await getPersonBounds(fg); const c = calcSmartCrop(b, 300, 400)
  const pw = Math.min(c.sw, bm.width); const ph = Math.min(c.sh, bm.height)
  const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph
  const ctx = cv.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, pw, ph)
  ctx.drawImage(bm, c.sx, c.sy, c.sw, c.sh, 0, 0, pw, ph); bm.close()
  return new Promise(r => cv.toBlob(r, 'image/jpeg', 0.92))
}

export async function resizeImage(blob, tw, th) {
  const bm = await blobToBitmap(blob); const cv = document.createElement('canvas'); cv.width = tw; cv.height = th
  const ctx = cv.getContext('2d'); const a = bm.width / bm.height; const ta = tw / th
  let sx, sy, sw, sh
  if (a > ta) { sh = bm.height; sw = bm.height * ta; sx = (bm.width - sw) / 2; sy = 0 }
  else { sw = bm.width; sh = bm.width / ta; sx = 0; sy = (bm.height - sh) / 2 }
  ctx.drawImage(bm, sx, sy, sw, sh, 0, 0, tw, th); bm.close()
  return new Promise(r => cv.toBlob(r, 'image/jpeg', 0.95))
}

export async function compressImage(blob, maxKB, minKB = 0) {
  if (!maxKB || maxKB <= 0) return blob; let q = 0.9; let r = blob
  for (let i = 0; i < 10; i++) {
    if (r.size / 1024 <= maxKB && r.size / 1024 >= minKB) break
    const bm = await blobToBitmap(r); const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height
    cv.getContext('2d').drawImage(bm, 0, 0); bm.close()
    r = await new Promise(resolve => cv.toBlob(resolve, 'image/jpeg', q))
    if (r.size / 1024 > maxKB) q -= 0.1; else if (minKB > 0 && r.size / 1024 < minKB) q += 0.05; else break
    q = Math.max(0.1, Math.min(1, q))
  }
  return r
}

export async function captureFromCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
  return new Promise((resolve, reject) => {
    const v = document.createElement('video'); v.srcObject = stream; v.play()
    v.onloadedmetadata = () => {
      const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight
      c.getContext('2d').drawImage(v, 0, 0); stream.getTracks().forEach(t => t.stop())
      c.toBlob(b => b ? resolve(b) : reject(new Error('capture failed')), 'image/jpeg', 0.95)
    }
  })
}
