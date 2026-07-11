import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock, PhoneCall, ShieldCheck, Siren } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { MatchScoreRing } from "../components/MatchScoreRing";
import { SequenceProgress } from "../components/SequenceProgress";
import { VerificationPrompt } from "../components/VerificationPrompt";
import { pushToast } from "../components/NotificationToast";
import { useAuth } from "../hooks/useAuth";
import {
  addConnection,
  getVerification,
  logAudit,
  makeId,
  pushNotification,
  recordVerificationAttempt,
  updateReportStatus,
  useNetworkState,
} from "../lib/store";
import { scorePair, MIN_MATCH_SCORE } from "../lib/matching";
import { categoryDef } from "../lib/categories";
import { formatKm } from "../lib/format";
import type { ChatMessage } from "../lib/types";

type VerifySearch = { mine?: string };

export const Route = createFileRoute("/matches/$id/verify")({
  component: Verify,
  validateSearch: (search: Record<string, unknown>): VerifySearch => ({
    mine: typeof search.mine === "string" ? search.mine : undefined,
  }),
  head: () => ({ meta: [{ title: "Verify Match · FindrAI" }] }),
});

function Verify() {
  const { id } = Route.useParams();
  const { mine: mineId } = Route.useSearch();
  const nav = useNavigate();
  const { reports } = useNetworkState();
  const { user, displayName, setAuthModalOpen } = useAuth();
  const [passed, setPassed] = useState(false);

  const candidate = useMemo(() => reports.find((r) => r.id === id) ?? null, [reports, id]);
  const mine = useMemo(
    () => (mineId ? (reports.find((r) => r.id === mineId) ?? null) : null),
    [reports, mineId],
  );

  const match = useMemo(
    () => (candidate && mine ? scorePair(mine, candidate) : null),
    [candidate, mine],
  );

  // Loser answers the founder's private questions (never auto-filled).
  // Only the other party's challenge fields are used — you type the answers yourself.
  const fields = useMemo(() => candidate?.privateFields ?? [], [candidate]);

  if (!candidate) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <GlassCard className="py-14">
          <div className="font-display text-xl font-semibold">Match not found</div>
          <p className="mt-2 text-sm text-muted-foreground">
            This candidate may have been recovered or removed.
          </p>
          <Link to="/matches" className="mt-5 inline-block text-sm text-gold hover:underline">
            ← Back to matches
          </Link>
        </GlassCard>
      </div>
    );
  }

  const verification = getVerification(candidate.id);
  const sensitive = candidate.sensitive || mine?.sensitive;

  const handlePass = () => {
    setPassed(true);
    if (!mine) return;
    updateReportStatus(candidate.id, "matched");
    updateReportStatus(mine.id, "matched");
  };

  const openChat = () => {
    if (!mine || !match) return;
    if (!user) {
      setAuthModalOpen(true);
      pushToast({
        title: "Sign in required",
        body: "Live chat needs both people signed in.",
        tone: "alert",
      });
      return;
    }
    if (match.score < MIN_MATCH_SCORE) {
      pushToast({
        title: `Match below ${MIN_MATCH_SCORE}%`,
        body: `Only matches at ${MIN_MATCH_SCORE}%+ can open a secure channel.`,
        tone: "alert",
      });
      return;
    }
    const connId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : makeId("c");
    const opening: ChatMessage[] = [
      {
        id: makeId("m"),
        connectionId: connId,
        from: "sys",
        senderId: "sys",
        kind: "sys",
        text: "Live channel opened. Copy the invite link so the other signed-in person can join — messages sync in real time.",
        at: new Date().toISOString(),
      },
    ];
    addConnection(
      {
        id: connId,
        myReportId: mine.id,
        otherReportId: candidate.id,
        otherReporter: candidate.reporter,
        itemTitle: candidate.title,
        verifiedAt: new Date().toISOString(),
        recovered: false,
        live: true,
        openerId: user.id,
      },
      opening,
    );
    pushNotification({
      title: "Live chat opened",
      body: `Share the invite with ${candidate.reporter.name} about ${candidate.title}`,
    });
    pushToast({
      title: "Connection unlocked",
      body: "Copy the invite link in chat so the other person can join live.",
      tone: "verify",
    });
    nav({
      to: "/chat/$connectionId",
      params: { connectionId: connId },
      search: { title: candidate.title, peer: displayName },
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/matches" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to matches
      </Link>

      <div className="mt-6">
        <SequenceProgress step={passed ? "connect" : "verify"} />
      </div>

      {sensitive && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
          <Siren className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="text-sm">
            <div className="font-semibold text-destructive">Sensitive case</div>
            <p className="mt-0.5 text-muted-foreground">
              This involves a person. Also contact local police or a child helpline — that's the
              right first move. Every verification attempt here is permanently logged.
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
              <PhoneCall className="h-3.5 w-3.5" /> Emergency: 15 · Child helpline: 1121
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 mt-2">
        <div className="text-xs uppercase tracking-[0.25em] text-gold">Verification challenge</div>
        <h1 className="mt-1 font-display text-3xl font-bold">
          {sensitive ? "Confirm you're really them" : "Prove it's yours"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Type the answer{fields.length === 1 ? "" : "s"} yourself — only the finder set these.
          Nothing is filled in for you. Three misses escalate to human review.
        </p>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <MatchScoreRing score={match?.score ?? 0} size={180} />
          <div className="text-center">
            <div className="font-medium">{candidate.title}</div>
            <div className="mono text-xs text-muted-foreground">
              {match ? formatKm(match.distanceKm) : "—"} · {categoryDef(candidate.category).label}
            </div>
          </div>
          {match && (
            <div className="mono flex gap-3 text-[11px] text-muted-foreground">
              <span>text {match.textScore}%</span>
              <span>vision {match.visionScore}%</span>
            </div>
          )}
        </div>

        <GlassCard>
          {fields.length === 0 ? (
            <div className="space-y-4 py-4 text-center">
              <Lock className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <div className="font-display text-lg font-semibold">No private details on file</div>
              <p className="mx-auto max-w-sm text-sm text-muted-foreground">
                {sensitive
                  ? "Sensitive cases without recorded private details always go to human review — contact is never auto-unlocked."
                  : "Neither report recorded private verification details, so this claim goes to a moderator before contact unlocks."}
              </p>
              <button
                onClick={() => {
                  logAudit("verify.escalated", `report ${candidate.id} · no private fields`);
                  pushToast({
                    title: "Escalated to human review",
                    body: "A moderator will confirm this match. You'll be notified.",
                    tone: "alert",
                  });
                }}
                className="rounded-lg border border-panel-border px-5 py-2.5 text-sm transition hover:bg-white/[0.05]"
              >
                Request human review
              </button>
            </div>
          ) : (
            <>
              <VerificationPrompt
                fields={fields}
                initialAttempts={verification.attempts}
                onPass={handlePass}
                onAttempt={(ok) => recordVerificationAttempt(candidate.id, ok)}
                onLock={() =>
                  pushToast({
                    title: "Claim escalated",
                    body: "Attempt limit reached — a human moderator now reviews this case.",
                    tone: "alert",
                  })
                }
              />

              {passed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 border-t border-panel-border pt-6"
                >
                  {mine ? (
                    <button
                      onClick={openChat}
                      className="flex w-full items-center justify-center gap-2 rounded-lg gold-gradient px-5 py-3.5 text-sm font-semibold text-primary-foreground beacon-glow transition active:scale-[0.98]"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Open secure chat with {candidate.reporter.name}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      Verified. File your own report to open a recovery channel.
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}
        </GlassCard>
      </div>

      <div className="mono mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> Private questions and answers never appear on public listings.
      </div>
    </div>
  );
}
