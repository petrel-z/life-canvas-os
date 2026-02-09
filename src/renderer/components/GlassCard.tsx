import React from "react";
import { cn } from "~/renderer/lib/utils";

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function GlassCard({
  children,
  className,
  onClick,
  title,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "liquid-glass rounded-2xl p-6 transition-all duration-300 hover:border-apple-accent/20 dark:hover:border-white/20 group",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
    >
      {title && (
        <h3 className="text-apple-textTer dark:text-white/60 text-xs font-semibold uppercase tracking-wider mb-4">
          {title}
        </h3>
      )}
      <div className="text-apple-textMain dark:text-white">{children}</div>
    </div>
  );
}
