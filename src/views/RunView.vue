<template>
  <div class="run">
    <header class="top">
      <button class="ico" @click="togglePause" :aria-label="isPaused ? '继续' : '暂停'">
        <svg v-if="isPaused" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <rect x="7" y="5.5" width="3.6" height="13" rx="1.2" />
          <rect x="13.4" y="5.5" width="3.6" height="13" rx="1.2" />
        </svg>
      </button>

      <div class="timer">
        <div class="t-main">{{ elapsedText }}</div>
        <div class="t-sub">预计需要 {{ estimateMin }} 分钟</div>
      </div>

      <div class="mid">
        <input
          v-if="renaming"
          ref="renameEl"
          v-model="nameDraft"
          class="rename"
          @blur="commitRename"
          @keyup.enter="commitRename"
        />
        <template v-else>
          <span class="day">{{ current?.name }}</span>
          <button class="pencil" @click="startRename" aria-label="重命名">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z" />
            </svg>
          </button>
        </template>
      </div>

      <button class="ico" @click="$router.push('/settings/training')" aria-label="训练设置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M12 3.2v2.2M12 18.6v2.2M4.9 12H2.7M21.3 12h-2.2M6.8 6.8 5.2 5.2M18.8 18.8l-1.6-1.6M17.2 6.8l1.6-1.6M5.2 18.8l1.6-1.6"
          />
        </svg>
      </button>
    </header>

    <div v-if="!hasCurrent" class="empty-wrap">
      <div class="empty">
        <div class="t">还没有添加动作</div>
        <div class="d">从动作库里挑几个动作开始</div>
      </div>
      <button class="btn btn-primary btn-block" @click="pickExercise">添加动作</button>
    </div>

    <div v-else class="layout">
      <aside class="rail">
        <button
          v-for="(it, i) in items"
          :key="i"
          class="rail-item"
          :class="{ on: i === cur, done: allDone(i) }"
          @click="goTo(i)"
        >
          <span class="rail-thumb">
            <ExThumb :id="it.exerciseId" :size="46" :radius="8" />
            <span v-if="allDone(i)" class="rail-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12.5l5.2 5.2L20 7" />
              </svg>
            </span>
          </span>
          <span class="rail-name">{{ nameOf(it.exerciseId) }}</span>
        </button>
        <button class="rail-add" @click="pickExercise" aria-label="添加动作">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M12 6v12M6 12h12" />
          </svg>
        </button>
      </aside>

      <main class="main">
        <div class="pct">{{ progressPct }}%</div>
        <div class="prog"><i :style="{ width: progressPct + '%' }" /></div>

        <div class="now">
          <span>正在进行</span>
          <span class="now-r">当前动作用时 {{ exTimeText }}</span>
        </div>

        <div class="exname">{{ ex?.name }}</div>

        <div class="cues">
          <ExThumb :id="item?.exerciseId || ''" :size="72" :radius="10" />
          <ol class="cue-list">
            <li v-for="(c, i) in shortCues" :key="i">{{ i + 1 }}、{{ c }}</li>
          </ol>
        </div>
        <button class="more" @click="openDetail">查看详细讲解 ›</button>

        <div class="sets">
          <div v-for="(s, j) in entry?.sets ?? []" :key="j" class="set" :class="{ done: s.done }">
            <button class="no" @click="removeSet(j)" :title="'删除第 ' + (j + 1) + ' 组'">
              第<br />{{ j + 1 }}<br />组
            </button>

            <!-- 力竭：没有数值可填，只展示 -->
            <div v-if="isUnitless(s.unit)" class="val static">力竭</div>
            <template v-else>
              <button class="val" @click="openValueSheet(j, 'value')">
                <b>{{ fmtNum(s.value) }}</b><small>{{ unitLabel }}</small>
              </button>
              <button v-if="s.unit === 'kg'" class="val" @click="openValueSheet(j, 'reps')">
                <b>{{ fmtNum(s.reps) }}</b><small>次</small>
              </button>
            </template>

            <button class="ok" :class="{ on: s.done }" @click="toggleSet(j)" aria-label="完成这组">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12.5l5.2 5.2L20 7" />
              </svg>
            </button>
          </div>
        </div>

        <button class="addset" @click="addSet">添加一组</button>
      </main>
    </div>

    <footer v-if="hasCurrent" class="bottom">
      <button class="b-act" @click="minimize">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M5 19V9M12 19V5M19 19v-6" />
        </svg>
        最小化
      </button>
      <button class="b-act" @click="openEdit">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z" />
        </svg>
        编辑
      </button>
      <button class="finish" @click="confirming = true">完成训练</button>
    </footer>

    <RestTimer
      v-if="rest.running"
      :left="restLeft"
      :total="rest.total"
      :minimized="rest.minimized"
      @skip="dismissRest"
      @add="addRest"
      @minimize="rest.minimized = true"
      @expand="rest.minimized = false"
    />

    <ItemConfigSheet
      v-if="sheetMode && (sheetMode === 'add' || item)"
      :item="editDraft"
      :title="sheetMode === 'add' ? '添加动作' : '编辑动作'"
      @close="sheetMode = null"
      @confirm="onSheetConfirm"
    />

    <ExercisePicker
      v-if="pickerOpen"
      mode="pick"
      @close="pickerOpen = false"
      @pick="onPickExercise"
      @detail="openExercise"
      @create="router.push('/exercises/new')"
    />

    <NumEntrySheet
      v-if="entrySheet"
      :title="entrySheet.title"
      :value="entrySheet.value"
      :unit="entrySheet.unit"
      :steps="entrySheet.steps"
      :active-step="entrySheet.activeStep"
      @close="entrySheet = null"
      @confirm="applyEntry"
    />

    <div v-if="confirming" class="mask" @click.self="confirming = false">
      <div class="dialog">
        <div class="d-title">结束本次训练？</div>
        <div class="d-sub">{{ doneSets }} / {{ totalSets }} 组已完成</div>
        <button class="d-main" @click="doFinish">结束并保存</button>
        <button class="d-danger" @click="doAbandon">放弃本次训练</button>
        <button class="d-cancel" @click="confirming = false">继续训练</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { PlanItem } from '@/types'
import { getExercise, getExerciseName } from '@/data/exercises'
import { useWorkoutStore } from '@/stores/workout'
import { useUserStore } from '@/stores/user'
import { useSessionStore } from '@/stores/session'
import { fmtMS, minutesOf } from '@/utils/date'
import { useNow } from '@/utils/now'
import { UNIT_LABEL, fmtNum, isUnitless, numOf, planItemSeconds } from '@/utils/num'
import { playRestSound, stopVibrate, vibrateRest, warmupAudio } from '@/utils/sound'
import ExThumb from '@/components/ExThumb.vue'
import RestTimer from '@/components/RestTimer.vue'
import ItemConfigSheet from '@/components/ItemConfigSheet.vue'
import NumEntrySheet from '@/components/NumEntrySheet.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'

const router = useRouter()
const workoutStore = useWorkoutStore()
const userStore = useUserStore()
const profile = computed(() => userStore.profile)

/* ---------------- 派生 ---------------- */
const current = computed(() => workoutStore.current)
const hasCurrent = computed(() => workoutStore.hasCurrent)
const items = computed(() => current.value?.items ?? [])
const cur = computed(() => current.value?.currentIndex ?? 0)
const item = computed<PlanItem | null>(() => items.value[cur.value] ?? null)
const ex = computed(() => (item.value ? getExercise(item.value.exerciseId) : null))
const entry = computed(() => current.value?.entries[cur.value] ?? null)
const doneSets = computed(() => workoutStore.doneSets)
const totalSets = computed(() => workoutStore.totalSets)
const progressPct = computed(() => workoutStore.progressPct)

/** 某个动作的组是不是全打勾了（用于左侧导航栏打完成标记） */
function allDone(i: number): boolean {
  const e = current.value?.entries[i]
  return !!e && e.sets.length > 0 && e.sets.every((s) => s.done)
}

const nameOf = (id: string) => getExerciseName(id)
const shortCues = computed(() => (ex.value?.cues ?? []).slice(0, 3))

/** 当前动作的强度单位文案 */
const unitLabel = computed(() => {
  const u = entry.value?.sets[0]?.unit ?? item.value?.unit ?? 'kg'
  return u === 'kg' ? 'kg' : UNIT_LABEL[u]
})

const estimateSec = computed(() => items.value.reduce((n, it) => n + planItemSeconds(it), 0))
const estimateMin = computed(() => Math.max(1, minutesOf(estimateSec.value)))

/* ---------------- 计时 ----------------
 * 时长一律用「挂钟时间相减」算（workoutStore.elapsedSec），
 * useNow() 只负责每秒触发一次重新渲染，并在页面回到前台时立刻校准。
 * 这样切到别的 App 再回来，读数是真实经过的时间，而不是被挂起的计数器。
 */
const now = useNow()

const elapsedText = computed(() => {
  void now.value
  return fmtMS(workoutStore.elapsedSec())
})

const exTimeText = computed(() => {
  void now.value
  return fmtMS(workoutStore.exerciseSec())
})

const isPaused = computed(() => workoutStore.isPaused)

function togglePause() {
  warmupAudio()
  if (isPaused.value) workoutStore.resume()
  else workoutStore.pause()
}

/* ---------------- 重命名 ---------------- */
const renaming = ref(false)
const nameDraft = ref('')
const renameEl = ref<HTMLInputElement | null>(null)

function startRename() {
  nameDraft.value = current.value?.name ?? ''
  renaming.value = true
  void nextTick(() => renameEl.value?.focus())
}

function commitRename() {
  if (!renaming.value) return
  const v = nameDraft.value.trim()
  if (v && current.value) current.value.name = v
  renaming.value = false
}

/* ---------------- 导航 ---------------- */
const goTo = (i: number) => workoutStore.goTo(i)
const minimize = () => router.replace('/train')

function openExercise(id: string) {
  router.push('/exercises/' + id)
}

function openDetail() {
  const id = item.value?.exerciseId
  if (id) openExercise(id)
}

/* ---------------- 组操作 ---------------- */
function toggleSet(j: number) {
  warmupAudio()
  const s = entry.value?.sets[j]
  if (!s) return
  if (s.done) {
    workoutStore.setSet(cur.value, j, { done: false })
    return
  }
  workoutStore.setSet(cur.value, j, { done: true })
  if (profile.value.restAlert !== 'none') {
    startRest(item.value?.rest ?? ex.value?.rest ?? 90)
  }
}

const addSet = () => workoutStore.addSet(cur.value)
const removeSet = (j: number) => workoutStore.removeSet(cur.value, j)

/* ---------------- 逐组数值编辑 ---------------- */
interface EntrySheetState {
  title: string
  value: number
  unit: string
  steps: number[]
  activeStep?: number
  j: number
  field: 'value' | 'reps'
}

const entrySheet = ref<EntrySheetState | null>(null)

function openValueSheet(j: number, field: 'value' | 'reps') {
  const s = entry.value?.sets[j]
  if (!s) return
  const isWeight = s.unit === 'kg' && field === 'value'
  entrySheet.value = {
    title: field === 'reps' ? '次数' : '强度',
    value: numOf(field === 'reps' ? s.reps : s.value),
    unit: field === 'reps' ? '次' : UNIT_LABEL[s.unit],
    steps: isWeight ? profile.value.dumbbellSteps : [],
    activeStep: isWeight ? userStore.nearestStep(numOf(s.value)) : undefined,
    j,
    field,
  }
}

function applyEntry(v: number) {
  const sheet = entrySheet.value
  if (!sheet) return
  workoutStore.setSet(cur.value, sheet.j, { [sheet.field]: v })
  entrySheet.value = null
}

/* ---------------- 添加 / 编辑动作 ---------------- */
const pickerOpen = ref(false)
/** 'add' = 新增动作；'edit' = 调整当前动作的参数 */
const sheetMode = ref<'add' | 'edit' | null>(null)
const editDraft = ref<PlanItem>({ exerciseId: '', sets: 1, unit: 'kg', strength: 0, rest: 60 })

function pickExercise() {
  pickerOpen.value = true
}

function onPickExercise(id: string) {
  pickerOpen.value = false
  const ex = getExercise(id)
  const last = useSessionStore().lastPerf(id)
  const bodyweight = !ex?.equipment.some((k) =>
    ['dumbbell', 'barbell', 'machine', 'cable', 'kettlebell'].includes(k),
  )
  editDraft.value = {
    exerciseId: id,
    sets: 3,
    unit: 'kg',
    strength: bodyweight ? 0 : last?.value ?? 0,
    reps: last?.reps ?? 10,
    rest: ex?.rest ?? 60,
  }
  sheetMode.value = 'add'
}

function openEdit() {
  if (!item.value) return
  editDraft.value = JSON.parse(JSON.stringify(item.value))
  sheetMode.value = 'edit'
}

function onSheetConfirm(next: PlanItem) {
  if (sheetMode.value === 'add') {
    workoutStore.addExercise(next)
    workoutStore.goTo(items.value.length - 1)
    sheetMode.value = null
    return
  }
  applyEdit(next)
}

function applyEdit(next: PlanItem) {
  const c = current.value
  const i = cur.value
  if (!c) return
  c.items[i] = { ...c.items[i], ...next }
  workoutStore.ensureSets(i, next.sets)
  const sets = c.entries[i]?.sets
  if (!sets) return
  sets.forEach((s) => {
    s.unit = next.unit
    if (s.done) return
    if (next.strength !== undefined && next.strength !== '') s.value = next.strength
    if (next.unit === 'kg' && next.reps !== undefined && next.reps !== '') s.reps = next.reps
  })
  sheetMode.value = null
}

/* ---------------- 组休计时 ----------------
 * 同样用挂钟驱动：只记「结束时刻」，剩余秒数每次渲染时现算。
 * 原来的「每秒减一」在切后台时定时器被挂起，回来会多出一大截休息时间。
 */
const rest = ref({ total: 0, endsAt: 0, running: false, minimized: false })

const restLeft = computed(() => {
  if (!rest.value.running) return 0
  return Math.max(0, Math.ceil((rest.value.endsAt - now.value) / 1000))
})

watch(restLeft, (v) => {
  if (rest.value.running && v <= 0) {
    notifyRestEnd()
    stopRest()
  }
})

function startRest(sec: number) {
  if (sec <= 0) return
  rest.value = {
    total: sec,
    endsAt: Date.now() + sec * 1000,
    running: true,
    minimized: false,
  }
}

/** 结束组休（到点自然结束）。震动是提示信号，让它按节奏放完 */
function stopRest() {
  rest.value.running = false
  rest.value.minimized = false
}

/** 手动跳过组休 / 结束训练：连同正在响的震动一起掐掉 */
function dismissRest() {
  stopVibrate()
  stopRest()
}

function addRest(delta: number) {
  // 已经到点了就从不早于现在开始算；同时兜个底，-10s 不会一下把休息点掉
  const base = Math.max(Date.now(), rest.value.endsAt)
  rest.value.endsAt = Math.max(Date.now() + 1000, base + delta * 1000)
  rest.value.total = Math.max(rest.value.total, restLeft.value)
}

function notifyRestEnd() {
  const kind = profile.value.restAlert
  if (kind === 'sound' || kind === 'both') playRestSound()
  if (kind === 'vibrate' || kind === 'both') vibrateRest()
}

/* ---------------- 结束 / 放弃 ---------------- */
const confirming = ref(false)

function doFinish() {
  const s = workoutStore.finish()
  dismissRest()
  confirming.value = false
  router.replace(s ? '/train/summary/' + s.id : '/train')
}

function doAbandon() {
  workoutStore.abandon()
  dismissRest()
  confirming.value = false
  router.replace('/train')
}
</script>

<style scoped>
.run {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--card);
  overflow: hidden;
}

/* ---------- 顶栏 ---------- */
.top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px;
  border-bottom: 1px solid var(--line);
  flex: none;
}

.ico {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: #4a4f57;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.ico svg {
  width: 20px;
  height: 20px;
}

.timer {
  flex: none;
}

.t-main {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.t-sub {
  font-size: 10.5px;
  color: var(--ink-3);
  margin-top: 1px;
}

.mid {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.day {
  font-size: 15px;
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
  font-size: 15px;
  font-weight: 600;
  border-bottom: 1.5px solid var(--brand-1);
  padding-bottom: 2px;
}

/* ---------- 主体两栏 ---------- */
.layout {
  flex: 1;
  display: flex;
  min-height: 0;
}

.rail {
  width: 92px;
  flex: none;
  background: var(--surface-2);
  border-right: 1px solid var(--line);
  overflow-y: auto;
  padding: 10px 8px 20px;
  scrollbar-width: none;
}

.rail::-webkit-scrollbar {
  display: none;
}

.rail-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 6px 4px;
  border-radius: 10px;
  margin-bottom: 6px;
  transition: background 0.15s;
}

.rail-item.on {
  background: var(--surface-raise);
  box-shadow: inset 0 0 0 2px var(--brand-1);
}

/* 这个动作的组全打勾了 */
.rail-thumb {
  position: relative;
  display: block;
  line-height: 0;
}

.rail-check {
  position: absolute;
  right: -4px;
  bottom: -4px;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.22);
}

.rail-check svg {
  width: 12px;
  height: 12px;
}

.rail-name {
  font-size: 11px;
  color: var(--ink-2);
  line-height: 1.25;
  text-align: center;
  word-break: break-all;
}

.rail-item.on .rail-name {
  color: var(--brand-1);
  font-weight: 600;
}

/* 已完成但当前不在这一项时，标题转绿；当前项仍然保持红色，避免分不清在哪一项 */
.rail-item.done:not(.on) .rail-name {
  color: var(--ok);
  font-weight: 600;
}

.rail-add {
  width: 46px;
  height: 46px;
  margin: 2px auto 0;
  border-radius: 8px;
  border: 1.5px dashed var(--line-2);
  color: var(--ink-3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.rail-add svg {
  width: 20px;
  height: 20px;
}

.main {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 12px 12px 24px;
}

.pct {
  font-size: 12px;
  color: var(--brand-1);
  font-weight: 600;
}

.prog {
  height: 4px;
  border-radius: 2px;
  background: var(--surface-3);
  overflow: hidden;
  margin: 4px 0 14px;
}

.prog i {
  display: block;
  height: 100%;
  background: var(--grad);
  transition: width 0.3s;
}

.now {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12.5px;
  color: var(--ink-3);
}

.now-r {
  font-variant-numeric: tabular-nums;
}

.exname {
  font-size: 22px;
  font-weight: 700;
  margin: 5px 0 12px;
  line-height: 1.25;
}

.cues {
  display: flex;
  gap: 10px;
  background: var(--surface-2);
  border-radius: 12px;
  padding: 10px;
}

.cue-list {
  flex: 1;
  min-width: 0;
}

.cue-list li {
  font-size: 12.5px;
  color: var(--ink-2);
  line-height: 1.5;
  margin-bottom: 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.more {
  display: block;
  width: 100%;
  text-align: right;
  font-size: 12.5px;
  color: var(--ink-3);
  padding: 8px 2px 14px;
}

/* ---------- 组列表 ---------- */
.set {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-3);
  border-radius: 10px;
  padding: 7px 9px;
  margin-bottom: 8px;
  transition: background 0.15s;
}

.set.done {
  background: var(--brand-soft);
}

.no {
  flex: none;
  width: 26px;
  font-size: 11px;
  line-height: 1.15;
  color: var(--ink-3);
  text-align: center;
}

.set.done .no {
  color: var(--brand-1);
}

.val {
  flex: 1;
  min-width: 0;
  height: 38px;
  border-radius: 8px;
  background: var(--card);
  box-shadow: 0 0 0 1px var(--line-2);
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
}

.val b {
  font-size: 18px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.val small {
  font-size: 11px;
  color: var(--ink-3);
}

/* 力竭：固定文案，不可点 */
.val.static {
  align-items: center;
  color: var(--brand-1);
  font-size: 15px;
  font-weight: 700;
  box-shadow: none;
  background: var(--brand-soft);
}

.ok {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: var(--card);
  box-shadow: 0 0 0 1px var(--line-2);
  color: var(--ink-4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ok svg {
  width: 19px;
  height: 19px;
}

.ok.on {
  background: var(--brand-1);
  box-shadow: none;
  color: #fff;
}

.addset {
  width: 100%;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--line-2);
  color: var(--ink-2);
  font-size: 14px;
  margin-top: 4px;
}

/* ---------- 底栏 ---------- */
.bottom {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line);
  background: var(--card);
}

.b-act {
  width: 62px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  font-size: 10.5px;
  color: var(--ink-2);
}

.b-act svg {
  width: 21px;
  height: 21px;
}

.finish {
  flex: 1;
  height: 52px;
  border-radius: 26px;
  background: var(--grad);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(255, 107, 107, 0.3);
}

/* ---------- 空态 ---------- */
.empty-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 20px 60px;
}

.empty {
  text-align: center;
  color: var(--ink-3);
  margin-bottom: 18px;
}

.empty .t {
  font-size: 15px;
  color: var(--ink-2);
  margin-bottom: 5px;
}

.empty .d {
  font-size: 12.5px;
}

/* ---------- 确认弹窗 ---------- */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.45);
  z-index: 320;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  width: 76%;
  max-width: 300px;
  background: var(--card);
  border-radius: var(--r-xl);
  padding: 20px 16px 12px;
  text-align: center;
}

.d-title {
  font-size: 16px;
  font-weight: 600;
}

.d-sub {
  font-size: 12.5px;
  color: var(--ink-3);
  margin: 5px 0 16px;
}

.d-main,
.d-danger,
.d-cancel {
  display: block;
  width: 100%;
  height: 46px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 8px;
}

.d-main {
  background: var(--grad);
  color: #fff;
  font-weight: 600;
}

.d-danger {
  background: var(--brand-soft);
  color: var(--danger);
}

.d-cancel {
  background: var(--surface-2);
  color: var(--ink-2);
}
</style>
