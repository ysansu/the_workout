import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Plan, PlanDay } from '@/types'
import { seedPlans } from '@/data/plans'
import { loadState, persist, saveState } from '@/utils/persist'
import { migratePlan, uid } from '@/utils/migrate'
import { dateKey, todayKey, todayWeekday } from '@/utils/date'

interface ActivePlan {
  planId: string
  /** 周期模式下：下一次该练第几天（plan.days 的下标）。按周模式不使用 */
  dayIndex: number
  /**
   * 周期模式下 dayIndex 的「生效日期」(YYYY-MM-DD)，只在推进时写。
   *
   * 存在的唯一理由是休息日：训练日必须「练完」才推进（没练不能把内容跳过去），
   * 而休息日是随时间自然结束的 —— 到了第二天就该轮到下一个训练日。
   * 没有这个日期就没法区分「今天刚到休息日」和「休息日已经过完了」，
   * 练三休一会永远卡在休息日上。
   */
  since?: string
}

/** 明天（本地日期）。用 setDate 而不是加毫秒，跨时区/夏令时都稳 */
function tomorrowKey(): string {
  const d = new Date()
  return dateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1))
}

/** PlanDay 是不是休息日 */
function isRestDay(d: PlanDay | null | undefined): boolean {
  return !!d?.rest
}

const SEED_FLAG = 'seededPlans'

export const usePlanStore = defineStore('plan', () => {
  const customPlans = ref<Plan[]>(
    (loadState<unknown[]>('customPlans', []) as any[]).map(migratePlan),
  )
  const active = ref<ActivePlan | null>(loadState<ActivePlan | null>('activePlan', null))
  persist('customPlans', () => customPlans.value)
  persist('activePlan', () => active.value)

  /**
   * 首次启动时把初始计划装进「我的计划」。
   * 装进去之后就跟自己建的计划一样，可以随意改、也可以直接删掉，不会再被补回来。
   */
  function installSeed() {
    if (loadState<boolean>(SEED_FLAG, false)) return
    const existing = new Set(customPlans.value.map((p) => p.id))
    const incoming = seedPlans.filter((p) => !existing.has(p.id)).map((p) => ({ ...p, builtin: false }))
    if (incoming.length) customPlans.value = [...incoming, ...customPlans.value]
    saveState(SEED_FLAG, true)
  }
  installSeed()

  const ownPlans = computed<Plan[]>(() => customPlans.value)

  function getPlanById(id: string): Plan | undefined {
    return customPlans.value.find((p) => p.id === id)
  }

  const activePlan = computed<Plan | null>(() =>
    active.value ? getPlanById(active.value.planId) ?? null : null,
  )

  /** 计划里某星期几对应的训练日 */
  function dayOfWeekday(plan: Plan, weekday: number): PlanDay | null {
    return plan.days.find((d) => d.weekday === weekday) ?? null
  }

  /**
   * 当前该练的那一天。
   * - weekly：取今天星期几对应的训练日；今天没排就是休息日（null）
   * - cycle：按 dayIndex 轮转（轮到的可能是一个 rest 休息日条目）
   */
  const currentDay = computed<PlanDay | null>(() => {
    const plan = activePlan.value
    if (!active.value || !plan || !plan.days.length) return null
    if (plan.schedule === 'weekly') {
      return dayOfWeekday(plan, todayWeekday())
    }
    return plan.days[active.value.dayIndex % plan.days.length] ?? null
  })

  /** 今天轮到的是不是休息日 */
  const onRestDay = computed(() => isRestDay(currentDay.value))

  function activate(planId: string) {
    active.value = { planId, dayIndex: 0, since: todayKey() }
  }

  function deactivate() {
    active.value = null
  }

  /** 完成一次训练后推进。按周模式不需要推进 */
  function advanceDay() {
    if (!active.value || !activePlan.value) return
    if (activePlan.value.schedule === 'weekly') return
    const days = activePlan.value.days
    const n = days.length || 1
    const next = (active.value.dayIndex + 1) % n
    active.value = {
      ...active.value,
      dayIndex: next,
      // 落点是休息日时，生效日期写「明天」——休息日占的是下一个自然日。
      // 写成今天的话，刚练完的当晚就把休息日消耗掉了，第二天直接跳到训练日。
      since: isRestDay(days[next]) ? tomorrowKey() : todayKey(),
    }
  }

  /**
   * 把已经过完的休息日推过去。
   *
   * 只在周期模式下有意义（按周模式由星期几决定，不需要推）。
   * 冷启动、切回前台、跨天时各调用一次。
   * 只在「日期已经跨过 since」时才推，所以同一个休息日会完整占掉一个自然日。
   */
  function syncRestDay() {
    if (!active.value || !activePlan.value) return
    if (activePlan.value.schedule !== 'cycle') return
    const days = activePlan.value.days
    const n = days.length
    if (!n) return

    const today = todayKey()
    const since = active.value.since
    let idx = active.value.dayIndex

    // 老数据没有 since：先记成今天，当作「今天刚轮到这里」，不推进
    if (!since) {
      active.value = { ...active.value, since: today }
      return
    }
    if (since >= today) return

    // 已经跨天了：如果是休息日就往后推，最多绕一圈（防止整份计划全是休息日时死循环）
    let moved = false
    for (let i = 0; i < n; i++) {
      if (!isRestDay(days[idx % n])) break
      idx = (idx + 1) % n
      moved = true
    }

    active.value = {
      ...active.value,
      dayIndex: idx,
      since: isRestDay(days[idx % n]) ? tomorrowKey() : today,
    }
  }

  // 跨天时自动推进（冷启动 / 切回前台 / 跨过零点）
  if (typeof document !== 'undefined') {
    const onWake = () => syncRestDay()
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
  }
  syncRestDay()

  /* ---------------- 自定义计划 ---------------- */

  function addCustomPlan(p: Plan) {
    customPlans.value = [p, ...customPlans.value]
  }

  function updateCustomPlan(id: string, patch: Partial<Plan>) {
    const i = customPlans.value.findIndex((p) => p.id === id)
    if (i < 0) return
    customPlans.value[i] = { ...customPlans.value[i], ...patch }
  }

  function removeCustomPlan(id: string) {
    customPlans.value = customPlans.value.filter((p) => p.id !== id)
    if (active.value?.planId === id) active.value = null
  }

  /** 复制一份（含所有训练日与动作），副本可自由编辑 */
  function duplicatePlan(id: string, asCustom = true): Plan | null {
    const src = getPlanById(id)
    if (!src) return null
    const copy: Plan = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid('plan'),
      name: src.name + ' 副本',
      builtin: false,
      days: src.days.map((d) => ({ ...d, id: uid('day') })),
    }
    if (asCustom) addCustomPlan(copy)
    return copy
  }

  /* ---------------- 训练日 ---------------- */

  function updateDay(planId: string, dayId: string, patch: Partial<PlanDay>) {
    const i = customPlans.value.findIndex((p) => p.id === planId)
    if (i < 0) return
    const days = customPlans.value[i].days.map((d) => {
      if (d.id !== dayId) return d
      const next = { ...d, ...patch }
      // 休息日一旦被塞进动作，就不再是休息日了
      // （在训练日编辑页给休息日加动作的场景）。放在这里改，
      // 是因为加动作有拖拽排序等好几条路径，逐个改容易漏。
      if (next.items?.length) next.rest = undefined
      return next
    })
    customPlans.value[i] = { ...customPlans.value[i], days }
  }

  function addDay(planId: string, day: PlanDay) {
    const i = customPlans.value.findIndex((p) => p.id === planId)
    if (i < 0) return
    const days = [...customPlans.value[i].days, day]
    customPlans.value[i] = { ...customPlans.value[i], days, daysPerWeek: days.length }
  }

  function removeDay(planId: string, dayId: string) {
    const i = customPlans.value.findIndex((p) => p.id === planId)
    if (i < 0) return
    const days = customPlans.value[i].days.filter((d) => d.id !== dayId)
    customPlans.value[i] = { ...customPlans.value[i], days, daysPerWeek: days.length }
  }

  /** 调整训练日顺序，dir=-1 前移，1 后移 */
  function moveDay(planId: string, dayId: string, dir: -1 | 1) {
    const i = customPlans.value.findIndex((p) => p.id === planId)
    if (i < 0) return
    const days = [...customPlans.value[i].days]
    const at = days.findIndex((d) => d.id === dayId)
    const to = at + dir
    if (at < 0 || to < 0 || to >= days.length) return
    ;[days[at], days[to]] = [days[to], days[at]]
    customPlans.value[i] = { ...customPlans.value[i], days }
  }

  /** 复制训练日（连动作一起复制） */
  function copyDay(planId: string, dayId: string): PlanDay | null {
    const i = customPlans.value.findIndex((p) => p.id === planId)
    if (i < 0) return null
    const src = customPlans.value[i].days.find((d) => d.id === dayId)
    if (!src) return null
    const copy: PlanDay = {
      ...JSON.parse(JSON.stringify(src)),
      id: uid('day'),
      name: src.name + ' 副本',
    }
    const days = [...customPlans.value[i].days, copy]
    customPlans.value[i] = { ...customPlans.value[i], days, daysPerWeek: days.length }
    return copy
  }

  /** 切换排布方式；从按周切到周期时清掉星期绑定 */
  function setSchedule(planId: string, schedule: Plan['schedule']) {
    const i = customPlans.value.findIndex((p) => p.id === planId)
    if (i < 0) return
    const days =
      schedule === 'cycle'
        ? customPlans.value[i].days.map((d) => ({ ...d, weekday: undefined }))
        : customPlans.value[i].days
    customPlans.value[i] = { ...customPlans.value[i], schedule, days }
  }

  /** 把某个训练日设成 / 取消休息日。动作内容保留，取消时原样回来 */
  function setDayRest(planId: string, dayId: string, rest: boolean) {
    updateDay(planId, dayId, { rest: rest || undefined })
  }

  /** 按周模式下，某个星期几是否已被占用 */
  function isWeekdayTaken(planId: string, weekday: number): boolean {
    const p = getPlanById(planId)
    return !!p?.days.some((d) => d.weekday === weekday)
  }

  return {
    customPlans,
    ownPlans,
    active,
    activePlan,
    currentDay,
    onRestDay,
    getPlanById,
    activate,
    deactivate,
    advanceDay,
    syncRestDay,
    addCustomPlan,
    updateCustomPlan,
    removeCustomPlan,
    duplicatePlan,
    updateDay,
    addDay,
    removeDay,
    moveDay,
    copyDay,
    setSchedule,
    setDayRest,
    isWeekdayTaken,
  }
})
