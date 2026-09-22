function pad(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/** 本地日期 YYYY-MM-DD（不用 toISOString，避免时区偏移） */
export function dateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function todayKey(): string {
  return dateKey(new Date())
}

/** 周一为一周起点，返回该周 7 天的 key */
export function weekKeys(base: Date = new Date()): string[] {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d)
    x.setDate(d.getDate() + i)
    return dateKey(x)
  })
}

export function fmtMD(key: string): string {
  const [, m, d] = key.split('-')
  return `${Number(m)}月${Number(d)}日`
}

export function weekdayLabel(key: string): string {
  return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][parseKey(key).getDay()]
}

/* ---------------- 星期（1=周一 … 7=周日，与 PlanDay.weekday 对齐） ---------------- */

export const WEEKDAY_CN = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']
export const WEEKDAY_SHORT = ['', '一', '二', '三', '四', '五', '六', '日']

function weekdayNum(d: Date = new Date()): number {
  const n = d.getDay()
  return n === 0 ? 7 : n
}

export function todayWeekday(): number {
  return weekdayNum(new Date())
}

/** 完整时间：2026/09/10 14:10 */
export function fmtYMDHM(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 秒 → mm:ss */
export function fmtMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
}

/** 秒 → X分钟（取整，用于首页的大号数字） */
export function minutesOf(sec: number): number {
  return Math.round(sec / 60)
}
