<template>
  <div v-if="visible" class="mask" @click.self="onCancel">
    <div class="dialog">
      <div class="title">{{ title }}</div>
      <p v-if="message" class="message">{{ message }}</p>
      <button class="main" :class="{ danger: danger }" @click="$emit('confirm')">
        {{ confirmText }}
      </button>
      <button class="cancel" @click="onCancel">{{ cancelText }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    title: string
    message?: string
    confirmText?: string
    cancelText?: string
    /** 确认按钮用危险色 */
    danger?: boolean
  }>(),
  { message: '', confirmText: '确定', cancelText: '取消', danger: false },
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function onCancel() {
  emit('cancel')
}
</script>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 18, 0.45);
  z-index: 340;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  width: 78%;
  max-width: 310px;
  background: var(--card);
  border-radius: var(--r-xl);
  padding: 22px 18px 14px;
  text-align: center;
}

.title {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.message {
  font-size: 13px;
  color: var(--ink-3);
  line-height: 1.6;
  margin: 8px 0 0;
}

.main {
  display: block;
  width: 100%;
  height: 46px;
  border-radius: 12px;
  background: var(--grad);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  margin-top: 18px;
}

.main.danger {
  background: #e0483d;
}

.cancel {
  display: block;
  width: 100%;
  height: 46px;
  border-radius: 12px;
  background: var(--surface-2);
  color: var(--ink-2);
  font-size: 15px;
  margin-top: 8px;
}
</style>
