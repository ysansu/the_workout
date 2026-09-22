<template>
  <div class="cover" :style="box">
    <ExThumb v-if="firstId && hasImage" :id="firstId" fill />
    <div v-else class="fallback" :style="{ background: grad }">
      <span class="fb-name">{{ plan.name }}</span>
      <span class="fb-goal">{{ goalLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Plan } from '@/types'
import ExThumb from './ExThumb.vue'
import { useThumbs } from '@/utils/thumbs'

const props = withDefaults(
  defineProps<{
    plan: Plan
    width?: number
    height?: number
    radius?: number
  }>(),
  { width: 0, height: 118, radius: 12 },
)

const thumbs = useThumbs()

/** 用计划里的第一个动作当封面（用户传过示范图时才显示） */
const firstId = computed(() => props.plan.days[0]?.items[0]?.exerciseId ?? '')
const hasImage = computed(() => !!thumbs.value[firstId.value])

const box = computed(() => ({
  width: props.width ? `${props.width}px` : '100%',
  height: `${props.height}px`,
  borderRadius: `${props.radius}px`,
}))

const GRADIENTS: Record<string, string> = {
  muscle: 'linear-gradient(135deg, #8b7bff 0%, #6d5ef0 100%)',
  fatloss: 'linear-gradient(135deg, #ffb27a 0%, #ff8a5c 100%)',
  strength: 'linear-gradient(135deg, #7f9cf5 0%, #5b7cfa 100%)',
  health: 'linear-gradient(135deg, #6dd5a8 0%, #3fbf8f 100%)',
}

const grad = computed(() => GRADIENTS[props.plan.goal] ?? GRADIENTS.muscle)

const GOAL_LABEL: Record<string, string> = {
  muscle: '增肌',
  fatloss: '减脂',
  strength: '力量',
  health: '健康',
}
const goalLabel = computed(() => GOAL_LABEL[props.plan.goal] ?? '')
</script>

<style scoped>
.cover {
  flex: none;
  overflow: hidden;
  background: var(--surface-3);
  display: flex;
}

.fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 12px;
  color: #fff;
}

.fb-name {
  font-size: 15px;
  font-weight: 700;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fb-goal {
  font-size: 11px;
  opacity: 0.9;
  margin-top: 3px;
}
</style>
