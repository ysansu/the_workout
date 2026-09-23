import type { Plan } from '@/types'

/**
 * 首次启动时装入「我的计划」的初始内容。
 *
 * 只放一份起始计划：上肢推 / 上肢拉 / 下肢与核心，一期 3 练按周期循环。
 * 装进去之后就是用户自己的计划，可自由增删改。
 *
 * 用之前按自己情况调一遍：
 * - 重量先从「能标准完成 10-12 次」的档位起步，别照抄别人
 * - 上肢推类重量顶到器材上限时，改靠「组数 + 次数」渐进
 * - 下肢与核心普遍是短板，安排里已经加重了占比
 */
export const seedPlans: Plan[] = [
  {
    id: 'starter',
    name: '上下肢三分化',
    desc: '上肢推 / 上肢拉 / 下肢与核心三条循环，第 4 天休息（练三休一）。先保动作质量，再谈重量。',
    goal: 'muscle',
    level: 'beginner',
    schedule: 'cycle',
    daysPerWeek: 3,
    equipment: ['dumbbell', 'bench', 'mat', 'band'],
    days: [
      {
        id: 'starter-a',
        name: 'A · 上肢推（胸 / 肩 / 肱三）',
        items: [
          { exerciseId: 'scapular-push-up', sets: 2, unit: 'reps', strength: 12, rest: 30, note: '肩胛激活，不必力竭' },
          { exerciseId: 'band-pull-apart', sets: 2, unit: 'reps', strength: 15, rest: 30, note: '激活后束、防圆肩' },
          { exerciseId: 'db-bench-press', sets: 4, unit: 'kg', strength: 20, reps: '10-12', rest: 120, note: '12 次做满 4 组后先加次数到 15' },
          { exerciseId: 'db-incline-press', sets: 3, unit: 'kg', strength: 15, reps: '10-12', rest: 90 },
          { exerciseId: 'seated-db-press', sets: 3, unit: 'kg', strength: 20, reps: '10', rest: 90 },
          { exerciseId: 'db-lateral-raise', sets: 3, unit: 'kg', strength: 6, reps: '15', rest: 45, note: '全程沉肩；次数加满 20 再考虑加重量' },
          { exerciseId: 'overhead-db-extension', sets: 3, unit: 'kg', strength: 9, reps: '12', rest: 60 },
          { exerciseId: 'push-up', sets: 2, unit: 'failure', strength: 0, rest: 60, note: '收尾，做到动作变形即停' },
        ],
      },
      {
        id: 'starter-b',
        name: 'B · 上肢拉（背 / 后束 / 肱二）',
        items: [
          { exerciseId: 'cat-cow', sets: 1, unit: 'reps', strength: 8, rest: 30 },
          { exerciseId: 'band-pull-apart', sets: 2, unit: 'reps', strength: 15, rest: 30 },
          { exerciseId: 'single-arm-db-row', sets: 4, unit: 'kg', strength: 10, reps: '10-12', rest: 90, note: '全程不要耸肩' },
          { exerciseId: 'db-bent-over-row', sets: 3, unit: 'kg', strength: 10, reps: '12', rest: 90 },
          { exerciseId: 'bent-over-reverse-fly', sets: 3, unit: 'kg', strength: 6, reps: '15', rest: 45, note: '肘部微屈固定，靠肩胛后缩发力' },
          { exerciseId: 'prone-y-raise', sets: 3, unit: 'kg', strength: 3, reps: '15', rest: 45, note: '防圆肩关键动作，重点是压肩胛不是提肩' },
          { exerciseId: 'face-pull', sets: 3, unit: 'kg', strength: 6, reps: '15', rest: 45 },
          { exerciseId: 'hammer-curl', sets: 3, unit: 'kg', strength: 7.5, reps: '12', rest: 45 },
        ],
      },
      {
        id: 'starter-c',
        name: 'C · 下肢 + 核心（重点补短板）',
        items: [
          { exerciseId: 'worlds-greatest-stretch', sets: 1, unit: 'reps', strength: 6, rest: 30, note: '每侧' },
          { exerciseId: 'hip-flexor-stretch', sets: 1, unit: 'sec', strength: 30, rest: 30, note: '每侧；久坐必做' },
          { exerciseId: 'goblet-squat', sets: 4, unit: 'kg', strength: 10, reps: '10-12', rest: 120, note: '动作质量优先' },
          { exerciseId: 'step-up', sets: 3, unit: 'reps', strength: 10, rest: 75, note: '每侧；家里有台阶即可，上方腿主动发力' },
          { exerciseId: 'single-leg-hip-thrust', sets: 3, unit: 'reps', strength: 12, rest: 60, note: '每侧；骨盆保持水平，这是难点' },
          { exerciseId: 'romanian-deadlift', sets: 3, unit: 'kg', strength: 10, reps: '12', rest: 90, note: '哑铃版，感受腘绳肌拉伸' },
          { exerciseId: 'plank', sets: 3, unit: 'sec', strength: '30-45', rest: 45, note: '撑不住就缩短时间，绝不塌腰硬撑' },
          { exerciseId: 'dead-bug', sets: 3, unit: 'reps', strength: 10, rest: 45, note: '每侧；后腰全程压紧地面' },
          { exerciseId: 'standing-calf-raise', sets: 3, unit: 'reps', strength: 15, rest: 30 },
        ],
      },
      {
        id: 'starter-d',
        name: 'D · 休息日',
        rest: true,
        items: [],
      },
    ],
  },
]
