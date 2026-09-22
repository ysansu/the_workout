<template>
  <router-view />
  <TabBar v-if="showTab" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from '@/components/TabBar.vue'

const route = useRoute()

/**
 * 底部导航只在两个主 Tab（训练 / 我的计划 / 记录）上出现。
 * 子页面（训练执行、计划编辑、动作详情等）各自带固定底栏，再叠一层 TabBar 会互相压住。
 */
const showTab = computed(() => route.meta.tab !== false)
</script>
