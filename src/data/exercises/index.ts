import type { Equipment, Exercise, MuscleGroup } from '@/types'
import { chest } from './chest'
import { back } from './back'
import { shoulders } from './shoulders'
import { arms } from './arms'
import { legs } from './legs'
import { calves } from './calves'
import { core } from './core'
import { cardio } from './cardio'
import { warmup } from './warmup'

/** 系统内置动作库 */
export const exercises: Exercise[] = [
  ...chest,
  ...back,
  ...shoulders,
  ...arms,
  ...legs,
  ...calves,
  ...core,
  ...cardio,
  ...warmup,
]

/**
 * 用户自建动作由 store 注入。
 * 这里做成 可重注册 的注册表，`getExercise` 才能同时对内置与自建动作生效，
 * 而不必让每个页面都去查一遍 store（避免 store ↔ data 的循环依赖）。
 */
let customs: Exercise[] = []
let map = new Map<string, Exercise>()

function rebuild() {
  map = new Map([...customs, ...exercises].map((e) => [e.id, e]))
}
rebuild()

export function registerCustom(list: Exercise[]) {
  customs = list
  rebuild()
}

export function getExercise(id: string): Exercise | undefined {
  return map.get(id)
}

export function getExerciseName(id: string): string {
  return map.get(id)?.name ?? '未知动作'
}

/** 部位分组顺序，用于左侧分类栏 */
export const MUSCLE_GROUPS: MuscleGroup[] = [
  '热身',
  '拉伸',
  '有氧',
  '胸',
  '背',
  '腿',
  '肩',
  '二头',
  '三头',
  '小腿',
  '前臂',
  '臀部',
  '腹部',
]

/** 器械名称 */
export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  bodyweight: '自重',
  dumbbell: '哑铃',
  barbell: '杠铃',
  machine: '固定器械',
  cable: '龙门架',
  band: '弹力带',
  bench: '哑铃凳',
  mat: '瑜伽垫',
  kettlebell: '壶铃',
  cardio: '有氧器械',
  other: '其他',
}

/** 分类栏里「徒手」对应 bodyweight，用于动作详情副标题 */
export const EQUIPMENT_SHORT: Record<Equipment, string> = {
  ...EQUIPMENT_LABEL,
  bodyweight: '徒手',
}

/** 动作模式名称 */
export const PATTERN_LABEL: Record<string, string> = {
  push: '推',
  pull: '拉',
  squat: '蹲',
  hinge: '髋铰链',
  core: '核心',
  cardio: '有氧',
  stretch: '拉伸',
}

export const GROUP_COLOR: Record<string, string> = {
  热身: '#9CA3AF',
  拉伸: '#94A3B8',
  有氧: '#7ED321',
  胸: '#FF6B81',
  背: '#4E7FFF',
  腿: '#26C6A2',
  肩: '#FF9F43',
  二头: '#A855F7',
  三头: '#8B5CF6',
  小腿: '#5EB0EF',
  前臂: '#38BDF8',
  臀部: '#F472B6',
  腹部: '#FFB020',
}

/** 动作详情的副标题：'热身 · 徒手' */
function equipmentText(e: Exercise): string {
  const list = e.equipment.map((k) => EQUIPMENT_SHORT[k]).filter(Boolean)
  if (!list.length) return ''
  return [...new Set(list)].slice(0, 3).join('、')
}

/** 动作详情的副标题：'热身 · 徒手' */
export function subtitleOf(e: Exercise): string {
  return [e.group, equipmentText(e)].filter(Boolean).join(' · ')
}
