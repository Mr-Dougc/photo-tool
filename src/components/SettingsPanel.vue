<template>
  <div class="settings-panel">
    <!-- 考试类型 -->
    <div class="section">
      <label class="section-title">考试类型</label>
      <select v-model="localExamId" class="select" @change="onExamSelect">
        <option value="">-- 手动设置 --</option>
        <option v-for="exam in examPresets" :key="exam.id" :value="exam.id">
          {{ exam.name }}
        </option>
      </select>
    </div>

    <!-- 手动尺寸 -->
    <div class="section">
      <label class="section-title">照片尺寸（像素）</label>
      <div class="row-inputs">
        <div class="input-group">
          <label>宽</label>
          <input v-model.number="localWidth" type="number" min="1" class="input" placeholder="px" @input="onManualInput" />
        </div>
        <span class="sep">×</span>
        <div class="input-group">
          <label>高</label>
          <input v-model.number="localHeight" type="number" min="1" class="input" placeholder="px" @input="onManualInput" />
        </div>
      </div>
    </div>

    <!-- 文件大小 -->
    <div class="section">
      <label class="section-title">文件大小限制</label>
      <div class="row-inputs">
        <div class="input-group">
          <label>最小</label>
          <input v-model.number="localMinSize" type="number" min="0" class="input input-sm" placeholder="KB" />
        </div>
        <div class="input-group">
          <label>最大</label>
          <input v-model.number="localMaxSize" type="number" min="0" class="input input-sm" placeholder="KB" />
        </div>
      </div>
    </div>

    <!-- 当前选择信息 -->
    <div v-if="currentExamInfo || selectedBgColor" class="section info-summary">
      <div v-if="currentExamInfo" class="info-row">
        <span class="info-label">尺寸：</span>
        <span>{{ currentExamInfo.width }}×{{ currentExamInfo.height }}px</span>
      </div>
      <div v-if="currentExamInfo" class="info-row">
        <span class="info-label">文件：</span>
        <span v-if="currentExamInfo.fileSize.min > 0">{{ currentExamInfo.fileSize.min }}~{{ currentExamInfo.fileSize.max }}KB</span>
        <span v-else>≤ {{ currentExamInfo.fileSize.max }}KB</span>
      </div>
      <div class="info-row">
        <span class="info-label">底色：</span>
        <span v-if="selectedBgColor">
          <span class="color-dot" :style="{ backgroundColor: selectedBgColor, border: selectedBgColor === '#FFFFFF' ? '1px solid #ccc' : 'none' }"></span>
          {{ bgColorName }}
        </span>
        <span v-else class="text-muted">未选择（保持原色）</span>
      </div>
    </div>

    <div class="section divider"></div>

    <!-- 下载 -->
    <div class="section">
      <button class="btn btn-download" :class="{ downloading: processing }" :disabled="!hasPhotos" @click="onDownload"><span v-if="processing" class="spin"></span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {{ isBatchMode ? '批量下载' : '下载照片' }}
      </button>
      <p class="download-hint">
        {{ downloadHint }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { examPresets, bgColorList } from '../data/examPresets.js'

const props = defineProps({
  isBatchMode: Boolean, hasPhotos: Boolean, hasProcessed: Boolean, processing: Boolean,
  currentExamId: String, width: Number, height: Number,
  minSize: Number, maxSize: Number, selectedBgColor: String
})
const emit = defineEmits(['download', 'update:currentExamId', 'update:width', 'update:height', 'update:minSize', 'update:maxSize'])

const localExamId = ref(props.currentExamId)
const localWidth = ref(props.width)
const localHeight = ref(props.height)
const localMinSize = ref(props.minSize)
const localMaxSize = ref(props.maxSize)

watch(() => props.currentExamId, v => localExamId.value = v)
watch(() => props.width, v => localWidth.value = v)
watch(() => props.height, v => localHeight.value = v)
watch(() => props.minSize, v => localMinSize.value = v)
watch(() => props.maxSize, v => localMaxSize.value = v)

const currentExamInfo = computed(() =>
  localExamId.value ? examPresets.find(e => e.id === localExamId.value) || null : null
)

const bgColorName = computed(() => {
  if (!props.selectedBgColor) return ''
  const found = bgColorList.find(c => c.hex === props.selectedBgColor)
  return found ? found.name : props.selectedBgColor
})

const downloadHint = computed(() => {
  if (!props.hasPhotos) return '请先上传照片'
  const hints = []
  if (props.selectedBgColor) hints.push('换底色')
  if (localWidth.value > 0 && localHeight.value > 0) hints.push(`${localWidth.value}×${localHeight.value}px`)
  if (hints.length === 0) return '直接下载原始照片'
  return `将 ${hints.join(' + ')} 后下载`
})

function onExamSelect() {
  const exam = examPresets.find(e => e.id === localExamId.value)
  if (exam) {
    localWidth.value = exam.width
    localHeight.value = exam.height
    localMinSize.value = exam.fileSize.min
    localMaxSize.value = exam.fileSize.max
    emit('update:currentExamId', localExamId.value)
    emit('update:width', exam.width)
    emit('update:height', exam.height)
    emit('update:minSize', exam.fileSize.min)
    emit('update:maxSize', exam.fileSize.max)
  } else {
    emit('update:currentExamId', '')
  }
}

function onManualInput() {
  if (localExamId.value) {
    localExamId.value = ''
    emit('update:currentExamId', '')
  }
  emit('update:width', localWidth.value)
  emit('update:height', localHeight.value)
}

watch(localMinSize, v => emit('update:minSize', v))
watch(localMaxSize, v => emit('update:maxSize', v))

function onDownload() {
  emit('download')
}
</script>

<style scoped>
.settings-panel { display: flex; flex-direction: column; gap: 12px; }
.section { display: flex; flex-direction: column; gap: 4px; }
.section-title { font-size: 13px; font-weight: 600; color: #333; }

.select {
  padding: 6px 10px; border: 1px solid #d0d5dd; border-radius: 7px;
  font-size: 13px; background: #fff; color: #333; cursor: pointer;
  font-family: inherit; transition: border-color 0.15s;
}
.select:focus { border-color: #4185D3; outline: none; box-shadow: 0 0 0 2px rgba(65,133,211,0.15); }

.row-inputs { display: flex; align-items: flex-end; gap: 6px; flex-wrap: wrap; }
.input-group { display: flex; flex-direction: column; gap: 1px; }
.input-group label { font-size: 11px; color: #999; }
.input {
  width: 72px; padding: 5px 8px; border: 1px solid #d0d5dd; border-radius: 5px;
  font-size: 13px; font-family: inherit; color: #333; transition: border-color 0.15s;
}
.input:focus { border-color: #4185D3; outline: none; box-shadow: 0 0 0 2px rgba(65,133,211,0.15); }
.input-sm { width: 58px; }
.sep { display: flex; align-items: center; padding-bottom: 4px; font-weight: 600; color: #aaa; font-size: 13px; }

.info-summary { background: #f8f9fa; padding: 8px 10px; border-radius: 7px; font-size: 12px; }
.info-row { margin-bottom: 2px; }
.info-label { color: #888; }
.color-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: middle; margin-right: 3px; }
.text-muted { color: #aaa; }

.divider { border-top: 1px solid #eee; margin: 2px 0; }

.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: 5px; padding: 8px 20px; border: none; border-radius: 7px;
  font-size: 14px; cursor: pointer; font-family: inherit; font-weight: 500;
  transition: all 0.15s; width: 100%;
}
.btn-download { background: #22c55e; color: #fff; }
.btn-download:hover:not(:disabled) { background: #16a34a; }
.btn-download:disabled { background: #b0c4de; cursor: not-allowed; opacity: 0.7; }


.btn-download.downloading { background: #16a34a; pointer-events: none; }
.spin { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; margin-right: 4px; }
@keyframes spin { to { transform: rotate(360deg); } }.download-hint { font-size: 11px; color: #aaa; text-align: center; margin-top: 2px; }
</style>
