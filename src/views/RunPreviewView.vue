<template>
  <div class="page preview">
    <header class="head">
      <div>
        <h1>即将开始训练</h1>
        <p class="sub">准备一下吧</p>
      </div>
      <button class="close" @click="$router.replace('/train')">返回 ✕</button>
    </header>

    <div class="body">
      <div v-if="isRest" class="card">
        <div class="card-title"><span>今天是休息日</span></div>
        <p class="hint">这个计划今天不安排训练，回去好好休息吧。</p>
      </div>

      <template v-else>
        <div class="two">
          <div class="card mini">
            <div class="k"><i class="dot red" />预计总训练时间</div>
            <div class="v">{{ minutes }}<small>分钟</small></div>
            <div class="note">建议在预计时间左右完成</div>
          </div>
          <div class="card mini">
            <div class="k"><i class="dot blue" />需要的器械</div>
            <div class="eq">{{ equipmentText || '徒手' }}</div>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><span>今日训练内容</span></div>
          <div v-if="!items.length" class="empty-inline">这一天还没有动作，先去计划里加几个吧</div>
          <ul v-else class="list">
            <li v-for="(it, i) in items" :key="i" class="item">
              <ExThumb :id="it.exerciseId" :size="48" :radius="8" />
              <div class="meta">
                <div class="name">{{ name(it.exerciseId) }}</div>
                <div class="sub2">{{ fmtPlanItemFull(it) }}</div>
              </div>
              <span class="sets">{{ it.sets }}组</span>
            </li>
          </ul>
        </div>
      </template>

    </div>

    <footer v-if="!isRest" class="bottom">
      <button class="btn btn-primary btn-block" :disabled="!items.length" @click="begin">
        开始训练
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EQUIPMENT_LABEL, getExercise, getExerciseName } from '@/data/exercises'
import { usePlanStore } from '@/stores/plan'
import { useWorkoutStore } from '@/stores/workout'
import { fmtPlanItemFull, planItemSeconds } from '@/utils/num'
import type { Equipment, PlanDay } from '@/types'
import ExThumb from '@/components/ExThumb.vue'

const route = useRoute()
const router = useRouter()
const planStore = usePlanStore()
const workoutStore = useWorkoutStore()

/**
 * 要练的那一天。
 * `?day=<训练日 id>` 由调用方带过来：首页「再来一次」传今天练过的那天，
 * 计划里的「立即开练」传那一个训练日。没带就退回当前轮次该练的那天。
 */
const day = computed<PlanDay | null>(() => {
  const want = String(route.query.day ?? '')
  const p = planStore.activePlan
  if (want && p) {
    const hit = p.days.find((d) => d.id === want)
    if (hit) return hit
  }
  return planStore.currentDay
})
const items = computed(() => day.value?.items ?? [])

/** 休息日不该走到这里（首页不会给入口），真跳进来了就只显示提示、不给开练 */
const isRest = computed(() => !!day.value?.rest)

const totalSec = computed(() => items.value.reduce((n, it) => n + planItemSeconds(it), 0))
const minutes = computed(() => Math.max(1, Math.round(totalSec.value / 60)))

const equipmentText = computed(() => {
  const set = new Set<Equipment>()
  items.value.forEach((it) => {
    getExercise(it.exerciseId)?.equipment.forEach((e) => set.add(e))
  })
  // 自重不算「需要的器械」
  set.delete('bodyweight')
  set.delete('mat')
  return [...set].map((e) => EQUIPMENT_LABEL[e]).join('、')
})

const name = (id: string) => getExerciseName(id)

function begin() {
  const d = day.value
  if (!d) return
  const p = planStore.activePlan
  workoutStore.start({
    name: d.name,
    items: d.items,
    planId: planStore.active?.planId,
    planDayId: d.id,
    dayIndex: p ? Math.max(0, p.days.indexOf(d)) : undefined,
  })
  router.replace('/train/run')
}

onMounted(() => {
  if (!day.value) router.replace('/train')
})
</script>

<style scoped>
.preview {
  background: var(--bg);
  padding-bottom: 84px;
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 16px) 16px 12px;
}

.head h1 {
  font-size: 21px;
  font-weight: 700;
}

.sub {
  font-size: 13px;
  color: var(--ink-3);
  margin-top: 3px;
}

.close {
  font-size: 14px;
  color: var(--ink-2);
  padding: 4px 0;
}

.body {
  padding: 0 14px;
}

.two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.card.mini {
  padding: 13px;
  margin-bottom: 12px;
}

.k {
  font-size: 12.5px;
  color: var(--ink-2);
  display: flex;
  align-items: center;
  gap: 5px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}

.dot.red {
  background: #ff5a5a;
}

.dot.blue {
  background: #3b82f6;
}

.v {
  font-size: 30px;
  font-weight: 800;
  line-height: 1.15;
  margin-top: 4px;
  font-variant-numeric: tabular-nums;
}

.v small {
  font-size: 13px;
  font-weight: 600;
  margin-left: 2px;
}

.note {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 2px;
}

.eq {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  margin-top: 6px;
}

.list {
  margin-top: 2px;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
}

.item:last-child {
  border-bottom: none;
}

.meta {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 14.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub2 {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 2px;
}

.sets {
  flex: none;
  font-size: 13px;
  color: var(--ink-2);
}

.empty-inline {
  font-size: 13px;
  color: var(--ink-3);
  padding: 18px 0;
  text-align: center;
}

.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--card);
  border-top: 1px solid var(--line);
}
</style>
