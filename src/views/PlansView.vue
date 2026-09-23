<template>
  <div class="page">
    <TrainTabs current="plans" />

    <div class="body">
      <div class="sec-row">
        <h2 class="sec">我的计划</h2>
        <button class="create" @click="$router.push('/plans/new/custom')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          创建计划
        </button>
      </div>

      <div v-if="!ownPlans.length" class="none">
        <p>还没有自建计划</p>
        <button class="none-btn" @click="$router.push('/plans/new/custom')">创建计划</button>
      </div>

      <div
        v-for="p in ownPlans"
        :key="p.id"
        class="own-card"
        @click="$router.push('/plans/' + p.id)"
      >
        <PlanCover :plan="p" :width="86" :height="86" :radius="10" />
        <div class="own-meta">
          <div class="own-name">{{ p.name }}</div>
        </div>
        <div class="own-right">
          <button class="dots" @click.stop="openSheet(p)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="19" cy="12" r="1.8" />
            </svg>
          </button>
          <span v-if="isActive(p)" class="running">执行中</span>
        </div>
      </div>
    </div>

    <ActionSheet
      :visible="!!sheetFor"
      :title="sheetFor?.name"
      :items="sheetItems"
      @close="sheetFor = null"
      @select="onSheetSelect"
    />

    <div v-if="previewFor" class="mask" @click.self="previewFor = null">
      <div class="pv">
        <div class="pv-head">
          <span class="pv-title">{{ previewFor.name }}</span>
          <button class="pv-x" @click="previewFor = null">✕</button>
        </div>
        <div class="pv-body">
          <div v-for="d in previewFor.days" :key="d.id" class="pv-day">
            <div class="pv-dhead">
              <span>{{ d.name }}</span>
              <span v-if="d.weekday" class="pv-wd">{{ WEEKDAY_CN[d.weekday] }}</span>
              <span class="pv-cnt">{{ d.items.length }} 个动作</span>
            </div>
            <div v-if="!d.items.length" class="pv-empty">这一天还没有动作</div>
            <div v-for="(it, i) in d.items" :key="i" class="pv-item">
              <span class="pv-idx">{{ i + 1 }}</span>
              <span class="pv-name">{{ nameOf(it.exerciseId) }}</span>
              <span class="pv-reps">{{ fmtPlanItem(it) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { Plan } from '@/types'
import { WEEKDAY_CN } from '@/utils/date'
import { getExerciseName } from '@/data/exercises'
import { usePlanStore } from '@/stores/plan'
import { fmtPlanItem } from '@/utils/num'
import TrainTabs from '@/components/TrainTabs.vue'
import PlanCover from '@/components/PlanCover.vue'
import ActionSheet, { type SheetItem } from '@/components/ActionSheet.vue'

const router = useRouter()
const planStore = usePlanStore()

const ownPlans = computed(() => planStore.ownPlans)

const nameOf = (id: string) => getExerciseName(id)

const isActive = (p: Plan) => planStore.active?.planId === p.id

/* ---------------- 计划操作面板 ---------------- */
const sheetFor = ref<Plan | null>(null)
const previewFor = ref<Plan | null>(null)

const sheetItems = computed<SheetItem[]>(() => {
  const p = sheetFor.value
  if (!p) return []
  return [
    { key: 'preview', label: '计划预览', icon: ['M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'] },
    { key: 'edit', label: '编辑计划', icon: ['M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z'] },
    { key: 'delete', label: '删除计划', danger: true, icon: ['M4 7h16', 'M9 7V5h6v2', 'M6.5 7l1 12.5h9L17.5 7'] },
    { key: 'copy', label: '复制计划', icon: ['M9 9h11v11H9z', 'M4 15V4h11'] },
    { key: 'detail', label: '计划详情', icon: ['M6 3h9l4 4v14H6z', 'M9 12h7M9 16h5'] },
    { key: 'run', label: '执行计划', icon: ['M8 5.5v13l11-6.5z'] },
  ]
})

function openSheet(p: Plan) {
  sheetFor.value = p
}

function onSheetSelect(key: string) {
  const p = sheetFor.value
  sheetFor.value = null
  if (!p) return

  if (key === 'preview') previewFor.value = p
  else if (key === 'edit') router.push('/plans/' + p.id + '/edit')
  else if (key === 'detail') router.push('/plans/' + p.id)
  else if (key === 'copy') {
    const copy = planStore.duplicatePlan(p.id)
    if (copy) router.push('/plans/' + copy.id + '/edit')
  } else if (key === 'run') {
    planStore.activate(p.id)
    router.push('/train')
  } else if (key === 'delete') {
    if (!window.confirm(`确定删除「${p.name}」？删除后无法恢复。`)) return
    planStore.removeCustomPlan(p.id)
  }
}
</script>

<style scoped>
.body {
  padding: 6px 14px 30px;
}

/* 标题和「创建计划」放同一行 —— 放顶栏右侧在窄屏上会被挤到换行 */
.sec-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 2px 10px;
}

.create {
  flex: none;
  display: flex;
  align-items: center;
  gap: 3px;
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  background: var(--surface-3);
  color: var(--ink-2);
  font-size: 12.5px;
  white-space: nowrap;
}

.create svg {
  width: 14px;
  height: 14px;
}

.sec {
  font-size: 15px;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.none {
  text-align: center;
  padding: 26px 0 10px;
  color: var(--ink-3);
  font-size: 13px;
}

.none p {
  margin-bottom: 12px;
}

.none-btn {
  height: 34px;
  padding: 0 18px;
  border-radius: 17px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 13px;
}

/* ---------- 自建计划卡片 ---------- */
.own-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border-radius: var(--r-lg);
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
}

.own-meta {
  flex: 1;
  min-width: 0;
}

.own-name {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.own-right {
  flex: none;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
}

.dots {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-4);
}

.dots svg {
  width: 19px;
  height: 19px;
}

.running {
  padding: 4px 11px;
  border-radius: 12px;
  background: var(--grad);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

/* ---------- 预览弹层 ---------- */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.45);
  z-index: 230;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.pv {
  width: 100%;
  max-width: 340px;
  max-height: 76vh;
  background: var(--card);
  border-radius: var(--r-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pv-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
}

.pv-title {
  font-size: 15.5px;
  font-weight: 600;
}

.pv-x {
  color: var(--ink-3);
  font-size: 16px;
}

.pv-body {
  overflow-y: auto;
  padding: 6px 16px 16px;
}

.pv-day {
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}

.pv-day:last-child {
  border-bottom: none;
}

.pv-dhead {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.pv-wd {
  font-size: 11px;
  font-weight: 500;
  color: var(--brand-1);
  background: var(--brand-soft);
  padding: 2px 7px;
  border-radius: 7px;
}

.pv-cnt {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 400;
  color: var(--ink-3);
}

.pv-empty {
  font-size: 12.5px;
  color: var(--ink-3);
  padding: 2px 0 4px;
}

.pv-item {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 4px 0;
  font-size: 13px;
}

.pv-idx {
  width: 16px;
  color: var(--ink-3);
  font-size: 12px;
}

.pv-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pv-reps {
  flex: none;
  font-size: 11.5px;
  color: var(--ink-3);
}
</style>
