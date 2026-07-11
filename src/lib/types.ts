export type Category =
  | "wallet"
  | "phone"
  | "laptop"
  | "keys"
  | "passport"
  | "license"
  | "bag"
  | "jewelry"
  | "pet"
  | "bicycle"
  | "electronics"
  | "person"
  | "other";

export type ReportKind = "lost" | "found";
export type ReportStatus = "open" | "matched" | "recovered" | "escalated";

export interface PrivateField {
  question: string;
  answer: string;
}

export interface Reporter {
  id: string;
  name: string;
  trust: number;
}

export interface Report {
  id: string;
  kind: ReportKind;
  category: Category;
  title: string;
  description: string;
  location: [number, number];
  radiusM: number;
  photo?: string;
  createdAt: string;
  status: ReportStatus;
  reporter: Reporter;
  privateFields: PrivateField[];
  sensitive?: boolean;
  flagged?: boolean;
}

export interface MatchCandidate {
  candidate: Report;
  mine: Report;
  score: number;
  textScore: number;
  visionScore: number;
  distanceKm: number;
}

export interface Connection {
  id: string;
  myReportId: string;
  otherReportId: string;
  otherReporter: Reporter;
  itemTitle: string;
  verifiedAt: string;
  recovered: boolean;
  /** Auth user who opened the channel after verification. */
  openerId?: string;
  /** Second signed-in user who joined via invite / live link. */
  peerId?: string;
  /** True when this room uses Supabase Realtime (two-browser live chat). */
  live?: boolean;
}

export type MessageFrom = "me" | "them" | "sys";

export interface ChatMessage {
  id: string;
  connectionId: string;
  /** Legacy local-only side. Prefer senderId for live chat. */
  from?: MessageFrom;
  /** Auth user id, or "sys" for system notices. */
  senderId?: string;
  senderName?: string;
  text: string;
  kind?: "text" | "location" | "sys";
  at: string;
}

export interface Broadcast {
  id: string;
  author: string;
  category: Category;
  title: string;
  body: string;
  at: string;
  distanceKm: number;
  urgent?: boolean;
}

export interface TagScan {
  at: string;
  note?: string;
}

export interface QrTag {
  id: string;
  label: string;
  category: Category;
  ownerId: string;
  createdAt: string;
  scans: TagScan[];
  active: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
}

export interface VerificationState {
  reportId: string;
  attempts: number;
  passed: boolean;
  locked: boolean;
}

export interface AuditLogEntry {
  id: string;
  at: string;
  action: string;
  detail: string;
}

export interface HeatPoint {
  lat: number;
  lng: number;
  weight: number;
}
