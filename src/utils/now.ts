import { ref } from 'vue'

/**
 * 全局共享的「当前时间」，每秒更新一次。
 *
 * 为什么不用各页面自己 setInterval 去累加计数：
 * 切到后台（或锁屏）时，WebView 会把定时器挂起，累加式计数会停住、回来就是错的。
 * 所以计时统一用「挂钟时间相减」算，这里只负责触发重新渲染；
 * 并且页面重新可见时立刻校准一次，避免回来那一瞬间还显示旧值。
 */
const now = ref(Date.now())

let started = false

function bump() {
  now.value = Date.now()
}

function onVisibility() {
  if (document.visibilityState === 'visible') bump()
}

function start() {
  if (started) return
  started = true
  window.setInterval(bump, 1000)
  // 回到前台的各种时机都补一次，尽量缩短「显示值是旧的」的窗口
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('focus', bump)
  window.addEventListener('pageshow', bump)
  window.addEventListener('resize', bump)
  // Capacitor 打包成 App 后，从后台恢复会派发 document 上的 resume
  document.addEventListener('resume', bump)
}

export function useNow() {
  start()
  return now
}
