import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { PlanItem, Session, SessionEntry, SetEntry } from '@/types'
import { loadState, persist } from '@/utils/persist'
import { migratePlanItem, migrateSet } from '@/utils/migrate'
import { useSessionStore } from './session'
import { usePlanStore } from './plan'
import { dateKey } from '@/utils/date'
import { numOf, isUnitless } from '@/utils/num'

export interface CurrentWorkout {
  name: string
  planId?: string
  planDayId?: string
  dayIndex?: number
  items: PlanItem[]
  entries: SessionEntry[]
  startedAt: number
  currentIndex: number
  /** 当前动作的计时起点，切换动作时重置 */
  exStartedAt: number
  /** 累计暂停时长（毫秒） */
  pausedMs: number
  /** 暂停开始的时刻；未暂停时为空 */
  pausedAt?: number
  /**
   * 最近一次「App 在前台」的时间戳。
   * 用来区分「切到后台又回来」（要计时）和「App 被杀掉后重开」（不该计入）。
   */
  lastSeenAt: number
}

/** 冷启动时，超过这个时长的空档视为「App 被关掉了」，不计入训练时长 */
const COLD_GAP_MS = 60 * 1000

function migrateCurrent(old: any): CurrentWorkout | null {
  if (!old || !Array.isArray(old.items)) return null
  return {
    ...old,
    items: old.items.map(migratePlanItem),
    entries: Array.isArray(old.entries)
      ? old.entries.map((e: any) => ({
          exerciseId: e.exerciseId,
          sets: Array.isArray(e.sets) ? e.sets.map(migrateSet) : [],
        }))
      : [],
    exStartedAt: old.exStartedAt ?? old.startedAt ?? Date.now(),
    pausedMs: old.pausedMs ?? 0,
    pausedAt: old.pausedAt,
    lastSeenAt: old.lastSeenAt ?? Date.now(),
  }
}

/**
 * 冷启动重锚：页面重新加载（= App 被关掉后重开）时，
 * 把「上一次在前台」到「现在」的空档从训练时长里扣掉。
 * 单纯切后台不会走到这里 —— 页面没有重新加载，计时自然继续。
 */
function reanchor(c: CurrentWorkout | null) {
  if (!c?.lastSeenAt) return
  const gap = Date.now() - c.lastSeenAt
  if (gap < COLD_GAP_MS) return
  c.startedAt += gap
  c.exStartedAt += gap
  if (c.pausedAt) c.pausedAt += gap
  c.lastSeenAt = Date.now()
}

/** 一组是否算「有内容」 */
function setFilled(s: SetEntry): boolean {
  return !!s.done || numOf(s.value) > 0
}

export const useWorkoutStore = defineStore('workout', () => {
  const current = ref<CurrentWorkout | null>(migrateCurrent(loadState<any>('currentWorkout', null)))
  persist('currentWorkout', () => current.value)

  // 冷启动时先把「App 关着的那段」扣掉，再开始计时
  reanchor(current.value)

  /** 记录「还在前台」的时间点，供下次冷启动判断空档 */
  function touch() {
    if (current.value) current.value.lastSeenAt = Date.now()
  }

  let touchTimer: number | null = null
  function startTouch() {
    if (touchTimer !== null) return
    touchTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') touch()
    }, 5000)
    // 切到后台的那一刻也记一下，App 若在此后被系统回收，空档起点才准确
    document.addEventListener('visibilitychange', touch)
    window.addEventListener('focus', touch)
    window.addEventListener('pageshow', touch)
  }
  startTouch()

  const hasCurrent = computed(() => !!current.value && current.value.items.length > 0)

  /** 已勾选的组数 */
  const doneSets = computed(() => {
    if (!current.value) return 0
    return current.value.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0)
  })

  const totalSets = computed(() =>
    current.value ? current.value.entries.reduce((n, e) => n + e.sets.length, 0) : 0,
  )

  /** 整体完成进度（已勾选组数 / 总组数） */
  const progressPct = computed(() =>
    totalSets.value ? Math.round((doneSets.value / totalSets.value) * 100) : 0,
  )

  /** 从头到尾已过的时长（秒），已扣除暂停 */
  function elapsedSec(): number {
    const c = current.value
    if (!c) return 0
    const paused = c.pausedMs + (c.pausedAt ? Date.now() - c.pausedAt : 0)
    return Math.max(0, Math.round((Date.now() - c.startedAt - paused) / 1000))
  }

  /** 当前动作已用时长（秒） */
  function exerciseSec(): number {
    const c = current.value
    if (!c) return 0
    const paused = c.pausedMs + (c.pausedAt ? Date.now() - c.pausedAt : 0)
    return Math.max(0, Math.round((Date.now() - c.exStartedAt - paused) / 1000))
  }

  const isPaused = computed(() => !!current.value?.pausedAt)

  function start(opts: {
    name: string
    items: PlanItem[]
    planId?: string
    planDayId?: string
    dayIndex?: number
  }) {
    const sessionStore = useSessionStore()
    const entries: SessionEntry[] = opts.items.map((it) => {
      // 预填顺序：计划指定强度 > 上次成绩。让录入变成微调而不是从零输入。
      // 力竭没有数值可言，不参与回填。
      const last = sessionStore.lastSets(it.exerciseId)
      const first = last && last.length ? last[0] : null
      const useLast = !isUnitless(it.unit) && numOf(it.strength) === 0 && first
      const value = useLast ? first!.value : it.strength
      const reps = useLast ? first!.reps : it.reps
      return {
        exerciseId: it.exerciseId,
        sets: Array.from({ length: Math.max(1, it.sets) }, () => ({
          unit: it.unit,
          value,
          reps,
          done: false,
        })),
      }
    })
    current.value = {
      name: opts.name,
      planId: opts.planId,
      planDayId: opts.planDayId,
      dayIndex: opts.dayIndex,
      items: opts.items,
      entries,
      startedAt: Date.now(),
      currentIndex: 0,
      exStartedAt: Date.now(),
      pausedMs: 0,
      lastSeenAt: Date.now(),
    }
  }

  function setSet(
    index: number,
    setIdx: number,
    patch: Partial<Pick<SetEntry, 'value' | 'reps' | 'done' | 'unit'>>,
  ) {
    if (!current.value) return
    const e = current.value.entries[index]
    if (!e) return
    const prev = e.sets[setIdx]
    if (!prev) return
    e.sets[setIdx] = { ...prev, ...patch, at: patch.done ? Date.now() : prev.at }
  }

  function addSet(index: number) {
    const c = current.value
    if (!c) return
    const e = c.entries[index]
    if (!e) return
    const last = e.sets[e.sets.length - 1]
    e.sets.push({
      unit: last?.unit ?? c.items[index]?.unit ?? 'kg',
      value: last?.value ?? 0,
      reps: last?.reps ?? 0,
      done: false,
    })
  }

  function removeSet(index: number, setIdx: number) {
    const c = current.value
    if (!c) return
    const e = c.entries[index]
    if (!e || e.sets.length <= 1) return
    e.sets.splice(setIdx, 1)
  }

  function goTo(i: number) {
    const c = current.value
    if (!c) return
    const next = Math.max(0, Math.min(i, c.items.length - 1))
    c.exStartedAt = Date.now()
    c.currentIndex = next
  }

  function removeExercise(index: number) {
    const c = current.value
    if (!c) return
    c.items.splice(index, 1)
    c.entries.splice(index, 1)
    if (c.currentIndex >= c.items.length) {
      c.currentIndex = Math.max(0, c.items.length - 1)
      c.exStartedAt = Date.now()
    }
  }

  function addExercise(item: PlanItem) {
    const c = current.value
    if (!c) return
    const sessionStore = useSessionStore()
    const last = sessionStore.lastSets(item.exerciseId)
    const first = last && last.length ? last[0] : null
    const useLast = !isUnitless(item.unit) && numOf(item.strength) === 0 && first
    c.items.push(item)
    c.entries.push({
      exerciseId: item.exerciseId,
      sets: Array.from({ length: Math.max(1, item.sets) }, () => ({
        unit: item.unit,
        value: useLast ? first!.value : item.strength,
        reps: useLast ? first!.reps : item.reps,
        done: false,
      })),
    })
  }

  /** 把某个动作的组数补齐/裁剪到指定数量 */
  function ensureSets(index: number, count: number) {
    const c = current.value
    if (!c) return
    const e = c.entries[index]
    if (!e) return
    while (e.sets.length < count) addSet(index)
    while (e.sets.length > count && e.sets.length > 1) e.sets.pop()
    if (c.items[index]) c.items[index].sets = e.sets.length
  }

  function pause() {
    if (!current.value || current.value.pausedAt) return
    current.value.pausedAt = Date.now()
  }

  function resume() {
    const c = current.value
    if (!c || !c.pausedAt) return
    c.pausedMs += Date.now() - c.pausedAt
    c.pausedAt = undefined
  }

  /** 结束训练：写入历史记录，推进计划天数，清空当前训练 */
  function finish(): Session | null {
    const c = current.value
    if (!c) return null
    if (c.pausedAt) resume()
    const sessionStore = useSessionStore()
    const planStore = usePlanStore()

    // 优先取打了勾的组；一组都没勾时，退化成「所有填了数值的组」，避免白练
    const anyDone = c.entries.some((e) => e.sets.some((s) => s.done))
    const entries = c.entries
      .map((e) => ({
        ...e,
        sets: e.sets.filter((s) => (anyDone ? s.done : setFilled(s))),
      }))
      .filter((e) => e.sets.length)

    if (!entries.length) {
      current.value = null
      return null
    }

    const now = Date.now()
    const session: Session = {
      id: 's_' + now,
      date: dateKey(),
      planId: c.planId,
      planDayIndex: c.dayIndex,
      planDayId: c.planDayId,
      name: c.name,
      startAt: c.startedAt,
      endAt: now,
      durationSec: Math.round((now - c.startedAt - c.pausedMs) / 1000),
      entries,
    }
    sessionStore.addSession(session)
    if (c.planId) advancePlanAfter(c)
    current.value = null
    return session
  }

  /**
   * 完成训练后推进计划轮次。
   *
   * 只有「练的正是当前轮次指向的那天」才推进 —— 首页的「再来一次」练的是今天已经
   * 练过的那天（轮次早已推到下一天），这时再推进一次会把中间那天直接跳过去。
   */
  function advancePlanAfter(c: CurrentWorkout) {
    const planStore = usePlanStore()
    const plan = planStore.activePlan
    const days = plan?.days ?? []
    const pointer = planStore.active?.dayIndex ?? 0
    const cur = days.length ? days[pointer % days.length] : null
    if (cur && c.planDayId && cur.id !== c.planDayId) return
    planStore.advanceDay()
  }

  /** 放弃训练：直接丢弃，不写入记录 */
  function abandon() {
    current.value = null
  }

  return {
    current,
    hasCurrent,
    doneSets,
    totalSets,
    progressPct,
    isPaused,
    elapsedSec,
    exerciseSec,
    start,
    setSet,
    addSet,
    removeSet,
    ensureSets,
    goTo,
    removeExercise,
    addExercise,
    pause,
    resume,
    finish,
    abandon,
  }
})
