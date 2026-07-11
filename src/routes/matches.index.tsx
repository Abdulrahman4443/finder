import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FilePlus2, MessagesSquare, Radar, X } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { MatchScoreRing } from "../components/MatchScoreRing";
import { SequenceProgress } from "../components/SequenceProgress";
import { TrustBadge } from "../components/TrustBadge";
import { useNetworkState } from "../lib/store";
import { useAuth } from "../hooks/useAuth";
import { findMatches } from "../lib/matching";
import { timeAgo, formatKm } from "../lib/format";
import { categoryDef } from "../lib/categories";

type MatchesSearch = { report?: string };

export const Route = createFileRoute("/matches/")({
  component: Matches,
  validateSearch: (search: Record<string, unknown>): MatchesSearch => ({
    report: typeof search.report === "string" ? search.report : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Matches · FindrAI" },
      { name: "description", content: "AI-ranked candidate matches for your report." },
    ],
  }),
});

type Filter = "all" | "nearby" | "recent";

function Matches() {
  const { report: reportParam } = Route.useSearch();
  const { reports, connections } = useNetworkState();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const myReports = useMemo(
    () => (user ? reports.filter((r) => r.reporter.id === user.id) : []),
    [reports, user],
  );

  const activeReport = useMemo(() => {
    if (reportParam) return reports.find((r) => r.id === reportParam) ?? null;
    return myReports.find((r) => r.status === "open") ?? myReports[0] ?? null;
  }, [reportParam, reports, myReports]);

  const matches = useMemo(() => {
    if (!activeReport) return [];
    let list = findMatches(activeReport, reports).filter((m) => !dismissed.has(m.candidate.id));
    if (filter === "nearby") list = list.filter((m) => m.distanceKm <= 3);
    if (filter === "recent")
      list = list.filter(
        (m) => Date.now() - new Date(m.candidate.createdAt).getTime() < 86_400_000,
      );
    return list;
  }, [activeReport, reports, filter, dismissed]);

  const myConnections = useMemo(() => connections.filter((c) => !c.recovered), [connections]);

  if (!activeReport) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <GlassCard className="py-16 text-center">
          <Radar className="mx-auto h-10 w-10 text-gold/70" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-2xl font-bold">No reports to match yet</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {user
              ? "File a lost or found report and the AI starts scanning the network immediately."
              : "Sign in and file a report — the AI starts scanning the network immediately."}
          </p>
          <Link
            to="/report/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            <FilePlus2 className="h-4 w-4" /> File a report
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mono text-xs uppercase tracking-[0.2em] text-gold">
            {activeReport.kind} · {categoryDef(activeReport.category).label} ·{" "}
            {timeAgo(activeReport.createdAt)}
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">
            {matches.length} candidate match{matches.length === 1 ? "" : "es"} for “
            {activeReport.title}”
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by AI confidence (60%+ only). Verify yourself — answers are never auto-filled.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          {(
            [
              { id: "all", label: "All" },
              { id: "nearby", label: "≤ 3 km" },
              { id: "recent", label: "Last 24h" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`glass rounded-full border px-3.5 py-1.5 transition ${
                filter === f.id
                  ? "border-gold/50 text-gold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {myReports.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {myReports.slice(0, 6).map((r) => (
            <Link
              key={r.id}
              to="/matches"
              search={{ report: r.id }}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
                r.id === activeReport.id
                  ? "border-gold/60 bg-accent text-gold"
                  : "border-panel-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.title.slice(0, 32)}
            </Link>
          ))}
        </div>
      )}

      <SequenceProgress step={matches.length > 0 ? "matching" : "report"} />

      {myConnections.length > 0 && (
        <GlassCard className="mb-6 border border-verify/30">
          <div className="mb-3 text-xs uppercase tracking-[0.2em] text-verify">
            Open recovery channels
          </div>
          <div className="flex flex-wrap gap-2">
            {myConnections.map((c) => (
              <Link
                key={c.id}
                to="/chat/$connectionId"
                params={{ connectionId: c.id }}
                className="inline-flex items-center gap-2 rounded-lg border border-verify/40 bg-verify/10 px-4 py-2 text-sm text-verify transition hover:bg-verify/20"
              >
                <MessagesSquare className="h-4 w-4" /> {c.itemTitle} · with {c.otherReporter.name}
              </Link>
            ))}
          </div>
        </GlassCard>
      )}

      {matches.length === 0 ? (
        <GlassCard className="py-14 text-center">
          <Radar className="mx-auto h-9 w-9 animate-pulse text-gold/60" strokeWidth={1.5} />
          <div className="mt-4 font-display text-xl font-semibold">Still scanning the network</div>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            No candidates above the confidence threshold yet. You'll get a push notification the
            moment a {activeReport.kind === "lost" ? "found" : "lost"} report matches.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {matches.map((m, i) => (
            <motion.div
              key={m.candidate.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <GlassCard glow={i === 0} className="overflow-hidden p-0">
                <div className="grid items-center gap-6 p-6 md:grid-cols-[160px_1fr_auto]">
                  <div className="flex items-center justify-center">
                    <MatchScoreRing
                      score={m.score}
                      size={132}
                      stroke={8}
                      duration={1 + i * 0.15}
                      showPulse={i === 0}
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {categoryDef(m.candidate.category).label}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="mono text-xs text-muted-foreground">
                        {timeAgo(m.candidate.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="mono text-xs text-gold">{formatKm(m.distanceKm)} away</span>
                    </div>
                    <div className="mb-1 font-display text-xl font-semibold">
                      {m.candidate.title}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {m.candidate.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Reporter</span>
                        <span className="text-xs font-medium">{m.candidate.reporter.name}</span>
                        <TrustBadge score={m.candidate.reporter.trust} />
                      </div>
                      <div className="mono flex gap-3 text-[11px] text-muted-foreground">
                        <span>text {m.textScore}%</span>
                        <span>vision {m.visionScore}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:w-40">
                    <Link
                      to="/matches/$id/verify"
                      params={{ id: m.candidate.id }}
                      search={{ mine: m.mine.id }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg gold-gradient px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition active:scale-[0.98]"
                    >
                      Verify <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => setDismissed((prev) => new Set([...prev, m.candidate.id]))}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-panel-border px-4 py-2.5 text-sm text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" /> Not mine
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
