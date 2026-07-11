import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Camera,
  Eye,
  MapPin,
  MessageSquareLock,
  PlayCircle,
  QrCode,
  Radar,
  RadioTower,
  ScanSearch,
  ShieldCheck,
  Siren,
  Sparkles,
  Trophy,
} from "lucide-react";
import { MatchScoreRing } from "../components/MatchScoreRing";
import { GlassCard } from "../components/GlassCard";
import { ReportsMap } from "../components/ReportsMap";
import { useNetworkState } from "../lib/store";
import { DEFAULT_CENTER, DEFAULT_CITY } from "../lib/geo";
import { findMatches } from "../lib/matching";
import { useMemo } from "react";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "FindrAI — Reunite people with what they've lost" },
      {
        name: "description",
        content:
          "AI matching, verification challenges, and a live recovery network. Report lost or found items in seconds.",
      },
    ],
  }),
});

const FEATURES = [
  {
    icon: Brain,
    title: "Semantic AI matching",
    body: "\u201cBlack leather wallet\u201d matches \u201cdark purse\u201d. Descriptions are compared by meaning, not keywords, with a live confidence score.",
  },
  {
    icon: Camera,
    title: "Computer vision",
    body: "Photos are analyzed for color, shape, brand, and wear — details text alone misses — and blended into one score.",
  },
  {
    icon: MapPin,
    title: "Geolocation intelligence",
    body: "Nearby reports rank higher. You control precision: an exact pin, or just a neighborhood radius for privacy.",
  },
  {
    icon: ShieldCheck,
    title: "Verification challenge",
    body: "Before contact unlocks, claimants answer private questions only the true owner knows. Three misses escalates to review.",
  },
  {
    icon: MessageSquareLock,
    title: "Secure in-app chat",
    body: "No phone numbers exchanged. Share meeting points or live location inside the app, then mark the case recovered.",
  },
  {
    icon: RadioTower,
    title: "City-wide broadcasts",
    body: "Push an opt-in, geofenced alert across the city — \u201cSeen this cat near the canal?\u201d — rate-limited so it never feels like spam.",
  },
  {
    icon: Siren,
    title: "Sensitive case protocol",
    body: "Missing-person reports run the same verification engine with higher-stakes questions, a permanent audit trail, and a standing \u201ccontact police\u201d reminder.",
  },
  {
    icon: QrCode,
    title: "QR smart tags",
    body: "Printable tags for wallets, bags, and collars. A scan notifies you instantly — without revealing your number.",
  },
  {
    icon: Trophy,
    title: "Community reputation",
    body: "Verified helpers earn trust scores and badges. Organizers get a live dashboard with an anonymized heatmap.",
  },
];

function Landing() {
  const { reports } = useNetworkState();

  const stats = useMemo(() => {
    const recovered = reports.filter((r) => r.status === "recovered").length;
    const open = reports.filter((r) => r.status === "open").length;
    return { total: reports.length, recovered, open };
  }, [reports]);

  const demoMatch = useMemo(() => {
    const lost = reports.find((r) => r.kind === "lost" && r.status === "open");
    if (!lost) return null;
    const [best] = findMatches(lost, reports, 1);
    return best ?? null;
  }, [reports]);

  const activeReports = useMemo(() => reports.filter((r) => r.status !== "recovered"), [reports]);

  return (
    <div>
      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-accent px-3 py-1.5 text-xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-gold opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
              </span>
              <span className="font-medium text-gold">
                Live · {stats.open} open reports around {DEFAULT_CITY}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mt-6 font-display text-5xl font-bold leading-[1.04] tracking-tight sm:text-6xl"
            >
              Lost something?
              <br />
              <span className="text-gold">AI finds the match</span>
              <br />
              and proves it's real.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="mt-6 max-w-lg text-lg text-muted-foreground"
            >
              FindrAI cross-matches lost and found reports with semantic AI, computer vision, and
              location intelligence — then verifies the owner before anyone connects.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mt-10 flex flex-wrap gap-3"
            >
              <Link
                to="/report/new"
                search={{ mode: "lost" }}
                className="inline-flex items-center gap-2 rounded-xl gold-gradient px-7 py-3.5 font-semibold text-primary-foreground beacon-glow transition hover:opacity-90"
              >
                I lost something <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/report/new"
                search={{ mode: "found" }}
                className="inline-flex items-center gap-2 rounded-xl border border-panel-border bg-white/[0.03] px-7 py-3.5 font-semibold transition hover:bg-white/[0.07]"
              >
                <Eye className="h-4 w-4" /> I found something
              </Link>
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-verify transition hover:text-foreground"
              >
                <PlayCircle className="h-4 w-4" /> Watch the demo
              </Link>
            </motion.div>

            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div>
                <span className="mono text-lg font-semibold text-gold">{stats.total}</span>
                <br />
                reports on the network
              </div>
              <div className="h-8 w-px bg-panel-border" />
              <div>
                <span className="mono text-lg font-semibold text-gold">{stats.recovered}</span>
                <br />
                items reunited
              </div>
              <div className="h-8 w-px bg-panel-border" />
              <div>
                <span className="mono text-lg font-semibold text-gold">
                  {stats.total > 0 ? Math.round((stats.recovered / stats.total) * 100) : 0}%
                </span>
                <br />
                recovery rate
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative h-full min-h-[420px] w-full"
          >
            <ReportsMap
              reports={activeReports}
              center={DEFAULT_CENTER}
              zoom={12}
              height={520}
              interactive={false}
            />
            {demoMatch && (
              <div className="absolute bottom-5 right-5 z-[400] w-72">
                <GlassCard glow className="bg-black/50 p-5 backdrop-blur-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        Live match
                      </div>
                      <div className="mt-1 max-w-40 truncate font-display text-sm font-semibold">
                        {demoMatch.candidate.title}
                      </div>
                    </div>
                    <span className="rounded-full bg-verify/15 px-2 py-0.5 text-[10px] font-medium text-verify">
                      {demoMatch.distanceKm} km away
                    </span>
                  </div>
                  <div className="flex justify-center py-1">
                    <MatchScoreRing score={demoMatch.score} size={132} stroke={8} />
                  </div>
                </GlassCard>
              </div>
            )}
            <Link
              to="/map"
              className="absolute left-5 top-5 z-[400] inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-medium backdrop-blur-md transition hover:border-gold/40 hover:text-gold"
            >
              <Radar className="h-3.5 w-3.5" /> Open live map & heatmap
            </Link>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold">How it works</div>
          <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Four steps. Zero friction.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              n: "01",
              icon: ScanSearch,
              t: "Report",
              d: "Snap a photo, pick a category, drop a privacy radius. Thirty seconds, start to finish.",
            },
            {
              n: "02",
              icon: Sparkles,
              t: "Match",
              d: "Semantic text, vision features, distance, and recency blend into one confidence score.",
            },
            {
              n: "03",
              icon: ShieldCheck,
              t: "Verify",
              d: "Answer private questions only the true owner knows. Fuzzy matching, three attempts, then human review.",
            },
            {
              n: "04",
              icon: MessageSquareLock,
              t: "Recover",
              d: "Secure in-app chat opens. Share a meeting point, reunite, and mark the case recovered.",
            },
          ].map((f) => (
            <GlassCard
              key={f.n}
              className="group cursor-default border border-panel-border bg-white/[0.015] p-7 transition hover:border-gold/30 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <f.icon className="h-5 w-5 text-gold" strokeWidth={1.75} />
                <div className="mono text-xs text-muted-foreground">{f.n}</div>
              </div>
              <div className="mt-5 font-display text-xl font-semibold">{f.t}</div>
              <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Feature grid */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12">
          <div className="text-xs uppercase tracking-[0.25em] text-gold">The full network</div>
          <h2 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Built for the moment
            <br />
            something goes missing.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <GlassCard
              key={f.title}
              className="border border-panel-border bg-white/[0.015] p-6 transition hover:border-gold/25 hover:bg-white/[0.035]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-gold">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="mt-4 font-display text-lg font-semibold">{f.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <GlassCard glow className="p-10 text-center sm:p-14">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            The network works better
            <br />
            with you on it.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Every report strengthens the match graph for everyone in your city. Free for
            individuals, forever.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/report/new"
              className="inline-flex items-center gap-2 rounded-xl gold-gradient px-7 py-3.5 font-semibold text-primary-foreground transition hover:opacity-90"
            >
              File a report <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/map"
              className="inline-flex items-center gap-2 rounded-xl border border-panel-border px-7 py-3.5 font-semibold transition hover:bg-white/[0.05]"
            >
              <MapPin className="h-4 w-4" /> Explore the live map
            </Link>
          </div>
        </GlassCard>
      </section>

      <footer className="mx-auto mt-6 max-w-7xl border-t border-panel-border px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} FindrAI · Signal, not noise.</div>
          <div className="flex items-center gap-4">
            <Link to="/demo" className="hover:text-foreground">
              Judge demo
            </Link>
            <Link to="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <Link to="/sensitive/new" className="hover:text-destructive">
              Report a missing person
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
