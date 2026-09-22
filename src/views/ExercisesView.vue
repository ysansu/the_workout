<template>
  <div class="page lib">
    <TrainTabs current="exercises" />

    <ExercisePicker
      embedded
      mode="browse"
      @detail="openDetail"
      @create="router.push('/exercises/new')"
      @more="openMenu"
    />

    <ActionSheet
      :visible="!!menuFor"
      :title="menuName"
      :items="menuItems"
      @select="onMenu"
      @close="menuFor = null"
    />

    <ConfirmDialog
      :visible="!!askingDelete"
      :title="deleteIsBuiltin ? '确定删除这个内置动作？' : '确定删除这个动作？'"
      :message="
        deleteIsBuiltin
          ? '删除后它不再出现在动作库里，已记录的训练不受影响。「设置 → 数据」里可以一键恢复全部内置动作。'
          : '删除后不可恢复，已记录的训练不受影响。'
      "
      confirm-text="删除"
      cancel-text="取消"
      danger
      @confirm="doDelete"
      @cancel="askingDelete = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import TrainTabs from '@/components/TrainTabs.vue'
import ExercisePicker from '@/components/ExercisePicker.vue'
import ActionSheet from '@/components/ActionSheet.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useExerciseStore } from '@/stores/exercise'

const router = useRouter()
const store = useExerciseStore()

function openDetail(id: string) {
  router.push('/exercises/' + id)
}

/* ---------------- 动作的「更多」操作 ---------------- */

const menuFor = ref<string | null>(null)
const askingDelete = ref<string | null>(null)

const menuName = computed(() => store.list.find((e) => e.id === menuFor.value)?.name ?? '')

const menuItems = [
  { key: 'edit', label: '编辑动作', icon: ['M16.5 4.5l3 3L8 19H5v-3L16.5 4.5Z'] },
  {
    key: 'delete',
    label: '删除动作',
    danger: true,
    icon: ['M4 7h16', 'M9.5 7V4.8h5V7', 'M6.5 7l.9 12.2h9.2L17.5 7', 'M10.5 10.5v6M13.5 10.5v6'],
  },
]

const deleteIsBuiltin = computed(() => !!askingDelete.value && store.isBuiltin(askingDelete.value))

function openMenu(id: string) {
  menuFor.value = id
}

function onMenu(key: string) {
  const id = menuFor.value
  menuFor.value = null
  if (!id) return
  if (key === 'edit') router.push('/exercises/' + id + '/edit')
  else if (key === 'delete') askingDelete.value = id
}

function doDelete() {
  const id = askingDelete.value
  askingDelete.value = null
  if (id) store.removeExercise(id)
}
</script>

<style scoped>
/* 动作库整页不滚动，内部列表自己滚；底部给 TabBar 留出位置 */
.lib {
  height: 100vh;
  padding-bottom: calc(var(--tab-h) + var(--safe-b));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
