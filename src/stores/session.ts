import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { IntensityUnit, Session, SessionEntry, SetEntry } from '@/types'
import { loadState, persist } from '@/utils/persist'
import { migrateSession } from '@/utils/migrate'
import { getExercise } from '@/data/exercises'
import { bestSet, sessionVolume } from '@/utils/stats'
import { numOf } from '@/utils/num'
import { todayKey, weekKeys } from '@/utils/date'

export const useSessionStore = defineStore('session', () => {
  const sessions = ref<Session[]>(
    (loadState<unknown[]>('sessions', []) as any[]).map(migrateSession),
  )
  persist('sessions', () => sessions.value)

  /* ---------------- 写入 ---------------- */

  function addSession(s: Session) {
    sessions.value = [s, ...sessions.value]
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id)
  }

  /* ---------------- 查询 ---------------- */

  const sorted = computed(() =>
    [...sessions.value].sort((a, b) =>
      a.date === b.date ? b.startAt - a.startAt : b.date.localeCompare(a.date),
    ),
  )

  const byDate = computed(() => {
    const m: Record<string, Session[]> = {}
    sessions.value.forEach((s) => {
      ;(m[s.date] ||= []).push(s)
    })
    return m
  })

  /** 某动作最近一次训练的所有组，用于「上次成绩」回显 */
  function lastSets(exerciseId: string): SetEntry[] | null {
    for (const s of sorted.value) {
      const e = s.entries.find((x) => x.exerciseId === exerciseId)
      if (e && e.sets.length) return e.sets
    }
    return null
  }

  /** 某动作最近一次的最佳组 */
  function lastPerf(
    exerciseId: string,
  ): { date: string; unit: IntensityUnit; value: number; reps: number } | null {
    for (const s of sorted.value) {
      const e = s.entries.find((x) => x.exerciseId === exerciseId)
      if (!e) continue
      const b = bestSet(e.sets)
      if (b) return { date: s.date, unit: b.unit, value: numOf(b.value), reps: numOf(b.reps) }
    }
    return null
  }

  /* ---------------- 统计 ---------------- */

  const trainedDates = computed(() => [...new Set(sessions.value.map((s) => s.date))])

  const totalDays = computed(() => trainedDates.value.length)

  /** 本周已练天数（周一为起点） */
  const weekTrainedDays = computed(() => {
    const keys = new Set(weekKeys())
    return new Set(sessions.value.filter((s) => keys.has(s.date)).map((s) => s.date)).size
  })

  /** 本周各部位组数，用于肌群分布 */
  const muscleSetsThisWeek = computed(() => {
    const keys = new Set(weekKeys())
    const m: Record<string, number> = {}
    sessions.value
      .filter((s) => keys.has(s.date))
      .forEach((s) => {
        s.entries.forEach((e: SessionEntry) => {
          const ex = getExercise(e.exerciseId)
          if (!ex) return
          m[ex.group] = (m[ex.group] || 0) + e.sets.length
        })
      })
    return m
  })

  const todaySessions = computed(() => byDate.value[todayKey()] || [])

  const totalVolume = computed(() => sessions.value.reduce((n, s) => n + sessionVolume(s), 0))

  return {
    sessions,
    sorted,
    byDate,
    addSession,
    deleteSession,
    lastSets,
    lastPerf,
    totalDays,
    weekTrainedDays,
    muscleSetsThisWeek,
    todaySessions,
    totalVolume,
  }
})
