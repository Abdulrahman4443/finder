import type { MatchCandidate, Report } from "./types";
import { haversineKm } from "./geo";

/**
 * Client-side semantic matching engine.
 *
 * Mirrors the production design (text embeddings + vision features + geo weighting)
 * with a deterministic in-browser approximation: token vectors with synonym
 * expansion stand in for embeddings, and the blended score combines text,
 * attribute overlap, and distance decay.
 */

const SYNONYMS: Record<string, string[]> = {
  black: ["dark", "charcoal", "jet"],
  dark: ["black", "charcoal"],
  brown: ["tan", "beige", "camel", "chestnut"],
  tan: ["brown", "beige", "camel"],
  white: ["cream", "ivory", "pale"],
  gray: ["grey", "silver", "slate"],
  grey: ["gray", "silver", "slate"],
  red: ["maroon", "crimson", "scarlet"],
  blue: ["navy", "azure", "cobalt"],
  green: ["olive", "emerald"],
  gold: ["golden", "yellow", "brass"],
  golden: ["gold", "yellow"],
  wallet: ["purse", "billfold", "cardholder"],
  purse: ["wallet", "handbag", "bag"],
  bag: ["backpack", "handbag", "satchel", "luggage", "purse"],
  backpack: ["bag", "rucksack"],
  phone: ["iphone", "smartphone", "mobile", "android", "samsung"],
  iphone: ["phone", "smartphone", "mobile"],
  laptop: ["macbook", "notebook", "computer", "thinkpad"],
  macbook: ["laptop", "notebook"],
  keys: ["key", "keychain", "fob", "keyring"],
  key: ["keys", "keychain"],
  dog: ["puppy", "retriever", "pup", "canine"],
  cat: ["kitten", "feline"],
  leather: ["hide", "suede"],
  small: ["little", "tiny", "slim", "compact"],
  large: ["big", "huge", "oversized"],
  scratch: ["scratched", "scuff", "mark", "worn"],
  sticker: ["stickers", "decal", "label"],
  collar: ["tag", "leash"],
  glasses: ["spectacles", "sunglasses", "eyeglasses"],
  ring: ["band", "jewelry"],
  watch: ["wristwatch", "timepiece"],
  card: ["cards", "id", "license"],
  child: ["kid", "boy", "girl", "toddler"],
  man: ["male", "gentleman", "elderly"],
  woman: ["female", "lady", "elderly"],
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "my",
  "it",
  "its",
  "is",
  "was",
  "with",
  "and",
  "or",
  "of",
  "in",
  "on",
  "at",
  "near",
  "lost",
  "found",
  "have",
  "has",
  "to",
  "for",
  "this",
  "that",
  "some",
  "one",
  "two",
  "very",
  "left",
  "around",
]);

export function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 2 || STOP_WORDS.has(raw)) continue;
    tokens.add(raw);
    const singular = raw.endsWith("s") ? raw.slice(0, -1) : null;
    if (singular && singular.length >= 2) tokens.add(singular);
  }
  return tokens;
}

function expand(tokens: Set<string>): Set<string> {
  const out = new Set(tokens);
  for (const t of tokens) {
    for (const syn of SYNONYMS[t] ?? []) out.add(syn);
  }
  return out;
}

/** Soft cosine over expanded token sets, in [0, 1]. */
export function textSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  const ea = expand(ta);
  const eb = expand(tb);
  let hitsA = 0;
  for (const t of ta) if (eb.has(t)) hitsA++;
  let hitsB = 0;
  for (const t of tb) if (ea.has(t)) hitsB++;
  const recall = hitsA / ta.size;
  const precision = hitsB / tb.size;
  if (recall + precision === 0) return 0;
  return (2 * recall * precision) / (recall + precision);
}

/** Distance decay: full weight inside 1 km, fading to ~0 at 25 km. */
function distanceScore(km: number): number {
  if (km <= 1) return 1;
  return Math.max(0, 1 - Math.log10(km) / Math.log10(25));
}

/** Recency decay across 14 days. */
function recencyScore(iso: string): number {
  const ageDays = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  return Math.max(0.2, 1 - ageDays / 14);
}

export function scorePair(mine: Report, candidate: Report): MatchCandidate {
  const text = textSimilarity(
    `${mine.title} ${mine.description}`,
    `${candidate.title} ${candidate.description}`,
  );
  const categoryBoost = mine.category === candidate.category ? 1 : 0.35;
  // Photo present on both sides stands in for a vision-model comparison.
  const vision = candidate.photo && mine.photo ? Math.min(1, text * 1.15 + 0.1) : text * 0.9;
  const distanceKm = haversineKm(mine.location, candidate.location);
  const geo = distanceScore(distanceKm);
  const recency = recencyScore(candidate.createdAt);

  const blended = (0.48 * text + 0.22 * vision + 0.2 * geo + 0.1 * recency) * categoryBoost;
  const score = Math.round(Math.min(0.99, blended) * 100);

  return {
    mine,
    candidate,
    score,
    textScore: Math.round(text * 100),
    visionScore: Math.round(vision * 100),
    distanceKm: Math.round(distanceKm * 10) / 10,
  };
}

/** Minimum confidence shown to users. Below this, treat as no match. */
export const MIN_MATCH_SCORE = 60;

/** Rank counterpart reports (lost↔found) for a given report. */
export function findMatches(mine: Report, all: Report[], limit = 8): MatchCandidate[] {
  const wantKind = mine.kind === "lost" ? "found" : "lost";
  return all
    .filter(
      (r) =>
        r.id !== mine.id &&
        r.kind === wantKind &&
        r.status !== "recovered" &&
        r.reporter.id !== mine.reporter.id,
    )
    .map((r) => scorePair(mine, r))
    .filter((m) => m.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Fuzzy answer check for verification challenges.
 * "500 rupees" matches "Rs. 500" — token overlap plus edit tolerance.
 */
export function fuzzyAnswerMatch(given: string, expected: string): boolean {
  const g = normalizeAnswer(given);
  const e = normalizeAnswer(expected);
  if (!g || !e) return false;
  if (g === e) return true;

  const gt = tokenize(g);
  const et = tokenize(e);
  if (et.size > 0) {
    let hits = 0;
    for (const t of et) {
      if (gt.has(t)) {
        hits++;
        continue;
      }
      for (const gtok of gt) {
        if (levenshtein(gtok, t) <= Math.max(1, Math.floor(t.length / 4))) {
          hits++;
          break;
        }
      }
    }
    if (hits / et.size >= 0.6) return true;
  }
  return levenshtein(g, e) <= Math.max(1, Math.floor(e.length / 4));
}

/** Strip currency labels so "Rs. 500" and "500 rupees" share the same digits. */
function normalizeAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/rs\.?|pkr|rupees?|inr|\$|usd|€|eur/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
