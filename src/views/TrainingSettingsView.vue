<template>
  <div class="page plain">
    <header class="bar">
      <button class="back" @click="$router.back()" aria-label="返回">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <h1>训练设置</h1>
      <span class="sp" />
    </header>

    <div class="body">
      <div class="sec-label">组休设置</div>

      <div class="card">
        <div class="row-t">组休提示类型</div>
        <div class="chips">
          <button
            v-for="o in alertOptions"
            :key="o.value"
            class="chip"
            :class="{ on: profile.restAlert === o.value }"
            @click="update({ restAlert: o.value })"
          >
            {{ o.label }}
          </button>
        </div>
      </div>

      <div class="card">
        <div class="row-t">
          组休提示音
          <button class="try" @click="preview()">
            试听
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 9.5h3l4-3.5v12l-4-3.5H4z" />
              <path d="M15.5 9a4 4 0 0 1 0 6" />
              <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
            </svg>
          </button>
        </div>
        <p class="fixed-sound">闹钟滴滴声（滴三下 · 停 1.5 秒，共三轮）</p>
      </div>

      <div class="sec-label">时间计时器设置</div>

      <div class="card">
        <div class="row-t">时间型训练是否开启计时器</div>
        <div class="chips two">
          <button
            class="chip"
            :class="{ on: profile.timerEnabled }"
            @click="update({ timerEnabled: true })"
          >
            开启
          </button>
          <button
            class="chip"
            :class="{ on: !profile.timerEnabled }"
            @click="update({ timerEnabled: false })"
          >
            关闭
          </button>
        </div>
      </div>

      <div class="card" :class="{ dim: !profile.timerEnabled }">
        <div class="row-t">计时器规则</div>
        <div class="chips two">
          <button
            class="chip"
            :class="{ on: profile.timerRule === 'countup' }"
            @click="update({ timerRule: 'countup' })"
          >
            正计时
          </button>
          <button
            class="chip"
            :class="{ on: profile.timerRule === 'countdown' }"
            @click="update({ timerRule: 'countdown' })"
          >
            倒计时
          </button>
        </div>
      </div>

      <p class="hint">
        组休提示音在训练中生效：勾选一组后开始计时，到点按这里的设置提醒你。
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RestAlert } from '@/types'
import { useUserStore } from '@/stores/user'
import { playRestSound, vibrateRest } from '@/utils/sound'

const userStore = useUserStore()
const profile = computed(() => userStore.profile)
const update = userStore.update

const alertOptions: { value: RestAlert; label: string }[] = [
  { value: 'sound', label: '声音' },
  { value: 'vibrate', label: '振动' },
  { value: 'both', label: '声音加振动' },
  { value: 'none', label: '不提示' },
]

/**
 * 试听：模拟组休到点的效果。
 * 声音始终播（这支按钮的作用就是确认音效本身），震动按「提示类型」决定 ——
 * 选了振动类就能顺便验证震动与声音是否对得上拍。
 */
function preview() {
  playRestSound()
  if (profile.value.restAlert === 'vibrate' || profile.value.restAlert === 'both') vibrateRest()
}
</script>

<style scoped>
.page.plain {
  background: var(--card);
  padding-bottom: 32px;
}

.bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 40px 1fr 40px;
  align-items: center;
  height: calc(48px + env(safe-area-inset-top, 0px));
  padding-top: env(safe-area-inset-top, 0px);
  background: var(--card);
}

.back {
  width: 40px;
  height: 40px;
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
  font-size: 16px;
  font-weight: 600;
}

.body {
  padding-top: 4px;
}

.sec-label {
  padding: 14px 16px 8px;
  font-size: 12.5px;
  color: var(--ink-3);
}

.card {
  background: var(--card);
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  transition: opacity 0.15s;
}

.card.dim {
  opacity: 0.45;
  pointer-events: none;
}

.row-t {
  font-size: 14.5px;
  color: var(--ink-1);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.try {
  font-size: 12.5px;
  color: var(--ink-3);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.try svg {
  width: 15px;
  height: 15px;
}

/* 音效只剩一种，不用选了，直接标出来 */
.fixed-sound {
  font-size: 13px;
  color: var(--ink-3);
  margin-top: -4px;
}

.chips {
  display: flex;
  gap: 6px;
}

.chip {
  flex: 1;
  height: 36px;
  border-radius: 18px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 13.5px;
  white-space: nowrap;
}

.chip.on {
  background: var(--grad);
  color: #fff;
  font-weight: 600;
}

.hint {
  padding: 16px;
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.6;
}
</style>
