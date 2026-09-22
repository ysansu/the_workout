<template>
  <div class="picker" :class="{ embedded }">
    <header class="head">
      <button v-if="!embedded" class="back" @click="$emit('close')" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <label class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M16.5 16.5 21 21" />
        </svg>
        <input v-model="kw" placeholder="搜索动作" />
      </label>

      <button class="add-own" @click="$emit('create')" aria-label="创建自定义动作">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </header>

    <nav class="tabs">
      <button class="t" :class="{ on: tab === 'all' }" @click="switchTab('all')">全部动作</button>
      <button class="t" :class="{ on: tab === 'mine' }" @click="switchTab('mine')">我的动作</button>
    </nav>

    <div v-if="tab === 'all'" class="chips">
      <button
        v-for="c in equipChips"
        :key="c.value"
        class="chip"
        :class="{ on: equip === c.value }"
        @click="equip = c.value"
      >
        {{ c.label }}
      </button>
    </div>

    <div class="body">
      <aside class="rail">
        <button
          v-for="c in railItems"
          :key="c.key"
          class="rail-item"
          :class="{ on: rail === c.key }"
          @click="rail = c.key"
        >
          {{ c.label }}
        </button>
      </aside>

      <main class="grid-wrap">
        <div v-if="!shown.length" class="empty">
          <div class="e-t">{{ emptyText }}</div>
          <button v-if="tab === 'mine'" class="e-btn" @click="$emit('create')">添加自定义动作</button>
        </div>

        <div v-else class="grid">
          <div v-for="e in shown" :key="e.id" class="cell">
            <div class="cover-wrap">
              <button class="cover" @click="$emit('detail', e.id)">
                <ExThumb :id="e.id" fill />
              </button>
              <button
                v-if="mode === 'browse'"
                class="more"
                aria-label="更多操作"
                @click="$emit('more', e.id)"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5.4" cy="12" r="1.7" />
                  <circle cx="12" cy="12" r="1.7" />
                  <circle cx="18.6" cy="12" r="1.7" />
                </svg>
              </button>
            </div>
            <div class="cname" @click="$emit('detail', e.id)">{{ e.name }}</div>
            <button v-if="mode === 'pick'" class="cbtn" @click="$emit('pick', e.id)">添加动作</button>
            <button v-else class="cbtn ghost" @click="$emit('detail', e.id)">查看详情</button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Equipment, MuscleGroup } from '@/types'
import { EQUIPMENT_LABEL, MUSCLE_GROUPS } from '@/data/exercises'
import { useExerciseStore } from '@/stores/exercise'
import { useUserStore } from '@/stores/user'
import ExThumb from './ExThumb.vue'

const props = withDefaults(
  defineProps<{
    mode?: 'pick' | 'browse'
    /** 只显示用户器材做得到的动作 */
    onlyOwned?: boolean
    /**
     * 内嵌在页面里（动作库 Tab）而不是整屏弹层：
     * 去掉返回键、不铺满视口，让页面自己的 TrainTabs 当表头。
     */
    embedded?: boolean
  }>(),
  { mode: 'pick', onlyOwned: false, embedded: false },
)

// 模板统一用 $emit 触发，这里只做类型声明
defineEmits<{
  (e: 'close'): void
  (e: 'pick', id: string): void
  (e: 'detail', id: string): void
  (e: 'more', id: string): void
  (e: 'create'): void
}>()

const store = useExerciseStore()
const userStore = useUserStore()

const kw = ref('')
const tab = ref<'all' | 'mine'>('all')
const equip = ref<Equipment | 'all'>('all')
const rail = ref<MuscleGroup | '全部' | '我创建的' | '我收藏的'>('全部')

const equipChips = computed(() => {
  const keys: Equipment[] = [
    'bodyweight',
    'dumbbell',
    'barbell',
    'cable',
    'machine',
    'bench',
    'band',
    'mat',
    'kettlebell',
    'cardio',
  ]
  return [
    { value: 'all' as const, label: '全部' },
    ...keys.map((k) => ({ value: k, label: EQUIPMENT_LABEL[k] })),
  ]
})

const railItems = computed(() => {
  if (tab.value === 'mine') {
    return [
      { key: '我创建的' as const, label: '我创建的' },
      { key: '我收藏的' as const, label: '我收藏的' },
    ]
  }
  return [
    { key: '全部' as const, label: '全部' },
    ...MUSCLE_GROUPS.map((g) => ({ key: g, label: g })),
  ]
})

function switchTab(t: 'all' | 'mine') {
  tab.value = t
  rail.value = t === 'all' ? '全部' : '我创建的'
}

const base = computed(() => {
  if (tab.value === 'mine') {
    return rail.value === '我收藏的' ? store.favoriteList : store.mine
  }
  return store.groupOf(rail.value as MuscleGroup | '全部')
})

const shown = computed(() => {
  let out = base.value
  if (props.onlyOwned) out = store.filterByEquipment(out, userStore.profile.equipment)
  if (equip.value !== 'all') out = out.filter((e) => e.equipment.includes(equip.value as Equipment))
  const q = kw.value.trim().toLowerCase()
  if (q) {
    out = out.filter((e) =>
      [e.name, e.en, ...e.primary, ...e.secondary].join(' ').toLowerCase().includes(q),
    )
  }
  return out
})

const emptyText = computed(() => {
  if (kw.value.trim()) return '没有找到匹配的动作'
  if (tab.value === 'mine') return rail.value === '我收藏的' ? '还没有收藏动作' : '当前没有动作哦~'
  return '这个分类下还没有动作'
})

defineExpose({ switchTab })
</script>

<style scoped>
.picker {
  position: fixed;
  inset: 0;
  z-index: 220;
  background: var(--card);
  display: flex;
  flex-direction: column;
}

/* 内嵌模式：不铺满视口，撑满父容器；页面自己的 TrainTabs 当表头，顶部安全区由它负责 */
.picker.embedded {
  position: static;
  inset: auto;
  flex: 1;
  min-height: 0;
  z-index: auto;
}

/* ---------- 顶部 ---------- */
.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: calc(env(safe-area-inset-top, 0px) + 10px) 12px 8px;
  flex: none;
}

.picker.embedded .head {
  padding: 4px 12px 10px;
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

.search {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 12px;
  border-radius: 19px;
  background: var(--surface-3);
}

.search svg {
  width: 17px;
  height: 17px;
  color: var(--ink-3);
  flex: none;
}

.search input {
  flex: 1;
  min-width: 0;
  font-size: 14px;
}

.add-own {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.6px solid var(--brand-1);
  color: var(--brand-1);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.add-own svg {
  width: 18px;
  height: 18px;
}

/* ---------- 二级 Tab ---------- */
.tabs {
  display: flex;
  gap: 22px;
  padding: 4px 16px 0;
  flex: none;
}

.t {
  font-size: 15.5px;
  color: var(--ink-3);
  padding-bottom: 8px;
  position: relative;
}

.t.on {
  color: var(--ink-1);
  font-weight: 700;
}

.t.on::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 2px;
  width: 20px;
  height: 3px;
  border-radius: 2px;
  background: var(--brand-1);
}

/* ---------- 器械筛选 ---------- */
.chips {
  display: flex;
  gap: 7px;
  overflow-x: auto;
  padding: 10px 14px 10px;
  border-bottom: 1px solid var(--line);
  scrollbar-width: none;
  flex: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.chip {
  flex: none;
  height: 28px;
  padding: 0 12px;
  border-radius: 14px;
  background: var(--surface-3);
  color: var(--ink-2);
  font-size: 12.5px;
  white-space: nowrap;
}

.chip.on {
  background: #4a4f57;
  color: #fff;
}

/* ---------- 主体 ---------- */
.body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.rail {
  width: 78px;
  flex: none;
  background: var(--surface-2);
  overflow-y: auto;
  padding: 6px 0 24px;
  scrollbar-width: none;
}

.rail::-webkit-scrollbar {
  display: none;
}

.rail-item {
  position: relative;
  width: 100%;
  padding: 13px 4px;
  font-size: 13px;
  color: var(--ink-2);
  text-align: center;
}

.rail-item.on {
  color: var(--brand-1);
  font-weight: 600;
}

.rail-item.on::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  border-radius: 0 2px 2px 0;
  background: var(--brand-1);
}

.grid-wrap {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 12px 12px 30px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cell {
  display: flex;
  flex-direction: column;
}

.cover-wrap {
  position: relative;
}

.cover {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface-3);
  display: block;
}

/* 压在缩略图上的「更多」，用半透明深色底，两种主题下都压得住图 */
.more {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(20, 20, 28, 0.42);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}

.more svg {
  width: 16px;
  height: 16px;
}

.cname {
  font-size: 13px;
  color: var(--ink-1);
  text-align: center;
  margin: 7px 2px 8px;
  line-height: 1.3;
  min-height: 34px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cbtn {
  height: 32px;
  border-radius: 16px;
  background: var(--grad);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.cbtn.ghost {
  background: var(--card);
  color: var(--brand-1);
  box-shadow: inset 0 0 0 1.4px var(--brand-soft-2);
}

.empty {
  padding: 60px 20px;
  text-align: center;
}

.e-t {
  font-size: 13.5px;
  color: var(--ink-3);
  margin-bottom: 14px;
}

.e-btn {
  height: 38px;
  padding: 0 20px;
  border-radius: 19px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 13.5px;
}
</style>
