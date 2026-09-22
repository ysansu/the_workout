<template>
  <div class="page">
    <header class="bar">
      <button class="back" @click="leave" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div class="title-wrap">
        <input
          v-if="renaming"
          ref="nameEl"
          v-model="nameDraft"
          class="rename"
          @blur="commitRename"
          @keyup.enter="commitRename"
        />
        <template v-else>
          <span class="title">{{ day?.name || '训练日' }}</span>
          <button class="pencil" @click="startRename" aria-label="重命名">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z" />
            </svg>
          </button>
        </template>
      </div>

      <button class="dots" @click="daySheet = true" aria-label="更多">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
    </header>

    <div v-if="weekdayTag" class="wd-row">
      <span class="wd">{{ weekdayTag }}</span>
    </div>

    <div class="body">
      <div v-if="!items.length" class="empty">
        <div class="e-t">暂无动作</div>
        <div class="e-d">快去添加动作吧~</div>
        <button class="e-btn" @click="openPicker">去添加</button>
      </div>

      <div v-else ref="listEl" class="list" :class="{ dragging }" @touchmove="onTouchMove" @touchend="onTouchEnd" @touchcancel="onTouchEnd">
        <div
          v-for="(it, i) in items"
          :key="i"
          data-row
          class="row"
          :class="{ ghost: dragging && i === dragIndex }"
          :style="dragging && i === dragIndex ? ghostStyle : undefined"
          @click="onRowClick(i)"
          @touchstart="onTouchStart($event, i)"
          @mousedown="onMouseDown($event, i)"
        >
          <span class="handle" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M8 8h8M8 12h8M8 16h8" />
            </svg>
          </span>
          <ExThumb :id="it.exerciseId" :size="52" :radius="8" />
          <div class="meta">
            <div class="name">{{ nameOf(it.exerciseId) }}</div>
            <div class="sub">{{ fmtPlanItemFull(it) }}</div>
            <div v-if="it.note" class="note">{{ it.note }}</div>
          </div>
          <button class="row-dots" @click.stop="openItemSheet(i)" aria-label="操作">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="19" cy="12" r="1.7" />
            </svg>
          </button>
        </div>
      </div>

      <p v-if="items.length > 1" class="drag-hint">长按任意一条动作，上下拖动可以调整顺序</p>
    </div>

    <footer class="bottom">
      <button class="btn btn-primary btn-block" @click="openPicker">添加动作</button>
    </footer>

    <ExercisePicker
      v-if="pickerOpen"
      mode="pick"
      :only-owned="false"
      @close="pickerOpen = false"
      @pick="onPick"
      @detail="gotoDetail"
      @create="$router.push('/exercises/new')"
    />

    <ItemConfigSheet
      v-if="configOpen"
      :item="draft"
      :title="editIndex === null ? '添加动作' : '编辑动作'"
      @close="configOpen = false"
      @confirm="applyItem"
    />

    <ActionSheet
      :visible="daySheet"
      :title="day?.name"
      :items="dayItems"
      @close="daySheet = false"
      @select="onDayAction"
    />

    <ActionSheet
      :visible="itemSheetIndex !== null"
      :title="itemSheetIndex !== null ? nameOf(items[itemSheetIndex].exerciseId) : ''"
      :items="itemItems"
      @close="itemSheetIndex = null"
      @select="onItemAction"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PlanItem } from '@/types'
import { WEEKDAY_CN } from '@/utils/date'
import { getExercise, getExerciseName } from '@/data/exercises'
import { usePlanStore } from '@/stores/plan'
import { useSessionStore } from '@/stores/session'
import { fmtPlanItemFull } from '@/utils/num'
import ExThumb from '@/components/ExThumb.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'
import ItemConfigSheet from '@/components/ItemConfigSheet.vue'
import ActionSheet, { type SheetItem } from '@/components/ActionSheet.vue'

const route = useRoute()
const router = useRouter()
const planStore = usePlanStore()
const sessionStore = useSessionStore()

const planId = computed(() => String(route.params.id))
const dayId = computed(() => String(route.params.dayId))

const plan = computed(() => planStore.getPlanById(planId.value) ?? null)
const day = computed(() => plan.value?.days.find((d) => d.id === dayId.value) ?? null)
const items = computed<PlanItem[]>(() => day.value?.items ?? [])

const nameOf = (id: string) => getExerciseName(id)

const weekdayTag = computed(() => {
  const w = day.value?.weekday
  return w ? WEEKDAY_CN[w] : ''
})

/** 预置计划不能直接改，先跳到计划编辑页做副本 */
watch(
  plan,
  (p) => {
    if (p && p.builtin) router.replace('/plans/' + p.id + '/edit')
  },
  { immediate: true },
)

function leave() {
  if (plan.value) router.replace('/plans/' + plan.value.id + '/edit')
  else router.back()
}

/* ---------------- 重命名 ---------------- */
const renaming = ref(false)
const nameDraft = ref('')
const nameEl = ref<HTMLInputElement | null>(null)

function startRename() {
  nameDraft.value = day.value?.name ?? ''
  renaming.value = true
  void nextTick(() => nameEl.value?.focus())
}

function commitRename() {
  if (!renaming.value) return
  const v = nameDraft.value.trim()
  if (v) planStore.updateDay(planId.value, dayId.value, { name: v })
  renaming.value = false
}

/* ---------------- 加动作 ---------------- */
const pickerOpen = ref(false)
const configOpen = ref(false)
const editIndex = ref<number | null>(null)
const draft = ref<PlanItem>({ exerciseId: '', sets: 3, unit: 'kg', strength: 0, reps: 10, rest: 60 })

function defaultItem(exerciseId: string): PlanItem {
  const ex = getExercise(exerciseId)
  const last = sessionStore.lastPerf(exerciseId)
  const bodyweight = !ex?.equipment.some((k) =>
    ['dumbbell', 'barbell', 'machine', 'cable', 'kettlebell'].includes(k),
  )
  return {
    exerciseId,
    sets: 3,
    unit: 'kg',
    strength: bodyweight ? 0 : last?.value ?? 0,
    reps: last?.reps ?? 10,
    rest: ex?.rest ?? 60,
  }
}

function openPicker() {
  pickerOpen.value = true
}

function onPick(id: string) {
  pickerOpen.value = false
  draft.value = defaultItem(id)
  editIndex.value = null
  configOpen.value = true
}

function editItem(i: number) {
  editIndex.value = i
  draft.value = JSON.parse(JSON.stringify(items.value[i]))
  configOpen.value = true
}

function applyItem(item: PlanItem) {
  const next = [...items.value]
  if (editIndex.value === null) next.push(item)
  else next[editIndex.value] = item
  planStore.updateDay(planId.value, dayId.value, { items: next })
  configOpen.value = false
}

function removeItem(i: number) {
  const next = items.value.filter((_, k) => k !== i)
  planStore.updateDay(planId.value, dayId.value, { items: next })
}

function moveItem(i: number, dir: -1 | 1) {
  const next = [...items.value]
  const to = i + dir
  if (to < 0 || to >= next.length) return
  ;[next[i], next[to]] = [next[to], next[i]]
  planStore.updateDay(planId.value, dayId.value, { items: next })
}

/* ---------------- 长按拖动排序 ---------------- */
const listEl = ref<HTMLElement | null>(null)
const dragging = ref(false)
const dragIndex = ref(-1)
const ghostOffset = ref(0)
const suppressClick = ref(false)

let pressTimer: number | null = null
let pressIdx = -1
let startY = 0
let lastY = 0
/** 拖动开始/重排后重新测量的每行位置，用来判断手指落在哪个槽位 */
let rects: { top: number; bottom: number }[] = []

const ghostStyle = computed(() => ({
  transform: `translateY(${ghostOffset.value}px) scale(1.02)`,
  zIndex: 5,
}))

function rowEls(): HTMLElement[] {
  if (!listEl.value) return []
  return Array.from(listEl.value.querySelectorAll<HTMLElement>('[data-row]'))
}

function measure() {
  rects = rowEls().map((el) => {
    const r = el.getBoundingClientRect()
    return { top: r.top, bottom: r.bottom }
  })
}

function clearPress() {
  if (pressTimer) {
    window.clearTimeout(pressTimer)
    pressTimer = null
  }
  pressIdx = -1
}

function beginPress(i: number, y: number) {
  if (dragging.value) return
  clearPress()
  pressIdx = i
  startY = y
  lastY = y
  pressTimer = window.setTimeout(() => {
    pressTimer = null
    enterDrag(i, y)
  }, 300)
}

function enterDrag(i: number, y: number) {
  if (i < 0 || i >= items.value.length) return
  dragging.value = true
  dragIndex.value = i
  lastY = y
  measure()
  updateGhost()
  try {
    navigator.vibrate?.(12)
  } catch {
    /* noop */
  }
}

/** 让被拖的那条始终跟着手指走 */
function updateGhost() {
  const r = rects[dragIndex.value]
  if (!r) return
  ghostOffset.value = lastY - (r.top + (r.bottom - r.top) / 2)
}

async function reorderTo(target: number) {
  const arr = items.value
  if (target < 0 || target >= arr.length || target === dragIndex.value) return
  const next = [...arr]
  const [moved] = next.splice(dragIndex.value, 1)
  next.splice(target, 0, moved)
  planStore.updateDay(planId.value, dayId.value, { items: next })
  dragIndex.value = target
  await nextTick()
  measure()
  updateGhost()
}

function moveTo(y: number) {
  lastY = y
  let target = rects.findIndex((r) => y >= r.top && y < r.bottom)
  if (target < 0) target = y < (rects[0]?.top ?? 0) ? 0 : rects.length - 1
  if (target !== dragIndex.value) void reorderTo(target)
  else updateGhost()
}

function endDrag() {
  clearPress()
  if (!dragging.value) return
  dragging.value = false
  dragIndex.value = -1
  ghostOffset.value = 0
  // 拖动结束后紧跟着的 click 要吞掉，否则会误触进入编辑
  suppressClick.value = true
  window.setTimeout(() => (suppressClick.value = false), 80)
}

function onRowClick(i: number) {
  if (suppressClick.value) return
  editItem(i)
}

function onTouchStart(ev: TouchEvent, i: number) {
  if (ev.touches.length !== 1) return
  beginPress(i, ev.touches[0].clientY)
}

function onTouchMove(ev: TouchEvent) {
  const y = ev.touches[0]?.clientY ?? 0
  if (dragging.value) {
    // 非 passive 监听，这里 preventDefault 才能真正阻止页面跟着滚
    ev.preventDefault()
    moveTo(y)
    return
  }
  if (pressTimer && Math.abs(y - startY) > 8) clearPress()
}

function onTouchEnd() {
  endDrag()
}

function onMouseDown(ev: MouseEvent, i: number) {
  if (ev.button !== 0) return
  beginPress(i, ev.clientY)
}

function onMouseMove(ev: MouseEvent) {
  if (dragging.value) {
    ev.preventDefault()
    moveTo(ev.clientY)
    return
  }
  if (pressTimer && Math.abs(ev.clientY - startY) > 8) clearPress()
}

function onMouseUp() {
  endDrag()
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  clearPress()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

function gotoDetail(id: string) {
  router.push('/exercises/' + id)
}

/* ---------------- 训练日菜单 ---------------- */
const daySheet = ref(false)

const dayItems = computed<SheetItem[]>(() => [
  { key: 'add', label: '编辑训练日', icon: ['M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z'] },
  { key: 'rename', label: '重命名', icon: ['M4 7h10M4 12h7M4 17h13'] },
  { key: 'up', label: '上移训练日', icon: ['M12 19V5', 'M6 11l6-6 6 6'] },
  { key: 'down', label: '下移训练日', icon: ['M12 5v14', 'M6 13l6 6 6-6'] },
  { key: 'copy', label: '复制训练日', icon: ['M9 9h11v11H9z', 'M4 15V4h11'] },
  { key: 'run', label: '立即开练', icon: ['M8 5.5v13l11-6.5z'] },
  { key: 'delete', label: '删除训练日', danger: true, icon: ['M4 7h16', 'M9 7V5h6v2', 'M6.5 7l1 12.5h9L17.5 7'] },
])

function onDayAction(key: string) {
  daySheet.value = false
  if (key === 'rename') startRename()
  else if (key === 'up') planStore.moveDay(planId.value, dayId.value, -1)
  else if (key === 'down') planStore.moveDay(planId.value, dayId.value, 1)
  else if (key === 'copy') planStore.copyDay(planId.value, dayId.value)
  else if (key === 'run') startNow()
  else if (key === 'add') openPicker()
  else if (key === 'delete') {
    if (!window.confirm(`确定删除训练日「${day.value?.name}」？`)) return
    planStore.removeDay(planId.value, dayId.value)
    router.replace('/plans/' + planId.value + '/edit')
  }
}

function startNow() {
  const d = day.value
  const p = plan.value
  if (!d || !p) return
  // 还没在执行这个计划才激活；已在执行就别重复 activate，否则轮次会被重置回第 1 天
  if (planStore.active?.planId !== p.id) planStore.activate(p.id)
  router.push({ path: '/train/start', query: { day: d.id } })
}

/* ---------------- 单条动作菜单 ---------------- */
const itemSheetIndex = ref<number | null>(null)

const itemItems: SheetItem[] = [
  { key: 'edit', label: '编辑参数', icon: ['M12 20h9', 'M16.5 3.5l4 4L8 20H4v-4L16.5 3.5Z'] },
  { key: 'up', label: '上移', icon: ['M12 19V5', 'M6 11l6-6 6 6'] },
  { key: 'down', label: '下移', icon: ['M12 5v14', 'M6 13l6 6 6-6'] },
  { key: 'remove', label: '移除这个动作', danger: true, icon: ['M6 6l12 12M18 6L6 18'] },
]

function openItemSheet(i: number) {
  itemSheetIndex.value = i
}

function onItemAction(key: string) {
  const i = itemSheetIndex.value
  itemSheetIndex.value = null
  if (i === null) return
  if (key === 'edit') editItem(i)
  else if (key === 'up') moveItem(i, -1)
  else if (key === 'down') moveItem(i, 1)
  else if (key === 'remove') removeItem(i)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 84px;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px;
  background: var(--card);
}

.back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  flex: none;
}

.back svg {
  width: 22px;
  height: 22px;
}

.title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pencil {
  color: var(--ink-3);
  flex: none;
  display: flex;
}

.pencil svg {
  width: 15px;
  height: 15px;
}

.rename {
  width: 100%;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1.5px solid var(--brand-1);
  padding-bottom: 2px;
}

.dots {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  flex: none;
}

.dots svg {
  width: 19px;
  height: 19px;
}

.wd-row {
  padding: 0 16px 10px;
  background: var(--card);
}

.wd {
  display: inline-block;
  font-size: 12px;
  color: var(--brand-1);
  background: var(--brand-soft);
  padding: 3px 10px;
  border-radius: 9px;
  font-weight: 600;
}

.body {
  padding: 12px 14px;
}

.empty {
  text-align: center;
  padding: 70px 20px;
}

.e-t {
  font-size: 15px;
  color: var(--ink-2);
  margin-bottom: 5px;
}

.e-d {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-bottom: 16px;
}

.e-btn {
  height: 38px;
  padding: 0 22px;
  border-radius: 19px;
  background: var(--card);
  color: var(--brand-1);
  font-size: 13.5px;
  box-shadow: inset 0 0 0 1.4px var(--brand-soft-2);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.list.dragging {
  user-select: none;
}

.row {
  display: flex;
  align-items: center;
  gap: 9px;
  background: var(--card);
  border-radius: var(--r-lg);
  padding: 11px;
  box-shadow: var(--shadow);
  touch-action: manipulation;
}

/* 拖动中的那一条：浮起来，且不参与命中测试（否则会拖到自己） */
.row.ghost {
  position: relative;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.18);
  pointer-events: none;
  transition: none;
}

.handle {
  flex: none;
  width: 16px;
  display: flex;
  align-items: center;
  color: var(--ink-4);
  cursor: grab;
}

.handle svg {
  width: 16px;
  height: 16px;
}

.drag-hint {
  text-align: center;
  font-size: 11.5px;
  color: var(--ink-4);
  padding: 14px 0 4px;
}

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14.5px;
  font-weight: 600;
}

.sub {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 3px;
}

.note {
  font-size: 11.5px;
  color: var(--brand-1);
  margin-top: 3px;
}

.row-dots {
  flex: none;
  width: 28px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-4);
}

.row-dots svg {
  width: 18px;
  height: 18px;
}

.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--card);
  border-top: 1px solid var(--line);
}
</style>
