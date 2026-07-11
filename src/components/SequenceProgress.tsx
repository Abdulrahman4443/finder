import { motion } from "framer-motion";
import { GlassCard } from "./GlassCard";

export type Step = "idle" | "report" | "matching" | "verify" | "connect" | "chat" | "recovered";

export const STEP_ORDER: Step[] = ["report", "matching", "verify", "connect", "chat", "recovered"];

export const STEP_LABEL: Record<Step, string> = {
  idle: "Ready",
  report: "Report filed",
  matching: "AI matching…",
  verify: "Verifying identity",
  connect: "Secure channel opened",
  chat: "In-app chat live",
  recovered: "Item recovered",
};

export function SequenceProgress({ step }: { step: Step }) {
  const progressIdx = step === "idle" ? -1 : STEP_ORDER.indexOf(step);
  const progressPct = step === "idle" ? 0 : ((progressIdx + 1) / STEP_ORDER.length) * 100;

  return (
    <GlassCard className="mb-6 p-6">
      <div className="flex justify-between text-xs mb-3">
        <span className="text-muted-foreground">Sequence Status</span>
        <span className="mono text-gold font-semibold">{STEP_LABEL[step]}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full gold-gradient"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <div className="mt-4 flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
        {STEP_ORDER.map((s, i) => (
          <span key={s} className={i <= progressIdx ? "text-gold font-medium" : "opacity-50"}>
            {s}
          </span>
        ))}
      </div>
    </GlassCard>
  );
}
