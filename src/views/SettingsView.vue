<template>
  <div class="page">
    <div class="page-head">
      <div class="back" @click="$router.back()">‹</div>
      <h1>设置</h1>
      <div class="sub">训练设置与数据</div>
    </div>

    <div class="body-pad" style="margin-top: 12px">
      <div class="card">
        <div class="card-title"><span>外观</span></div>
        <div class="theme-chips">
          <button class="tchip" :class="{ on: theme === 'light' }" @click="setTheme('light')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
            </svg>
            日间模式
          </button>
          <button class="tchip" :class="{ on: theme === 'dark' }" @click="setTheme('dark')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
            </svg>
            夜间模式
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span>训练设置</span></div>
        <button class="nav-row" @click="$router.push('/settings/training')">
          <span>组休提示与计时器</span>
          <span class="chev">›</span>
        </button>
      </div>

      <div class="card">
        <div class="card-title"><span>数据</span></div>
        <div class="data-btns">
          <button class="btn btn-ghost btn-sm" @click="doExport">导出备份</button>
          <button class="btn btn-ghost btn-sm" @click="fileInput?.click()">导入备份</button>
          <button class="btn btn-ghost btn-sm danger" @click="doClear">清空数据</button>
        </div>
        <input ref="fileInput" type="file" accept="application/json" hidden @change="doImport" />
        <div v-if="exportText" class="card-title" style="margin-top: 12px">
          <span>备份内容（可复制保存）</span>
        </div>
        <textarea v-if="exportText" class="ta" :value="exportText" readonly />
        <textarea
          v-if="importMode"
          v-model="importText"
          class="ta"
          placeholder="粘贴备份内容后点下方确认导入"
        />
        <button
          v-if="importMode"
          class="btn btn-primary btn-block"
          style="margin-top: 8px"
          @click="applyImport"
        >
          确认导入
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { clearAll, exportJSON, importJSON } from '@/utils/persist'

const userStore = useUserStore()
// ⚠️ 不能写 `const theme = userStore.theme` —— Pinia 的 store 会自动解包 ref，
// 那样拿到的是字符串快照，切主题时视图不更新
const theme = computed(() => userStore.theme)
const setTheme = userStore.setTheme

const exportText = ref('')
const importMode = ref(false)
const importText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

function doExport() {
  exportText.value = exportJSON()
  const blob = new Blob([exportText.value], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `workout-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
}

function doImport(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  const r = new FileReader()
  r.onload = () => {
    importText.value = String(r.result)
    importMode.value = true
  }
  r.readAsText(f)
}

function applyImport() {
  try {
    importJSON(importText.value)
    alert('导入成功，将刷新页面')
    location.reload()
  } catch {
    alert('导入失败：备份内容格式不正确')
  }
}

function doClear() {
  if (!confirm('确定清空全部训练记录和设置？此操作不可恢复。')) return
  clearAll()
  location.reload()
}
</script>

<style scoped>
.nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 0;
  font-size: 14.5px;
  color: var(--ink-1);
}

.chev {
  color: var(--ink-4);
  font-size: 20px;
}

.back {
  font-size: 30px;
  line-height: 1;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
  width: 26px;
}

.data-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ---------- 外观：日间 / 夜间 ---------- */
.theme-chips {
  display: flex;
  gap: 6px;
}

.tchip {
  flex: 1;
  height: 38px;
  border-radius: 19px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 13.5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
}

.tchip svg {
  width: 16px;
  height: 16px;
  flex: none;
}

.tchip.on {
  background: var(--grad);
  color: #fff;
  font-weight: 600;
}

.ta {
  width: 100%;
  min-height: 120px;
  margin-top: 8px;
  padding: 10px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  font-size: 12px;
  line-height: 1.5;
  resize: vertical;
}
</style>
