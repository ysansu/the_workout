<template>
  <!-- 最小化：右下角悬浮条 -->
  <button v-if="minimized" class="mini" @click="$emit('expand')">
    <span class="mini-dot" />
    <span class="mini-t">组休 {{ left }}<small>s</small></span>
    <span class="mini-bar"><i :style="{ width: pct + '%' }" /></span>
  </button>

  <!-- 完整计时卡片 -->
  <div v-else class="mask">
    <div class="card">
      <div class="head">
        <span class="h-t">组休计时</span>
        <button class="skip" @click="$emit('skip')">跳过</button>
      </div>
      <div class="sub">训练辛苦了，休息一下吧~</div>

      <div class="ring-wrap">
        <svg viewBox="0 0 120 120" class="ring">
          <circle cx="60" cy="60" r="52" class="bg" />
          <circle
            cx="60"
            cy="60"
            r="52"
            class="fg"
            :stroke-dasharray="`${arc} ${circ}`"
            :stroke-dashoffset="0"
          />
        </svg>
        <div class="read">
          <div class="big">{{ left }}<small>s</small></div>
          <div class="total">{{ total }}</div>
        </div>
      </div>

      <div class="btns">
        <button class="adj" @click="$emit('add', -10)">-10s</button>
        <button class="adj" @click="$emit('add', 10)">+10s</button>
        <button class="min" @click="$emit('minimize')">最小化</button>
      </div>

      <div class="tip">提示：可通过 +/- 按钮调整组间休息时长</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    left: number
    total: number
    minimized?: boolean
  }>(),
  { minimized: false },
)

defineEmits<{
  (e: 'skip'): void
  (e: 'add', delta: number): void
  (e: 'minimize'): void
  (e: 'expand'): void
}>()

const circ = 2 * Math.PI * 52
const ratio = computed(() => {
  if (!props.total) return 0
  return Math.max(0, Math.min(1, props.left / props.total))
})
/** 留一点缺口，视觉上更像刻度环 */
const arc = computed(() => Math.max(0, circ * ratio.value - 6))
const pct = computed(() => Math.round(ratio.value * 100))
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 16, 16, 0.45);
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  width: 78%;
  max-width: 320px;
  background: var(--card);
  border-radius: var(--r-lg);
  padding: 16px 18px 14px;
  text-align: center;
  animation: pop 0.2s ease;
}

@keyframes pop {
  from {
    transform: scale(0.94);
    opacity: 0.5;
  }
}

.head {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.h-t {
  font-size: 16px;
  font-weight: 700;
}

.skip {
  position: absolute;
  right: 0;
  font-size: 14px;
  color: var(--brand-1);
  font-weight: 500;
}

.sub {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-top: 4px;
}

.ring-wrap {
  position: relative;
  width: 176px;
  height: 176px;
  margin: 8px auto 4px;
}

.ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring .bg {
  fill: none;
  stroke: var(--surface-3);
  stroke-width: 8;
}

.ring .fg {
  fill: none;
  stroke: var(--brand-1);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 1s linear;
}

.read {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.big {
  font-size: 46px;
  font-weight: 700;
  line-height: 1;
  color: var(--ink-1);
  font-variant-numeric: tabular-nums;
}

.big small {
  font-size: 18px;
  font-weight: 600;
  margin-left: 2px;
}

.total {
  font-size: 15px;
  color: var(--ink-3);
  margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.btns {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr;
  gap: 8px;
  margin-top: 6px;
}

.adj {
  height: 44px;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 15px;
  font-weight: 500;
}

.min {
  height: 44px;
  border-radius: 10px;
  background: #4a4f57;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
}

.tip {
  margin-top: 12px;
  font-size: 12px;
  color: var(--ink-3);
  line-height: 1.5;
}

.mini {
  position: fixed;
  right: 14px;
  bottom: calc(84px + env(safe-area-inset-bottom, 0px));
  z-index: 300;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 44px;
  border-radius: 22px;
  background: var(--grad);
  color: #fff;
  box-shadow: 0 6px 18px rgba(255, 107, 107, 0.35);
  overflow: hidden;
}

.mini-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #fff;
  animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}

.mini-t {
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.mini-t small {
  font-size: 11px;
  margin-left: 1px;
}

.mini-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 2.5px;
  background: rgba(255, 255, 255, 0.28);
}

.mini-bar i {
  display: block;
  height: 100%;
  background: #fff;
  transition: width 1s linear;
}
</style>
