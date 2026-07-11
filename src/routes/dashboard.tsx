import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, Flame, ScrollText, ShieldAlert, Trophy } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { ReportsMap } from "../components/ReportsMap";
import { TrustBadge } from "../components/TrustBadge";
import { flagReport, useNetworkState } from "../lib/store";
import { pushToast } from "../components/NotificationToast";
import { textSimilarity } from "../lib/matching";
import { DEFAULT_CENTER } from "../lib/geo";
import { CATEGORIES } from "../lib/categories";
import { timeAgo } from "../lib/format";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard · FindrAI" }] }),
});

function Stat({
  label,
  value,
  sub,
  tone = "gold",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "gold" | "verify" | "alert";
}) {
  const c = tone === "verify" ? "text-verify" : tone === "alert" ? "text-destructive" : "text-gold";
  return (
    <GlassCard>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-4xl font-bold ${c}`}>{value}</div>
      {sub && <div className="mono mt-1 text-xs text-muted-foreground">{sub}</div>}
    </GlassCard>
  );
}

function Dashboard() {
  const { reports, connections, audit } = useNetworkState();

  const stats = useMemo(() => {
    const recovered = reports.filter((r) => r.status === "recovered").length;
    const pending = reports.filter((r) => r.status === "open").length;
    const matched = reports.filter((r) => r.status === "matched").length;
    const closable = recovered + matched;
    const matchRate = reports.length > 0 ? Math.round((closable / reports.length) * 100) : 0;
    const today = reports.filter(
      (r) => Date.now() - new Date(r.createdAt).getTime() < 86_400_000,
    ).length;
    return { total: reports.length, recovered, pending, matched, matchRate, today };
  }, [reports]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reports) {
      const label = CATEGORIES.find((c) => c.id === r.category)?.label ?? "Other";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [reports]);

  const leaderboard = useMemo(() => {
    const byReporter = new Map<
      string,
      { id: string; name: string; trust: number; reports: number }
    >();
    for (const r of reports) {
      const cur = byReporter.get(r.reporter.id);
      if (cur) cur.reports += 1;
      else
        byReporter.set(r.reporter.id, {
          id: r.reporter.id,
          name: r.reporter.name,
          trust: r.reporter.trust,
          reports: 1,
        });
    }
    return [...byReporter.values()].sort((a, b) => b.trust - a.trust).slice(0, 6);
  }, [reports]);

  // Fraud detection: near-duplicate reports of the same kind from different accounts.
  const suspicious = useMemo(() => {
    const open = reports.filter((r) => r.status === "open" && !r.flagged);
    const flagged: { a: (typeof open)[number]; b: (typeof open)[number]; sim: number }[] = [];
    for (let i = 0; i < open.length; i++) {
      for (let j = i + 1; j < open.length; j++) {
        const a = open[i];
        const b = open[j];
        if (a.kind !== b.kind || a.category !== b.category) continue;
        const sim = textSimilarity(`${a.title} ${a.description}`, `${b.title} ${b.description}`);
        if (sim > 0.82) flagged.push({ a, b, sim });
      }
    }
    return flagged.slice(0, 3);
  }, [reports]);

  const maxCat = Math.max(1, ...categories.map((c) => c.count));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold">Ops dashboard</div>
          <h1 className="mt-1 font-display text-3xl font-bold">City intelligence overview</h1>
        </div>
        <div className="mono flex items-center gap-1.5 text-xs text-muted-foreground">
          <Activity className="h-3.5 w-3.5 text-verify" />
          Live · updated {new Date().toLocaleTimeString()}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total reports" value={stats.total} sub={`+${stats.today} in last 24h`} />
        <Stat label="Recovered" value={stats.recovered} sub="cases closed" tone="verify" />
        <Stat
          label="Open"
          value={stats.pending}
          sub={`${stats.matched} in verification`}
          tone="alert"
        />
        <Stat label="Match rate" value={`${stats.matchRate}%`} sub="matched or recovered" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <GlassCard>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
                  <Flame className="h-4 w-4" /> Recovery heatmap
                </div>
                <div className="mt-1 font-display text-lg font-semibold">
                  Report density · rolling 14 days
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground">Aggregate only · no addresses</div>
            </div>
            <ReportsMap
              reports={reports}
              center={DEFAULT_CENTER}
              zoom={11}
              height={400}
              showMarkers={false}
              showHeat
            />
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <ShieldAlert className="h-4 w-4" /> Fraud & abuse detection
            </div>
            {suspicious.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No duplicate or suspicious report pairs above the similarity threshold right now.
                Pattern checks run on every new report.
              </p>
            ) : (
              <div className="space-y-3">
                {suspicious.map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <div className="min-w-0 text-sm">
                      <div className="font-medium">
                        “{s.a.title}” ↔ “{s.b.title}”
                      </div>
                      <div className="mono mt-0.5 text-xs text-muted-foreground">
                        {Math.round(s.sim * 100)}% text overlap · same category & kind · different
                        reporters
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        flagReport(s.b.id);
                        pushToast({
                          title: "Report flagged",
                          body: "Held for moderator review.",
                          tone: "alert",
                        });
                      }}
                      className="rounded-lg border border-destructive/50 px-3 py-1.5 text-xs text-destructive transition hover:bg-destructive/15"
                    >
                      Flag duplicate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard>
            <div className="mb-4 text-xs uppercase tracking-[0.2em] text-gold">
              Category breakdown
            </div>
            <div className="space-y-3">
              {categories.map((c, i) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{c.name}</span>
                    <span className="mono text-gold">{c.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(c.count / maxCat) * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.07, ease: "easeOut" }}
                      className="h-full gold-gradient"
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <Trophy className="h-4 w-4" /> Community leaderboard
            </div>
            <div className="space-y-2.5">
              {leaderboard.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="mono w-5 text-xs text-muted-foreground">#{i + 1}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full gold-gradient text-[11px] font-bold text-primary-foreground">
                    {p.name[0]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                  <TrustBadge score={p.trust} />
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <ScrollText className="h-4 w-4" /> Audit log
            </div>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Every verification attempt, escalation, and sensitive-case action is recorded here
                permanently.
              </p>
            ) : (
              <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                {audit.slice(0, 12).map((a) => (
                  <div key={a.id} className="text-xs">
                    <span className="mono text-gold">{a.action}</span>
                    <span className="mx-1.5 text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{a.detail}</span>
                    <span className="mono ml-1.5 text-muted-foreground/60">{timeAgo(a.at)}</span>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
