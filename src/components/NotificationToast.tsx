import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, ShieldAlert } from "lucide-react";

type Tone = "gold" | "verify" | "alert";
type Toast = { id: number; title: string; body?: string; tone?: Tone };

let pushImpl: ((t: Omit<Toast, "id">) => void) | null = null;
export function pushToast(t: Omit<Toast, "id">) {
  pushImpl?.(t);
}

const TONE_ICON: Record<Tone, typeof BellRing> = {
  gold: BellRing,
  verify: CheckCircle2,
  alert: ShieldAlert,
};

export function NotificationHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => {
    pushImpl = (t) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-3), { id, ...t }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4500);
    };
    return () => {
      pushImpl = null;
    };
  }, []);

  return (
    <div className="fixed top-20 right-4 z-[80] flex w-80 flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => {
          const tone = t.tone ?? "gold";
          const Icon = TONE_ICON[tone];
          const iconCls =
            tone === "verify"
              ? "bg-verify/15 text-verify"
              : tone === "alert"
                ? "bg-destructive/15 text-destructive"
                : "gold-gradient text-primary-foreground";
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              className="glass-strong pointer-events-auto relative overflow-hidden rounded-xl border border-panel-border p-4 shadow-panel"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconCls}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{t.title}</div>
                  {t.body && <div className="mt-0.5 text-xs text-muted-foreground">{t.body}</div>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
