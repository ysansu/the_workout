<template>
  <div v-if="plan" class="page">
    <header class="bar">
      <button class="back" @click="$router.push('/plans')" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1>{{ plan.name }}</h1>
      <button class="dots" @click="sheetOpen = true" aria-label="更多">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
    </header>

    <div class="body">
      <div v-for="d in plan.days" :key="d.id" class="day-card">
        <div class="d-head">
          <span class="d-name">{{ d.name }}</span>
          <span v-if="d.weekday" class="d-wd">{{ WEEKDAY_CN[d.weekday] }}</span>
        </div>

        <div v-if="!d.items.length" class="d-empty">这一天还没有动作</div>
        <div v-else class="d-list">
          <div
            v-for="(it, k) in d.items"
            :key="k"
            class="d-row"
            @click="$router.push('/exercises/' + it.exerciseId)"
          >
            <ExThumb :id="it.exerciseId" :size="48" :radius="8" />
            <div class="d-meta">
              <div class="d-n">{{ nameOf(it.exerciseId) }}</div>
              <div class="d-s">{{ fmtPlanItemFull(it) }}</div>
            </div>
            <span class="chev">›</span>
          </div>
        </div>
      </div>
    </div>

    <footer class="bottom">
      <button v-if="!isActive" class="btn btn-primary btn-block" @click="activate">执行本计划</button>
      <template v-else>
        <button class="btn btn-primary btn-block" @click="$router.push('/train')">回到今日训练</button>
        <button class="end" @click="askingEnd = true">结束该计划</button>
      </template>
    </footer>

    <ConfirmDialog
      :visible="askingEnd"
      title="确定结束这个计划？"
      message="结束后首页就不再显示每日训练内容，计划本身会保留在「我的计划」里。"
      confirm-text="结束计划"
      cancel-text="取消"
      danger
      @confirm="onEndConfirm"
      @cancel="askingEnd = false"
    />

    <ActionSheet
      :visible="sheetOpen"
      :title="plan.name"
      :items="sheetItems"
      @close="sheetOpen = false"
      @select="onSheet"
    />
  </div>

  <div v-else class="miss">计划不存在</div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Plan } from '@/types'
import { WEEKDAY_CN } from '@/utils/date'
import { getExerciseName } from '@/data/exercises'
import { usePlanStore } from '@/stores/plan'
import { fmtPlanItemFull } from '@/utils/num'
import ExThumb from '@/components/ExThumb.vue'
import ActionSheet, { type SheetItem } from '@/components/ActionSheet.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const planStore = usePlanStore()

const plan = computed<Plan | null>(
  () => planStore.getPlanById(String(route.params.id)) ?? null,
)

const isActive = computed(() => planStore.active?.planId === plan.value?.id)
const nameOf = (id: string) => getExerciseName(id)

function activate() {
  if (!plan.value) return
  planStore.activate(plan.value.id)
  router.push('/train')
}

/* 结束计划：先弹窗确认，取消则什么都不做 */
const askingEnd = ref(false)

function onEndConfirm() {
  askingEnd.value = false
  planStore.deactivate()
}

/* ---------------- 菜单 ---------------- */
const sheetOpen = ref(false)

const sheetItems = computed<SheetItem[]>(() => [
  { key: 'edit', label: '编辑计划', icon: ['M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z'] },
  { key: 'copy', label: '复制计划', icon: ['M9 9h11v11H9z', 'M4 15V4h11'] },
  { key: 'delete', label: '删除计划', danger: true, disabled: !!plan.value?.builtin, icon: ['M4 7h16', 'M9 7V5h6v2', 'M6.5 7l1 12.5h9L17.5 7'] },
  { key: 'run', label: '执行计划', icon: ['M8 5.5v13l11-6.5z'] },
])

function onSheet(key: string) {
  const p = plan.value
  sheetOpen.value = false
  if (!p) return
  if (key === 'edit') router.push('/plans/' + p.id + '/edit')
  else if (key === 'copy') {
    const copy = planStore.duplicatePlan(p.id)
    if (copy) router.push('/plans/' + copy.id + '/edit')
  } else if (key === 'delete') {
    if (!window.confirm(`确定删除「${p.name}」？删除后无法恢复。`)) return
    planStore.removeCustomPlan(p.id)
    router.replace('/plans')
  } else if (key === 'run') {
    planStore.activate(p.id)
    router.push('/train')
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 96px;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  padding: calc(env(safe-area-inset-top, 0px) + 8px) 10px 8px;
  background: var(--card);
}

.back {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
}

.back svg {
  width: 22px;
  height: 22px;
}

.bar h1 {
  text-align: center;
  font-size: 16.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dots {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  justify-self: end;
}

.dots svg {
  width: 20px;
  height: 20px;
}

.body {
  padding: 12px 14px 0;
}

.day-card {
  background: var(--card);
  border-radius: var(--r-lg);
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: var(--shadow);
}

.d-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.d-name {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d-wd {
  flex: none;
  font-size: 11.5px;
  color: var(--brand-1);
  background: var(--brand-soft);
  padding: 3px 8px;
  border-radius: 8px;
  font-weight: 600;
}

.d-empty {
  font-size: 12.5px;
  color: var(--ink-3);
  padding: 14px 0 4px;
}

.d-list {
  margin-top: 10px;
}

.d-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
}

.d-row:last-child {
  border-bottom: none;
}

.d-meta {
  flex: 1;
  min-width: 0;
}

.d-n {
  font-size: 14px;
  font-weight: 500;
}

.d-s {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 2px;
}

.chev {
  color: var(--ink-4);
  font-size: 19px;
  flex: none;
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

.end {
  display: block;
  width: 100%;
  padding: 12px 0 2px;
  font-size: 13px;
  color: var(--ink-3);
  text-align: center;
}

.miss {
  padding: 80px 20px;
  text-align: center;
  color: var(--ink-3);
}
</style>
