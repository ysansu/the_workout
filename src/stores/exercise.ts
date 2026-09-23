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
   * 内置 + 自建，两边都要按隐藏名单过滤。
   * 注意：隐藏的**自建**动作仍然留在 custom 里（只是不进这个列表），
   * 这样已计划里引用到它的地方还能解析出名称和缩略图，不会变成「未知动作」。
   */
  const list = computed<Exercise[]>(() => {
    const hidden = new Set(hiddenIds.value)
    const overridden = new Set(custom.value.map((e) => e.id))
    return [
      ...custom.value.filter((e) => !hidden.has(e.id)),
      ...builtin.filter((e) => !overridden.has(e.id) && !hidden.has(e.id)),
    ]
  })

  const mine = computed<Exercise[]>(() => custom.value)

  const favoriteList = computed<Exercise[]>(() =>
    favorites.value.map((id) => list.value.find((e) => e.id === id)).filter(Boolean) as Exercise[],
  )

  /** 删掉的动作数量，>0 时设置页给一个一键恢复 */
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

  /**
   * 删除 = 从动作库里拿掉，但**不销毁数据**，统一记进隐藏名单。
   *
   * 内置动作本来就没法真删（数据是打包进来的），只能记名单；
   * 自建动作以前是真删，结果计划里引用它的地方全变成「未知动作」——
   * 用户想表达的是「我不想在动作库里看到它」，不是「把我计划里的动作也搞坏」。
   * 现在两边一致：列表里不显示，已有引用照常解析出名称和缩略图。
   * 误删了可以在「设置 → 数据」里一键全部恢复。
   */
  function removeExercise(id: string) {
    favorites.value = favorites.value.filter((x) => x !== id)
    if (!hiddenIds.value.includes(id)) hiddenIds.value = [...hiddenIds.value, id]
  }

  /** 把删掉的动作全部找回来（内置和自建都包括） */
  function restoreRemoved() {
    hiddenIds.value = []
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
    restoreRemoved,
    filterByEquipment,
  }
})
