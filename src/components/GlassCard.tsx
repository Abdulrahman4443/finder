import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/utils";

export function GlassCard({
  children,
  className,
  glow,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; glow?: boolean }) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6 shadow-panel relative overflow-hidden",
        glow && "beacon-glow",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
