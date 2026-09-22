import type { Session, SessionEntry, SetEntry } from '@/types'
import { numOf, setVolume } from './num'

export function entryVolume(e: SessionEntry): number {
  return e.sets.reduce((sum, s) => sum + setVolume(s), 0)
}

export function sessionVolume(s: Session): number {
  return s.entries.reduce((sum, e) => sum + entryVolume(e), 0)
}

export function sessionSets(s: Session): number {
  return s.entries.reduce((sum, e) => sum + e.sets.length, 0)
}

/** Epley 变体估算 1RM，用于比较不同次数的强度 */
function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

/** 单组中的最好一组（按估算 1RM）；非 kg 单位取数值最大的一组 */
export function bestSet(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null
  let bestScore = -1
  for (const s of sets) {
    if (s.done === false) continue
    const v = numOf(s.value)
    if (!v) continue
    const score = s.unit === 'kg' ? estimate1RM(v, numOf(s.reps)) : v
    if (score > bestScore) {
      bestScore = score
      best = s
    }
  }
  return best
}
