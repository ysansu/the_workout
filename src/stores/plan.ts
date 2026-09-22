import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Plan, PlanDay } from '@/types'
import { seedPlans } from '@/data/plans'
import { loadState, persist, saveState } from '@/utils/persist'
import { migratePlan, uid } from '@/utils/migrate'
import { todayWeekday } from '@/utils/date'

interface ActivePlan {
  planId: string
  /** 周期模式下：下一次该练第几天（plan.days 的下标）。按周模式不使用 */
  dayIndex: number
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
   * - cycle：按 dayIndex 轮转
   */
  const currentDay = computed<PlanDay | null>(() => {
    const plan = activePlan.value
    if (!active.value || !plan || !plan.days.length) return null
    if (plan.schedule === 'weekly') {
      return dayOfWeekday(plan, todayWeekday())
    }
    return plan.days[active.value.dayIndex % plan.days.length] ?? null
  })

  function activate(planId: string) {
    active.value = { planId, dayIndex: 0 }
  }

  function deactivate() {
    active.value = null
  }

  /** 完成一次训练后推进。按周模式不需要推进 */
  function advanceDay() {
    if (!active.value || !activePlan.value) return
    if (activePlan.value.schedule === 'weekly') return
    const n = activePlan.value.days.length || 1
    active.value = { ...active.value, dayIndex: (active.value.dayIndex + 1) % n }
  }

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
    const days = customPlans.value[i].days.map((d) => (d.id === dayId ? { ...d, ...patch } : d))
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
    getPlanById,
    activate,
    deactivate,
    advanceDay,
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
    isWeekdayTaken,
  }
})
