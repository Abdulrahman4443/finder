import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  CheckCheck,
  Copy,
  Link2,
  Loader2,
  MapPin,
  PartyPopper,
  Radio,
  SendHorizonal,
} from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { SequenceProgress } from "../components/SequenceProgress";
import { pushToast } from "../components/NotificationToast";
import { useAuth } from "../hooks/useAuth";
import {
  addMessage,
  makeId,
  markConnectionRecovered,
  pushNotification,
  upsertConnection,
  useNetworkState,
} from "../lib/store";
import { broadcastChatMessage, joinLiveChat } from "../lib/liveChat";
import { chatInviteUrl, ensureConnectionStub, messageSide } from "../lib/chatUtils";
import { clockTime } from "../lib/format";
import type { ChatMessage } from "../lib/types";

type ChatSearch = { invite?: string; title?: string; peer?: string };

export const Route = createFileRoute("/chat/$connectionId")({
  component: Chat,
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    invite: typeof search.invite === "string" ? search.invite : undefined,
    title: typeof search.title === "string" ? search.title : undefined,
    peer: typeof search.peer === "string" ? search.peer : undefined,
  }),
  head: () => ({ meta: [{ title: "Live Chat · FindrAI" }] }),
});

function Chat() {
  const { connectionId } = Route.useParams();
  const search = Route.useSearch();
  const { connections, messages } = useNetworkState();
  const { user, displayName, loading, setAuthModalOpen } = useAuth();
  const [input, setInput] = useState("");
  const [liveStatus, setLiveStatus] = useState<"connecting" | "live" | "error" | "idle">("idle");
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Invitee: materialize a local room stub from the shared link.
  useEffect(() => {
    if (!user) return;
    const existing = connections.find((c) => c.id === connectionId);
    if (existing) return;
    if (search.invite !== "1" && !search.title) return;
    upsertConnection(
      ensureConnectionStub(undefined, {
        id: connectionId,
        itemTitle: search.title || "Verified recovery",
        otherName: search.peer || "Other party",
      }),
    );
  }, [user, connectionId, connections, search.invite, search.title, search.peer]);

  const connection = useMemo(
    () => connections.find((c) => c.id === connectionId) ?? null,
    [connections, connectionId],
  );

  const thread = useMemo(
    () =>
      messages
        .filter((m) => m.connectionId === connectionId)
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    [messages, connectionId],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.length]);

  // Connect Realtime once signed in.
  useEffect(() => {
    if (!user || !connection || connection.recovered) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    setLiveStatus("connecting");
    joinLiveChat(connectionId, { id: user.id, name: displayName })
      .then((leave) => {
        if (cancelled) {
          leave();
          return;
        }
        cleanup = leave;
        setLiveStatus("live");
      })
      .catch(() => {
        if (!cancelled) setLiveStatus("error");
      });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [user, connectionId, connection?.id, connection?.recovered, displayName]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <GlassCard className="py-14 text-center">
          <div className="font-display text-xl font-semibold">Sign in to open live chat</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Both people need a FindrAI account so messages sync in real time.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="mt-5 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Sign in
          </button>
        </GlassCard>
      </div>
    );
  }

  if (!connection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <GlassCard className="py-14 text-center">
          <div className="font-display text-xl font-semibold">Channel not found</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask the other person to resend the invite link, or open chat from Matches after
            verification.
          </p>
          <Link to="/matches" className="mt-5 inline-block text-sm text-gold hover:underline">
            ← Back to matches
          </Link>
        </GlassCard>
      </div>
    );
  }

  const invite = chatInviteUrl(connection.id, connection.itemTitle, displayName);
  const peerOnline = Boolean(connection.peerId && connection.peerId !== user.id);

  const send = async () => {
    const text = input.trim();
    if (!text || connection.recovered) return;
    const msg: ChatMessage = {
      id: makeId("m"),
      connectionId: connection.id,
      senderId: user.id,
      senderName: displayName,
      from: "me",
      text,
      kind: "text",
      at: new Date().toISOString(),
    };
    addMessage(msg);
    setInput("");
    await broadcastChatMessage(connection.id, msg);
  };

  const shareLocation = async () => {
    if (connection.recovered) return;
    const msg: ChatMessage = {
      id: makeId("m"),
      connectionId: connection.id,
      senderId: user.id,
      senderName: displayName,
      from: "me",
      kind: "location",
      text: "Shared a live meeting pin",
      at: new Date().toISOString(),
    };
    addMessage(msg);
    await broadcastChatMessage(connection.id, msg);
  };

  const markRecovered = () => {
    markConnectionRecovered(connection.id);
    const sys: ChatMessage = {
      id: makeId("m"),
      connectionId: connection.id,
      from: "sys",
      senderId: "sys",
      kind: "sys",
      text: "Case marked as Recovered. Trust scores updated for both parties.",
      at: new Date().toISOString(),
    };
    addMessage(sys);
    void broadcastChatMessage(connection.id, sys);
    pushNotification({
      title: "Case recovered",
      body: `${connection.itemTitle} is back with its owner. Trust +5.`,
    });
    pushToast({ title: "Item recovered!", body: "Your trust score went up.", tone: "verify" });
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      pushToast({ title: "Invite copied", body: "Send it to the other person.", tone: "verify" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      pushToast({ title: "Copy failed", body: invite, tone: "alert" });
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/matches" className="text-sm text-muted-foreground hover:text-foreground">
        ← Matches
      </Link>

      <div className="mt-5">
        <SequenceProgress step={connection.recovered ? "recovered" : "chat"} />
      </div>

      <GlassCard className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-panel-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold font-bold text-primary-foreground">
              {connection.otherReporter.name[0]}
            </div>
            <div>
              <div className="font-semibold">{connection.otherReporter.name}</div>
              <div className="mono flex items-center gap-1 text-xs text-verify">
                <BadgeCheck className="h-3.5 w-3.5" /> verified · {connection.itemTitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`mono hidden items-center gap-1 rounded-full px-2.5 py-1 text-[10px] sm:inline-flex ${
                liveStatus === "live"
                  ? "bg-verify/15 text-verify"
                  : liveStatus === "connecting"
                    ? "bg-white/5 text-muted-foreground"
                    : liveStatus === "error"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-white/5 text-muted-foreground"
              }`}
            >
              <Radio className="h-3 w-3" />
              {liveStatus === "live"
                ? peerOnline
                  ? "live · peer online"
                  : "live · waiting"
                : liveStatus === "connecting"
                  ? "connecting…"
                  : liveStatus === "error"
                    ? "offline"
                    : "idle"}
            </span>
            <button
              onClick={markRecovered}
              disabled={connection.recovered}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                connection.recovered
                  ? "bg-verify/20 text-verify"
                  : "bg-gold text-primary-foreground active:scale-[0.98]"
              }`}
            >
              {connection.recovered ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5" /> Recovered
                </>
              ) : (
                "Mark recovered"
              )}
            </button>
          </div>
        </div>

        {!connection.recovered && (
          <div className="flex flex-wrap items-center gap-2 border-b border-panel-border bg-white/[0.02] px-4 py-3">
            <Link2 className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs text-muted-foreground">
              Share this link so the other signed-in person joins the same live room:
            </span>
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium transition hover:border-gold/40"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copied" : "Copy invite"}
            </button>
          </div>
        )}

        <div className="h-[430px] space-y-3 overflow-y-auto bg-background/30 p-4">
          <AnimatePresence initial={false}>
            {thread.map((m) => {
              const side = messageSide(m, user.id);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={
                    side === "sys"
                      ? "text-center"
                      : side === "me"
                        ? "flex justify-end"
                        : "flex justify-start"
                  }
                >
                  {side === "sys" ? (
                    <span className="mono glass inline-block rounded-full px-3 py-1 text-[11px] text-muted-foreground">
                      {m.text}
                    </span>
                  ) : (
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        side === "me"
                          ? "rounded-br-md bg-gold text-primary-foreground"
                          : "glass rounded-bl-md"
                      }`}
                    >
                      {side === "them" && m.senderName && (
                        <div className="mb-0.5 text-[10px] font-medium text-muted-foreground">
                          {m.senderName}
                        </div>
                      )}
                      {m.kind === "location" && (
                        <span className="mr-1 inline-flex align-text-bottom">
                          <MapPin className="h-3.5 w-3.5 text-verify" />
                        </span>
                      )}
                      {m.text}
                      <div
                        className={`mono mt-1 text-[10px] ${
                          side === "me" ? "text-primary-foreground/70" : "text-muted-foreground"
                        }`}
                      >
                        {clockTime(m.at)}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          {thread.filter((m) => messageSide(m, user.id) !== "sys").length === 0 && (
            <div className="px-2 py-8 text-center text-sm text-muted-foreground">
              Channel is live. Copy the invite for the other person — when they sign in and open
              it, both of you see messages instantly.
            </div>
          )}
          {connection.recovered && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-sm rounded-lg border border-gold/50 bg-accent p-4 text-center"
            >
              <PartyPopper className="mx-auto mb-1 h-6 w-6 text-gold" />
              <div className="font-display font-semibold text-gold">Marked as Recovered</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Case closed · trust score +5 for both parties
              </div>
            </motion.div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-panel-border p-3">
          <button
            onClick={shareLocation}
            disabled={connection.recovered}
            className="rounded-lg border border-panel-border p-2.5 text-muted-foreground transition hover:border-gold/50 hover:text-gold disabled:opacity-40"
            title="Share meeting location"
          >
            <MapPin className="h-4 w-4" />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void send()}
            disabled={connection.recovered}
            placeholder={connection.recovered ? "Case closed" : "Message…"}
            className="flex-1 rounded-lg border border-input bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition focus:border-gold/60 disabled:opacity-50"
          />
          <button
            onClick={() => void send()}
            disabled={connection.recovered || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </div>
      </GlassCard>

      <div className="mono mt-4 text-center text-xs text-muted-foreground">
        Live via Supabase Realtime · both users must be signed in · no bot replies
      </div>
    </div>
  );
}
