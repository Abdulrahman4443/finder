import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Radar,
  Search,
  ShieldQuestion,
  Siren,
  Trash2,
} from "lucide-react";
import { CategoryPicker } from "../components/CategoryPicker";
import { RadiusMapPicker } from "../components/RadiusMapPicker";
import { GlassCard } from "../components/GlassCard";
import { pushToast } from "../components/NotificationToast";
import { useAuth } from "../hooks/useAuth";
import { addReport, getNetworkState, makeId, pushNotification } from "../lib/store";
import { findMatches } from "../lib/matching";
import { DEFAULT_CENTER, requestUserLocation } from "../lib/geo";
import { fileToThumbnail } from "../lib/image";
import type { Category, PrivateField, Report, ReportKind } from "../lib/types";

type ReportSearch = { mode?: ReportKind };

export const Route = createFileRoute("/report/new")({
  component: NewReport,
  validateSearch: (search: Record<string, unknown>): ReportSearch => ({
    mode: search.mode === "found" ? "found" : search.mode === "lost" ? "lost" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "New Report · FindrAI" },
      { name: "description", content: "Report a lost or found item in seconds." },
    ],
  }),
});

function NewReport() {
  const nav = useNavigate();
  const { mode: modeParam } = Route.useSearch();
  const { user, displayName, profile } = useAuth();

  const [mode, setMode] = useState<ReportKind>(modeParam ?? "lost");
  const [category, setCategory] = useState<Category | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [radius, setRadius] = useState(500);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [privateFields, setPrivateFields] = useState<PrivateField[]>([
    { question: "", answer: "" },
  ]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (modeParam) setMode(modeParam);
  }, [modeParam]);

  useEffect(() => {
    requestUserLocation().then((loc) => {
      if (loc) setCenter(loc);
    });
  }, []);

  // Clear found-only fields when switching back to lost
  useEffect(() => {
    if (mode === "lost") {
      setPhoto(null);
      setPrivateFields([{ question: "", answer: "" }]);
    }
  }, [mode]);

  const validPrivateFields = useMemo(
    () => privateFields.filter((f) => f.question.trim() && f.answer.trim()),
    [privateFields],
  );

  const missing: string[] = [];
  if (!category) missing.push("category");
  if (title.trim().length <= 2) missing.push("title");
  if (desc.trim().length <= 10) missing.push("description (at least ~10 characters)");

  const canSubmit = missing.length === 0;

  const onPhotoChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      setPhoto(await fileToThumbnail(file));
    } catch {
      pushToast({ title: "Couldn't read that image", tone: "alert" });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit || !category) {
      pushToast({
        title: "Almost there",
        body: `Add a ${missing.join(", ")} to continue.`,
        tone: "alert",
      });
      return;
    }
    setSubmitting(true);
    try {
      const report: Report = {
        id: makeId("r"),
        kind: mode,
        category,
        title: title.trim(),
        description: desc.trim(),
        location: center,
        radiusM: radius,
        photo: mode === "found" ? (photo ?? undefined) : undefined,
        createdAt: new Date().toISOString(),
        status: "open",
        reporter: {
          id: user?.id ?? `guest_${makeId("g")}`,
          name: user ? displayName : "Guest",
          trust: profile?.trust_score ?? 50,
        },
        privateFields: mode === "found" ? validPrivateFields : [],
      };

      addReport(report);
      const matches = findMatches(report, getNetworkState().reports);
      if (matches.length > 0) {
        pushNotification({
          title: `Match found · ${matches[0].score}%`,
          body: `${matches[0].candidate.title} · ${matches[0].distanceKm} km away`,
        });
        pushToast({
          title: `Report filed — ${matches.length} candidate${matches.length === 1 ? "" : "s"} found`,
          body: `Top match: ${matches[0].score}% confidence`,
          tone: "verify",
        });
      } else {
        pushToast({
          title: "Report filed",
          body: "No matches yet — we'll notify you the moment one appears.",
        });
      }
      nav({ to: "/matches", search: { report: report.id } });
    } finally {
      setSubmitting(false);
    }
  };

  let step = 1;

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-gold/90">
            New report
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-semibold tracking-tight">
            Tell us what happened
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            {mode === "lost"
              ? "Describe the item and where it went missing. We'll scan the network for matches."
              : "Add a photo and a private check question so the real owner can claim it safely."}
          </p>
        </div>
        <Link
          to="/sensitive/new"
          className="inline-flex items-center gap-2 text-xs font-medium text-destructive/90 transition hover:text-destructive"
        >
          <Siren className="h-3.5 w-3.5" /> Missing person
        </Link>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-1 rounded-xl bg-white/[0.03] p-1 ring-1 ring-white/[0.06]">
        {(
          [
            { m: "lost" as const, icon: Search, label: "I lost something" },
            { m: "found" as const, icon: Eye, label: "I found something" },
          ] as const
        ).map(({ m, icon: Icon, label }) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              mode === m
                ? "bg-gold text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-4">
        <GlassCard className="ring-1 ring-white/[0.04]">
          <StepLabel n={step++} label="Category" />
          <CategoryPicker value={category} onChange={setCategory} exclude={["person"]} />
          {touched && !category && (
            <p className="mt-3 text-xs text-destructive">Pick a category to continue.</p>
          )}
        </GlassCard>

        {mode === "found" && (
          <GlassCard className="ring-1 ring-white/[0.04]">
            <StepLabel n={step++} label="Photo" hint="Improves match confidence" />
            <label className="block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhotoChange(e.target.files?.[0])}
              />
              {photo ? (
                <div className="relative w-fit">
                  <img src={photo} alt="Report" className="max-h-56 rounded-lg" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPhoto(null);
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground shadow"
                    aria-label="Remove photo"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center text-sm text-muted-foreground transition hover:border-gold/35 hover:bg-white/[0.03]">
                  <ImagePlus className="mx-auto mb-3 h-6 w-6 text-gold/70" strokeWidth={1.5} />
                  Upload a photo
                  <div className="mt-1 text-xs opacity-70">JPG, PNG, or HEIC</div>
                </div>
              )}
            </label>
          </GlassCard>
        )}

        <GlassCard className="ring-1 ring-white/[0.04]">
          <StepLabel n={step++} label="Description" hint="Distinctive details help matching" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short title — e.g. Brown leather wallet"
            className="mb-3 w-full rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-gold/50"
          />
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="Color, wear, unique marks, when and where you last saw it…"
            className="w-full resize-none rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-gold/50"
          />
          {touched && (title.trim().length <= 2 || desc.trim().length <= 10) && (
            <p className="mt-3 text-xs text-destructive">
              Add a clear title and a short description (10+ characters).
            </p>
          )}
        </GlassCard>

        <GlassCard className="ring-1 ring-white/[0.04]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <StepLabel n={step++} label="Area & privacy radius" className="mb-0" />
            <span className="mono text-sm text-gold">
              {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`}
            </span>
          </div>
          <RadiusMapPicker center={center} radius={radius} onCenterChange={setCenter} />
          <input
            type="range"
            min={100}
            max={5000}
            step={100}
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            className="mt-4 w-full accent-(--gold)"
          />
          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>Exact pin</span>
            <span>Neighborhood only</span>
          </div>
          <div className="mono mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {center[0].toFixed(4)}, {center[1].toFixed(4)} · public view is blurred
          </div>
        </GlassCard>

        {mode === "found" && (
          <GlassCard className="ring-1 ring-white/[0.04]">
            <div className="mb-1 flex items-center gap-2">
              <ShieldQuestion className="h-4 w-4 text-gold" />
              <StepLabel n={step++} label="Private verification" className="mb-0" />
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              Ask something only the true owner would know. Never shown publicly — used when someone
              claims this item.
            </p>
            <div className="space-y-3">
              {privateFields.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <input
                    value={f.question}
                    onChange={(e) =>
                      setPrivateFields((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, question: e.target.value } : p)),
                      )
                    }
                    placeholder="Question — e.g. What's inside the front pocket?"
                    className="flex-1 rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-gold/50"
                  />
                  <div className="flex flex-1 gap-2">
                    <input
                      value={f.answer}
                      onChange={(e) =>
                        setPrivateFields((prev) =>
                          prev.map((p, j) => (j === i ? { ...p, answer: e.target.value } : p)),
                        )
                      }
                      placeholder="Expected answer"
                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none transition focus:border-gold/50"
                    />
                    {privateFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPrivateFields((prev) => prev.filter((_, j) => j !== i))}
                        className="rounded-lg border border-white/10 p-3 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                        aria-label="Remove question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
            {privateFields.length < 3 && (
              <button
                type="button"
                onClick={() => setPrivateFields((prev) => [...prev, { question: "", answer: "" }])}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add another ({privateFields.length}/3)
              </button>
            )}
          </GlassCard>
        )}

        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={() => nav({ to: "/" })}
            className="rounded-lg px-5 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Radar className="h-4 w-4" />
            )}
            Submit &amp; scan
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function StepLabel({
  n,
  label,
  hint,
  className,
}: {
  n: number;
  label: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex flex-wrap items-baseline gap-2 ${className ?? ""}`}>
      <span className="mono text-[11px] text-gold/80">{String(n).padStart(2, "0")}</span>
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="text-xs text-muted-foreground">· {hint}</span>}
    </div>
  );
}
