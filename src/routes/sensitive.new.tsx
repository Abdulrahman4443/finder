import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PhoneCall, Plus, ShieldQuestion, Siren, Trash2 } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { RadiusMapPicker } from "../components/RadiusMapPicker";
import { pushToast } from "../components/NotificationToast";
import { useAuth } from "../hooks/useAuth";
import { addBroadcast, addReport, logAudit, makeId, pushNotification } from "../lib/store";
import { DEFAULT_CENTER, requestUserLocation } from "../lib/geo";
import type { PrivateField, Report } from "../lib/types";

export const Route = createFileRoute("/sensitive/new")({
  component: SensitiveReport,
  head: () => ({ meta: [{ title: "Sensitive Case · FindrAI" }] }),
});

function SensitiveReport() {
  const nav = useNavigate();
  const { user, displayName, profile, setAuthModalOpen } = useAuth();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [desc, setDesc] = useState("");
  const [radius, setRadius] = useState(2000);
  const [center, setCenter] = useState<[number, number]>(DEFAULT_CENTER);
  const [consent, setConsent] = useState(false);
  const [privateFields, setPrivateFields] = useState<PrivateField[]>([
    { question: "", answer: "" },
  ]);

  useEffect(() => {
    requestUserLocation().then((loc) => {
      if (loc) setCenter(loc);
    });
  }, []);

  const validPrivate = privateFields.filter((f) => f.question.trim() && f.answer.trim());
  const canSubmit = consent && name.trim() && desc.trim().length > 10 && validPrivate.length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (!user) {
      setAuthModalOpen(true);
      pushToast({ title: "Sign in required", body: "Sensitive cases need a verified account." });
      return;
    }

    const title = `Missing: ${name.trim()}${age.trim() ? `, ${age.trim()}` : ""}`;
    const report: Report = {
      id: makeId("r"),
      kind: "lost",
      category: "person",
      title,
      description: desc.trim(),
      location: center,
      radiusM: radius,
      createdAt: new Date().toISOString(),
      status: "open",
      reporter: { id: user.id, name: displayName, trust: profile?.trust_score ?? 50 },
      privateFields: validPrivate,
      sensitive: true,
    };
    addReport(report);
    addBroadcast({
      id: makeId("b"),
      author: displayName,
      category: "person",
      title,
      body: `${desc.trim().slice(0, 140)} — last seen in the highlighted area. Contact police first if sighted.`,
      at: new Date().toISOString(),
      distanceKm: 0,
      urgent: true,
    });
    logAudit(
      "sensitive.filed",
      `${title} · guardian ${displayName} · ${validPrivate.length} private details on file`,
    );
    pushNotification({
      title: "Sensitive alert dispatched",
      body: "Verified responders nearby have been notified.",
    });
    pushToast({
      title: "Sensitive alert dispatched",
      body: "Broadcast live. Verification challenge armed for any match.",
      tone: "alert",
    });
    nav({ to: "/broadcast" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <Siren className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <div className="font-semibold text-destructive">Sensitive Case Protocol</div>
          <p className="mt-1 text-muted-foreground">
            For missing persons and vulnerable individuals. Private identifying details are never
            shown publicly — they power the verification challenge any claimant must pass. Every
            action is permanently logged.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
            <PhoneCall className="h-3.5 w-3.5" /> Contact police first — Emergency 15 · Child
            helpline 1121
          </div>
        </div>
      </div>

      <h1 className="mb-6 font-display text-3xl font-bold">Report a missing person</h1>

      <form onSubmit={submit} className="space-y-4">
        <GlassCard>
          <label className="mb-2 block text-sm font-medium">Name (or nickname)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-input bg-white/[0.03] px-4 py-3 text-sm outline-none transition focus:border-gold/60"
          />
          <label className="mb-2 mt-4 block text-sm font-medium">Age</label>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value)}
            inputMode="numeric"
            className="w-full rounded-lg border border-input bg-white/[0.03] px-4 py-3 text-sm outline-none transition focus:border-gold/60"
          />
          <label className="mb-2 mt-4 block text-sm font-medium">
            Physical description &amp; last seen wearing
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            className="w-full resize-none rounded-lg border border-input bg-white/[0.03] px-4 py-3 text-sm outline-none transition focus:border-gold/60"
          />
        </GlassCard>

        <GlassCard>
          <div className="mb-1 flex items-center gap-2">
            <ShieldQuestion className="h-4 w-4 text-gold" />
            <span className="text-sm font-medium">Private identifying details (required)</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Facts only a real guardian would know — a birthmark, exact clothing, a favorite toy, the
            last thing they said. Any claimant must answer these before contact unlocks.
          </p>
          <div className="space-y-3">
            {privateFields.map((f, i) => (
              <div key={i} className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={f.question}
                  onChange={(e) =>
                    setPrivateFields((prev) =>
                      prev.map((p, j) => (j === i ? { ...p, question: e.target.value } : p)),
                    )
                  }
                  placeholder="Question (e.g. What birthmark is on their arm?)"
                  className="flex-1 rounded-lg border border-input bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-gold/60"
                />
                <div className="flex flex-1 gap-2">
                  <input
                    value={f.answer}
                    onChange={(e) =>
                      setPrivateFields((prev) =>
                        prev.map((p, j) => (j === i ? { ...p, answer: e.target.value } : p)),
                      )
                    }
                    placeholder="Answer (kept private)"
                    className="min-w-0 flex-1 rounded-lg border border-input bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-gold/60"
                  />
                  {privateFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPrivateFields((prev) => prev.filter((_, j) => j !== i))}
                      className="rounded-lg border border-panel-border p-3 text-muted-foreground transition hover:border-destructive/50 hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
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

        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-medium">Last known location</label>
            <span className="mono text-sm text-gold">
              {radius >= 1000 ? `${(radius / 1000).toFixed(1)} km` : `${radius} m`} radius
            </span>
          </div>
          <RadiusMapPicker center={center} radius={radius} onCenterChange={setCenter} />
          <input
            type="range"
            min={500}
            max={10000}
            step={500}
            value={radius}
            onChange={(e) => setRadius(+e.target.value)}
            className="mt-4 w-full accent-(--alert)"
          />
        </GlassCard>

        <GlassCard>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 accent-(--alert)"
            />
            <span>
              I confirm I am a family member, guardian, or authorized party, and I have contacted
              (or will contact) local authorities. I understand misuse results in permanent
              suspension and that all activity on this case is logged.
            </span>
          </label>
        </GlassCard>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-destructive py-3.5 text-sm font-semibold text-destructive-foreground transition active:scale-[0.99] disabled:opacity-40"
        >
          File sensitive alert &amp; broadcast
        </button>
      </form>
    </div>
  );
}
