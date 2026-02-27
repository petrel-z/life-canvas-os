import { cn } from './utils';

// 页面动画
export const PAGE_ANIMATION = "animate-in fade-in slide-in-from-bottom-4 duration-700";

// 文本颜色
export const textStyles = {
  primary: "text-apple-textMain dark:text-white",
  secondary: "text-apple-textSec dark:text-white/40",
  tertiary: "text-apple-textTer dark:text-white/30",
} as const;

// 背景样式
export const bgStyles = {
  input: "bg-black/5 dark:bg-white/5",
  card: "bg-black/5 dark:bg-white/5",
  hover: "hover:bg-black/10 dark:hover:bg-white/10",
} as const;

// 边框样式
export const borderStyles = {
  default: "border border-apple-border dark:border-white/10",
  thick: "border border-apple-border dark:border-white/5",
} as const;

// 预定义的样式组合
export const inputStyles = cn(
  bgStyles.input,
  borderStyles.default,
  textStyles.primary,
  "focus:outline-none focus:ring-2 focus:ring-apple-accent/30"
);

export const cardStyles = cn(
  bgStyles.card,
  borderStyles.thick,
  "rounded-xl"
);
