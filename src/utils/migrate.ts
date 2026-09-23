import type {
  IntensityUnit,
  NumText,
  Plan,
  PlanDay,
  PlanItem,
  Session,
  UserProfile,
} from '@/types'
import { numOf } from './num'

/** 简易唯一 id */
export function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

type Loose = Record<string, any>

/** 从旧版的次数文案里推断强度单位 */
function guessUnit(reps: string | undefined, weight: number | undefined): IntensityUnit {
  if (weight && weight > 0) return 'kg'
  const t = String(reps ?? '')
  if (t.includes('力竭')) return 'failure'
  if (t.includes('分钟')) return 'min'
  if (t.includes('秒')) return 'sec'
  return 'reps'
}

/**
 * 旧版 PlanItem → 新版。
 * 旧：`{ exerciseId, sets, reps: string, weight?: number, rest, note? }`
 * 新：`{ exerciseId, sets, unit, strength, reps?, rest, note? }`
 */
export function migratePlanItem(old: Loose): PlanItem {
  const weight = typeof old.weight === 'number' ? old.weight : undefined
  const repsText = old.reps == null ? undefined : String(old.reps)
  const unit: IntensityUnit = old.unit ?? guessUnit(repsText, weight)

  let strength: NumText
  if (old.strength != null) strength = old.strength
  else if (unit === 'failure') strength = 0
  else if (unit === 'kg') strength = weight ?? numOf(repsText)
  else strength = repsText != null && !/\d/.test(repsText) ? repsText : numOf(repsText)

  const item: PlanItem = {
    exerciseId: String(old.exerciseId ?? ''),
    sets: Number(old.sets) || 1,
    unit,
    strength,
    rest: Number(old.rest) || 60,
  }
  if (unit === 'kg') {
    item.reps = old.reps2 != null ? old.reps2 : (repsText ?? 10)
  }
  if (old.note) item.note = old.note
  return item
}

/** 旧版 PlanDay → 新版（旧版按 index 顺序，即新版 cycle 模式） */
export function migratePlanDay(old: Loose, i: number): PlanDay {
  const day: PlanDay = {
    id: old.id ?? `d${i}`,
    name: old.name ?? `第 ${i + 1} 天`,
    weekday: old.weekday,
    items: Array.isArray(old.items) ? old.items.map(migratePlanItem) : [],
  }
  // 这里是重建对象，新增字段必须显式带过来，否则刷新一次就丢了
  if (old.rest) day.rest = true
  return day
}

/** 旧版 Plan → 新版（旧版一律按周期模式排布） */
export function migratePlan(old: Loose): Plan {
  return {
    id: String(old.id ?? uid('plan')),
    name: old.name ?? '未命名计划',
    desc: old.desc ?? '',
    goal: old.goal ?? 'muscle',
    level: old.level ?? 'beginner',
    schedule: old.schedule ?? 'cycle',
    daysPerWeek: Number(old.daysPerWeek) || (Array.isArray(old.days) ? old.days.length : 3),
    equipment: Array.isArray(old.equipment) ? old.equipment : [],
    days: Array.isArray(old.days) ? old.days.map(migratePlanDay) : [],
    builtin: !!old.builtin,
    cover: old.cover,
  }
}

/** 旧版 SetEntry → 新版 */
export function migrateSet(old: Loose) {
  if (old && 'value' in old && 'unit' in old) return old
  return {
    unit: old?.unit ?? ('kg' as IntensityUnit),
    value: old?.value ?? old?.weight ?? 0,
    reps: old?.reps ?? undefined,
    done: old?.done,
    at: old?.at,
  }
}

/** 旧版 Session → 新版 */
export function migrateSession(old: Loose): Session {
  return {
    ...old,
    entries: Array.isArray(old.entries)
      ? old.entries.map((e: Loose) => ({
          exerciseId: e.exerciseId,
          sets: Array.isArray(e.sets) ? e.sets.map(migrateSet) : [],
        }))
      : [],
  } as Session
}

/** 旧版 UserProfile → 新版（补训练设置默认值） */
export function migrateProfile(old: Loose): UserProfile {
  const next: Loose = {
    ...old,
    restAlert: old.restAlert ?? 'vibrate',
    timerEnabled: old.timerEnabled ?? true,
    timerRule: old.timerRule ?? 'countup',
    theme: old.theme === 'dark' ? 'dark' : 'light',
  }
  // 音效选项已去掉，顺手把老数据里的残留键清掉
  delete next.restSound
  return next as UserProfile
}
