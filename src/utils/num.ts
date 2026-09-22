import type { IntensityUnit, NumText, PlanItem, SetEntry } from '@/types'

/** 从可能是 '8-12' / '力竭' / '10 / 侧' 的写法里取第一个数字 */
export function numOf(v: NumText | undefined | null): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  if (v == null) return 0
  const m = String(v).match(/-?\d+(\.\d+)?/)
  return m ? Number(m[0]) : 0
}

/** 数字是否为空（0 或空串或 '力竭' 这类无数字的文本） */
function isEmptyNum(v: NumText | undefined | null): boolean {
  if (v == null || v === '') return true
  if (typeof v === 'number') return v === 0
  return !/\d/.test(String(v))
}

/** 去掉多余小数位：10 → '10'，7.5 → '7.5'，10.0 → '10' */
export function fmtNum(v: NumText | undefined | null): string {
  if (v == null || v === '') return ''
  if (typeof v === 'string') return v
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
}

export const UNIT_LABEL: Record<IntensityUnit, string> = {
  kg: 'kg',
  rm: 'rm',
  reps: '次',
  sec: '秒',
  min: '分钟',
  failure: '力竭',
}

/** 强度单位的选项文案 */
export const UNIT_OPTIONS: { value: IntensityUnit; label: string }[] = [
  { value: 'kg', label: 'kg/次' },
  { value: 'rm', label: 'rm' },
  { value: 'reps', label: '次' },
  { value: 'sec', label: '秒' },
  { value: 'min', label: '分钟' },
  { value: 'failure', label: '力竭' },
]

/** 该单位下是否需要单独填写「次数」 */
export function needsReps(unit: IntensityUnit): boolean {
  return unit === 'kg'
}

/** 该单位是否不需要填任何数值（选了就是「力竭」两个字） */
export function isUnitless(unit: IntensityUnit): boolean {
  return unit === 'failure'
}

/** 该单位是否表示时长 */
function isTimed(unit: IntensityUnit): boolean {
  return unit === 'sec' || unit === 'min'
}

/** 强度单位 + 数值 → 展示文本，如 '10kg' / '10rm' / '30秒' / '力竭' */
export function fmtStrength(unit: IntensityUnit, value: NumText | undefined | null): string {
  if (isUnitless(unit)) return UNIT_LABEL.failure
  if (isEmptyNum(value)) return ''
  if (typeof value === 'string' && !/\d/.test(value)) return value
  return `${fmtNum(value)}${UNIT_LABEL[unit]}`
}

/** 把 PlanItem 渲染成一行文案：'每组10kg×10次 · 组休30秒' */
export function fmtPlanItem(it: PlanItem): string {
  const parts: string[] = []
  if (it.unit === 'kg') {
    const w = fmtNum(it.strength)
    const r = fmtNum(it.reps)
    if (w) parts.push(fmtNum(it.strength) ? `${w}kg${r ? `×${r}次` : ''}` : '')
    else if (r) parts.push(`${r}次`)
  } else {
    const s = fmtStrength(it.unit, it.strength)
    if (s) parts.push(s)
  }
  const body = parts.filter(Boolean).join(' ') || '—'
  return `每组${body} · 组休${it.rest}秒`
}

/** 计划的简短摘要：'共4组 · 每组10kg×10次 · 组休30秒' */
export function fmtPlanItemFull(it: PlanItem): string {
  return `共${it.sets}组 · ${fmtPlanItem(it)}`
}

/** 一组实绩的展示文本，如 '10kg × 10' / '30秒' */
export function fmtSet(s: SetEntry): string {
  if (s.unit === 'kg') {
    const w = fmtNum(s.value)
    const r = fmtNum(s.reps)
    if (w && r) return `${w}kg × ${r}`
    if (w) return `${w}kg`
    if (r) return `${r} 次`
    return '—'
  }
  return fmtStrength(s.unit, s.value) || '—'
}

/** 单组容量：只有 kg 单位才计算（重量 × 次数） */
export function setVolume(s: SetEntry): number {
  if (s.unit !== 'kg') return 0
  return Math.round(numOf(s.value) * numOf(s.reps))
}

/**
 * 粗略估算一条动作需要多久（秒）。
 * 每组按「实际做功时间 + 组休」累加，做功时间按 次数×3 秒或直接取时长。
 */
export function planItemSeconds(it: PlanItem): number {
  const perSet = isTimed(it.unit)
    ? numOf(it.strength) * (it.unit === 'min' ? 60 : 1)
    : Math.max(20, numOf(it.reps ?? it.strength) * 3)
  const work = perSet * it.sets
  const rest = it.rest * Math.max(0, it.sets - 1)
  return Math.round(work + rest)
}
