# FindrAI — AI-Powered Community Recovery Network

Lost-and-found, reimagined: report a lost or found item (or a missing person), let semantic
AI + vision + geolocation surface the match, prove ownership through a private verification
challenge, and recover it over secure in-app chat.

## Features

- **Semantic AI matching** — descriptions are compared by meaning (synonym-aware token
  vectors standing in for embeddings), blended with vision, distance, and recency into a
  live confidence score.
- **Verification challenge** — 1–3 private questions per report, fuzzy answer matching
  ("500 rupees" matches "Rs. 500"), 3 attempts, then automatic escalation to human review.
- **Sensitive case protocol** — missing-person flow with required private identifying
  details, an urgent city broadcast, a standing "contact police" banner, and a permanent
  audit trail.
- **Live map & heatmap** — every report on a dark map with pulsing beacons plus an
  anonymized density heatmap (locations are blurred; exact addresses are never shown).
- **Secure chat** — opens only after verification passes; share meeting pins in-app and
  mark cases recovered.
- **City broadcasts** — geofenced, radius-controlled, opt-in alerts with urgent priority.
- **QR smart tags** — real scannable QR codes that notify the owner without exposing a
  phone number, with scan history.
- **Ops dashboard** — live stats, category breakdown, recovery heatmap, community
  leaderboard, fraud/duplicate detection, and the audit log.
- **Judge demo mode** — one-tap report → match → verify → chat → recovered loop in under
  30 seconds, scored live by the real matching engine.

## Stack

- Vite + React 19 + TypeScript
- TanStack Router (file-based, SPA)
- Tailwind CSS v4 + Framer Motion + lucide-react
- Leaflet + leaflet.heat (dark CARTO tiles)
- Supabase (authentication + `profiles`; full app schema in `supabase/migrations`)

## Getting started

```bash
npm install
npm run dev        # http://localhost:8080
```

Create a `.env` with your Supabase project credentials:

```
VITE_SUPABASE_URL="https://<project>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon key>"
```

Authentication (sign up / sign in) runs against Supabase. Network data (reports, matches,
chat, tags) currently lives in a persistent client-side store seeded with a demo network;
`supabase/migrations/20260711000000_findr_core_schema.sql` contains the full cloud schema
(reports, private verification fields, matches, connections, messages, broadcasts, QR tags,
notifications, admin logs — all with row-level security) for moving that data to the cloud
with `supabase db push`.

## Scripts

| Command             | Purpose                      |
| ------------------- | ---------------------------- |
| `npm run dev`       | Dev server on port 8080      |
| `npm run build`     | Production build             |
| `npm run preview`   | Preview the production build |
| `npm run typecheck` | TypeScript check             |
| `npm run lint`      | ESLint                       |
