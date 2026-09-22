import { watch } from 'vue'

const PREFIX = 'workout:'

/**
 * 读取本地状态。
 *
 * 注意：不能无脑用 `{ ...fallback, ...parsed }` 合并 —— 当 fallback 是数组时，
 * 对象展开会把数组变成 `{0:…, 1:…}`，刷新后 sessions / customPlans 不再是数组，
 * 后续的 forEach / map 会直接抛错。这里按 fallback 的类型分派。
 */
export function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (parsed == null) return fallback

    if (Array.isArray(fallback)) {
      return (Array.isArray(parsed) ? parsed : fallback) as T
    }
    if (typeof fallback === 'object' && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { ...fallback, ...parsed }
    }
    return parsed as T
  } catch {
    return fallback
  }
}

export function saveState(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* 忽略写入失败（隐私模式等） */
  }
}

export function persist(key: string, getter: () => unknown) {
  watch(
    getter,
    (v) => {
      saveState(key, v)
    },
    { deep: true },
  )
}

export function clearAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* noop */
  }
}

export function exportJSON(): string {
  const data: Record<string, unknown> = {}
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => {
        data[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k) || 'null')
      })
  } catch {
    /* noop */
  }
  return JSON.stringify(data, null, 2)
}

export function importJSON(text: string) {
  const data = JSON.parse(text)
  Object.keys(data).forEach((k) => {
    localStorage.setItem(PREFIX + k, JSON.stringify(data[k]))
  })
}
