import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { Equipment, Exercise, MuscleGroup } from '@/types'
import { exercises as builtin, registerCustom } from '@/data/exercises'
import { loadState, persist } from '@/utils/persist'
import { uid } from '@/utils/migrate'

/** 空的自定义动作草稿 */
export function blankExercise(): Exercise {
  return {
    id: '',
    name: '',
    en: '',
    primary: [],
    secondary: [],
    equipment: ['bodyweight'],
    pattern: 'push',
    group: '胸',
    difficulty: 1,
    rest: 60,
    cues: [],
    mistakes: [],
    custom: true,
    private: true,
  }
}

export const useExerciseStore = defineStore('exercise', () => {
  const custom = ref<Exercise[]>(loadState<Exercise[]>('customExercises', []))
  const favorites = ref<string[]>(loadState<string[]>('favoriteExercises', []))
  persist('customExercises', () => custom.value)
  persist('favoriteExercises', () => favorites.value)

  // 注入到动作注册表，让 getExercise / getExerciseName 同时认得自建动作
  registerCustom(custom.value)
  watch(custom, (v) => registerCustom(v), { deep: true, immediate: false })

  /** 内置 + 自建 */
  const list = computed<Exercise[]>(() => [...custom.value, ...builtin])

  const mine = computed<Exercise[]>(() => custom.value)

  const favoriteList = computed<Exercise[]>(() =>
    favorites.value.map((id) => list.value.find((e) => e.id === id)).filter(Boolean) as Exercise[],
  )

  function isFavorite(id: string): boolean {
    return favorites.value.includes(id)
  }

  function toggleFavorite(id: string) {
    const i = favorites.value.indexOf(id)
    if (i >= 0) favorites.value.splice(i, 1)
    else favorites.value.push(id)
  }

  function addCustom(e: Exercise): Exercise {
    const next: Exercise = { ...e, id: e.id || uid('ex'), custom: true }
    custom.value = [next, ...custom.value]
    return next
  }

  function updateCustom(id: string, patch: Partial<Exercise>) {
    const i = custom.value.findIndex((e) => e.id === id)
    if (i < 0) return
    custom.value[i] = { ...custom.value[i], ...patch }
  }

  function removeCustom(id: string) {
    custom.value = custom.value.filter((e) => e.id !== id)
    favorites.value = favorites.value.filter((x) => x !== id)
  }

  /** 按器械过滤：只保留用户器材做得到的动作 */
  function filterByEquipment(items: Exercise[], owned: Equipment[]): Exercise[] {
    return items.filter((e) => {
      if (!e.equipment.length) return true
      return e.equipment.some((k) => owned.includes(k))
    })
  }

  function groupOf(g: MuscleGroup | '全部'): Exercise[] {
    return g === '全部' ? list.value : list.value.filter((e) => e.group === g)
  }

  return {
    custom,
    favorites,
    list,
    mine,
    favoriteList,
    groupOf,
    isFavorite,
    toggleFavorite,
    addCustom,
    updateCustom,
    removeCustom,
    filterByEquipment,
  }
})
