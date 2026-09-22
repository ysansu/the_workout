<template>
  <header class="tabs">
    <nav class="nav">
      <button
        v-for="t in list"
        :key="t.key"
        class="t"
        :class="{ on: t.key === current }"
        @click="go(t.to)"
      >
        {{ t.label }}
      </button>
    </nav>

    <span class="spacer" />
    <slot name="action" />

    <button class="gear" @click="go('/settings')" aria-label="设置">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3.1" />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15.1 4.7a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.1a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1.03z"
        />
      </svg>
    </button>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{ current: 'train' | 'plans' | 'exercises' }>()

const router = useRouter()

const list = [
  { key: 'train' as const, label: '训练', to: '/train' },
  { key: 'plans' as const, label: '我的计划', to: '/plans' },
  { key: 'exercises' as const, label: '动作库', to: '/exercises' },
]

function go(to: string) {
  router.push(to)
}
</script>

<style scoped>
.tabs {
  display: flex;
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 0;
  background: var(--card);
}

.nav {
  display: flex;
  gap: 20px;
  min-width: 0;
}

.t {
  font-size: 17px;
  color: var(--ink-3);
  padding-bottom: 9px;
  position: relative;
  font-weight: 500;
  white-space: nowrap;
}

.t.on {
  color: var(--ink-1);
  font-weight: 700;
}

.t.on::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 2px;
  width: 22px;
  height: 3px;
  border-radius: 2px;
  background: var(--brand-1);
}

.spacer {
  flex: 1;
  min-width: 8px;
}

.gear {
  width: 30px;
  height: 30px;
  flex: none;
  margin-left: 8px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-2);
}

.gear svg {
  width: 21px;
  height: 21px;
}
</style>
