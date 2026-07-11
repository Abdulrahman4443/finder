import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

export function MatchScoreRing({
  score,
  size = 176,
  stroke = 10,
  duration = 1.4,
  showPulse = true,
}: {
  score: number;
  size?: number;
  stroke?: number;
  duration?: number;
  showPulse?: boolean;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDone(false);
    const controls = animate(count, score, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
      onComplete: () => setDone(true),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = useTransform(rounded, (v) => (v / 100) * circ);

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--panel-border)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ strokeDashoffset: useTransform(dash, (d) => circ - d) }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-display font-bold text-gold leading-none"
          style={{ fontSize: size * 0.32 }}
        >
          {display}
          <span style={{ fontSize: size * 0.14 }}>%</span>
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          match
        </div>
      </div>
      {showPulse && done && (
        <>
          <span key="p1" className="beacon-ring" />
          <span key="p2" className="beacon-ring" style={{ animationDelay: "0.6s" }} />
        </>
      )}
    </div>
  );
}
