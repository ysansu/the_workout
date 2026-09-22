<template>
  <div class="pad">
    <div v-if="steps && steps.length" class="steps">
      <button
        v-for="s in steps"
        :key="s"
        class="step"
        :class="{ on: s === activeStep }"
        @click="$emit('step', s)"
      >
        {{ s }}
      </button>
    </div>

    <div class="grid">
      <button v-for="n in 9" :key="n" class="k" @click="$emit('key', String(n))">{{ n }}</button>

      <button class="k del" @click="$emit('backspace')" aria-label="退格">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M9.5 4h9A2.5 2.5 0 0 1 21 6.5v11A2.5 2.5 0 0 1 18.5 20h-9a2 2 0 0 1-1.6-.8l-5-6.5a1.2 1.2 0 0 1 0-1.4l5-6.5A2 2 0 0 1 9.5 4Z" />
          <path
            d="M15.6 9.4 12.9 12l2.7 2.6"
            fill="none"
            stroke="#fff"
            stroke-width="1.8"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <button class="k zero" @click="$emit('key', '0')">0</button>

      <button class="k ok" @click="$emit('confirm')">确定</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** 哑铃档位等快捷值，选填 */
  steps?: number[]
  activeStep?: number
}>()

defineEmits<{
  (e: 'key', v: string): void
  (e: 'backspace'): void
  (e: 'confirm'): void
  (e: 'step', v: number): void
}>()
</script>

<style scoped>
.pad {
  background: var(--card);
}

.steps {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 10px 12px 2px;
  scrollbar-width: none;
}

.steps::-webkit-scrollbar {
  display: none;
}

.step {
  flex: none;
  min-width: 52px;
  height: 36px;
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 14px;
  font-weight: 600;
}

.step.on {
  background: var(--brand-soft);
  color: var(--brand-1);
  box-shadow: inset 0 0 0 1.5px var(--brand-1);
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 46px);
  gap: 6px;
  padding: 10px 10px calc(10px + env(safe-area-inset-bottom, 0px));
  background: var(--surface-3);
}

.k {
  border-radius: 8px;
  background: var(--surface-raise);
  font-size: 21px;
  font-weight: 500;
  color: var(--ink-1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.k:active {
  background: var(--surface-3);
}

.del {
  grid-column: 4;
  grid-row: 1;
  background: #4a4f57;
  color: #fff;
}

.del svg {
  width: 22px;
  height: 22px;
}

.del:active {
  background: #3b4048;
}

.zero {
  grid-column: 1 / span 3;
  grid-row: 4;
}

.ok {
  grid-column: 4;
  grid-row: 2 / span 3;
  background: var(--grad);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
}

.ok:active {
  opacity: 0.9;
}
</style>
