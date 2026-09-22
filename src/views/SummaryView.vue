<template>
  <div class="page dark">
    <header class="head">
      <button class="done" @click="$router.replace('/train')">完成</button>
    </header>

    <div v-if="!s" class="miss">没有找到这次训练的记录</div>

    <div v-else class="body">
      <h1>恭喜你完成训练！</h1>
      <p class="sub">太棒了，继续维持这种状态。</p>

      <section class="card">
        <div class="who">
          <div class="avatar">{{ (profile.name || 'Y').slice(0, 1).toUpperCase() }}</div>
          <div>
            <div class="who-n">{{ profile.name }}</div>
            <div class="who-d">{{ fmtYMDHM(s.startAt) }}</div>
          </div>
        </div>

        <div class="line">
          第 {{ nth }} 次训练 | {{ weekdayLabel(s.date) }} · {{ groupText || s.name }}
        </div>
        <div class="plan-name">{{ planName }}</div>

        <div class="gauge">
          <svg viewBox="0 0 160 96" class="arc">
            <path class="arc-bg" d="M14 88 A66 66 0 0 1 146 88" />
            <path
              class="arc-fg"
              d="M14 88 A66 66 0 0 1 146 88"
              :stroke-dasharray="`${arcLen} ${arcTotal}`"
            />
          </svg>
          <div class="gauge-read">
            <div class="pct">{{ pct }}%</div>
            <div class="pct-k">训练完成度</div>
          </div>
        </div>

        <div class="stats">
          <div class="st">
            <div class="st-k"><i class="dot blue" />今日用时</div>
            <div class="st-v">{{ fmtMS(s.durationSec || 0) }}</div>
          </div>
          <div class="st">
            <div class="st-k"><i class="dot green" />动作组数</div>
            <div class="st-v">{{ doneSetCount }}<small>/{{ plannedSetCount }}组</small></div>
          </div>
        </div>
        <p class="tip">在推荐时间左右完成训练，可以取得更好的效果哦~</p>
      </section>

      <h2 class="sec">运动详情</h2>
      <ul class="detail">
        <li v-for="(e, i) in s.entries" :key="i">
          <ExThumb :id="e.exerciseId" :size="46" :radius="8" />
          <div class="d-meta">
            <div class="d-n">{{ nameOf(e.exerciseId) }}</div>
            <div class="d-s">{{ summaryOf(e) }}</div>
          </div>
          <span class="d-r">{{ e.sets.length }}/{{ plannedOf(e.exerciseId) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { SessionEntry } from '@/types'
import { getExercise, getExerciseName } from '@/data/exercises'
import { useSessionStore } from '@/stores/session'
import { usePlanStore } from '@/stores/plan'
import { useUserStore } from '@/stores/user'
import { fmtMS, fmtYMDHM, weekdayLabel } from '@/utils/date'
import { fmtPlanItem, fmtSet } from '@/utils/num'
import ExThumb from '@/components/ExThumb.vue'

const route = useRoute()
const sessionStore = useSessionStore()
const planStore = usePlanStore()
const userStore = useUserStore()

const profile = computed(() => userStore.profile)
const s = computed(() => sessionStore.sessions.find((x) => x.id === String(route.params.id)) ?? null)

const nth = computed(() => {
  if (!s.value) return 1
  return sessionStore.sorted.filter((x) => x.startAt <= s.value!.startAt).length
})

const planName = computed(() => s.value?.name ?? '自由训练')

const day = computed(() => {
  const sid = s.value
  if (!sid?.planId || !sid.planDayId) return null
  return planStore.getPlanById(sid.planId)?.days.find((d) => d.id === sid.planDayId) ?? null
})

const groupText = computed(() => {
  const d = day.value
  if (!d) return ''
  const set = new Set<string>()
  d.items.forEach((it) => {
    const ex = getExercise(it.exerciseId)
    if (ex) set.add(ex.group)
  })
  return [...set].join('+')
})

const plannedSetCount = computed(() => {
  if (day.value) return day.value.items.reduce((n, it) => n + it.sets, 0)
  return doneSetCount.value || 1
})

const doneSetCount = computed(() =>
  s.value ? s.value.entries.reduce((n, e) => n + e.sets.length, 0) : 0,
)

const pct = computed(() => {
  const p = plannedSetCount.value
  if (!p) return 100
  return Math.min(100, Math.round((doneSetCount.value / p) * 100))
})

/** 半圆弧长度，按完成度填充 */
const arcTotal = Math.PI * 66
const arcLen = computed(() => (arcTotal * pct.value) / 100)

const nameOf = (id: string) => getExerciseName(id)

/** 某动作在计划里的组数 */
function plannedOf(exerciseId: string): number {
  const it = day.value?.items.find((x) => x.exerciseId === exerciseId)
  return it?.sets ?? 0
}

function summaryOf(e: SessionEntry): string {
  const it = day.value?.items.find((x) => x.exerciseId === e.exerciseId)
  if (it) return `共${it.sets}组 · ${fmtPlanItem(it)}`
  const first = e.sets[0]
  return first ? fmtSet(first) : ''
}
</script>

<style scoped>
.dark {
  background: #17181b;
  color: #f2f3f5;
  min-height: 100vh;
  padding-bottom: 40px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 4px;
}

.done {
  font-size: 16px;
  color: #f2f3f5;
}

.miss {
  padding: 60px 20px;
  text-align: center;
  color: #8b8f96;
}

.body {
  padding: 4px 14px 0;
}

h1 {
  font-size: 20px;
  font-weight: 600;
  padding: 6px 2px 0;
}

.sub {
  font-size: 13px;
  color: #8b8f96;
  padding: 3px 2px 14px;
}

.card {
  background: #232428;
  border-radius: var(--r-lg);
  padding: 16px;
}

.who {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b7bff, #b3a7ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.who-n {
  font-size: 14.5px;
  font-weight: 500;
}

.who-d {
  font-size: 11.5px;
  color: #8b8f96;
  margin-top: 2px;
}

.line {
  font-size: 11.5px;
  color: #8b8f96;
  margin-top: 14px;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  margin-top: 6px;
}

.gauge {
  position: relative;
  width: 190px;
  margin: 10px auto 0;
}

.arc {
  width: 100%;
  display: block;
}

.arc-bg {
  fill: none;
  stroke: #34363b;
  stroke-width: 9;
  stroke-linecap: round;
}

.arc-fg {
  fill: none;
  stroke: #8b7bff;
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}

.gauge-read {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 4px;
  text-align: center;
}

.pct {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
}

.pct-k {
  font-size: 12px;
  color: #8b8f96;
  margin-top: 5px;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 14px;
}

.st {
  text-align: center;
}

.st-k {
  font-size: 12px;
  color: #8b8f96;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot.blue {
  background: #3b82f6;
}

.dot.green {
  background: #34c759;
}

.st-v {
  font-size: 25px;
  font-weight: 700;
  margin-top: 5px;
  font-variant-numeric: tabular-nums;
}

.st-v small {
  font-size: 13px;
  font-weight: 500;
  color: #8b8f96;
}

.tip {
  font-size: 11.5px;
  color: #8b8f96;
  text-align: center;
  margin-top: 12px;
  line-height: 1.5;
}

.sec {
  font-size: 15px;
  font-weight: 600;
  padding: 20px 2px 10px;
}

.detail {
  background: #232428;
  border-radius: var(--r-lg);
  padding: 4px 14px;
}

.detail li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #2e3035;
}

.detail li:last-child {
  border-bottom: none;
}

.d-meta {
  flex: 1;
  min-width: 0;
}

.d-n {
  font-size: 14.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d-s {
  font-size: 11.5px;
  color: #8b8f96;
  margin-top: 2px;
}

.d-r {
  flex: none;
  font-size: 14px;
  font-weight: 600;
  color: #9a8cff;
  font-variant-numeric: tabular-nums;
}
</style>
