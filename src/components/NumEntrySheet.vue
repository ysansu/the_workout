<template>
  <div class="mask" @click.self="$emit('close')">
    <div class="sheet">
      <div class="head">
        <span class="sp" />
        <div class="title">{{ title }}</div>
        <button class="x" @click="$emit('close')" aria-label="关闭">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div class="read">
        <span class="val">{{ buf || '0' }}</span>
        <span class="unit">{{ unit }}</span>
      </div>

      <NumPad
        :steps="steps"
        :active-step="activeStep"
        @key="onKey"
        @backspace="onBackspace"
        @confirm="confirm"
        @step="onStep"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NumPad from './NumPad.vue'

const props = withDefaults(
  defineProps<{
    title: string
    value: number
    unit?: string
    /** 快捷值（哑铃档位） */
    steps?: number[]
    activeStep?: number
  }>(),
  { unit: '', steps: () => [] },
)

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', v: number): void
}>()

const buf = ref(String(props.value ?? 0))

/** 打开弹层后，第一次按数字键直接整格覆盖，不用先删旧值 */
const fresh = ref(true)

function onKey(d: string) {
  if (fresh.value) {
    buf.value = d
    fresh.value = false
    return
  }
  const next = buf.value === '0' ? d : buf.value + d
  if (next.length > 5) return
  buf.value = next
}

function onBackspace() {
  if (fresh.value) {
    buf.value = ''
    fresh.value = false
    return
  }
  buf.value = buf.value.slice(0, -1)
}

function onStep(v: number) {
  buf.value = String(v)
  fresh.value = false
}

function confirm() {
  emit('confirm', Number(buf.value) || 0)
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.45);
  z-index: 250;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  overflow: hidden;
  animation: up 0.2s ease;
}

@keyframes up {
  from {
    transform: translateY(24px);
    opacity: 0.6;
  }
}

.head {
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: 12px 12px 0;
}

.title {
  text-align: center;
  font-size: 14.5px;
  font-weight: 600;
}

.x {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
  justify-self: end;
}

.x svg {
  width: 19px;
  height: 19px;
}

.read {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  padding: 10px 0 14px;
}

.val {
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
  color: var(--brand-1);
  font-variant-numeric: tabular-nums;
}

.unit {
  font-size: 15px;
  color: var(--ink-3);
}
</style>
