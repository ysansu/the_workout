/** 器械 */
export type Equipment =
  | 'bodyweight' // 自重
  | 'dumbbell' // 哑铃
  | 'barbell' // 杠铃
  | 'machine' // 固定器械
  | 'cable' // 龙门架/绳索
  | 'band' // 弹力带
  | 'bench' // 哑铃凳
  | 'mat' // 瑜伽垫
  | 'kettlebell' // 壶铃
  | 'cardio' // 有氧器械
  | 'other'

/** 动作模式 */
export type Pattern = 'push' | 'pull' | 'squat' | 'hinge' | 'core' | 'cardio' | 'stretch'

/**
 * 部位 / 肌群分组。
 * ① 库中没有斜方肌孤立动作；② 不单练斜方肌（避免上斜方肥大、脖子显短）。
 * 因此合并为 13 类，不单列斜方肌。
 */
export type MuscleGroup =
  | '热身'
  | '拉伸'
  | '有氧'
  | '胸'
  | '背'
  | '腿'
  | '肩'
  | '二头'
  | '三头'
  | '小腿'
  | '前臂'
  | '臀部'
  | '腹部'

/** 训练目标 */
export type Goal = 'fatloss' | 'muscle' | 'strength' | 'health'

/**
 * 强度单位。
 * kg      → 强度=重量(kg)，另需次数
 * rm      → 强度=RM 值
 * reps    → 强度=次数（自重动作）
 * sec     → 强度=时长(秒)
 * min     → 强度=时长(分钟)
 * failure → 力竭，不填任何数值，也不填次数
 */
export type IntensityUnit = 'kg' | 'rm' | 'reps' | 'sec' | 'min' | 'failure'

/**
 * 数值字段。正常是数字，但允许 '8-12' / '力竭' / '10 / 侧' 这类写法，
 * 避免为了迁就输入框而丢掉计划里的区间与提示。
 */
export type NumText = number | string

export interface Exercise {
  id: string
  name: string
  en: string
  /** 主肌群 */
  primary: string[]
  /** 次要肌群 */
  secondary: string[]
  equipment: Equipment[]
  pattern: Pattern
  /** 部位分组 */
  group: MuscleGroup
  /** 是否单侧动作 */
  unilateral?: boolean
  /** 难度 1-5 */
  difficulty: number
  /** 默认组间休息（秒） */
  rest: number
  /** 动作要点 */
  cues: string[]
  /** 常见错误 */
  mistakes: string[]
  /** 是否必须健身房器械 */
  gym?: boolean

  /* ---------- 可选扩展字段；缺省则不渲染对应分区 ---------- */

  /** 动作步骤（按顺序编号展示） */
  steps?: string[]
  /** 呼吸节奏 */
  breathing?: string
  /** 动作感觉 */
  feel?: string
  /** 示范图 / 封面（IndexedDB 中的 key，第一张作为封面） */
  images?: string[]
  /** 用户自建动作 */
  custom?: boolean
  /** 已收藏 */
  favorite?: boolean
}

/** 计划中的一条动作（对应「添加动作」面板的四个字段） */
export interface PlanItem {
  exerciseId: string
  /** 组数 */
  sets: number
  /** 强度单位 */
  unit: IntensityUnit
  /** 强度主值：kg → 重量；rm → RM；reps → 次数；sec/min → 时长 */
  strength: NumText
  /** 每组次数，仅 kg 单位使用 */
  reps?: NumText
  /** 组休秒数 */
  rest: number
  /** 备注 */
  note?: string
}

export interface PlanDay {
  id: string
  /** 训练日名称，如「胸」「A · 上肢推」 */
  name: string
  /** weekly 模式：1=周一 … 7=周日；cycle 模式：留空，按数组顺序即第 1/2/3 天 */
  weekday?: number
  items: PlanItem[]
}

/** 计划的排布方式 */
export type PlanSchedule =
  /** 按周：每个训练日绑定星期几 */
  | 'weekly'
  /** 周期：自定义几天为一组，第 1 天、第 2 天……循环 */
  | 'cycle'

export interface Plan {
  id: string
  name: string
  desc: string
  goal: Goal
  level: 'beginner' | 'intermediate' | 'advanced'
  /** 排布方式 */
  schedule: PlanSchedule
  daysPerWeek: number
  equipment: Equipment[]
  days: PlanDay[]
  /** 是否系统预置 */
  builtin?: boolean
  /** 计划封面（可选） */
  cover?: string
}

/** 一组实绩 */
export interface SetEntry {
  /** 强度单位，与所属动作的 PlanItem 一致 */
  unit: IntensityUnit
  /** 主值：kg → 重量；rm → RM；reps → 次数；sec/min → 时长 */
  value: NumText
  /** 仅 kg 单位：实际次数 */
  reps?: NumText
  done?: boolean
  at?: number
}

export interface SessionEntry {
  exerciseId: string
  sets: SetEntry[]
}

export interface Session {
  id: string
  date: string // YYYY-MM-DD
  planId?: string
  planDayIndex?: number
  planDayId?: string
  name: string
  startAt: number
  endAt?: number
  durationSec?: number
  entries: SessionEntry[]
  note?: string
}

/** 组休提示方式 */
export type RestAlert = 'sound' | 'vibrate' | 'both' | 'none'
/** 计时器规则 */
export type TimerRule = 'countup' | 'countdown'
/** 外观主题 */
export type ThemeMode = 'light' | 'dark'

export interface UserProfile {
  name: string
  gender: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  /** 可用器械（决定筛选与计划生成） */
  equipment: Equipment[]
  /** 哑铃可选档位 kg */
  dumbbellSteps: number[]
  weeklyGoal: number

  /* ---------- 训练设置 ---------- */
  /** 组休提示方式 */
  restAlert: RestAlert
  /** 时间型训练是否开启计时器 */
  timerEnabled: boolean
  /** 计时器规则 */
  timerRule: TimerRule

  /* ---------- 外观 ---------- */
  /** 日间 / 夜间模式，默认日间 */
  theme: ThemeMode
}

/** 某个动作的历史最佳 */
export interface PR {
  exerciseId: string
  unit: IntensityUnit
  value: number
  reps: number
  date: string
  volume: number
}
