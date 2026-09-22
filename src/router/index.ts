import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

/**
 * meta.tab === false 的页面不显示底部导航。
 * 用 meta 而不是写死路径列表 —— 后者在改路由时极易漏改（之前就漏过）。
 */
const noTab = { tab: false }

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/train' },

  /* 训练 */
  { path: '/train', name: 'train', component: () => import('@/views/TrainView.vue') },
  {
    path: '/train/start',
    name: 'run-preview',
    meta: noTab,
    component: () => import('@/views/RunPreviewView.vue'),
  },
  {
    path: '/train/run',
    name: 'run',
    meta: noTab,
    component: () => import('@/views/RunView.vue'),
  },
  {
    path: '/train/summary/:id',
    name: 'summary',
    meta: noTab,
    component: () => import('@/views/SummaryView.vue'),
  },

  /* 动作库 */
  {
    path: '/exercises',
    name: 'exercises',
    component: () => import('@/views/ExercisesView.vue'),
  },
  {
    path: '/exercises/new',
    name: 'exercise-new',
    meta: noTab,
    component: () => import('@/views/ExerciseEditView.vue'),
  },
  {
    path: '/exercises/:id/edit',
    name: 'exercise-edit',
    meta: noTab,
    component: () => import('@/views/ExerciseEditView.vue'),
  },
  {
    path: '/exercises/:id',
    name: 'exercise-detail',
    meta: noTab,
    component: () => import('@/views/ExerciseDetailView.vue'),
  },

  /* 计划 */
  { path: '/plans', name: 'plans', component: () => import('@/views/PlansView.vue') },
  {
    path: '/plans/new/custom',
    name: 'plan-new',
    meta: noTab,
    component: () => import('@/views/PlanEditView.vue'),
  },
  {
    path: '/plans/:id/edit',
    name: 'plan-edit',
    meta: noTab,
    component: () => import('@/views/PlanEditView.vue'),
  },
  {
    path: '/plans/:id/days/:dayId',
    name: 'plan-day-edit',
    meta: noTab,
    component: () => import('@/views/PlanDayEditView.vue'),
  },
  {
    path: '/plans/:id',
    name: 'plan-detail',
    meta: noTab,
    component: () => import('@/views/PlanDetailView.vue'),
  },

  /* 记录 */
  { path: '/records', name: 'records', component: () => import('@/views/RecordsView.vue') },
  {
    path: '/records/:id',
    name: 'session-detail',
    meta: noTab,
    component: () => import('@/views/SessionDetailView.vue'),
  },

  /* 设置 */
  {
    path: '/settings',
    name: 'settings',
    meta: noTab,
    component: () => import('@/views/SettingsView.vue'),
  },
  {
    path: '/settings/training',
    name: 'training-settings',
    meta: noTab,
    component: () => import('@/views/TrainingSettingsView.vue'),
  },
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
