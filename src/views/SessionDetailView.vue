<template>
  <div class="page" v-if="s">
    <div class="page-head">
      <div class="back" @click="$router.back()">‹</div>
      <h1>{{ s.name }}</h1>
      <div class="sub">{{ s.date }} · {{ Math.round((s.durationSec || 0) / 60) }} 分钟 · {{ totalSets }} 组</div>
    </div>

    <div class="body-pad" style="margin-top: 12px">
      <div class="stat-grid c2">
        <div class="stat-box">
          <div class="v">{{ volume }}<small>kg</small></div>
          <div class="k">总容量</div>
        </div>
        <div class="stat-box">
          <div class="v">{{ s.entries.length }}</div>
          <div class="k">动作数</div>
        </div>
      </div>

      <div v-for="(e, i) in s.entries" :key="i" class="card">
        <div class="card-title">
          <span @click="$router.push('/exercises/' + e.exerciseId)">
            {{ getExerciseName(e.exerciseId) }} ›
          </span>
          <span class="more">{{ entryVolume(e) }} kg</span>
        </div>
        <div class="sets">
          <span v-for="(set, j) in e.sets" :key="j" class="set-chip">
            {{ fmtSet(set) }}
          </span>
        </div>
      </div>

      <button class="del" @click="remove">删除这次记录</button>
    </div>
  </div>
  <div v-else class="empty" style="padding-top: 80px"><div class="t">记录不存在</div></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getExerciseName } from '@/data/exercises'
import { useSessionStore } from '@/stores/session'
import { entryVolume, sessionSets, sessionVolume } from '@/utils/stats'
import { fmtSet } from '@/utils/num'

const route = useRoute()
const router = useRouter()
const sessionStore = useSessionStore()

const s = computed(() => sessionStore.sessions.find((x) => x.id === route.params.id))
const volume = computed(() => (s.value ? sessionVolume(s.value) : 0))
const totalSets = computed(() => (s.value ? sessionSets(s.value) : 0))

function remove() {
  if (!s.value) return
  if (!confirm('确定删除这次训练记录？')) return
  sessionStore.deleteSession(s.value.id)
  router.replace('/records')
}
</script>

<style scoped>
.back {
  font-size: 30px;
  line-height: 1;
  margin-bottom: 4px;
  position: relative;
  z-index: 1;
  width: 26px;
}

.sets {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.set-chip {
  background: var(--brand-soft);
  color: var(--brand-1);
  font-size: 13.5px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 10px;
}

.set-chip small {
  font-size: 10px;
  font-weight: 500;
  margin: 0 1px;
}

.del {
  width: 100%;
  margin-top: 8px;
  color: var(--ink-3);
  font-size: 13px;
  text-decoration: underline;
  padding: 10px;
}
</style>
