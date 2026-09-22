<template>
  <div class="page">
    <div class="page-head">
      <h1>训练记录</h1>
      <div class="sub">累计 {{ sessionStore.totalDays }} 天 · 总容量 {{ Math.round(sessionStore.totalVolume / 1000) }}k kg</div>
    </div>

    <div class="body-pad" style="margin-top: 12px">
      <!-- 肌群分布 -->
      <div class="card" v-if="muscleList.length">
        <div class="card-title"><span>本周各部位组数</span></div>
        <div v-for="m in muscleList" :key="m.k" class="mbar">
          <span class="mk">{{ m.k }}</span>
          <div class="track"><i :style="{ width: m.pct + '%', background: m.color }" /></div>
          <span class="mv">{{ m.v }}</span>
        </div>
      </div>

      <!-- 月度打卡 -->
      <div class="card">
        <div class="card-title">
          <button class="mnav" @click="shiftMonth(-1)">‹</button>
          <span class="mtitle">{{ monthLabel }}</span>
          <button class="mnav" @click="shiftMonth(1)">›</button>
        </div>
        <div class="month-info">
          本月训练 {{ monthDays }} 天 · 容量 {{ monthVolume }} kg
        </div>

        <!-- 周标题和日期放在同一个 grid 里，行高由 grid-auto-rows 统一管，
             分成两块容易出现行距对不齐 -->
        <div class="month">
          <span v-for="w in WEEKDAYS" :key="w" class="wd">{{ w }}</span>
          <div
            v-for="(c, i) in monthGrid"
            :key="'d' + i"
            class="mcell"
            :class="{ empty: !c, trained: c && trainedSet.has(c.key), sel: c && c.key === selectedDate, today: c && c.key === todayKey() }"
            @click="tapDay(c)"
          >
            <template v-if="c">
              <span class="dnum">{{ c.day }}</span>
              <i v-if="trainedSet.has(c.key)" class="mark" />
            </template>
          </div>
        </div>

        <div v-if="selectedDate" class="day-box">
          <div class="db-title">
            {{ fmtMD(selectedDate) }} 的训练
            <span class="db-close" @click="selectedDate = null">收起</span>
          </div>
          <div v-if="daySessions.length">
            <div
              v-for="s in daySessions"
              :key="s.id"
              class="db-item"
              @click="$router.push('/records/' + s.id)"
            >
              <div>
                <div class="db-name">{{ s.name }}</div>
                <div class="db-sub">
                  {{ Math.round((s.durationSec || 0) / 60) }} 分钟 · {{ sessionVolume(s) }} kg ·
                  {{ s.entries.length }} 个动作
                </div>
              </div>
              <span class="arrow">›</span>
            </div>
          </div>
          <div v-else class="db-none">这天没有训练记录</div>
        </div>
      </div>

      <div v-if="!sessionStore.sorted.length" class="empty">
        <div class="t">还没有训练记录</div>
        <div class="d">完成一次训练后，点日历上对应的日期就能看到</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { GROUP_COLOR } from '@/data/exercises'
import { useSessionStore } from '@/stores/session'
import { sessionVolume } from '@/utils/stats'
import { dateKey, fmtMD, todayKey } from '@/utils/date'

const sessionStore = useSessionStore()

const muscleList = computed(() => {
  const m = sessionStore.muscleSetsThisWeek
  const total = Object.values(m).reduce((a, b) => a + b, 0) || 1
  return Object.entries(m)
    .map(([k, v]) => ({ k, v, pct: Math.round((v / total) * 100), color: GROUP_COLOR[k] || '#ccc' }))
    .sort((a, b) => b.v - a.v)
})

/* ---------------- 月度视图 ---------------- */
const viewMonth = ref(new Date())
const selectedDate = ref<string | null>(null)

/** 周一为一周起点 */
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

const monthLabel = computed(
  () => `${viewMonth.value.getFullYear()} 年 ${viewMonth.value.getMonth() + 1} 月`,
)

const trainedSet = computed(() => new Set(sessionStore.sessions.map((s) => s.date)))

/** 周一为一周起点的月历格子，前后补空位 */
const monthGrid = computed(() => {
  const v = viewMonth.value
  const y = v.getFullYear()
  const m = v.getMonth()
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7
  const total = new Date(y, m + 1, 0).getDate()
  const cells: ({ day: number; key: string } | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= total; d++) cells.push({ day: d, key: dateKey(new Date(y, m, d)) })
  while (cells.length % 7) cells.push(null)
  return cells
})

const monthKeys = computed(
  () => new Set(monthGrid.value.filter(Boolean).map((c) => c!.key)),
)

const monthDays = computed(() => [...trainedSet.value].filter((k) => monthKeys.value.has(k)).length)

const monthVolume = computed(() =>
  sessionStore.sessions
    .filter((s) => monthKeys.value.has(s.date))
    .reduce((n, s) => n + sessionVolume(s), 0),
)

function shiftMonth(n: number) {
  const v = new Date(viewMonth.value)
  v.setMonth(v.getMonth() + n)
  viewMonth.value = v
  selectedDate.value = null
}

const daySessions = computed(() =>
  selectedDate.value ? sessionStore.byDate[selectedDate.value] || [] : [],
)

function tapDay(c: { day: number; key: string } | null) {
  if (!c) return
  selectedDate.value = selectedDate.value === c.key ? null : c.key
}

/**
 * 进来就先展开一天，避免看到一个空日历。
 * 优先今天；今天没练就展开本月最近练过的那天。
 */
onMounted(() => {
  if (sessionStore.sessions.some((s) => s.date === todayKey())) {
    selectedDate.value = todayKey()
    return
  }
  const latest = sessionStore.sorted.find((s) => monthKeys.value.has(s.date))
  if (latest) selectedDate.value = latest.date
})
</script>

<style scoped>
.mbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}

.mk {
  font-size: 12px;
  color: var(--ink-2);
  width: 28px;
  flex: none;
}

.track {
  flex: 1;
  height: 8px;
  background: var(--surface-3);
  border-radius: 4px;
  overflow: hidden;
}

.track i {
  display: block;
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s;
}

.mv {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-2);
  width: 20px;
  text-align: right;
}

.mnav {
  width: 28px;
  height: 26px;
  font-size: 20px;
  line-height: 1;
  color: var(--ink-3);
}

.mtitle {
  font-size: 15px;
  font-weight: 700;
}

.month-info {
  font-size: 11.5px;
  color: var(--ink-3);
  margin: -2px 0 8px;
}

.month {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* 行高交给 grid 管，格子自己不再设高度，避免出现某一行被内容撑高 */
  grid-auto-rows: 28px;
  gap: 2px;
}

.wd {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  color: var(--ink-4);
}

.mcell {
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  transition: transform 0.12s;
  overflow: hidden;
}

.mcell:active {
  transform: scale(0.93);
}

.mcell.empty {
  background: transparent;
}

.dnum {
  font-size: 12.5px;
  line-height: 1;
  color: var(--ink-2);
}

.mcell.trained {
  background: var(--grad);
  box-shadow: var(--shadow);
}

.mcell.trained .dnum {
  color: #fff;
  font-weight: 700;
}

.mark {
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  background: var(--bar-bg);
  margin-top: 2px;
}

.mcell.today {
  box-shadow: 0 0 0 1.5px var(--brand-2);
}

.mcell.sel {
  box-shadow: 0 0 0 2px var(--brand-1);
}

.day-box {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.db-title {
  font-size: 13px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.db-close {
  color: var(--brand-1);
  font-weight: 500;
  font-size: 12px;
}

.db-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.db-item:last-child {
  border-bottom: none;
}

.db-name {
  font-size: 14px;
  font-weight: 600;
}

.db-sub {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 2px;
}

.db-none {
  font-size: 12.5px;
  color: var(--ink-4);
  padding: 8px 0;
}

.arrow {
  color: var(--ink-4);
  font-size: 18px;
}
</style>
