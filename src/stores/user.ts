import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ThemeMode, UserProfile } from '@/types'
import { loadState, persist } from '@/utils/persist'
import { migrateProfile } from '@/utils/migrate'

/** 默认档案与哑铃档位（相邻档位跳跃约 25%），装好后可在设置里自己调 */
const DEFAULT: UserProfile = {
  name: '训练者',
  gender: 'male',
  age: 26,
  heightCm: 174,
  weightKg: 67,
  equipment: ['bodyweight', 'dumbbell', 'bench', 'mat', 'band'],
  dumbbellSteps: [3, 3.5, 4.5, 6, 7.5, 10],
  weeklyGoal: 3,
  restAlert: 'vibrate',
  timerEnabled: true,
  timerRule: 'countup',
  theme: 'light',
}

/**
 * 主题不放在组件里做，而是挂在 <html data-theme> 上：
 * 所有颜色都来自 global.css 的 CSS 变量，切属性即可整站换肤。
 */
function applyTheme(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode
}

export const useUserStore = defineStore('user', () => {
  const profile = ref<UserProfile>(
    migrateProfile(loadState<Partial<UserProfile>>('profile', DEFAULT)),
  )
  persist('profile', () => profile.value)

  // 建 store 时立刻应用一次，避免首帧白闪
  applyTheme(profile.value.theme)
  watch(
    () => profile.value.theme,
    (m) => applyTheme(m),
  )

  const theme = computed(() => profile.value.theme)

  function setTheme(mode: ThemeMode) {
    profile.value = { ...profile.value, theme: mode }
  }

  function toggleTheme() {
    setTheme(profile.value.theme === 'dark' ? 'light' : 'dark')
  }

  /**
   * 离给定重量最近的档位，用于数字键盘上那排快捷键的选中态。
   * 档位跳跃约 25%（3/3.5/4.5/6/7.5/10），所以小重量不能按 ±2.5kg 通用步进。
   */
  function nearestStep(cur: number): number {
    const steps = profile.value.dumbbellSteps
    if (!steps.length) return 0
    return steps.reduce((best, s) => (Math.abs(s - cur) < Math.abs(best - cur) ? s : best), steps[0])
  }

  function update(patch: Partial<UserProfile>) {
    profile.value = { ...profile.value, ...patch }
  }

  return {
    profile,
    theme,
    setTheme,
    toggleTheme,
    nearestStep,
    update,
  }
})
