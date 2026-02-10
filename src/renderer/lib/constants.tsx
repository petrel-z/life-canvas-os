import React from "react";
import {
  Beef,
  Dumbbell,
  BookOpen,
  Zap,
  Moon,
  Wallet,
  Users,
  TreePine,
  LayoutDashboard,
  Settings,
  History,
  Sparkles,
  Heart,
  Smile,
  Meh,
  Frown,
} from "lucide-react";
import { DimensionType, DimensionInfo, AppState } from "~/shared/types";

// 情绪类型定义
export type MoodType = "great" | "good" | "neutral" | "bad" | "terrible";

// 统一的情绪配置
export const MOODS: {
  type: MoodType;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  emoji: () => string;
  color: string;
  label: string;
}[] = [
  {
    type: "great",
    icon: Heart,
    emoji: () => "💖",
    color: "text-pink-500",
    label: "很棒",
  },
  {
    type: "good",
    icon: Smile,
    emoji: () => "😊",
    color: "text-green-500",
    label: "不错",
  },
  {
    type: "neutral",
    icon: Meh,
    emoji: () => "😐",
    color: "text-yellow-500",
    label: "一般",
  },
  {
    type: "bad",
    icon: Frown,
    emoji: () => "😞",
    color: "text-orange-500",
    label: "不好",
  },
  {
    type: "terrible",
    icon: Frown,
    emoji: () => "😢",
    color: "text-red-500",
    label: "很糟",
  },
];

export const DIMENSIONS: DimensionInfo[] = [
  {
    type: DimensionType.FUEL,
    label: "饮食 (饮食营养)",
    icon: "Beef",
    color: "#FF5733",
  },
  {
    type: DimensionType.PHYSICAL,
    label: "运动 (身体健康)",
    icon: "Dumbbell",
    color: "#33FF57",
  },
  {
    type: DimensionType.INTELLECTUAL,
    label: "认知 (知识学习)",
    icon: "BookOpen",
    color: "#3357FF",
  },
  {
    type: DimensionType.OUTPUT,
    label: "产出 (工作效能)",
    icon: "Zap",
    color: "#F333FF",
  },
  {
    type: DimensionType.RECOVERY,
    label: "梦想 (恢复/睡眠)",
    icon: "Moon",
    color: "#33FFF3",
  },
  {
    type: DimensionType.ASSET,
    label: "财务 (资产管理)",
    icon: "Wallet",
    color: "#FFD700",
  },
  {
    type: DimensionType.CONNECTION,
    label: "社交 (人际链接)",
    icon: "Users",
    color: "#FF33A1",
  },
  {
    type: DimensionType.ENVIRONMENT,
    label: "环境 (居住空间)",
    icon: "TreePine",
    color: "#2E8B57",
  },
];

export const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "全局总览",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  { id: "fuel", label: "饮食系统", icon: <Beef className="w-5 h-5" /> },
  { id: "journal", label: "生活日记", icon: <Sparkles className="w-5 h-5" /> },
  { id: "timeline", label: "时间轴", icon: <History className="w-5 h-5" /> },
  { id: "settings", label: "系统设置", icon: <Settings className="w-5 h-5" /> },
];

const now = Date.now();
const oneDay = 24 * 60 * 60 * 1000;

export const INITIAL_STATE: AppState = {
  user: {
    name: "画布用户",
    birthday: "1995-01-01",
    mbti: "INTJ",
    values: ["自由", "成长", "健康"],
    lifespan: 85,
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
    baseline: "早餐：燕麦片与煎蛋。午餐：沙拉与鸡胸肉。晚餐：优质蛋白与蔬菜。",
    deviations: [
      {
        id: "dev-1",
        timestamp: now - 3600000, // 1小时前
        description: "加班太累，忍不住点了一份超大份麻辣烫作为宵夜。",
        type: "excess",
      },
      {
        id: "dev-2",
        timestamp: now - oneDay - 14400000, // 昨天傍晚
        description: "朋友生日聚会，吃了三块奶油蛋糕和大量炸鸡。",
        type: "excess",
      },
    ],
  },
  journals: [
    {
      id: "j-1",
      timestamp: now,
      content:
        "今天完成了 Life Canvas OS 的初步构建。看着那些雷达图，我第一次感觉到生活是可以被这样优雅地量化的。",
      mood: "great",
      tags: ["成就感", "OS"],
      attachments: [],
    },
    {
      id: "j-2",
      timestamp: now - oneDay,
      content:
        "阴雨天。在咖啡馆读完了《反脆弱》。书里提到的系统冗余和压力测试，其实在个人成长模型中也同样适用。",
      mood: "good",
      tags: ["阅读", "思考"],
      attachments: [],
    },
    {
      id: "j-3",
      timestamp: now - 2 * oneDay,
      content:
        "感觉最近的工作产出进入了瓶颈期。也许我需要调整一下 Output 维度的评价指标，不要只关注时长，而要关注深度的结果。",
      mood: "neutral",
      tags: ["复盘"],
      attachments: [],
    },
  ],
  isLocked: true, // Default to locked for security demo
  theme: "auto",
  language: "zh",
  aiConfig: {
    provider: "DeepSeek",
    apiKey: "",
    frequencyLimit: 10,
  },
  systemConfig: {
    autoSaveInterval: 60,
    notificationsEnabled: true,
  },
};
