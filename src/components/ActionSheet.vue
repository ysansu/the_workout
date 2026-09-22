<template>
  <div v-if="visible" class="mask" @click.self="$emit('close')">
    <div class="sheet">
      <div v-if="title" class="title">{{ title }}</div>
      <button
        v-for="it in items"
        :key="it.key"
        class="item"
        :class="{ danger: it.danger, off: it.disabled }"
        :disabled="it.disabled"
        @click="pick(it)"
      >
        <svg
          v-if="it.icon"
          class="ic"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path v-for="(d, i) in it.icon" :key="i" :d="d" />
        </svg>
        <span>{{ it.label }}</span>
      </button>
      <button class="cancel" @click="$emit('close')">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface SheetItem {
  key: string
  label: string
  icon?: string[]
  danger?: boolean
  disabled?: boolean
}

defineProps<{
  visible: boolean
  items: SheetItem[]
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', key: string): void
}>()

function pick(it: SheetItem) {
  if (it.disabled) return
  emit('select', it.key)
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.42);
  z-index: 210;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  padding: 6px 0 calc(8px + env(safe-area-inset-bottom, 0px));
  animation: up 0.22s ease;
  max-height: 80vh;
  overflow-y: auto;
}

@keyframes up {
  from {
    transform: translateY(24px);
    opacity: 0.6;
  }
}

.title {
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
}

.item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  height: 54px;
  font-size: 15px;
  color: var(--ink-1);
  border-bottom: 1px solid var(--line);
}

.item:last-of-type {
  border-bottom: none;
}

.item:active {
  background: var(--surface-2);
}

.item.danger {
  color: var(--danger);
}

.item.off {
  color: var(--ink-4);
  pointer-events: none;
}

.ic {
  width: 19px;
  height: 19px;
  flex: none;
}

.cancel {
  width: 100%;
  height: 52px;
  font-size: 15px;
  color: var(--ink-2);
  background: var(--surface-2);
  margin-top: 6px;
}
</style>
