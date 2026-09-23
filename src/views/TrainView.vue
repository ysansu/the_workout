<template>
  <div class="page">
    <TrainTabs current="train" />

    <div class="page-head">
      <h1>今日训练</h1>
      <div class="sub">
        {{ dateLabel }} · 本周已练 {{ weekTrainedDays }} / {{ profile.weeklyGoal }} 天
      </div>
      <div class="bar"><i :style="{ width: weekPct + '%' }" /></div>
    </div>

    <div class="body-pad" style="margin-top: 12px">
      <!-- 进行中的训练 -->
      <div v-if="workoutStore.hasCurrent" class="card running">
        <div class="card-title">
          <span>训练进行中</span>
          <span class="tag">{{ workoutStore.doneSets }} / {{ workoutStore.totalSets }} 组</span>
        </div>
        <div class="run-row">
          <div class="run-name">{{ workoutStore.current?.name }}</div>
          <div class="run-clock">{{ liveElapsed }}</div>
        </div>
        <button class="btn btn-primary btn-block" @click="$router.push('/train/run')">继续训练</button>
      </div>

      <!-- 休息日 -->
      <div v-if="restToday && !workoutStore.hasCurrent" class="card rest">
        <div class="card-title">
          <span>今天是休息日</span>
        </div>
        <p class="hint">这个计划今天不安排训练，好好恢复。</p>
        <div class="from-plan">
          来自「{{ planStore.activePlan?.name }}」
          <button class="link" @click="askingEnd = true">结束该计划</button>
        </div>
        <button class="btn btn-ghost btn-block" @click="adjustOpen = true">调整计划顺序</button>
      </div>

      <!-- 今日清单 -->
      <div v-if="shownDay && !restToday && !workoutStore.hasCurrent" class="card" :class="{ finished: dayDone }">
        <div class="card-title">
          <span class="title-l">
            <span class="day-name">{{ shownDay.name }}</span>
            <span v-if="dayDone" class="mark-done">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12.5l5.2 5.2L20 7" />
              </svg>
              今日已完成
            </span>
            <span v-else-if="dayProgress.done" class="mark-part">
              {{ dayProgress.done }}/{{ dayProgress.total }} 组
            </span>
          </span>
          <button class="fold" :class="{ open: expanded }" @click="expanded = !expanded">
            {{ expanded ? '收起' : '展开' }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>

        <div class="from-plan">
          来自「{{ planStore.activePlan?.name }}」
          <button class="link" @click="askingEnd = true">结束该计划</button>
        </div>

        <div class="stat-line">
          {{ shownItems.length }} 个动作 · 预计 {{ estimateMin }} 分钟
        </div>

        <!-- 折叠时的动作预览 -->
        <div v-if="!expanded && shownItems.length" class="teaser">
          {{ shownItems.map((it) => nameOf(it.exerciseId)).join('、') }}
        </div>

        <ul v-show="expanded" class="list">
          <li v-for="(it, i) in shownItems" :key="i" class="row">
            <span class="idx">{{ i + 1 }}</span>
            <div class="meta" @click="$router.push('/exercises/' + it.exerciseId)">
              <div class="name">{{ nameOf(it.exerciseId) }}</div>
              <div class="sub2">{{ fmtPlanItemFull(it) }}</div>
              <div v-if="lastOf(it.exerciseId)" class="sub3">
                上次 {{ fmtStrength(lastOf(it.exerciseId)!.unit, lastOf(it.exerciseId)!.value) }}
                <template v-if="lastOf(it.exerciseId)!.unit === 'kg'">
                  × {{ lastOf(it.exerciseId)!.reps }}
                </template>
              </div>
            </div>
            <span class="status" :class="statusOf(it).kind">{{ statusOf(it).text }}</span>
          </li>
        </ul>

        <button class="btn btn-primary btn-block" style="margin-top: 12px" @click="startPlanDay">
          {{ startLabel }}
        </button>
        <button class="btn btn-ghost btn-block" style="margin-top: 8px" @click="adjustOpen = true">
          调整计划顺序
        </button>
      </div>

      <!-- 没有执行中的计划 -->
      <div v-if="!hasPlan && !workoutStore.hasCurrent" class="card">
        <div class="card-title"><span>还没有执行中的计划</span></div>
        <p class="hint">从计划库挑一个开始，或先自由训练。</p>
        <div class="btns">
          <button class="btn btn-primary" style="flex: 1" @click="$router.push('/plans')">去选计划</button>
          <button class="btn btn-ghost" style="flex: 1" @click="startFree">自由训练</button>
        </div>
      </div>

      <!-- 今日已完成 -->
      <div v-if="sessionStore.todaySessions.length" class="card">
        <div class="card-title">
          <span>今日已完成</span>
          <span class="more">{{ sessionStore.todaySessions.length }} 次训练</span>
        </div>
        <div
          v-for="s in sessionStore.todaySessions"
          :key="s.id"
          class="row done-row"
          @click="$router.push('/records/' + s.id)"
        >
          <div class="meta">
            <div class="name">{{ s.name }}</div>
            <div class="sub2">{{ Math.round((s.durationSec || 0) / 60) }} 分钟 · 容量 {{ sessionVolume(s) }} kg</div>
          </div>
          <span class="arrow">›</span>
        </div>
      </div>
    </div>

    <!-- 调整计划顺序：把轮次直接拨到某一天 -->
    <div v-if="adjustOpen" class="mask" @click.self="adjustOpen = false">
      <div class="adj">
        <div class="adj-head">
          <span class="adj-title">调整计划顺序</span>
          <button class="adj-x" @click="adjustOpen = false">✕</button>
        </div>
        <p class="adj-sub">
          {{ isWeeklyPlan ? '这个计划按星期排布，由日历决定，不能手动调整' : '选一天，今天就从它开始，练完会自动往下走' }}
        </p>
        <div class="adj-body">
          <div v-for="d in planDays" :key="d.id" class="adj-row">
            <div class="adj-meta">
              <div class="adj-name">{{ d.name }}</div>
              <div class="adj-info">{{ d.rest ? '休息日' : d.items.length + ' 个动作' }}</div>
            </div>
            <button
              v-if="!d.rest && !isWeeklyPlan"
              class="adj-go"
              :disabled="d.id === currentDayId"
              @click="startFromDay(d.id)"
            >
              {{ d.id === currentDayId ? '已是今天' : '从今日开始' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog
      :visible="askingEnd"
      title="确定结束这个计划？"
      message="结束后首页就不再显示每日训练内容，计划本身会保留在「我的计划」里。"
      confirm-text="结束计划"
      cancel-text="取消"
      danger
      @confirm="onEndConfirm"
      @cancel="askingEnd = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { PlanDay, PlanItem } from '@/types'
import { getExerciseName } from '@/data/exercises'
import { usePlanStore } from '@/stores/plan'
import { useSessionStore } from '@/stores/session'
import { useUserStore } from '@/stores/user'
import { useWorkoutStore } from '@/stores/workout'
import { fmtMD, fmtMS, todayKey, weekdayLabel } from '@/utils/date'
import { useNow } from '@/utils/now'
import { fmtPlanItemFull, fmtStrength, planItemSeconds } from '@/utils/num'
import { sessionVolume } from '@/utils/stats'
import TrainTabs from '@/components/TrainTabs.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const router = useRouter()
const planStore = usePlanStore()
const sessionStore = useSessionStore()
const userStore = useUserStore()
const workoutStore = useWorkoutStore()

const profile = computed(() => userStore.profile)
const day = computed(() => planStore.currentDay)
const weekTrainedDays = computed(() => sessionStore.weekTrainedDays)
const dateLabel = computed(() => `${fmtMD(todayKey())} ${weekdayLabel(todayKey())}`)
const weekPct = computed(() =>
  Math.min(100, Math.round((weekTrainedDays.value / (profile.value.weeklyGoal || 1)) * 100)),
)

const nameOf = (id: string) => getExerciseName(id)

/* 首页也要能看到进行中的训练时长（挂钟驱动，切后台再回来读数依然正确） */
const now = useNow()
const liveElapsed = computed(() => {
  void now.value
  if (!workoutStore.hasCurrent) return '00:00'
  return fmtMS(workoutStore.elapsedSec())
})

function lastOf(id: string) {
  return sessionStore.lastPerf(id)
}

/* ---------------- 今日训练：折叠 + 完成状态 ---------------- */

/** 动作列表默认折叠 */
const expanded = ref(false)

/** 今天实际练过的那一天。周期模式练完会推进到下一轮，所以要单独找回来 */
const todayTrainedDay = computed<PlanDay | null>(() => {
  const p = planStore.activePlan
  if (!p) return null
  const ids = sessionStore.todaySessions
    .map((s) => s.planDayId)
    .filter(Boolean) as string[]
  if (!ids.length) return null
  // todaySessions 是按开始时间倒序的，ids[0] 就是最近一次
  return p.days.find((d) => d.id === ids[0]) ?? p.days.find((d) => ids.includes(d.id)) ?? null
})

/** 卡片展示哪一天：今天练过就展示练过的那天，否则展示轮到的那天 */
const shownDay = computed<PlanDay | null>(() => todayTrainedDay.value ?? day.value)

const hasPlan = computed(() => !!planStore.activePlan?.days.length)

/**
 * 今天算不算「休息日」。
 * 包括两种：① 轮到的这一天被标成了休息日；② 按周模式下今天没排任何训练。
 *
 * 今天已经练过就不算 —— 练完的当晚应该看到自己练的那天（含「今日已完成」），
 * 而不是一进门就被告知「今天是休息日」。
 */
const restToday = computed(
  () => hasPlan.value && !todayTrainedDay.value && (planStore.onRestDay || !day.value),
)

const shownItems = computed<PlanItem[]>(() => shownDay.value?.items ?? [])

const estimateMin = computed(() => {
  if (!shownItems.value.length) return 0
  return Math.max(
    1,
    Math.round(shownItems.value.reduce((n, it) => n + planItemSeconds(it), 0) / 60),
  )
})

/**
 * 今天这个动作已经完成的组数。
 * 只统计「当前展示的这一训练日」的记录 —— 同一个动作可能出现在不同训练日，
 * 按动作名统计会把别的天的量算进来。
 */
function doneSetsOf(exerciseId: string): number {
  const dayId = shownDay.value?.id
  if (!dayId) return 0
  let n = 0
  sessionStore.todaySessions.forEach((s) => {
    if (s.planDayId !== dayId) return
    s.entries.forEach((e) => {
      if (e.exerciseId === exerciseId) n += e.sets.length
    })
  })
  return n
}

/** 单条动作的完成状态 */
function statusOf(it: PlanItem): { text: string; kind: 'idle' | 'part' | 'done' } {
  const done = Math.min(doneSetsOf(it.exerciseId), it.sets)
  if (done <= 0) return { text: '未开始', kind: 'idle' }
  if (done >= it.sets) return { text: '已完成', kind: 'done' }
  return { text: `${done}/${it.sets}`, kind: 'part' }
}

/** 今日整体进度（按计划组数算） */
const dayProgress = computed(() => {
  const total = shownItems.value.reduce((n, it) => n + it.sets, 0)
  const done = shownItems.value.reduce(
    (n, it) => n + Math.min(doneSetsOf(it.exerciseId), it.sets),
    0,
  )
  return { done, total }
})

/** 这一天计划里的动作是否全部完成 */
const dayDone = computed(
  () => !!shownItems.value.length && dayProgress.value.done >= dayProgress.value.total,
)

/**
 * 今天已练完时按钮变成「再来一次」—— 点它练的是**今天练过的那天**，
 * 而不是轮次里的下一天：当天练完不等于可以接着练明天的内容。
 */
const startLabel = computed(() => (dayDone.value ? '再来一次' : '开始训练'))

function startPlanDay() {
  const d = shownDay.value
  if (!d) return
  // 只跳预习页，真正的 start 交给「即将开始训练」里的按钮 ——
  // 否则从预习页返回时首页会误显示「训练进行中」
  router.push({ path: '/train/start', query: { day: d.id } })
}

/* 结束计划：先弹窗确认，取消则什么都不做 */
const askingEnd = ref(false)

function onEndConfirm() {
  askingEnd.value = false
  planStore.deactivate()
}

/* ---------------- 调整计划顺序 ---------------- */

const adjustOpen = ref(false)

const planDays = computed<PlanDay[]>(() => planStore.activePlan?.days ?? [])
const currentDayId = computed(() => planStore.currentDay?.id ?? '')
const isWeeklyPlan = computed(() => planStore.activePlan?.schedule === 'weekly')

/** 今天就从这一天开始：把轮次拨过去，首页立刻换成这一天 */
function startFromDay(dayId: string) {
  planStore.setCurrentDay(dayId)
  adjustOpen.value = false
}

function startFree() {
  workoutStore.start({ name: '自由训练', items: [] })
  router.push('/train/run')
}
</script>

<style scoped>
.bar {
  margin-top: 14px;
  height: 5px;
  border-radius: 3px;
  background: var(--surface-3);
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--grad);
  border-radius: 3px;
  transition: width 0.4s;
}

.running {
  background: var(--brand-soft);
  border: 1px solid var(--brand-soft-2);
}

/* 休息日：中性灰底，跟「训练进行中」的紫色卡区分开，也不抢眼 */
.rest {
  background: var(--surface-2);
}

.run-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.run-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-1);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.run-clock {
  flex: none;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}

.from-plan {
  font-size: 12px;
  color: var(--ink-3);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.link {
  color: var(--brand-1);
  font-size: 12px;
}

.list {
  margin-top: 4px;
}

.idx {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  background: var(--brand-soft);
  color: var(--brand-1);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meta {
  flex: 1;
  min-width: 0;
}

.meta .name {
  font-size: 14.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub2 {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.sub3 {
  font-size: 11.5px;
  color: var(--ink-4);
  margin-top: 2px;
}

/* ---------- 今日训练：完成态 ---------- */
.card.finished {
  box-shadow: inset 0 0 0 1.4px var(--ok-line), var(--shadow);
}

.title-l {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.day-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mark-done {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px 9px 3px 7px;
  border-radius: 9px;
  background: var(--ok-soft);
  color: var(--ok);
  font-size: 11.5px;
  font-weight: 600;
  flex: none;
}

.mark-done svg {
  width: 13px;
  height: 13px;
}

.mark-part {
  padding: 3px 9px;
  border-radius: 9px;
  background: var(--brand-soft);
  color: var(--brand-1);
  font-size: 11.5px;
  font-weight: 600;
  flex: none;
}

/* ---------- 折叠开关 ---------- */
.fold {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--ink-3);
  flex: none;
}

.fold svg {
  width: 15px;
  height: 15px;
  transition: transform 0.2s;
  transform: rotate(-90deg);
}

.fold.open svg {
  transform: rotate(0);
}

.stat-line {
  font-size: 12px;
  color: var(--ink-3);
  margin-bottom: 6px;
}

.teaser {
  font-size: 12.5px;
  color: var(--ink-2);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 单条动作状态 ---------- */
.status {
  flex: none;
  font-size: 11.5px;
  padding: 3px 8px;
  border-radius: 8px;
}

.status.idle {
  color: var(--ink-3);
  background: var(--surface-3);
}

.status.part {
  color: var(--brand-1);
  background: var(--brand-soft);
  font-weight: 600;
}

.status.done {
  color: var(--ok);
  background: var(--ok-soft);
  font-weight: 600;
}

.hint {
  font-size: 13px;
  color: var(--ink-2);
  margin-bottom: 12px;
}

.btns {
  display: flex;
  gap: 10px;
}

.done-row {
  cursor: pointer;
}

.arrow {
  color: var(--ink-4);
  font-size: 20px;
}

/* ---------- 调整计划顺序弹层 ---------- */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.45);
  z-index: 230;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.adj {
  width: 100%;
  max-width: 340px;
  max-height: 76vh;
  background: var(--card);
  border-radius: var(--r-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.adj-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 0;
}

.adj-title {
  font-size: 15.5px;
  font-weight: 600;
}

.adj-x {
  color: var(--ink-3);
  font-size: 16px;
}

.adj-sub {
  padding: 6px 16px 12px;
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
  border-bottom: 1px solid var(--line);
}

.adj-body {
  overflow-y: auto;
  padding: 4px 10px 12px;
}

.adj-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 6px;
  border-bottom: 1px solid var(--line);
}

.adj-row:last-child {
  border-bottom: none;
}

.adj-meta {
  flex: 1;
  min-width: 0;
}

.adj-name {
  font-size: 14.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.adj-info {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.adj-go {
  flex: none;
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  background: var(--brand-soft);
  color: var(--brand-1);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
}

.adj-go:disabled {
  background: var(--surface-3);
  color: var(--ink-4);
  font-weight: 400;
}
</style>
