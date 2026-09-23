<template>
  <div class="page">
    <header class="bar">
      <button class="back" @click="leave" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1>{{ isEdit ? '编辑动作' : '创建动作' }}</h1>
      <button class="save" :disabled="!canSave" @click="submit">
        {{ isEdit ? '保存' : '创建' }}
      </button>
    </header>

    <div class="body">
      <div class="card">
        <div class="card-title"><span>动作名称</span></div>
        <div class="field">
          <input v-model="form.name" placeholder="给动作起个名吧" />
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span>锻炼部位</span></div>
        <div class="field">
          <select v-model="form.group">
            <option v-for="g in MUSCLE_GROUPS" :key="g" :value="g">{{ g }}</option>
          </select>
          <span class="caret" />
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span>所需器材</span></div>
        <div class="chips">
          <button
            v-for="k in EQUIP_KEYS"
            :key="k"
            class="chip"
            :class="{ on: form.equipment.includes(k) }"
            @click="toggleEquip(k)"
          >
            {{ EQUIPMENT_LABEL[k] }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-title"><span>动作封面</span></div>
        <div class="covers">
          <div v-for="(src, i) in covers" :key="i" class="cover">
            <img v-if="src" :src="src" alt="封面" @click="removeCover(i)" />
            <label v-else class="cover-add">
              <input type="file" accept="image/*" hidden @change="onFile($event, i)" />
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8.5" cy="9.5" r="1.5" />
                <path d="M4 17l4.5-4.5L12 16l3-3 5 5" />
              </svg>
            </label>
          </div>
        </div>
        <p class="hint">有图就点一下再选，没有可以留空。点已上传的图可以删掉。</p>
      </div>

      <div class="card">
        <div class="card-title">
          <span>动作步骤</span>
          <span class="more">{{ form.stepsText.length }}/200</span>
        </div>
        <textarea
          v-model="form.stepsText"
          class="ta"
          rows="4"
          maxlength="200"
          placeholder="一句话一步，用换行分开，例如：&#10;掌心朝下抓握哑铃，准备卧推&#10;仰卧在训练凳上，将哑铃举到胸部上方"
        />
      </div>

      <div class="card">
        <div class="card-title"><span>动作要点</span></div>
        <textarea v-model="form.cuesText" class="ta" rows="3" placeholder="请输入动作要点，如发力部位、感觉等" />
      </div>

      <div class="card">
        <div class="card-title"><span>呼吸节奏</span></div>
        <textarea v-model="form.breathing" class="ta" rows="2" placeholder="请输入呼吸节奏，如上推呼气，下放吸气" />
      </div>

      <div class="card">
        <div class="card-title"><span>动作感觉</span></div>
        <textarea v-model="form.feel" class="ta" rows="2" placeholder="做这个动作时应该是什么感觉" />
      </div>

      <div class="card">
        <div class="card-title"><span>常见错误</span></div>
        <textarea v-model="form.mistakesText" class="ta" rows="3" placeholder="请输入练习本动作时的常见错误" />
      </div>

      <button v-if="isEdit" class="del" @click="askingDelete = true">删除这个动作</button>
    </div>

    <ConfirmDialog
      :visible="askingDelete"
      title="确定删除这个动作？"
      message="删除后它不再出现在动作库里。已经排进计划的地方不受影响，还是正常显示动作名。「设置 → 数据」里可以恢复。"
      confirm-text="删除"
      cancel-text="取消"
      danger
      @confirm="remove"
      @cancel="askingDelete = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Equipment, Exercise, MuscleGroup, Pattern } from '@/types'
import { EQUIPMENT_LABEL, MUSCLE_GROUPS } from '@/data/exercises'
import { useExerciseStore } from '@/stores/exercise'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { addGif, fileToDataUrl } from '@/utils/imageStore'
import { refreshThumbs } from '@/utils/thumbs'
import { blankExercise } from '@/stores/exercise'

const route = useRoute()
const router = useRouter()
const store = useExerciseStore()

const editId = computed(() => String(route.params.id ?? ''))
const isEdit = computed(() => !!editId.value)

const EQUIP_KEYS: Equipment[] = [
  'bodyweight',
  'dumbbell',
  'barbell',
  'machine',
  'cable',
  'band',
  'bench',
  'mat',
  'kettlebell',
  'cardio',
]

const covers = ref<(string | null)[]>([null, null])

const askingDelete = ref(false)

const form = reactive({
  name: '',
  group: '胸' as MuscleGroup,
  equipment: ['bodyweight'] as Equipment[],
  stepsText: '',
  cuesText: '',
  breathing: '',
  feel: '',
  mistakesText: '',
  rest: 60,
})

const canSave = computed(() => !!form.name.trim())

onMounted(() => {
  if (!isEdit.value) return
  const e = store.list.find((x) => x.id === editId.value)
  if (!e) return
  form.name = e.name
  form.group = e.group
  form.equipment = [...e.equipment]
  form.stepsText = (e.steps ?? []).join('\n')
  form.cuesText = (e.cues ?? []).join('\n')
  form.breathing = e.breathing ?? ''
  form.feel = e.feel ?? ''
  form.mistakesText = (e.mistakes ?? []).join('\n')
  form.rest = e.rest
})

function toggleEquip(k: Equipment) {
  const i = form.equipment.indexOf(k)
  if (i >= 0) {
    if (form.equipment.length > 1) form.equipment.splice(i, 1)
  } else form.equipment.push(k)
}

async function onFile(ev: Event, i: number) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 8 * 1024 * 1024) {
    window.alert('图片太大了，单张请控制在 8MB 以内')
    return
  }
  covers.value[i] = await fileToDataUrl(file)
}

function removeCover(i: number) {
  covers.value[i] = null
}

const PATTERN_BY_GROUP: Record<string, Pattern> = {
  热身: 'stretch',
  拉伸: 'stretch',
  有氧: 'cardio',
  胸: 'push',
  背: 'pull',
  腿: 'squat',
  肩: 'push',
  二头: 'pull',
  三头: 'push',
  小腿: 'squat',
  前臂: 'pull',
  臀部: 'hinge',
  腹部: 'core',
}

function lines(t: string): string[] {
  return t
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean)
}

async function submit() {
  if (!canSave.value) return
  const base: Exercise = isEdit.value
    ? ({ ...blankExercise(), ...store.list.find((x) => x.id === editId.value) } as Exercise)
    : blankExercise()

  const patch: Partial<Exercise> = {
    name: form.name.trim(),
    en: base.en ?? '',
    group: form.group,
    equipment: [...form.equipment],
    pattern: PATTERN_BY_GROUP[form.group] ?? 'push',
    // 详情页页头的主肌群标签读的是 primary，自建动作没别的来源，就用选好的「锻炼部位」
    // （编辑内置动作时，没改部位就保留它原有的 primary，别把次要肌群信息抹掉）
    primary: base.primary.length && base.group === form.group ? base.primary : [form.group],
    steps: lines(form.stepsText),
    cues: lines(form.cuesText),
    breathing: form.breathing.trim() || undefined,
    feel: form.feel.trim() || undefined,
    mistakes: lines(form.mistakesText),
    custom: true,
    rest: form.rest,
  }

  let id = editId.value
  if (isEdit.value) {
    // 内置动作也走这里：store 会存一份同 id 的副本覆盖它
    store.saveExercise(id, patch)
  } else {
    const created = store.addCustom({ ...base, ...patch } as Exercise)
    id = created.id
  }

  const images = covers.value.filter(Boolean) as string[]
  for (const src of images) {
    await addGif(id, src, form.name.trim())
  }
  await refreshThumbs()

  router.replace('/exercises/' + id)
}

function remove() {
  askingDelete.value = false
  store.removeExercise(editId.value)
  router.replace('/exercises')
}

function leave() {
  if (window.history.length > 1) router.back()
  else router.replace('/exercises')
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 40px;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 40px 1fr 56px;
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 8px) 10px 8px;
  background: var(--card);
}

.back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
}

.back svg {
  width: 22px;
  height: 22px;
}

.bar h1 {
  text-align: center;
  font-size: 16.5px;
  font-weight: 600;
}

.save {
  justify-self: end;
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  background: #3c4149;
  color: #fff;
  font-size: 13.5px;
}

.save:disabled {
  opacity: 0.4;
}

.body {
  padding: 12px 14px 0;
}

.field {
  display: flex;
  align-items: center;
  height: 44px;
  border-radius: var(--r-md);
  background: var(--surface-2);
  padding: 0 13px;
}

.field input,
.field select {
  flex: 1;
  min-width: 0;
  font-size: 14.5px;
  background-color: transparent;
  color: var(--ink-1);
  appearance: none;
}

/* 原生下拉的弹层在夜间会用系统白底，不显式给 option 上色就是白底白字 */
.field select option {
  background-color: var(--card);
  color: var(--ink-1);
}

.caret {
  flex: none;
  width: 7px;
  height: 7px;
  margin-left: 8px;
  margin-top: -4px;
  border-right: 1.6px solid var(--ink-3);
  border-bottom: 1.6px solid var(--ink-3);
  transform: rotate(45deg);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chip {
  height: 32px;
  padding: 0 13px;
  border-radius: 16px;
  background: var(--surface-3);
  color: var(--ink-2);
  font-size: 13px;
}

.chip.on {
  background: var(--brand-soft);
  color: var(--brand-1);
  font-weight: 600;
  box-shadow: inset 0 0 0 1.4px var(--brand-1);
}

.covers {
  display: flex;
  gap: 12px;
}

.cover {
  width: 96px;
  height: 96px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-2);
}

.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-add {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px dashed var(--line-2);
  border-radius: 10px;
  color: var(--ink-4);
}

.cover-add svg {
  width: 26px;
  height: 26px;
}

.hint {
  font-size: 11.5px;
  color: var(--ink-3);
  line-height: 1.5;
  margin-top: 10px;
}

.ta {
  width: 100%;
  border-radius: var(--r-md);
  background: var(--surface-2);
  padding: 11px 12px;
  font-size: 13.5px;
  line-height: 1.6;
  resize: none;
}

.card-title .more {
  font-size: 11.5px;
  color: var(--ink-4);
}

.del {
  width: 100%;
  padding: 14px;
  font-size: 13.5px;
  color: var(--danger);
}
</style>
