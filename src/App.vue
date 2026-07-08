<template>
  <div class="app">
    <header class="app-header"><h1>Photo Tool</h1></header>
    <div class="main-layout">
      <div class="left-panel">
        <PhotoPanel
          :original-url="originalUrl"
          :processed-url="processedUrl"
          :show-processed="showProcessed"
          :selected-bg-color="selectedBgColor"
          :processing="processing"
          :processing-status="processingStatus"
          :photo-list="photoList"
          :is-batch-mode="isBatchMode"
          :bg-processed="bgProcessed"
          @upload-single="onUploadSingle"
          @upload-batch="onUploadBatch"
          @reset="onReset"
          @select-bg-color="onColorChange"
          @remove-batch-item="onRemoveItem"
        />
      </div>
      <div class="right-panel">
        <SettingsPanel
          :is-batch-mode="isBatchMode"
          :has-photos="hasPhotos"
          :has-processed="hasProcessed"
          :current-exam-id="examId"
          :width="sw"
          :height="sh"
          :min-size="smin"
          :max-size="smax"
          :selected-bg-color="selectedBgColor"
          :processing="processing" @download="onDownload"
          @update:currentExamId="examId=$event"
          @update:width="sw=$event"
          @update:height="sh=$event"
          @update:minSize="smin=$event"
          @update:maxSize="smax=$event"
        />
      </div>
    </div>
    <div v-if="dlg.show" class="modal" @click.self="dlg.show=false">
      <div class="modal-box"><p>{{ dlg.msg }}</p>
        <div class="modal-btns">
          <button class="btn-cancel" @click="dlg.show=false">Cancel</button>
          <button class="btn-ok" @click="dlg.show=false;dlg.fn?.()">OK</button>
        </div>
      </div>
    </div>
  </div>
    <footer class="app-footer">支持国考、省考、公务员、法考、教资、考研、事业编、一建二建、会计资格证等各类考试报名证件照在线处理，一键换底色、裁剪尺寸。</footer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import PhotoPanel from './components/PhotoPanel.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import { removeImageBackground, getPersonBounds, calcSmartCrop,
  removeImageBackgroundFast, compositeAndResize, compositePreview, resizeImage,
  blobToDataURL, compressImage, yieldToUI } from './utils/imageProcessor.js'
import { examPresets } from './data/examPresets.js'
import JSZip from 'jszip'; import { saveAs } from 'file-saver'

const originalBlob = ref(null)
const originalUrl = ref('')
const processedBlob = ref(null)
const processedUrl = ref('')
const showProcessed = ref(false)
const isBatchMode = ref(false)
const photoList = ref([])
const batDone = ref(false)
const examId = ref('')
const sw = ref(0), sh = ref(0), smin = ref(0), smax = ref(0)
const selectedBgColor = ref('')
const processing = ref(false)
const processingStatus = ref('')
const cachedForeground = ref(null)
const bgProcessed = ref(false)
const dlg = ref({ show: false, msg: '', fn: null })

const hasPhotos = computed(() => isBatchMode.value ? photoList.value.length > 0 : !!originalUrl.value)
const hasProcessed = computed(() => isBatchMode.value ? batDone.value : showProcessed.value)

async function toPreview(f) { const b = new Blob([f], { type: f.type }); return { blob: b, url: await blobToDataURL(b) } }

async function onUploadSingle(f) {
  isBatchMode.value = false; photoList.value = []; batDone.value = false
  cachedForeground.value = null; bgProcessed.value = false
  const { blob, url } = await toPreview(f)
  originalBlob.value = blob; originalUrl.value = url
  processedBlob.value = null; processedUrl.value = ''; showProcessed.value = false
}

async function onUploadBatch(files) {
  isBatchMode.value = true; originalBlob.value = null; originalUrl.value = ''; showProcessed.value = false; batDone.value = false
  cachedForeground.value = null; bgProcessed.value = false
  photoList.value = []
  for (const f of files) { const { blob, url } = await toPreview(f); photoList.value.push({ file: blob, preview: url, processed: null }) }
}

function onReset() {
  cachedForeground.value = null; bgProcessed.value = false
  originalBlob.value = null; originalUrl.value = ''
  processedBlob.value = null; processedUrl.value = ''; showProcessed.value = false
  photoList.value = []; isBatchMode.value = false; batDone.value = false; selectedBgColor.value = ''
}

function onRemoveItem(i) { photoList.value.splice(i, 1); if (photoList.value.length === 0) { isBatchMode.value = false; batDone.value = false } }

async function onColorChange(hex) {
  selectedBgColor.value = hex
  if (!hex || !originalBlob.value) { showProcessed.value = false; return }
  if (isBatchMode.value) return
  processing.value = true; processingStatus.value = ''
  try {
    // Cache hit: instant composite with smart crop
    if (cachedForeground.value) {
      processingStatus.value = ''
      const bm = await createImageBitmap(cachedForeground.value)
      const bounds = await getPersonBounds(cachedForeground.value)
      const crop = calcSmartCrop(bounds, 300, 400)
      const pw = Math.min(crop.sw, bm.width); const ph = Math.min(crop.sh, bm.height)
      const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph
      const ctx = cv.getContext('2d')
      ctx.fillStyle = hex; ctx.fillRect(0, 0, pw, ph)
      ctx.drawImage(bm, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph); bm.close()
      const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.95))
      processedBlob.value = blob; processedUrl.value = await blobToDataURL(blob)
      showProcessed.value = true; bgProcessed.value = true; processingStatus.value = ''; return
    }

    // Downscale for speed before API call
    processingStatus.value = 'Preparing...'
    const bm = await createImageBitmap(originalBlob.value)
    const maxDim = 800; let w = bm.width, h = bm.height
    if (Math.max(w, h) > maxDim) { const s = maxDim / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s) }
    const tmpCv = document.createElement('canvas'); tmpCv.width = w; tmpCv.height = h
    tmpCv.getContext('2d').drawImage(bm, 0, 0, w, h); bm.close()
    const smallBlob = await new Promise(r => tmpCv.toBlob(r, 'image/jpeg', 0.92))
    const dataUrl = await blobToDataURL(smallBlob)

    // API call
    processingStatus.value = 'AI processing...'
    const res = await fetch('/api/remove-bg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: dataUrl }) })
    const json = await res.json()
    if (json.error) { processingStatus.value = 'API err: ' + json.error.slice(0,40); return }
    const raw = json.foreground.replace(/^data:image\/\w+;base64,/, '')
    const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
    const fg = new Blob([bytes], { type: 'image/png' })
    cachedForeground.value = fg

    // Smart crop + composite
    processingStatus.value = 'Compositing...'
    const fgBm = await createImageBitmap(fg)
    const bounds = await getPersonBounds(fg)
    const crop = calcSmartCrop(bounds, 300, 400)
    const pw = Math.min(crop.sw, fgBm.width); const ph = Math.min(crop.sh, fgBm.height)
    const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph
    const ctx = cv.getContext('2d')
    ctx.fillStyle = hex; ctx.fillRect(0, 0, pw, ph)
    ctx.drawImage(fgBm, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, pw, ph); fgBm.close()
    const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.95))
    processedBlob.value = blob; processedUrl.value = await blobToDataURL(blob)
    showProcessed.value = true; bgProcessed.value = true; processingStatus.value = ''
  } catch (e) { processingStatus.value = 'ERR:'+(e.message||'unknown').slice(0,40); console.error(e) }
  finally { processing.value = false }
}
async function onDownload() { if (isBatchMode.value) await dBatch(); else await dSingle() }

async function dSingle() {
  const b = originalBlob.value; if (!b) return
  if (!selectedBgColor.value && sw.value === 0) { dlg.value = { show: true, msg: 'Download original?', fn: () => saveBlob(b, 'photo.jpg') }; return }
  processing.value = true; processingStatus.value = '...'
  try {
    let r = b
    if (selectedBgColor.value && cachedForeground.value) { r = sw.value ? await compositeAndResize(cachedForeground.value, selectedBgColor.value, sw.value, sh.value) : await compositePreview(cachedForeground.value, selectedBgColor.value) }
    else if (selectedBgColor.value && !cachedForeground.value) { const fg = await removeImageBackground(b); cachedForeground.value = fg; r = sw.value ? await compositeAndResize(fg, selectedBgColor.value, sw.value, sh.value) : await compositePreview(fg, selectedBgColor.value) }
    else if (!selectedBgColor.value && sw.value) { r = await resizeImage(b, sw.value, sh.value) }
    if (smax.value > 0) r = await compressImage(r, smax.value, smin.value)
    saveBlob(r, 'photo_' + (sw.value||'w') + 'x' + (sh.value||'h') + '.jpg'); processingStatus.value = ''
  } catch (e) { processingStatus.value = 'Err: ' + (e.message||'unknown').slice(0,30); console.error('onColorChange error:', e) } finally { processing.value = false }
}

async function dBatch() {
  if (photoList.value.length === 0) return
  processing.value = true; processingStatus.value = '...'
  try {
    const zip = new JSZip()
    for (let i = 0; i < photoList.value.length; i++) {
      processingStatus.value = (i + 1) + '/' + photoList.value.length
      let b = photoList.value[i].file
      if (selectedBgColor.value) { const fg = await removeImageBackground(b); b = sw.value ? await compositeAndResize(fg, selectedBgColor.value, sw.value, sh.value) : await compositePreview(fg, selectedBgColor.value) }
      else if (sw.value) b = await resizeImage(b, sw.value, sh.value)
      if (smax.value > 0) b = await compressImage(b, smax.value, smin.value)
      zip.file('photo_' + (i + 1) + '.jpg', b)
    }
    const zb = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }); saveAs(zb, 'photos.zip'); processingStatus.value = ''
  } catch (e) { processingStatus.value = 'Err: ' + (e.message||'unknown').slice(0,30); console.error('onColorChange error:', e) } finally { processing.value = false }
}

function saveBlob(b, n) { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = n; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u) }

watch(examId, id => { if (!id) return; const e = examPresets.find(x => x.id === id); if (e && e.bgColors.length === 1 && selectedBgColor.value !== e.bgColors[0]) onColorChange(e.bgColors[0]) })
</script>

<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;overflow:hidden}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;background:#f0f2f5;color:#333;line-height:1.5}
.app{height:100vh;max-width:1000px;margin:0 auto;padding:12px 16px;display:flex;flex-direction:column}
.app-header{text-align:center;margin-bottom:10px;flex-shrink:0}
.app-header h1{font-size:20px;font-weight:700;color:#1a1a2e}
.main-layout{flex:1;display:grid;grid-template-columns:1fr 280px;gap:16px;min-height:0}
@media(max-width:720px){.main-layout{grid-template-columns:1fr}}
.left-panel,.right-panel{background:#fff;border-radius:10px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.06);border:1px solid #e5e7eb;overflow-y:auto}
.modal{position:fixed;inset:0;z-index:100;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}
.modal-box{background:#fff;border-radius:12px;padding:24px;max-width:360px;width:90%;box-shadow:0 8px 30px rgba(0,0,0,.15)}
.modal p{font-size:15px;margin-bottom:20px}
.modal-btns{display:flex;gap:10px;justify-content:flex-end}
.btn-cancel,.btn-ok{padding:8px 18px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit}
.btn-cancel{background:#f0f0f0;color:#555}.btn-cancel:hover{background:#e0e0e0}
.btn-ok{background:#4185D3;color:#fff}.btn-ok:hover{background:#3575c0}
.app-footer{text-align:center;padding:8px;font-size:12px;color:#999;flex-shrink:0;border-top:1px solid #eee;margin-top:auto}</style>