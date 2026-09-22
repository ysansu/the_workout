/**
 * 组休提示（声音 + 震动）。
 *
 * 只保留「闹钟滴滴声」一种音效。
 * （原来的男音 / 女音走的是 speechSynthesis，语音库在各机型上差异太大，已去掉。）
 *
 * ⚠️ 声音与震动共用下面同一份节奏定义，改一处两边一起变，不会走拍。
 */

/* ---------------- 提示节奏（单一来源） ---------------- */

/** 一轮响几下 */
const PER_ROUND = 3
/** 共几轮 */
const ROUNDS = 3
/** 单次提示的持续时长 */
const LEN_MS = 160
/** 一轮之内两次提示之间的起点间隔（含前一次的持续时长） */
const IN_GAP_MS = 220
/** 两轮之间的停顿 */
const BURST_GAP_MS = 1500

/** 一轮占用的时间 = 最后一声的起点 + 单声时长 */
const ROUND_SPAN_MS = (PER_ROUND - 1) * IN_GAP_MS + LEN_MS
/** 一轮之内两次提示之间的**静默**时长（震动模式数组需要的是静默量） */
const IN_SILENCE_MS = IN_GAP_MS - LEN_MS

/**
 * 节奏：滴三下 → 停 1.5 秒 → 滴三下 → 停 1.5 秒 → 滴三下。
 * 整段时长 = ROUNDS * ROUND_SPAN_MS + (ROUNDS - 1) * BURST_GAP_MS = 4.8 秒。
 */

/* ---------------- 声音 ---------------- */

let ctx: AudioContext | null = null

function audioCtx(): AudioContext | null {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctor) return null
    if (!ctx) ctx = new Ctor()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** 闹钟滴滴声。整段用 AudioContext 预排程，后台被挂起也不会错拍 */
export function playRestSound() {
  const c = audioCtx()
  if (!c) return

  const start = c.currentTime
  const len = LEN_MS / 1000

  for (let r = 0; r < ROUNDS; r++) {
    const roundAt = start + (r * (ROUND_SPAN_MS + BURST_GAP_MS)) / 1000
    for (let i = 0; i < PER_ROUND; i++) {
      const at = roundAt + (i * IN_GAP_MS) / 1000
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.type = 'square'
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + len)
      osc.connect(gain).connect(c.destination)
      osc.start(at)
      osc.stop(at + len + 0.02)
    }
  }
}

/* ---------------- 震动 ---------------- */

/**
 * 与声音同节奏的震动。
 * `navigator.vibrate` 的模式数组是「振动, 静默, 振动, 静默…」交替，
 * 所以这里按同一份节奏参数拼出来，起点与每一声滴滴对齐。
 * 不支持震动的环境（如 iOS Safari）静默跳过。
 */
export function vibrateRest() {
  const pattern: number[] = []
  for (let r = 0; r < ROUNDS; r++) {
    if (r > 0) pattern.push(BURST_GAP_MS) // 轮间停顿
    for (let i = 0; i < PER_ROUND; i++) {
      if (i > 0) pattern.push(IN_SILENCE_MS)
      pattern.push(LEN_MS)
    }
  }
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* noop */
  }
}

/** 停掉正在进行的震动（提前跳过组休时用） */
export function stopVibrate() {
  try {
    navigator.vibrate?.(0)
  } catch {
    /* noop */
  }
}

/** 首次用户交互时把音频上下文建起来，避免真正要用时还处于 suspended */
export function warmupAudio() {
  audioCtx()
}
