import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clapperboard, PartyPopper, PawPrint, RotateCcw, Smartphone, Wallet } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { MatchScoreRing } from "../components/MatchScoreRing";
import { VerificationPrompt } from "../components/VerificationPrompt";
import { pushToast } from "../components/NotificationToast";
import { getNetworkState } from "../lib/store";
import { findMatches } from "../lib/matching";
import { DEFAULT_CENTER } from "../lib/geo";
import type { Report } from "../lib/types";

export const Route = createFileRoute("/demo")({
  component: Demo,
  head: () => ({ meta: [{ title: "Judge Demo Mode · FindrAI" }] }),
});

/**
 * Judge Demo Mode: one-tap, end-to-end, under 30 seconds.
 * The lost report is simulated, but the match score is computed live by the
 * same matching engine that powers the real product, against the real network.
 */

type Scenario = {
  key: string;
  label: string;
  icon: typeof Wallet;
  lostReport: Omit<Report, "id" | "createdAt" | "reporter" | "status">;
  chat: { from: "me" | "them"; text: string }[];
};

const SCENARIOS: Scenario[] = [
  {
    key: "wallet",
    label: "Lost Wallet",
    icon: Wallet,
    lostReport: {
      kind: "lost",
      category: "wallet",
      title: "Brown leather wallet, red stitching",
      description:
        "Lost my worn brown leather bifold wallet with red stitching inside, near the cafe by the roundabout.",
      location: DEFAULT_CENTER,
      radiusM: 500,
      privateFields: [],
      photo: "demo",
    },
    chat: [
      { from: "them", text: "Hey! I have your wallet — the red stitching matches." },
      { from: "me", text: "Amazing. Can we meet at the cafe on the corner?" },
      { from: "them", text: "There in 15!" },
    ],
  },
  {
    key: "phone",
    label: "Lost Phone",
    icon: Smartphone,
    lostReport: {
      kind: "lost",
      category: "phone",
      title: "iPhone 15, black case",
      description:
        "Lost my iPhone 15 in a black silicone case on the bus this morning, mountains photo on the lock screen.",
      location: DEFAULT_CENTER,
      radiusM: 800,
      privateFields: [],
      photo: "demo",
    },
    chat: [
      { from: "them", text: "Found your phone on the route 14 bus." },
      { from: "me", text: "Legend. Is it at the depot lost & found?" },
      { from: "them", text: "Yep — turned in already. Ask for Sara." },
    ],
  },
  {
    key: "pet",
    label: "Lost Pet",
    icon: PawPrint,
    lostReport: {
      kind: "lost",
      category: "pet",
      title: "Golden retriever, red collar",
      description:
        "Our friendly golden retriever slipped her leash at the canal park. Red collar with a bone-shaped tag.",
      location: DEFAULT_CENTER,
      radiusM: 1500,
      privateFields: [],
      photo: "demo",
    },
    chat: [
      { from: "them", text: "I think I have her — she's very sweet and safe with me." },
      { from: "me", text: "Thank you so much — sending a meeting pin now." },
      { from: "them", text: "See you in 10." },
    ],
  },
];

type Step = "idle" | "report" | "matching" | "verify" | "connect" | "chat" | "recovered";
const STEP_ORDER: Step[] = ["report", "matching", "verify", "connect", "chat", "recovered"];
const STEP_LABEL: Record<Step, string> = {
  idle: "Ready",
  report: "Report filed",
  matching: "AI matching…",
  verify: "Verifying identity",
  connect: "Secure channel opened",
  chat: "In-app chat live",
  recovered: "Recovered",
};

function Demo() {
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [chatMsgs, setChatMsgs] = useState<{ from: "me" | "them"; text: string; id: number }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => () => clearTimers(), []);

  // Compute the live match against the real network with the real engine.
  const liveMatch = useMemo(() => {
    if (!scenario) return null;
    const simulated: Report = {
      ...scenario.lostReport,
      id: `demo_${scenario.key}`,
      createdAt: new Date().toISOString(),
      status: "open",
      reporter: { id: "demo_judge", name: "Demo Judge", trust: 80 },
    };
    const [best] = findMatches(simulated, getNetworkState().reports, 1);
    return best ?? null;
  }, [scenario]);

  const networkSize = getNetworkState().reports.length;

  const run = (s: Scenario) => {
    clearTimers();
    setScenario(s);
    setChatMsgs([]);
    setStep("report");
    pushToast({ title: `Report filed: ${s.lostReport.title}`, body: "Scanning the network…" });

    const T = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

    T(1400, () => setStep("matching"));
    T(3800, () => setStep("verify"));
    T(4000, () =>
      pushToast({
        title: "Match found",
        body: "Verification challenge armed — answer to unlock contact.",
        tone: "verify",
      }),
    );
    T(6200, () => setStep("connect"));
    T(7000, () => {
      setStep("chat");
      pushToast({ title: "Secure chat opened", body: "Identity verified.", tone: "verify" });
    });
    s.chat.forEach((m, i) => {
      T(7800 + i * 1600, () => setChatMsgs((prev) => [...prev, { ...m, id: Date.now() + i }]));
    });
    T(7800 + s.chat.length * 1600 + 800, () => {
      setStep("recovered");
      pushToast({ title: "Recovered!", body: "Trust score +5 · case closed.", tone: "verify" });
    });
  };

  const reset = () => {
    clearTimers();
    setStep("idle");
    setScenario(null);
    setChatMsgs([]);
  };

  const progressIdx = step === "idle" ? -1 : STEP_ORDER.indexOf(step);
  const progressPct = step === "idle" ? 0 : ((progressIdx + 1) / STEP_ORDER.length) * 100;
  const score = liveMatch?.score ?? 0;
  const verifyFields =
    liveMatch && liveMatch.candidate.privateFields.length > 0
      ? liveMatch.candidate.privateFields
      : [{ question: "What color is the distinguishing mark?", answer: "red" }];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
            <Clapperboard className="h-4 w-4" /> Judge demo mode
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold">One-tap end-to-end demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Actors are simulated — the match score is computed live by the real engine against{" "}
            {networkSize} network reports. Under 30 seconds per scenario.
          </p>
        </div>
        {step !== "idle" && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-panel-border px-4 py-2 text-sm transition hover:border-destructive/50 hover:text-destructive"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Scenario buttons */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {SCENARIOS.map((s) => (
          <button
            key={s.key}
            onClick={() => run(s)}
            className={`glass rounded-xl border p-5 text-left transition hover:border-gold/60 ${
              scenario?.key === s.key ? "border-gold beacon-glow" : "border-panel-border"
            }`}
          >
            <s.icon className="h-7 w-7 text-gold" strokeWidth={1.5} />
            <div className="mt-3 font-display font-semibold">{s.label}</div>
            <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {s.lostReport.title}
            </div>
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <GlassCard className="mb-6">
        <div className="mb-2 flex justify-between text-xs">
          <span className="text-muted-foreground">Sequence</span>
          <span className="mono text-gold">{STEP_LABEL[step]}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full gold-gradient"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <div className="mt-3 flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          {STEP_ORDER.map((s, i) => (
            <span key={s} className={i <= progressIdx ? "text-gold" : ""}>
              {s}
            </span>
          ))}
        </div>
      </GlassCard>

      {/* Stage */}
      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GlassCard className="py-16 text-center">
              <Clapperboard className="mx-auto h-10 w-10 text-gold/60" strokeWidth={1.25} />
              <div className="mt-4 font-display text-xl">Pick a scenario to begin</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Report → AI match → verification → secure chat → recovered.
              </div>
            </GlassCard>
          </motion.div>
        )}

        {scenario && step !== "idle" && (
          <motion.div
            key="stage"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid gap-6 md:grid-cols-[280px_1fr]"
          >
            <GlassCard glow className="text-center">
              <scenario.icon className="mx-auto h-9 w-9 text-gold" strokeWidth={1.5} />
              <div className="mt-2 font-display font-semibold">
                {liveMatch?.candidate.title ?? scenario.lostReport.title}
              </div>
              <div className="text-xs text-muted-foreground">
                {liveMatch ? `${liveMatch.distanceKm} km away` : "scanning…"}
              </div>
              <div className="mt-4 flex justify-center">
                {step === "report" || step === "matching" ? (
                  <div className="relative flex h-40 w-40 items-center justify-center">
                    <div className="h-32 w-32 rounded-full border-2 border-gold/30" />
                    <div className="absolute inset-0 animate-ping rounded-full border-2 border-gold/50" />
                    <div className="mono absolute text-xs text-gold">scanning…</div>
                  </div>
                ) : (
                  <MatchScoreRing
                    score={score}
                    size={160}
                    showPulse={step === "verify" || step === "connect"}
                  />
                )}
              </div>
              {liveMatch && step !== "report" && step !== "matching" && (
                <div className="mono mt-2 flex justify-center gap-3 text-[11px] text-muted-foreground">
                  <span>text {liveMatch.textScore}%</span>
                  <span>vision {liveMatch.visionScore}%</span>
                </div>
              )}
            </GlassCard>

            <GlassCard>
              {(step === "verify" || step === "connect") && (
                <VerificationPrompt
                  fields={verifyFields}
                  autoValue={verifyFields[0].answer}
                  onPass={() => {}}
                />
              )}
              {(step === "chat" || step === "recovered") && (
                <div>
                  <div className="mb-3 text-xs uppercase tracking-[0.2em] text-gold">
                    Live channel
                  </div>
                  <div className="min-h-56 space-y-2">
                    {chatMsgs.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={m.from === "me" ? "flex justify-end" : "flex justify-start"}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                            m.from === "me"
                              ? "gold-gradient rounded-br-md text-primary-foreground"
                              : "glass rounded-bl-md"
                          }`}
                        >
                          {m.text}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  {step === "recovered" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-6 rounded-lg border border-gold/50 bg-accent p-4 text-center"
                    >
                      <PartyPopper className="mx-auto mb-1 h-7 w-7 text-gold" />
                      <div className="font-display font-semibold text-gold">
                        Marked as Recovered
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Trust score +5 · case closed in 28 seconds
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
              {step === "report" && (
                <div className="text-sm text-muted-foreground">
                  <div className="mono mb-2 text-xs text-gold">◉ REPORT INGESTED</div>
                  Report filed. Category:{" "}
                  <span className="text-foreground">{scenario.lostReport.category}</span>. Encoding
                  text embeddings, vision features, and geo-hash…
                </div>
              )}
              {step === "matching" && (
                <div className="text-sm text-muted-foreground">
                  <div className="mono mb-2 text-xs text-gold">◉ AI MATCHING</div>
                  Cross-referencing {networkSize} active reports…
                  <br />
                  Semantic text similarity · vision features · geo proximity · recency.
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
