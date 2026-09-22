<template>
  <div class="mask" @click.self="$emit('close')">
    <div class="sheet">
      <div class="head">
        <button class="note-btn" @click="editingNote = !editingNote">
          备注
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z" />
          </svg>
        </button>
        <div class="title">{{ title }}</div>
        <button class="x" @click="$emit('close')" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div class="body">
        <div class="exrow">
          <ExThumb :id="item.exerciseId" :size="54" :radius="8" />
          <div class="exmeta">
            <div class="exname">{{ ex?.name || '未知动作' }}</div>
            <div class="exsub">{{ subtitle }}</div>
          </div>
          <span class="gtype">普通组</span>
        </div>

        <textarea
          v-if="editingNote"
          v-model="noteDraft"
          class="notebox"
          rows="2"
          placeholder="给这条动作加个备注，例如「做到力竭」「每侧」"
        />

        <div class="fields" :class="{ three: !showReps }">
          <button
            v-for="f in visibleFields"
            :key="f.key"
            class="field"
            :class="{ on: field === f.key, static: f.static }"
            @click="onFieldTap(f)"
          >
            <span class="fl">{{ f.label }}</span>
            <span class="fv" :class="{ sm: f.small }">
              {{ f.value }}<small v-if="f.suffix">{{ f.suffix }}</small>
            </span>
          </button>
        </div>

        <div class="units">
          <span class="ul">强度单位</span>
          <div class="uchips">
            <button
              v-for="u in UNIT_OPTIONS"
              :key="u.value"
              class="uchip"
              :class="{ on: item.unit === u.value }"
              @click="setUnit(u.value)"
            >
              {{ u.label }}
            </button>
          </div>
        </div>
      </div>

      <NumPad
        :steps="field === 'strength' && item.unit === 'kg' ? dumbbellSteps : undefined"
        :active-step="item.unit === 'kg' ? nearestStep(numOf(item.strength)) : undefined"
        @key="onKey"
        @backspace="onBackspace"
        @confirm="confirm"
        @step="onStep"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Exercise, IntensityUnit, PlanItem } from '@/types'
import { getExercise, subtitleOf } from '@/data/exercises'
import { UNIT_LABEL, UNIT_OPTIONS, fmtNum, isUnitless, needsReps, numOf } from '@/utils/num'
import { useUserStore } from '@/stores/user'
import ExThumb from './ExThumb.vue'
import NumPad from './NumPad.vue'

const props = withDefaults(
  defineProps<{
    item: PlanItem
    title?: string
    /** 没有任何训练历史时，默认给个 10 次的起点 */
    defaultReps?: number
  }>(),
  { title: '添加动作', defaultReps: 10 },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', item: PlanItem): void
}>()

const userStore = useUserStore()

const item = computed(() => props.item)
const ex = computed<Exercise | undefined>(() => getExercise(props.item.exerciseId))
const subtitle = computed(() => (ex.value ? subtitleOf(ex.value) : ''))
const dumbbellSteps = computed(() => userStore.profile.dumbbellSteps)

const showReps = computed(() => needsReps(item.value.unit))

type FieldKey = 'sets' | 'strength' | 'reps' | 'rest'

const field = ref<FieldKey>('sets')
const editingNote = ref(false)
const noteDraft = ref(props.item.note ?? '')

watch(noteDraft, (v) => {
  item.value.note = v || undefined
})

/** 当前正在编辑字段的输入缓冲，让连续按键能正常拼接 */
const buf = ref(String(props.item.sets))

/**
 * 刚选中一个格子时，第一次按数字键直接整格覆盖。
 * 不然改「组休 60 → 90」得先按两次退格，很烦。
 */
const fresh = ref(true)

function rawOf(k: FieldKey): number {
  if (k === 'sets') return item.value.sets
  if (k === 'strength') return numOf(item.value.strength)
  if (k === 'reps') return numOf(item.value.reps)
  return item.value.rest
}

function writeTo(k: FieldKey, v: number) {
  if (k === 'sets') item.value.sets = Math.max(1, Math.min(20, v || 1))
  else if (k === 'strength') item.value.strength = v
  else if (k === 'reps') item.value.reps = v
  else item.value.rest = Math.max(0, Math.min(600, v || 0))
}

function selectField(k: FieldKey) {
  field.value = k
  buf.value = String(rawOf(k) || '')
  fresh.value = true
}

const visibleFields = computed(() => {
  const list: {
    key: FieldKey
    label: string
    value: string
    suffix?: string
    static?: boolean
    small?: boolean
  }[] = [
    { key: 'sets', label: '组数', value: fmtNum(item.value.sets), suffix: '组' },
  ]
  if (isUnitless(item.value.unit)) {
    // 选了「力竭」就没有数值可填，这里只做展示
    list.push({ key: 'strength', label: '强度', value: UNIT_LABEL.failure, static: true })
  } else if (showReps.value) {
    list.push({
      key: 'strength',
      label: '强度',
      value: fmtNum(numOf(item.value.strength)) || '0',
      suffix: 'kg',
    })
    list.push({
      key: 'reps',
      label: '',
      value: fmtNum(numOf(item.value.reps)) || '0',
      suffix: '次',
    })
  } else {
    list.push({
      key: 'strength',
      label: '强度',
      value: fmtNum(item.value.strength) || '0',
      suffix: unitSuffix(item.value.unit),
    })
  }
  list.push({ key: 'rest', label: '组休', value: fmtNum(item.value.rest), suffix: '秒' })

  // 四列格子很窄，数字一长（比如组休 180）就得缩小字号，不然溢出
  for (const f of list) {
    if (f.value.length >= 4) f.small = true
  }
  return list
})

function onFieldTap(f: { key: FieldKey; static?: boolean }) {
  if (f.static) return
  selectField(f.key)
}

function unitSuffix(u: IntensityUnit): string {
  return UNIT_OPTIONS.find((x) => x.value === u)?.label.split('/')[0] ?? ''
}

function onKey(d: string) {
  if (fresh.value) {
    // 整格覆盖，等价于「全选后输入」
    buf.value = d
    fresh.value = false
  } else {
    const next = buf.value === '0' ? d : buf.value + d
    if (next.length > 5) return
    buf.value = next
  }
  writeTo(field.value, Number(buf.value) || 0)
}

function onBackspace() {
  if (fresh.value) {
    // 刚选中就按退格 = 清空这一格
    buf.value = ''
    fresh.value = false
  } else {
    buf.value = buf.value.slice(0, -1)
  }
  writeTo(field.value, buf.value === '' ? 0 : Number(buf.value))
}

function onStep(v: number) {
  field.value = 'strength'
  buf.value = String(v)
  fresh.value = false
  writeTo('strength', v)
}

function setUnit(u: IntensityUnit) {
  item.value.unit = u

  if (isUnitless(u)) {
    // 力竭不需要任何数值，顺手把遗留的重量/次数清掉
    item.value.strength = 0
    item.value.reps = undefined
    if (field.value !== 'sets' && field.value !== 'rest') selectField('sets')
    return
  }

  if (u === 'kg') {
    if (!item.value.reps) item.value.reps = props.defaultReps
    if (numOf(item.value.strength) === 0) item.value.strength = numOf(item.value.reps)
  } else {
    // 切到非 kg 单位时，把原来的次数搬过来当强度，避免出现 0
    if (numOf(item.value.strength) === 0) item.value.strength = numOf(item.value.reps)
    item.value.reps = undefined
    // 「次数」这一格在非 kg 单位下不存在，别让键盘继续写一个看不见的字段
    if (field.value === 'reps') selectField('strength')
  }
}

function confirm() {
  if (noteDraft.value) item.value.note = noteDraft.value
  emit('confirm', { ...item.value })
}

const { nearestStep } = userStore
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.45);
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: up 0.22s ease;
}

@keyframes up {
  from {
    transform: translateY(24px);
    opacity: 0.6;
  }
}

.head {
  display: grid;
  grid-template-columns: 64px 1fr 40px;
  align-items: center;
  padding: 12px 14px 6px;
}

.note-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: var(--ink-2);
}

.note-btn svg {
  width: 14px;
  height: 14px;
}

.title {
  text-align: center;
  font-size: 15.5px;
  font-weight: 600;
}

.x {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
  justify-self: end;
}

.x svg {
  width: 20px;
  height: 20px;
}

.body {
  padding: 0 16px 8px;
  overflow-y: auto;
}

.exrow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0 14px;
}

.exmeta {
  flex: 1;
  min-width: 0;
}

.exname {
  font-size: 16px;
  font-weight: 700;
}

.exsub {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.gtype {
  flex: none;
  padding: 5px 10px;
  border-radius: 8px;
  background: #4a4f57;
  color: #fff;
  font-size: 12px;
}

.notebox {
  width: 100%;
  border-radius: 10px;
  background: var(--surface-2);
  padding: 10px 12px;
  font-size: 13px;
  resize: none;
  margin-bottom: 12px;
}

.fields {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding-bottom: 6px;
}

.fields.three {
  grid-template-columns: repeat(3, 1fr);
}

.field {
  padding: 6px 0 8px;
  border-bottom: 2px solid var(--line);
  text-align: center;
  transition: border-color 0.15s;
}

.field.on {
  border-bottom-color: var(--brand-1);
}

/* 选了「力竭」时的强度格：只展示，不可点 */
.field.static {
  pointer-events: none;
}

.field.static .fv {
  color: var(--brand-1);
}

.fl {
  display: block;
  font-size: 12px;
  color: var(--ink-3);
  min-height: 17px;
}

.fv {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--ink-1);
  line-height: 1.1;
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
}

/* 数字偏长（>=4 位）时缩一档，保证四列格子里放得下 */
.fv.sm {
  font-size: 19px;
}

.field.on .fv {
  color: var(--brand-1);
}

.fv small {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-3);
  margin-left: 3px;
}

.units {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0 4px;
}

.ul {
  flex: none;
  font-size: 12px;
  color: var(--ink-3);
}

.uchips {
  display: flex;
  gap: 4px;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}

.uchips::-webkit-scrollbar {
  display: none;
}

.uchip {
  flex: 1;
  min-width: 48px;
  padding: 7px 4px;
  border-radius: 8px;
  font-size: 12.5px;
  color: var(--ink-3);
  white-space: nowrap;
}

.uchip.on {
  color: var(--brand-1);
  font-weight: 600;
}
</style>
