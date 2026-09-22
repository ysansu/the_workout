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
  }
}

/**
 * 老数据里存过 `private`（「仅自己可见」），现在没有这个概念了，
 * 读进来时顺手扔掉，免得导出备份里还留着。
 */
function stripPrivate(list: Exercise[]): Exercise[] {
  return list.map((e) => {
    const o = e as unknown as Record<string, unknown>
    if (!('private' in o)) return e
    delete o.private
    return o as unknown as Exercise
  })
}

export const useExerciseStore = defineStore('exercise', () => {
  const custom = ref<Exercise[]>(stripPrivate(loadState<Exercise[]>('customExercises', [])))
  const favorites = ref<string[]>(loadState<string[]>('favoriteExercises', []))
  /** 被删掉的内置动作 id：内置数据是打包进来的，删不掉，只能记一份隐藏名单 */
  const hiddenIds = ref<string[]>(loadState<string[]>('hiddenExercises', []))
  persist('customExercises', () => custom.value)
  persist('favoriteExercises', () => favorites.value)
  persist('hiddenExercises', () => hiddenIds.value)

  // 注入到动作注册表，让 getExercise / getExerciseName 同时认得自建动作
  registerCustom(custom.value)
  watch(custom, (v) => registerCustom(v), { deep: true, immediate: false })

  /**
   * 内置 + 自建。
   * 自建的排前面；被自建覆盖过的内置、以及被删掉的内置都不再出现在列表里。
   * （注册表 rebuild 时自建在前，同 id 的自建会盖掉内置，两边口径一致）
   */
  const list = computed<Exercise[]>(() => {
    const overridden = new Set(custom.value.map((e) => e.id))
    const hidden = new Set(hiddenIds.value)
    return [...custom.value, ...builtin.filter((e) => !overridden.has(e.id) && !hidden.has(e.id))]
  })

  const mine = computed<Exercise[]>(() => custom.value)

  const favoriteList = computed<Exercise[]>(() =>
    favorites.value.map((id) => list.value.find((e) => e.id === id)).filter(Boolean) as Exercise[],
  )

  /** 删掉的内置动作数量，>0 时设置页给一个一键恢复 */
  const hiddenCount = computed(() => hiddenIds.value.length)

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

  /**
   * 保存动作。自建的直接改；内置的存一份同 id 的自建副本覆盖它
   * —— 这样内置动作也能编辑，且不必改动打包进来的数据。
   */
  function saveExercise(id: string, patch: Partial<Exercise>) {
    const i = custom.value.findIndex((e) => e.id === id)
    if (i >= 0) {
      custom.value[i] = { ...custom.value[i], ...patch }
      return
    }
    const base = builtin.find((e) => e.id === id)
    if (!base) return
    custom.value = [{ ...base, ...patch, id, custom: true }, ...custom.value]
  }

  /** 删除 = 从动作库里彻底消失：自建直接删，内置记进隐藏名单 */
  function removeExercise(id: string) {
    custom.value = custom.value.filter((e) => e.id !== id)
    favorites.value = favorites.value.filter((x) => x !== id)
    if (builtin.some((e) => e.id === id) && !hiddenIds.value.includes(id)) {
      hiddenIds.value = [...hiddenIds.value, id]
    }
  }

  /** 把删掉的内置动作全部找回来 */
  function restoreBuiltins() {
    hiddenIds.value = []
  }

  function isBuiltin(id: string): boolean {
    return builtin.some((e) => e.id === id)
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
    hiddenIds,
    hiddenCount,
    list,
    mine,
    favoriteList,
    groupOf,
    isFavorite,
    toggleFavorite,
    addCustom,
    saveExercise,
    removeExercise,
    restoreBuiltins,
    isBuiltin,
    filterByEquipment,
  }
})
