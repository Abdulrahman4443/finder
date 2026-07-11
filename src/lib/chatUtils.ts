import type { ChatMessage, Connection, MessageFrom } from "./types";

/** Resolve bubble side for the current viewer. */
export function messageSide(m: ChatMessage, myUserId: string | undefined): MessageFrom {
  if (m.kind === "sys" || m.from === "sys" || m.senderId === "sys") return "sys";
  if (m.senderId && myUserId && m.senderId === myUserId) return "me";
  if (m.from === "me" && !m.senderId) return "me";
  if (m.from === "them") return "them";
  if (m.senderId && myUserId && m.senderId !== myUserId) return "them";
  return m.from === "me" ? "me" : "them";
}

export function chatInviteUrl(connectionId: string, title: string, peerName: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const q = new URLSearchParams({
    invite: "1",
    title,
    peer: peerName,
  });
  return `${origin}/chat/${connectionId}?${q.toString()}`;
}

export function ensureConnectionStub(
  existing: Connection | undefined,
  opts: {
    id: string;
    itemTitle: string;
    otherName: string;
    myReportId?: string;
    otherReportId?: string;
  },
): Connection {
  if (existing) return existing;
  return {
    id: opts.id,
    myReportId: opts.myReportId ?? "",
    otherReportId: opts.otherReportId ?? "",
    otherReporter: { id: "peer", name: opts.otherName || "Other party", trust: 50 },
    itemTitle: opts.itemTitle || "Verified recovery",
    verifiedAt: new Date().toISOString(),
    recovered: false,
    live: true,
  };
}
