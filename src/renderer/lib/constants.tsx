import type React from 'react'
import {
  Beef,
  LayoutDashboard,
  History,
  Sparkles,
  Smile,
  Meh,
  Frown,
  SmilePlus,
  CircleX,
} from 'lucide-react'
import {
  DimensionType,
  type DimensionInfo,
  type AppState,
} from '~/shared/types'

// 情绪类型定义
export type MoodType = 'great' | 'good' | 'neutral' | 'bad' | 'terrible'

// 统一的情绪配置 - 使用圆脸表情风格图标
export const MOODS: {
  type: MoodType
  icon: React.ComponentType<{ size?: number; className?: string }>
  emoji: () => string
  color: string
  label: string
}[] = [
  {
    type: 'great',
    icon: SmilePlus,
    emoji: () => '🤩',
    color: 'text-yellow-500',
    label: '很棒',
  },
  {
    type: 'good',
    icon: Smile,
    emoji: () => '😊',
    color: 'text-green-500',
    label: '不错',
  },
  {
    type: 'neutral',
    icon: Meh,
    emoji: () => '😐',
    color: 'text-blue-500',
    label: '一般',
  },
  {
    type: 'bad',
    icon: Frown,
    emoji: () => '😞',
    color: 'text-orange-500',
    label: '不好',
  },
  {
    type: 'terrible',
    icon: CircleX,
    emoji: () => '😭',
    color: 'text-red-500',
    label: '很糟',
  },
]

export const DIMENSIONS: DimensionInfo[] = [
  {
    type: DimensionType.FUEL,
    label: '饮食 (饮食营养)',
    icon: 'Beef',
    color: '#FF5733',
  },
  {
    type: DimensionType.PHYSICAL,
    label: '运动 (身体健康)',
    icon: 'Dumbbell',
    color: '#33FF57',
  },
  {
    type: DimensionType.INTELLECTUAL,
    label: '认知 (知识学习)',
    icon: 'BookOpen',
    color: '#3357FF',
  },
  {
    type: DimensionType.OUTPUT,
    label: '产出 (工作效能)',
    icon: 'Zap',
    color: '#F333FF',
  },
  {
    type: DimensionType.DREAM,
    label: '梦想 (恢复/睡眠)',
    icon: 'Moon',
    color: '#33FFF3',
  },
  {
    type: DimensionType.ASSET,
    label: '财务 (资产管理)',
    icon: 'Wallet',
    color: '#FFD700',
  },
  {
    type: DimensionType.CONNECTION,
    label: '社交 (人际链接)',
    icon: 'Users',
    color: '#FF33A1',
  },
  {
    type: DimensionType.ENVIRONMENT,
    label: '环境 (居住空间)',
    icon: 'TreePine',
    color: '#2E8B57',
  },
]

export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: '全局总览',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { id: 'fuel', label: '饮食系统', icon: <Beef className="w-5 h-5" /> },
  { id: 'journal', label: '生活日记', icon: <Sparkles className="w-5 h-5" /> },
  { id: 'timeline', label: '时间轴', icon: <History className="w-5 h-5" /> },
]

// 16 种 MBTI 人格类型
export const MBTI_TYPES = [
  { value: 'INTJ', label: 'INTJ', description: '建筑师型' },
  { value: 'INTP', label: 'INTP', description: '逻辑学家型' },
  { value: 'ENTJ', label: 'ENTJ', description: '指挥官型' },
  { value: 'ENTP', label: 'ENTP', description: '辩论家型' },
  { value: 'INFJ', label: 'INFJ', description: '提倡者型' },
  { value: 'INFP', label: 'INFP', description: '调停者型' },
  { value: 'ENFJ', label: 'ENFJ', description: '主人公型' },
  { value: 'ENFP', label: 'ENFP', description: '竞选者型' },
  { value: 'ISTJ', label: 'ISTJ', description: '物流师型' },
  { value: 'ISFJ', label: 'ISFJ', description: '守卫者型' },
  { value: 'ESTJ', label: 'ESTJ', description: '总经理型' },
  { value: 'ESFJ', label: 'ESFJ', description: '执政官型' },
  { value: 'ISTP', label: 'ISTP', description: '鉴赏家型' },
  { value: 'ISFP', label: 'ISFP', description: '探险家型' },
  { value: 'ESTP', label: 'ESTP', description: '企业家型' },
  { value: 'ESFP', label: 'ESFP', description: '表演者型' },
]

const _now = Date.now()
const _oneDay = 24 * 60 * 60 * 1000

export const INITIAL_STATE: AppState = {
  user: {
    name: '',
    birthday: '',
    mbti: '',
    values: [],
    lifespan: 0,
  },
  dimensions: {
    [DimensionType.FUEL]: 80,
    [DimensionType.PHYSICAL]: 65,
    [DimensionType.INTELLECTUAL]: 90,
    [DimensionType.OUTPUT]: 70,
    [DimensionType.RECOVERY]: 60,
    [DimensionType.ASSET]: 55,
    [DimensionType.CONNECTION]: 75,
    [DimensionType.ENVIRONMENT]: 85,
  },
  fuelSystem: {
    baseline: '',
    deviations: [],
  },
  journals: [],
  isLocked: true, // Default to locked for security demo
  theme: 'auto',
  language: 'zh',
  aiConfig: {
    provider: 'DeepSeek',
    apiKey: '',
    modelName: 'deepseek-chat',
    frequencyLimit: 10,
  },
  systemConfig: {
    autoSaveInterval: 60,
    notificationsEnabled: true,
  },
}
