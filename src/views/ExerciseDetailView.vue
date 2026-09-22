<template>
  <div class="page" v-if="ex">
    <div class="page-head">
      <div class="back" @click="$router.back()">‹</div>
      <h1>{{ ex.name }}</h1>
      <div class="sub">{{ ex.en }}</div>
      <div class="tags">
        <span class="wt">{{ ex.primary.join(' / ') }}</span>
        <span v-for="e in ex.equipment" :key="e" class="wt">{{ EQUIPMENT_LABEL[e] }}</span>
      </div>
    </div>

    <div class="body-pad" style="margin-top: 12px">
      <div class="stat-grid c2">
        <div class="stat-box">
          <div class="v">{{ PATTERN_LABEL[ex.pattern] }}</div>
          <div class="k">动作模式</div>
        </div>
        <div class="stat-box">
          <div class="v">{{ ex.rest }}<small>s</small></div>
          <div class="k">建议组休</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span>次要肌群</span></div>
        <div v-if="ex.secondary.length" class="tag-wrap">
          <span v-for="m in ex.secondary" :key="m" class="tag">{{ m }}</span>
        </div>
        <div v-else class="muted">无</div>
        <div v-if="ex.unilateral" class="tag-wrap" style="margin-top: 8px">
          <span class="tag blue">单侧动作，需两侧分别完成</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">
          <span>动作示范图</span>
          <span class="more">{{ gifs.length }} 张</span>
        </div>

        <div v-if="gifs.length" class="gifs">
          <div v-for="g in gifs" :key="g.id" class="gif-item">
            <img :src="g.dataUrl" :alt="g.name" />
            <button class="gif-del" @click="delGif(g.id)" aria-label="删除">×</button>
          </div>
        </div>
        <div v-else class="gif-empty">还没有示范图，上传 GIF 能更直观看到动作轨迹</div>

        <label class="upload-btn" :class="{ busy: uploading }">
          {{ uploading ? '上传中…' : '+ 上传图片' }}
          <input
            type="file"
            accept="image/gif,image/png,image/jpeg,image/webp"
            multiple
            hidden
            @change="onPickFiles"
          />
        </label>
      </div>

      <div class="card">
        <div class="card-title"><span>动作要领</span></div>
        <ol class="cue-list">
          <li v-for="(c, i) in ex.cues" :key="i">{{ c }}</li>
        </ol>
      </div>

      <div class="card">
        <div class="card-title"><span style="color: var(--danger)">常见错误</span></div>
        <ul class="bad-list">
          <li v-for="(c, i) in ex.mistakes" :key="i">{{ c }}</li>
        </ul>
      </div>
    </div>
  </div>

  <div v-else class="empty" style="padding-top: 80px">
    <div class="t">动作不存在</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { EQUIPMENT_LABEL, PATTERN_LABEL, getExercise } from '@/data/exercises'
import { addGif, fileToDataUrl, listGifs, removeGif, type GifRecord } from '@/utils/imageStore'

const route = useRoute()

const ex = computed(() => getExercise(route.params.id as string))

/* ---------------- 示范图 ---------------- */
const gifs = ref<GifRecord[]>([])
const uploading = ref(false)

async function loadGifs() {
  const id = route.params.id as string
  if (!id) return
  try {
    gifs.value = await listGifs(id)
  } catch {
    gifs.value = []
  }
}
watch(() => route.params.id, loadGifs, { immediate: true })

async function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  const id = route.params.id as string
  if (!files.length || !id) return
  uploading.value = true
  try {
    for (const f of files) {
      if (f.size > 8 * 1024 * 1024) {
        alert(`「${f.name}」超过 8MB，已跳过`)
        continue
      }
      await addGif(id, await fileToDataUrl(f), f.name)
    }
    await loadGifs()
  } catch {
    alert('图片保存失败，可能是浏览器存储空间不足')
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function delGif(gid: string) {
  if (!confirm('确定删除这张图？')) return
  await removeGif(gid)
  await loadGifs()
}
</script>

<style scoped>
.back {
  font-size: 30px;
  line-height: 1;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
  width: 26px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  position: relative;
  z-index: 1;
}

.wt {
  background: var(--surface-3);
  font-size: 11.5px;
  padding: 3px 9px;
  border-radius: 11px;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.muted {
  font-size: 13px;
  color: var(--ink-3);
}

.gifs {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gif-item {
  position: relative;
  border-radius: var(--r-md);
  overflow: hidden;
  background: var(--surface-2);
  line-height: 0;
}

.gif-item img {
  width: 100%;
  height: auto;
  display: block;
}

.gif-del {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 27px;
  height: 27px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 17px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.gif-empty {
  font-size: 12.5px;
  color: var(--ink-3);
  text-align: center;
  padding: 12px 0 4px;
}

.upload-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 10px;
  border: 1px dashed var(--brand-soft-2);
  border-radius: var(--r-md);
  color: var(--brand-1);
  text-align: center;
  font-size: 13.5px;
  font-weight: 600;
}

.upload-btn.busy {
  color: var(--ink-3);
  border-color: var(--line);
}

.cue-list {
  margin-left: 17px;
  list-style: decimal;
}

.cue-list li {
  font-size: 13.5px;
  color: var(--ink-2);
  margin-bottom: 7px;
  line-height: 1.55;
}

.bad-list {
  margin-left: 17px;
  list-style: disc;
}

.bad-list li {
  font-size: 13.5px;
  color: var(--danger);
  margin-bottom: 6px;
  line-height: 1.5;
}
</style>
