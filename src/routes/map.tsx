import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Flame, Layers, MapPin, Search, UserRound, X } from "lucide-react";
import { ReportsMap } from "../components/ReportsMap";
import { TrustBadge } from "../components/TrustBadge";
import { useNetworkState } from "../lib/store";
import { DEFAULT_CENTER, requestUserLocation } from "../lib/geo";
import { categoryDef } from "../lib/categories";
import { timeAgo } from "../lib/format";
import type { Report } from "../lib/types";

export const Route = createFileRoute("/map")({
  component: LiveMap,
  head: () => ({
    meta: [
      { title: "Live Map · FindrAI" },
      {
        name: "description",
        content: "Live map and anonymized heatmap of lost, found, and missing-person reports.",
      },
    ],
  }),
});

type KindFilter = "all" | "lost" | "found" | "person";

function LiveMap() {
  const { reports } = useNetworkState();
  const [kind, setKind] = useState<KindFilter>("all");
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [includeRecovered, setIncludeRecovered] = useState(false);
  const [selected, setSelected] = useState<Report | null>(null);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);

  useEffect(() => {
    requestUserLocation().then((loc) => {
      if (loc) setCenter(loc);
    });
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (!includeRecovered && r.status === "recovered") return false;
      if (kind === "person") return r.category === "person" || r.sensitive;
      if (kind === "lost") return r.kind === "lost";
      if (kind === "found") return r.kind === "found";
      return true;
    });
  }, [reports, kind, includeRecovered]);

  const counts = useMemo(
    () => ({
      lost: reports.filter((r) => r.kind === "lost" && r.status !== "recovered").length,
      found: reports.filter((r) => r.kind === "found" && r.status !== "recovered").length,
      people: reports.filter(
        (r) => (r.category === "person" || r.sensitive) && r.status !== "recovered",
      ).length,
    }),
    [reports],
  );

  return (
    <div className="relative h-[calc(100vh-4rem)] w-full overflow-hidden">
      <ReportsMap
        reports={filtered}
        center={center}
        zoom={12}
        height="100%"
        showHeat={showHeat}
        showMarkers={showMarkers}
        onSelect={setSelected}
        className="h-full rounded-none border-0"
      />

      {/* Control panel */}
      <div className="absolute left-4 top-4 z-[500] w-72 space-y-3">
        <div className="glass-strong rounded-xl border border-panel-border p-4 shadow-panel">
          <div className="mb-1 flex items-center gap-2">
            <Layers className="h-4 w-4 text-gold" />
            <div className="font-display text-sm font-semibold">Live recovery map</div>
          </div>
          <p className="text-xs text-muted-foreground">
            Aggregate view of the network. Locations are blurred — never an exact address.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-1.5 text-xs">
            {(
              [
                { id: "all", label: `All (${counts.lost + counts.found})`, icon: Layers },
                { id: "lost", label: `Lost (${counts.lost})`, icon: Search },
                { id: "found", label: `Found (${counts.found})`, icon: Eye },
                { id: "person", label: `People (${counts.people})`, icon: UserRound },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setKind(f.id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 font-medium transition ${
                  kind === f.id
                    ? "border-gold/60 bg-accent text-gold"
                    : "border-panel-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <f.icon className="h-3.5 w-3.5" /> {f.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
            <ToggleRow
              icon={Flame}
              label="Density heatmap"
              checked={showHeat}
              onChange={setShowHeat}
            />
            <ToggleRow
              icon={MapPin}
              label="Report beacons"
              checked={showMarkers}
              onChange={setShowMarkers}
            />
            <ToggleRow
              icon={Eye}
              label="Include recovered"
              checked={includeRecovered}
              onChange={setIncludeRecovered}
            />
          </div>
        </div>

        <div className="glass-strong rounded-xl border border-panel-border p-4 text-xs text-muted-foreground shadow-panel">
          <div className="mb-2 font-medium text-foreground">Legend</div>
          <div className="space-y-1.5">
            <LegendDot color="var(--gold)" label="Lost report" />
            <LegendDot color="var(--verify)" label="Found report" />
            <LegendDot color="var(--alert)" label="Sensitive / missing person" />
          </div>
          <div className="mt-3 border-t border-panel-border pt-2.5">
            Heat shows report density over the last 14 days — blue is quiet, red is a hotspot.
          </div>
        </div>
      </div>

      {/* Selected report drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            className="absolute right-4 top-4 z-[500] w-80"
          >
            <div className="glass-strong rounded-xl border border-panel-border p-5 shadow-panel">
              <div className="flex items-start justify-between gap-3">
                <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {selected.kind} · {categoryDef(selected.category).label} ·{" "}
                  {timeAgo(selected.createdAt)}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 font-display text-lg font-semibold">{selected.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{selected.description}</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Reporter</span>
                <span className="font-medium">{selected.reporter.name}</span>
                <TrustBadge score={selected.reporter.trust} />
              </div>
              {selected.sensitive && (
                <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                  Sensitive case — verification and audit trail required before any contact.
                </div>
              )}
              <Link
                to="/matches/$id/verify"
                params={{ id: selected.id }}
                search={{ mine: undefined }}
                className="mt-4 block rounded-lg gold-gradient px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground"
              >
                This looks like mine — verify
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: typeof Flame;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between text-xs"
    >
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? "bg-gold/80" : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${
            checked ? "left-4.5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
    </div>
  );
}
