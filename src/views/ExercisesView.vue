<template>
  <div class="page lib">
    <TrainTabs current="exercises" />

    <ExercisePicker
      embedded
      mode="browse"
      @detail="openDetail"
      @create="router.push('/exercises/new')"
    />
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import TrainTabs from '@/components/TrainTabs.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'

const router = useRouter()

function openDetail(id: string) {
  router.push('/exercises/' + id)
}
</script>

<style scoped>
/* 动作库整页不滚动，内部列表自己滚；底部给 TabBar 留出位置 */
.lib {
  height: 100vh;
  padding-bottom: calc(var(--tab-h) + var(--safe-b));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
