import { ref } from 'vue'
import { listAllGifs } from './imageStore'

/**
 * 动作缩略图缓存。
 * 图片在 IndexedDB 里，一次全量取出后按 exerciseId 取第一张作为缩略图，
 * 列表页（动作库、今日训练、计划编辑）都复用这一份。
 */
const thumbs = ref<Record<string, string>>({})
let loaded = false
let loading: Promise<void> | null = null

export function refreshThumbs(): Promise<void> {
  loading = listAllGifs()
    .then((recs) => {
      const m: Record<string, string> = {}
      recs
        .sort((a, b) => a.createdAt - b.createdAt)
        .forEach((r) => {
          if (!m[r.exerciseId]) m[r.exerciseId] = r.dataUrl
        })
      thumbs.value = m
    })
    .catch(() => {
      /* IndexedDB 不可用时静默忽略，列表退化为无图 */
    })
    .finally(() => {
      loaded = true
      loading = null
    })
  return loading
}

export function useThumbs() {
  if (!loaded && !loading) void refreshThumbs()
  return thumbs
}
