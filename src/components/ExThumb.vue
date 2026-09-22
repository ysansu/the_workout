<template>
  <div class="thumb" :style="style">
    <img v-if="src" :src="src" :alt="name" />
    <span v-else class="ph" :style="{ background: color }">{{ initial }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getExercise, GROUP_COLOR } from '@/data/exercises'
import { useThumbs } from '@/utils/thumbs'

const props = withDefaults(
  defineProps<{
    id: string
    size?: number
    radius?: number
    /** 撑满父容器（列表封面用），忽略 size */
    fill?: boolean
  }>(),
  { size: 48, radius: 8, fill: false },
)

const map = useThumbs()

const ex = computed(() => getExercise(props.id))
const src = computed(() => map.value[props.id])
const name = computed(() => ex.value?.name ?? '')
const initial = computed(() => (name.value ? name.value.slice(0, 1) : '?'))
const color = computed(() => (ex.value ? GROUP_COLOR[ex.value.group] ?? '#c9ccd2' : '#c9ccd2'))

const style = computed(() =>
  props.fill
    ? { width: '100%', height: '100%', borderRadius: '0' }
    : {
        width: `${props.size}px`,
        height: `${props.size}px`,
        borderRadius: `${props.radius}px`,
      },
)
</script>

<style scoped>
.thumb {
  flex: none;
  overflow: hidden;
  background: var(--surface-3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ph {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  opacity: 0.85;
}
</style>
