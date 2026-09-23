<template>
  <div class="page">
    <header class="bar">
      <button class="back" @click="leave" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <div class="title-wrap">
        <input
          v-if="renaming"
          ref="nameEl"
          v-model="nameDraft"
          class="rename"
          @blur="commitRename"
          @keyup.enter="commitRename"
        />
        <template v-else>
          <span class="title">{{ plan?.name || '新建计划' }}</span>
          <button class="pencil" @click="startRename" aria-label="重命名">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z" />
            </svg>
          </button>
        </template>
      </div>

      <button class="finish" @click="leave">完成</button>
    </header>

    <div class="body">
      <div class="mode">
        <span class="mode-l">排布方式</span>
        <div class="mode-chips">
          <button
            class="mchip"
            :class="{ on: plan?.schedule === 'weekly' }"
            @click="setSchedule('weekly')"
          >
            按周
          </button>
          <button
            class="mchip"
            :class="{ on: plan?.schedule === 'cycle' }"
            @click="setSchedule('cycle')"
          >
            周期
          </button>
        </div>
      </div>
      <p class="mode-hint">
        {{
          plan?.schedule === 'weekly'
            ? '按周：每个训练日绑定星期几，到那天就练那一天。'
            : '周期：自己定几天为一组，按第 1 天、第 2 天……依次循环。'
        }}
      </p>

      <div v-if="!days.length" class="empty">
        <div class="e-t">暂无训练日</div>
        <div class="e-d">快去添加训练日吧~</div>
        <button class="e-btn" @click="addDayFlow">去添加</button>
      </div>

      <div v-for="(d, i) in days" :key="d.id" class="day-card" @click="openDay(d)">
        <div class="d-head">
          <div class="d-name-wrap">
            <input
              v-if="renamingDayId === d.id"
              v-model="dayNameDraft"
              class="d-rename"
              @click.stop
              @blur="commitDayRename(d)"
              @keyup.enter="commitDayRename(d)"
            />
            <template v-else>
              <span class="d-name">{{ d.name }}</span>
              <button class="d-pencil" @click.stop="startDayRename(d)" aria-label="重命名">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                  <path d="M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z" />
                </svg>
              </button>
            </template>
            <span v-if="d.weekday" class="d-wd">{{ WEEKDAY_CN[d.weekday] }}</span>
            <span v-else-if="plan?.schedule === 'cycle'" class="d-wd cycle">第 {{ i + 1 }} 天</span>
          </div>
          <button class="d-dots" @click.stop="openDaySheet(d)" aria-label="更多">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="19" cy="12" r="1.7" />
            </svg>
          </button>
        </div>

        <div v-if="d.rest" class="d-stat rest-tag">休息日</div>
        <div v-else class="d-stat">{{ d.items.length }} 个动作</div>
        <div v-if="d.rest" class="d-sum">这一天不安排训练，轮到它时首页会提示休息</div>
        <div v-else-if="d.items.length" class="d-sum">
          {{ d.items.map((it) => nameOf(it.exerciseId)).join('，') }}
        </div>
        <div v-else class="d-sum placeholder">请点击本训练日添加动作</div>
      </div>
    </div>

    <footer class="bottom">
      <button class="add-day" @click="addDayFlow">添加训练日</button>
    </footer>

    <!-- 选择每周训练日 -->
    <div v-if="weekSheet" class="mask" @click.self="weekSheet = false">
      <div class="ws">
        <div class="ws-title">选择每周训练日</div>
        <div class="ws-days">
          <button
            v-for="w in 7"
            :key="w"
            class="ws-day"
            :class="{ on: picked.includes(w), off: taken.has(w) }"
            @click="toggleWeekday(w)"
          >
            {{ WEEKDAY_SHORT[w] }}
          </button>
        </div>
        <div class="ws-sub">已排布的星期不可重复选择</div>
        <button class="ws-ok" :disabled="!picked.length" @click="confirmWeekdays">添加到列表</button>
      </div>
    </div>

    <ActionSheet
      :visible="!!sheetDay"
      :title="sheetDay?.name"
      :items="dayMenuItems"
      @close="sheetDay = null"
      @select="onDaySheet"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Plan, PlanDay } from '@/types'
import { WEEKDAY_CN, WEEKDAY_SHORT } from '@/utils/date'
import { getExerciseName } from '@/data/exercises'
import { usePlanStore } from '@/stores/plan'
import { uid } from '@/utils/migrate'
import ActionSheet, { type SheetItem } from '@/components/ActionSheet.vue'

const route = useRoute()
const router = useRouter()
const planStore = usePlanStore()

const isNew = computed(() => route.name === 'plan-new')
const planId = ref('')

const plan = computed<Plan | null>(() => (planId.value ? planStore.getPlanById(planId.value) : null))
const days = computed<PlanDay[]>(() => plan.value?.days ?? [])
const nameOf = (id: string) => getExerciseName(id)

onMounted(() => {
  if (isNew.value) {
    const p: Plan = {
      id: uid('plan'),
      name: '新建计划',
      desc: '',
      goal: 'muscle',
      level: 'beginner',
      schedule: 'cycle',
      daysPerWeek: 0,
      equipment: ['dumbbell', 'bodyweight', 'bench', 'mat'],
      days: [],
      builtin: false,
    }
    planStore.addCustomPlan(p)
    planId.value = p.id
    startRename()
    return
  }

  const id = String(route.params.id)
  const src = planStore.getPlanById(id)
  if (!src) {
    router.replace('/plans')
    return
  }
  // 预置计划：自动复制一份副本再编辑，不直接改模板
  if (src.builtin) {
    const copy = planStore.duplicatePlan(id)
    if (!copy) {
      router.replace('/plans')
      return
    }
    planId.value = copy.id
    router.replace('/plans/' + copy.id + '/edit')
    return
  }
  planId.value = id
})

/* ---------------- 计划名 ---------------- */
const renaming = ref(false)
const nameDraft = ref('')
const nameEl = ref<HTMLInputElement | null>(null)

function startRename() {
  nameDraft.value = plan.value?.name ?? ''
  renaming.value = true
  void nextTick(() => nameEl.value?.focus())
}

function commitRename() {
  if (!renaming.value) return
  const v = nameDraft.value.trim()
  if (v && plan.value) planStore.updateCustomPlan(plan.value.id, { name: v })
  renaming.value = false
}

/* ---------------- 训练日重命名 ---------------- */
const renamingDayId = ref('')
const dayNameDraft = ref('')

function startDayRename(d: PlanDay) {
  dayNameDraft.value = d.name
  renamingDayId.value = d.id
}

function commitDayRename(d: PlanDay) {
  if (!renamingDayId.value) return
  const v = dayNameDraft.value.trim()
  if (v && plan.value) planStore.updateDay(plan.value.id, d.id, { name: v })
  renamingDayId.value = ''
}

/* ---------------- 排布方式 ---------------- */
function setSchedule(s: Plan['schedule']) {
  if (!plan.value || plan.value.schedule === s) return
  if (s === 'weekly' && plan.value.days.some((d) => d.weekday)) return
  planStore.setSchedule(plan.value.id, s)
}

/* ---------------- 添加训练日 ---------------- */
const weekSheet = ref(false)
const picked = ref<number[]>([])
const taken = computed(() => new Set(days.value.map((d) => d.weekday).filter(Boolean) as number[]))

function addDayFlow() {
  if (!plan.value) return
  if (plan.value.schedule === 'weekly') {
    picked.value = []
    weekSheet.value = true
    return
  }
  const n = days.value.length + 1
  planStore.addDay(plan.value.id, { id: uid('day'), name: `第 ${n} 天`, items: [] })
}

function toggleWeekday(w: number) {
  if (taken.value.has(w)) return
  const i = picked.value.indexOf(w)
  if (i >= 0) picked.value.splice(i, 1)
  else picked.value.push(w)
}

function confirmWeekdays() {
  const p = plan.value
  if (!p) return
  const list = [...picked.value].sort((a, b) => a - b)
  list.forEach((w) => {
    planStore.addDay(p.id, { id: uid('day'), name: WEEKDAY_CN[w], weekday: w, items: [] })
  })
  weekSheet.value = false
  picked.value = []
}

/* ---------------- 打开训练日 ---------------- */
function openDay(d: PlanDay) {
  if (renamingDayId.value) return
  const p = plan.value
  if (!p) return
  router.push(`/plans/${p.id}/days/${d.id}`)
}

/* ---------------- 训练日菜单 ---------------- */
const sheetDay = ref<PlanDay | null>(null)

const daySheetItems: SheetItem[] = [
  { key: 'edit', label: '编辑训练日', icon: ['M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z'] },
  { key: 'rename', label: '重命名', icon: ['M4 7h10M4 12h7M4 17h13'] },
  { key: 'up', label: '上移训练日', icon: ['M12 19V5', 'M6 11l6-6 6 6'] },
  { key: 'down', label: '下移训练日', icon: ['M12 5v14', 'M6 13l6 6 6-6'] },
  { key: 'copy', label: '复制训练日', icon: ['M9 9h11v11H9z', 'M4 15V4h11'] },
  { key: 'run', label: '立即开练', icon: ['M8 5.5v13l11-6.5z'] },
  { key: 'delete', label: '删除训练日', danger: true, icon: ['M4 7h16', 'M9 7V5h6v2', 'M6.5 7l1 12.5h9L17.5 7'] },
]

/**
 * 训练日菜单。休息日和训练日能做的事不一样：
 * 休息日没有「立即开练」，但多一个「取消休息日」。
 */
const dayMenuItems = computed<SheetItem[]>(() => {
  const d = sheetDay.value
  const toggle: SheetItem = d?.rest
    ? { key: 'rest', label: '取消休息日', icon: ['M12 3v2M12 19v2M5 12H3M21 12h-2', 'M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M5.6 5.6L7 7M17 17l1.4 1.4'] }
    : { key: 'rest', label: '改为休息日', icon: ['M12 3a9 9 0 109 9', 'M12 7v5l3 2'] }
  return d?.rest
    ? [daySheetItems[0], daySheetItems[1], toggle, daySheetItems[2], daySheetItems[3], daySheetItems[4], daySheetItems[6]]
    : [...daySheetItems.slice(0, 5), toggle, daySheetItems[5], daySheetItems[6]]
})

function openDaySheet(d: PlanDay) {
  sheetDay.value = d
}

function onDaySheet(key: string) {
  const d = sheetDay.value
  sheetDay.value = null
  const pid = plan.value?.id
  if (!d || !pid) return

  if (key === 'edit') router.push(`/plans/${pid}/days/${d.id}`)
  else if (key === 'rename') startDayRename(d)
  else if (key === 'up') planStore.moveDay(pid, d.id, -1)
  else if (key === 'down') planStore.moveDay(pid, d.id, 1)
  else if (key === 'copy') planStore.copyDay(pid, d.id)
  else if (key === 'rest') planStore.setDayRest(pid, d.id, !d.rest)
  else if (key === 'run') startNow(d)
  else if (key === 'delete') {
    if (!window.confirm(`确定删除训练日「${d.name}」？`)) return
    planStore.removeDay(pid, d.id)
  }
}

function startNow(d: PlanDay) {
  const p = plan.value
  if (!p) return
  if (d.rest) return // 休息日不开练
  // 还没在执行这个计划才激活；已在执行就别重复 activate，否则轮次会被重置回第 1 天
  if (planStore.active?.planId !== p.id) planStore.activate(p.id)
  router.push({ path: '/train/start', query: { day: d.id } })
}

/* ---------------- 完成 ---------------- */
function leave() {
  const p = plan.value
  if (!p) {
    router.replace('/plans')
    return
  }
  const empty = !p.days.length || p.days.every((d) => !d.items.length)
  if (empty) {
    if (window.confirm('这个计划还没有任何动作，要丢弃吗？')) {
      planStore.removeCustomPlan(p.id)
      router.replace('/plans')
    }
    return
  }
  if (!p.desc) {
    planStore.updateCustomPlan(p.id, {
      desc: `${p.days.length} 个训练日，共 ${p.days.reduce((n, d) => n + d.items.length, 0)} 个动作`,
      daysPerWeek: p.days.length,
    })
  }
  router.replace('/plans/' + p.id)
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: var(--bg);
  padding-bottom: 84px;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px;
  background: var(--card);
}

.back {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-1);
  flex: none;
}

.back svg {
  width: 22px;
  height: 22px;
}

.title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pencil {
  color: var(--ink-3);
  flex: none;
  display: flex;
}

.pencil svg {
  width: 15px;
  height: 15px;
}

.rename {
  width: 100%;
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1.5px solid var(--brand-1);
  padding-bottom: 2px;
}

.finish {
  flex: none;
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-1);
  padding: 4px 2px;
}

.body {
  padding: 12px 14px;
}

/* ---------- 排布方式 ---------- */
.mode {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-l {
  flex: none;
  font-size: 13.5px;
  color: var(--ink-2);
}

.mode-chips {
  display: flex;
  gap: 6px;
  flex: 1;
}

.mchip {
  flex: 1;
  height: 32px;
  border-radius: 16px;
  background: var(--surface-raise);
  color: var(--ink-2);
  font-size: 13px;
  box-shadow: inset 0 0 0 1px var(--line);
}

.mchip.on {
  background: var(--grad);
  color: #fff;
  font-weight: 600;
  box-shadow: none;
}

.mode-hint {
  font-size: 11.5px;
  color: var(--ink-3);
  line-height: 1.5;
  padding: 8px 2px 14px;
}

/* ---------- 训练日卡片 ---------- */
.day-card {
  background: var(--card);
  border-radius: var(--r-lg);
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: var(--shadow);
}

.d-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.d-name-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.d-name {
  font-size: 15.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.d-pencil {
  color: var(--ink-3);
  flex: none;
  display: flex;
}

.d-pencil svg {
  width: 14px;
  height: 14px;
}

.d-rename {
  flex: 1;
  min-width: 0;
  font-size: 15.5px;
  font-weight: 600;
  border-bottom: 1.5px solid var(--brand-1);
  padding-bottom: 1px;
}

.d-wd {
  flex: none;
  font-size: 11.5px;
  color: var(--brand-1);
  background: var(--brand-soft);
  padding: 3px 9px;
  border-radius: 8px;
  font-weight: 600;
}

.d-wd.cycle {
  color: var(--ink-2);
  background: var(--surface-3);
}

.d-dots {
  flex: none;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-4);
}

.d-dots svg {
  width: 18px;
  height: 18px;
}

.d-stat {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 10px;
}

/* 休息日：给出一个明确标记，别只显示「0 个动作」 */
.d-stat.rest-tag {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 8px;
  background: var(--surface-3);
  color: var(--ink-2);
  font-weight: 600;
}

.d-sum {
  font-size: 12.5px;
  color: var(--ink-2);
  line-height: 1.6;
  margin-top: 6px;
}

.d-sum.placeholder {
  color: var(--ink-4);
}

/* ---------- 空态 ---------- */
.empty {
  text-align: center;
  padding: 70px 20px;
}

.e-t {
  font-size: 15px;
  color: var(--ink-2);
  margin-bottom: 5px;
}

.e-d {
  font-size: 12.5px;
  color: var(--ink-3);
  margin-bottom: 16px;
}

.e-btn {
  height: 38px;
  padding: 0 22px;
  border-radius: 19px;
  background: var(--card);
  color: var(--brand-1);
  font-size: 13.5px;
  box-shadow: inset 0 0 0 1.4px var(--brand-soft-2);
}

/* ---------- 底栏 ---------- */
.bottom {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 14px calc(12px + env(safe-area-inset-bottom, 0px));
  background: var(--card);
}

.add-day {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: #3c4149;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

/* ---------- 选择每周训练日 ---------- */
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.45);
  z-index: 230;
  display: flex;
  align-items: flex-end;
}

.ws {
  width: 100%;
  background: var(--card);
  border-radius: 24px 24px 0 0;
  padding: 20px 20px calc(16px + env(safe-area-inset-bottom, 0px));
  animation: up 0.22s ease;
}

@keyframes up {
  from {
    transform: translateY(24px);
    opacity: 0.6;
  }
}

.ws-title {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
}

.ws-days {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}

.ws-day {
  flex: 1;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--ink-2);
  font-size: 14px;
}

.ws-day.on {
  background: var(--brand-soft);
  color: var(--brand-1);
  font-weight: 700;
  box-shadow: inset 0 0 0 1.6px var(--brand-1);
}

.ws-day.off {
  color: var(--ink-4);
  text-decoration: line-through;
  pointer-events: none;
}

.ws-sub {
  text-align: center;
  font-size: 11.5px;
  color: var(--ink-3);
  margin: 14px 0 16px;
}

.ws-ok {
  width: 100%;
  height: 48px;
  border-radius: 24px;
  background: var(--grad);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.ws-ok:disabled {
  opacity: 0.45;
}
</style>
