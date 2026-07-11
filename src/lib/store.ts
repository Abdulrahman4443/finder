import { useSyncExternalStore } from "react";
import type {
  AppNotification,
  AuditLogEntry,
  Broadcast,
  ChatMessage,
  Connection,
  QrTag,
  Report,
  VerificationState,
} from "./types";
import { buildSeedBroadcasts, buildSeedReports } from "./seed";

/**
 * Client-side network store.
 *
 * Persists the whole community network (seeded + user-created) in localStorage
 * and exposes it through useSyncExternalStore so every route reacts to changes.
 * Auth is real (Supabase); this store carries the app data until the cloud
 * schema in supabase/migrations is applied to a project.
 */

export interface NetworkState {
  reports: Report[];
  broadcasts: Broadcast[];
  tags: QrTag[];
  connections: Connection[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  verifications: VerificationState[];
  audit: AuditLogEntry[];
}

const STORAGE_KEY = "findr.network.v3";

function freshState(): NetworkState {
  return {
    reports: buildSeedReports(),
    broadcasts: buildSeedBroadcasts(),
    tags: [],
    connections: [],
    messages: [],
    notifications: [],
    verifications: [],
    audit: [],
  };
}

function loadState(): NetworkState {
  if (typeof window === "undefined") return freshState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as NetworkState;
    if (!Array.isArray(parsed.reports) || parsed.reports.length === 0) return freshState();
    return { ...freshState(), ...parsed };
  } catch {
    return freshState();
  }
}

let state: NetworkState = loadState();
const listeners = new Set<() => void>();

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — app keeps working in memory.
  }
}

function setState(mutate: (s: NetworkState) => NetworkState) {
  state = mutate(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNetworkState(): NetworkState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function getNetworkState(): NetworkState {
  return state;
}

let idCounter = 0;
export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function addReport(report: Report) {
  setState((s) => ({ ...s, reports: [report, ...s.reports] }));
  logAudit("report.created", `${report.kind} · ${report.category} · ${report.title}`);
}

export function updateReportStatus(reportId: string, status: Report["status"]) {
  setState((s) => ({
    ...s,
    reports: s.reports.map((r) => (r.id === reportId ? { ...r, status } : r)),
  }));
}

export function flagReport(reportId: string) {
  setState((s) => ({
    ...s,
    reports: s.reports.map((r) => (r.id === reportId ? { ...r, flagged: true } : r)),
  }));
}

export function addBroadcast(b: Broadcast) {
  setState((s) => ({ ...s, broadcasts: [b, ...s.broadcasts] }));
}

export function mintTag(tag: QrTag) {
  setState((s) => ({ ...s, tags: [tag, ...s.tags] }));
  logAudit("tag.minted", `${tag.id} · ${tag.label}`);
}

export function recordTagScan(tagId: string, note?: string) {
  setState((s) => ({
    ...s,
    tags: s.tags.map((t) =>
      t.id === tagId ? { ...t, scans: [{ at: new Date().toISOString(), note }, ...t.scans] } : t,
    ),
  }));
}

export function addConnection(conn: Connection, opening: ChatMessage[]) {
  setState((s) => {
    const withoutConn = s.connections.filter((c) => c.id !== conn.id);
    const ids = new Set(s.messages.map((m) => m.id));
    const freshOpening = opening.filter((m) => !ids.has(m.id));
    return {
      ...s,
      connections: [conn, ...withoutConn],
      messages: [...s.messages, ...freshOpening],
    };
  });
  logAudit("connection.opened", `verified match · ${conn.itemTitle}`);
}

export function upsertConnection(conn: Connection) {
  setState((s) => {
    const idx = s.connections.findIndex((c) => c.id === conn.id);
    if (idx === -1) return { ...s, connections: [conn, ...s.connections] };
    const next = [...s.connections];
    next[idx] = { ...next[idx], ...conn };
    return { ...s, connections: next };
  });
}

export function patchConnection(connectionId: string, patch: Partial<Connection>) {
  setState((s) => ({
    ...s,
    connections: s.connections.map((c) => (c.id === connectionId ? { ...c, ...patch } : c)),
  }));
}

export function addMessage(msg: ChatMessage) {
  setState((s) => {
    if (s.messages.some((m) => m.id === msg.id)) return s;
    return { ...s, messages: [...s.messages, msg] };
  });
}

export function mergeMessages(incoming: ChatMessage[]) {
  if (incoming.length === 0) return;
  setState((s) => {
    const ids = new Set(s.messages.map((m) => m.id));
    const fresh = incoming.filter((m) => !ids.has(m.id));
    if (fresh.length === 0) return s;
    return {
      ...s,
      messages: [...s.messages, ...fresh].sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
    };
  });
}

export function markConnectionRecovered(
  connectionId: string,
  opts?: { silent?: boolean; skipBroadcast?: boolean },
) {
  setState((s) => {
    const conn = s.connections.find((c) => c.id === connectionId);
    if (conn?.recovered) return s;
    return {
      ...s,
      connections: s.connections.map((c) =>
        c.id === connectionId ? { ...c, recovered: true } : c,
      ),
      reports: conn
        ? s.reports.map((r) =>
            r.id === conn.myReportId || r.id === conn.otherReportId
              ? { ...r, status: "recovered" as const }
              : r,
          )
        : s.reports,
    };
  });
  if (!opts?.silent) {
    logAudit("case.recovered", `connection ${connectionId} closed`);
  }
  if (!opts?.skipBroadcast && typeof window !== "undefined") {
    void import("./liveChat").then(({ broadcastRecovered, isLiveChatConnected }) => {
      if (isLiveChatConnected(connectionId)) void broadcastRecovered(connectionId);
    });
  }
}

export function pushNotification(n: Omit<AppNotification, "id" | "at" | "read">) {
  setState((s) => ({
    ...s,
    notifications: [
      { ...n, id: makeId("n"), at: new Date().toISOString(), read: false },
      ...s.notifications,
    ].slice(0, 50),
  }));
}

export function markNotificationsRead() {
  setState((s) => ({
    ...s,
    notifications: s.notifications.map((n) => ({ ...n, read: true })),
  }));
}

export function getVerification(reportId: string): VerificationState {
  return (
    state.verifications.find((v) => v.reportId === reportId) ?? {
      reportId,
      attempts: 0,
      passed: false,
      locked: false,
    }
  );
}

export function recordVerificationAttempt(reportId: string, passed: boolean, maxAttempts = 3) {
  setState((s) => {
    const existing = s.verifications.find((v) => v.reportId === reportId);
    const attempts = (existing?.attempts ?? 0) + (passed ? 0 : 1);
    const locked = !passed && attempts >= maxAttempts;
    const next: VerificationState = { reportId, attempts, passed, locked };
    return {
      ...s,
      verifications: [...s.verifications.filter((v) => v.reportId !== reportId), next],
    };
  });
  logAudit(
    passed ? "verify.passed" : "verify.failed",
    `report ${reportId} · ${passed ? "challenge passed" : "wrong answer"}`,
  );
}

export function logAudit(action: string, detail: string) {
  setState((s) => ({
    ...s,
    audit: [{ id: makeId("a"), at: new Date().toISOString(), action, detail }, ...s.audit].slice(
      0,
      200,
    ),
  }));
}

export function resetNetwork() {
  state = freshState();
  persist();
  listeners.forEach((l) => l());
}
