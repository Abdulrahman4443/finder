import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { RadioTower, Send, Siren } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { pushToast } from "../components/NotificationToast";
import { addBroadcast, makeId, pushNotification, useNetworkState } from "../lib/store";
import { useAuth } from "../hooks/useAuth";
import { categoryDef } from "../lib/categories";
import { timeAgo, formatKm } from "../lib/format";
import type { Category } from "../lib/types";

export const Route = createFileRoute("/broadcast")({
  component: Broadcast,
  head: () => ({ meta: [{ title: "City Broadcast · FindrAI" }] }),
});

function Broadcast() {
  const { broadcasts } = useNetworkState();
  const { user, displayName, setAuthModalOpen } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);

  const reach = useMemo(() => Math.round(240 * radiusKm * (urgent ? 1.4 : 1)), [radiusKm, urgent]);

  const send = () => {
    if (!title.trim()) return;
    if (!user) {
      setAuthModalOpen(true);
      pushToast({
        title: "Sign in to broadcast",
        body: "Broadcasts are tied to verified accounts.",
      });
      return;
    }
    const category: Category = urgent ? "person" : "other";
    addBroadcast({
      id: makeId("b"),
      author: displayName,
      category,
      title: title.trim(),
      body: body.trim(),
      at: new Date().toISOString(),
      distanceKm: 0,
      urgent,
    });
    pushNotification({
      title: "Broadcast dispatched",
      body: `${title.trim()} · ~${reach} nearby users notified`,
    });
    setTitle("");
    setBody("");
    setUrgent(false);
    pushToast({
      title: "Broadcast sent",
      body: `Opt-in users within ${radiusKm} km are being notified.`,
      tone: "verify",
    });
  };

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
          <RadioTower className="h-4 w-4" /> City feed
        </div>
        <h1 className="mb-2 font-display text-3xl font-bold">Nearby broadcasts</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Geofenced, rate-limited, opt-in alerts. Only general areas are ever shown — never a home
          address.
        </p>

        <div className="space-y-3">
          {broadcasts.map((p, i) => {
            const def = categoryDef(p.category);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.4) }}
              >
                <GlassCard className={p.urgent ? "border-l-4 border-l-destructive" : ""}>
                  <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{p.author}</span>
                    <span>·</span>
                    <span className="mono">{timeAgo(p.at)}</span>
                    {p.distanceKm > 0 && (
                      <>
                        <span>·</span>
                        <span className="mono text-gold">{formatKm(p.distanceKm)}</span>
                      </>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full border border-panel-border px-2 py-0.5 text-[10px] uppercase tracking-wider">
                      <def.icon className="h-3 w-3" /> {def.label}
                    </span>
                    {p.urgent && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        <Siren className="h-3 w-3" /> Urgent
                      </span>
                    )}
                  </div>
                  <div className="font-semibold">{p.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>

      <GlassCard className="sticky top-20">
        <div className="mb-1 text-xs uppercase tracking-[0.2em] text-gold">Compose</div>
        <h2 className="mb-4 font-display text-xl font-semibold">Broadcast to your area</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Short headline"
          className="mb-2 w-full rounded-lg border border-input bg-white/[0.03] px-3 py-2.5 text-sm outline-none transition focus:border-gold/60"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Details, last-seen area, what to look for…"
          className="w-full resize-none rounded-lg border border-input bg-white/[0.03] px-3 py-2.5 text-sm outline-none transition focus:border-gold/60"
        />

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-muted-foreground">Broadcast radius</span>
            <span className="mono text-gold">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={radiusKm}
            onChange={(e) => setRadiusKm(+e.target.value)}
            className="w-full accent-(--gold)"
          />
        </div>

        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(e) => setUrgent(e.target.checked)}
            className="accent-(--alert)"
          />
          Urgent — missing person or child
        </label>

        <button
          onClick={send}
          disabled={!title.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg gold-gradient px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
        >
          <Send className="h-4 w-4" /> Send broadcast
        </button>
        <div className="mt-3 text-[11px] text-muted-foreground">
          Reaches ~{reach.toLocaleString()} opt-in users in {radiusKm} km. Rate-limited to prevent
          spam{urgent ? " · urgent alerts are prioritized" : ""}.
        </div>
      </GlassCard>
    </div>
  );
}
