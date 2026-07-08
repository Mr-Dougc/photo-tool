<template>
  <div class="photo-panel">
    <!-- 未上传 -->
    <div v-if="!hasPhotos" class="upload-area" @drop.prevent="onDrop" @dragover.prevent>
      <div class="upload-buttons">
        <button class="btn btn-upload" @click="triggerUpload('single')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          上传照片
        </button>
        <button class="btn btn-upload-secondary" @click="triggerUpload('batch')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="8" height="8" rx="1"/><rect x="14" y="2" width="8" height="8" rx="1"/>
            <rect x="2" y="14" width="8" height="8" rx="1"/><rect x="14" y="14" width="8" height="8" rx="1"/>
          </svg>
          批量
        </button>
        <button class="btn btn-upload-secondary" @click="onCameraCapture">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
          </svg>
          拍照
        </button>
      </div>
      <p class="upload-hint">支持 JPG/PNG，拖拽图片到此处</p>
    </div>

    <!-- 已有照片 -->
    <div v-else class="photo-preview-area">
      <!-- 单张模式 -->
      <template v-if="!isBatchMode">
        <div class="photo-container">
          <div v-if="processing" class="processing-overlay">
            <div class="spinner"></div>
            <p class="proc-text">{{ processingStatus || '处理中...' }}</p>
          </div>
          <img
            v-if="showProcessed && processedUrl"
            :src="processedUrl"
            alt="处理后照片"
            class="photo-img"
          />
          <img
            v-else
            :src="originalUrl"
            alt="原始照片"
            class="photo-img"
          />
        </div>
        <!-- 提示 -->
        <div v-if="!showProcessed && hasPhotos" class="hint-text">
          💡 点击下方底色按钮即可实时预览换色效果
        </div>
        <div v-if="bgProcessed" class="badge-cached">⚡ 背景已缓存，切换色板无需等待</div>
      </template>

      <!-- 批量模式 -->
      <template v-else>
        <div class="batch-gallery">
          <div v-for="(item, i) in photoList" :key="i" class="batch-item">
            <img :src="item.preview" class="batch-thumb" />
            <span class="batch-index">{{ i + 1 }}</span>
            <button class="btn-remove" @click="removeItem(i)">×</button>
          </div>
        </div>
      </template>

      <!-- 重新上传 -->
      <button class="btn btn-reupload" @click="resetUpload">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        重新上传
      </button>

      <!-- 底色按钮 -->
      <div class="color-selector">
        <span class="color-label">底色：</span>
        <button
          v-for="c in bgColors"
          :key="c.hex"
          class="btn-color"
          :class="{ active: selectedBgColor === c.hex }"
          :style="{
            backgroundColor: c.hex,
            border: c.hex === '#FFFFFF' ? '2px solid #ccc' : '2px solid transparent'
          }"
          :title="c.name"
          @click="selectColor(c.hex)"
        >
          <span v-if="c.hex === '#FFFFFF'" class="color-label-on-white">{{ c.name }}</span>
          <span v-else class="color-label-on-dark">{{ c.name }}</span>
        </button>
        <button
          class="btn btn-no-bg"
          :class="{ active: selectedBgColor === '' }"
          @click="selectColor('')"
        >
          不换色
        </button>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      :multiple="uploadMode === 'batch'"
      style="display:none"
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { bgColorList } from '../data/examPresets.js'
import { captureFromCamera } from '../utils/imageProcessor.js'

const props = defineProps({
  originalUrl: String, processedUrl: String, showProcessed: Boolean,
  selectedBgColor: String, processing: Boolean, processingStatus: String,
  photoList: Array, isBatchMode: Boolean, bgProcessed: Boolean
})

const emit = defineEmits(['upload-single','upload-batch','reset','select-bg-color','remove-batch-item'])

const fileInputRef = ref(null)
const uploadMode = ref('single')
const hasPhotosInternal = ref(false)
const bgColors = bgColorList

const hasPhotos = computed(() => {
  if (props.isBatchMode) return props.photoList?.length > 0
  return !!props.originalUrl
})

function triggerUpload(mode) {
  uploadMode.value = mode
  const input = fileInputRef.value
  if (mode === 'camera') { onCameraCapture(); return }
  input.removeAttribute('multiple'); input.removeAttribute('capture')
  if (mode === 'batch') input.setAttribute('multiple', 'multiple')
  input.value = ''; input.click()
}

function onFileSelected(e) {
  const files = e.target.files
  if (!files?.length) return
  if (files.length === 1 && uploadMode.value !== 'batch') emit('upload-single', files[0])
  else emit('upload-batch', Array.from(files))
}

async function onCameraCapture() {
  try {
    const blob = await captureFromCamera()
    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' })
    emit('upload-single', file)
  } catch {
    const input = fileInputRef.value
    input.value = ''; input.setAttribute('capture', 'environment'); input.removeAttribute('multiple')
    input.click()
  }
}

function onDrop(e) {
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
  if (!files.length) return
  files.length === 1 ? emit('upload-single', files[0]) : emit('upload-batch', files)
}

function resetUpload() { emit('reset') }
function selectColor(hex) { emit('select-bg-color', hex) }
function removeItem(index) { emit('remove-batch-item', index) }
</script>

<style scoped>
.photo-panel { display: flex; flex-direction: column; gap: 10px; height: 100%; }
.upload-area {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex: 1; min-height: 260px;
  border: 2px dashed #d0d5dd; border-radius: 10px; background: #f9fafb;
  padding: 24px 16px; cursor: pointer; transition: all 0.2s;
}
.upload-area:hover { border-color: #4185D3; background: #f0f4ff; }
.upload-buttons { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.upload-hint { margin-top: 8px; color: #999; font-size: 12px; }

.btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 16px; border: none; border-radius: 7px;
  font-size: 13px; cursor: pointer; transition: all 0.15s; font-family: inherit;
}
.btn-upload { background: #4185D3; color: #fff; font-size: 15px; padding: 10px 24px; }
.btn-upload:hover { background: #3575c0; }
.btn-upload-secondary { background: #e8edf5; color: #333; }
.btn-upload-secondary:hover { background: #d8e0ed; }

.photo-preview-area { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.photo-container {
  position: relative; display: flex; align-items: center; justify-content: center;
  flex: 1; min-height: 200px; max-height: 300px;
  background: #f7f8fa; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;
}
.photo-img { max-width: 100%; max-height: 100%; object-fit: contain; }

.hint-text { font-size: 12px; color: #999; text-align: center; }
.badge-cached { font-size: 11px; color: #22c55e; text-align: center; }

.processing-overlay {
  position: absolute; inset: 0; z-index: 5;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 8px; background: rgba(255,255,255,0.88);
}
.spinner {
  width: 28px; height: 28px;
  border: 3px solid #e8e8e8; border-top-color: #4185D3;
  border-radius: 50%; animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.proc-text { font-size: 13px; color: #555; }

.btn-reupload { align-self: flex-start; background: #e8edf5; color: #333; }
.btn-reupload:hover { background: #d8e0ed; }

.color-selector { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.color-label { font-size: 13px; color: #666; white-space: nowrap; }
.btn-color {
  width: 32px; height: 32px; border-radius: 50%;
  cursor: pointer; transition: all 0.15s;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; position: relative;
}
.btn-color.active { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #4185D3; }
.color-label-on-white { color: #999; font-weight: 500; }
.color-label-on-dark { color: #fff; font-weight: 500; text-shadow: 0 0 3px rgba(0,0,0,0.3); }

.btn-no-bg {
  background: #f0f0f0; color: #666; font-size: 11px; padding: 3px 10px;
  border-radius: 14px; border: 2px solid transparent; cursor: pointer; font-family: inherit;
}
.btn-no-bg.active { border-color: #4185D3; background: #e8f0fe; color: #4185D3; }

.batch-gallery {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 6px; max-height: 200px; overflow-y: auto;
}
.batch-item { position: relative; border-radius: 5px; overflow: hidden; border: 1px solid #e0e0e0; }
.batch-thumb { width: 100%; height: 68px; object-fit: cover; display: block; }
.batch-index {
  position: absolute; top: 1px; left: 1px;
  background: rgba(0,0,0,0.55); color: #fff;
  font-size: 10px; padding: 0 5px; border-radius: 3px;
}
.btn-remove {
  position: absolute; top: 1px; right: 1px;
  width: 18px; height: 18px; border: none;
  background: rgba(200,50,50,0.8); color: #fff;
  border-radius: 50%; cursor: pointer; font-size: 12px;
  line-height: 1; display: flex; align-items: center; justify-content: center;
}
.btn-remove:hover { background: rgba(200,50,50,1); }
</style>
