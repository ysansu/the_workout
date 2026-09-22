<template>
  <nav class="tabbar" :style="{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }">
    <router-link
      v-for="t in tabs"
      :key="t.to"
      :to="t.to"
      class="tab-item"
      :class="{ active: isActive(t.to) }"
    >
      <svg
        class="ico"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path v-for="(d, i) in t.icon" :key="i" :d="d" />
      </svg>
      <span>{{ t.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

/**
 * 只保留「训练」和「记录」两个 Tab：
 * 动作库与计划都收在训练流程内部（首页入口 + 计划页），不占底部导航。
 */
const tabs = [
  {
    to: '/train',
    label: '训练',
    icon: ['M13 3 5 13.5h5.2L10.6 21l8-10.7h-5.3z'],
  },
  {
    to: '/records',
    label: '记录',
    icon: ['M4 20h16', 'M7 20v-6', 'M12 20V6', 'M17 20v-9'],
  },
]

function isActive(to: string) {
  return route.path === to || route.path.startsWith(to + '/')
}
</script>
