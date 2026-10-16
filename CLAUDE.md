# CLAUDE.md

Guidance for Claude Code in this repo. **Read `SPEC.md` first.** It is the source of truth for features, data model and milestones.

## Project

Neeru (working name): a PWA showing real-time road waterlogging in Bengaluru, from community reports plus rainfall-based risk, with push alerts on users' saved commutes. We are racing the current monsoon, so **ship small, ship daily.** Prefer the simplest thing that works over the "right" abstraction.

## Owner context

The owner is an experienced backend SWE, new to frontend and mobile. Explain frontend and React concepts briefly when introducing them. Don't over-explain backend or SQL.

## Stack

- **Next.js** (App Router) + **TypeScript** (strict) + **Tailwind CSS**
- **MapLibre GL JS** via `react-map-gl/maplibre`, with OpenFreeMap tiles
- **Supabase**: Postgres + PostGIS, anonymous auth, Storage (photos), Realtime (live reports)
- **Web Push** (VAPID) with the `web-push` package, from Next.js Node runtime routes
- Scheduled jobs: **Supabase `pg_cron` + `pg_net`** calling `/api/jobs/*` with a shared secret header (not Vercel cron)
- Hosting: Vercel
- Package manager: pnpm

## Commands

```bash
pnpm dev            # local dev at http://localhost:3000
pnpm build          # production build; must pass before any commit
pnpm lint           # eslint
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest
supabase start      # local Supabase (Docker)
supabase db reset   # re-apply migrations + seed
supabase migration new <name>
supabase gen types typescript --local > src/lib/database.types.ts
```

## Layout

```
src/
  app/
    page.tsx                 # the map (home)
    r/[id]/page.tsx          # shareable report page + OG metadata
    r/[id]/opengraph-image.tsx
    area/[slug]/page.tsx
    routes/                  # saved routes UI
    api/
      reports/route.ts       # create report (server-side validation + rate limit)
      votes/route.ts
      push/subscribe/route.ts
      jobs/rain/route.ts     # pg_cron → ingest Open-Meteo + recompute spot_risk
      jobs/fanout/route.ts   # DB webhook on report insert/vote → push alerts
  components/                # MapView, ReportSheet, SeverityPicker, RouteCard, ...
  lib/
    supabase/{client,server}.ts
    geo.ts                   # bbox, distance helpers
    risk.ts                  # pure functions for risk rules (unit-tested)
    push.ts
public/
  manifest.webmanifest
  sw.js                      # service worker: push + notificationclick
supabase/
  migrations/
  seed.sql                   # known flood-prone spots
```

## Rules

### Geo
- Store everything as `geography(..., 4326)`. Coordinate order is **[lon, lat]** everywhere: GeoJSON, MapLibre and PostGIS `ST_MakePoint(lon, lat)`. Lat/lon swaps are the #1 bug risk, so assert inside the Bengaluru bbox `lon 77.35–77.85, lat 12.75–13.20` at API boundaries.
- Use `ST_DWithin(a, b, metres)` on geography for proximity, never degree-based math.
- Do spatial queries in SQL (RPC functions), not in JS.

### Data and security
- RLS on every table, following `SPEC.md` §5. Never expose the service-role key to the client. Service role is used only in `/api/jobs/*` and server routes.
- Validate all API input with **zod**.
- Report creation goes through `/api/reports`, which checks: GPS distance ≤ 500 m, rate limit 5/hour/user, and merges into an existing report if one within 200 m was active in the last 15 min.
- Job routes require the `x-job-secret` header to match `JOB_SECRET`.
- Strip EXIF from photos and compress client-side to ≤300 KB before upload.
- Never log precise user locations or route geometry.

### Time
- Store UTC. Display and evaluate route windows in **Asia/Kolkata**.

### Frontend
- Mobile-first. Design for a 360 px wide, low-end Android on 4G. The map is the home screen, and the report button stays thumb-reachable.
- Keep the client bundle lean. Lazy-load the photo picker, route editor and admin UI.
- Use server components by default; add `"use client"` only where needed (map, sheets, forms).
- Accessible tap targets (≥44 px). Severity uses colour **plus** icon and label.

### Config
- Risk thresholds and expiry durations live in the `config` table or `lib/risk.ts` constants. Don't scatter magic numbers.

## Env vars (`.env.local`, never commit)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
ORS_API_KEY=
JOB_SECRET=
```

## Workflow

- Work milestone by milestone (M0 → M1 → M2 in `SPEC.md`). Don't start M1 work while M0 is unfinished.
- Small commits with conventional messages (`feat:`, `fix:`, `chore:`).
- Before saying a task is done: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all pass.
- Unit-test pure logic (`risk.ts`, merge/expiry rules, route-window evaluation). Don't chase UI test coverage now.
- After schema changes, regenerate `database.types.ts`.
- When unsure about a product decision, check `SPEC.md`. If it isn't covered, pick the simpler option and leave a `// DECISION:` comment.

## Don't

- Don't add a signup wall, social login, or any feature not in `SPEC.md` without asking.
- Don't use the Google Maps APIs (cost) or scrape X/Twitter.
- Don't send push for anything except saved-route alerts.
- Don't add state-management libraries (Redux, etc.). React state + server data is enough.
