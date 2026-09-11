import type { ReactNode } from "react";

interface DarkGradientBgProps {
  children: ReactNode;
  className?: string;
}

/**
 * A low-cost ambient surface for dark product pages. Its animation is isolated
 * to CSS transforms and is disabled for people who prefer reduced motion.
 */
export function DarkGradientBg({ children, className }: DarkGradientBgProps) {
  return (
    <div className={`dark-gradient-bg ${className ?? ""}`.trim()}>
      <div className="dark-gradient-bg__aurora" aria-hidden />
      <div className="dark-gradient-bg__streaks" aria-hidden />
      <div className="dark-gradient-bg__grain" aria-hidden />
      <div className="dark-gradient-bg__content">{children}</div>
    </div>
  );
}
