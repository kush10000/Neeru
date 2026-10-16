# Neeru — Bengaluru waterlogging map (working name)

> "Is my route flooded right now, and will it be in the next hour?"

A community + rainfall-driven map of road waterlogging in Bengaluru, with alerts on your saved commute. Launch target: **v0 live in 3 days, public launch in ~12 days**, during the current late monsoon.

---

## 1. Why this, why now

- Government system (KSNDMC's Bengaluru Megha Sandesha) is driven by stormwater-drain sensors. It doesn't capture **road** waterlogging (underpasses, dips, blocked drains), and public awareness is low.
- Today, commuters learn about flooded roads from WhatsApp forwards, X posts and Reddit, usually too late.
- Positioning: **road-level, commute-first, real-time, community-verified.**
- Disclaimer shown in app: *"Community reports + rainfall estimates. Not an official source."*

## 2. Key decision: web app (PWA) first, not native

| | PWA now | Native app now |
|---|---|---|
| Time to launch | Days | Weeks |
| Play Store | Not needed | New personal dev accounts must run a closed test with ~12 testers for 14 days before production |
| Sharing | A WhatsApp link opens it instantly | Install friction |
| Push | Android Chrome yes; iOS 16.4+ only after "Add to Home Screen" | Yes |

**Plan:** ship a PWA now. In parallel, start Play Store closed testing with a TWA wrapper (Bubblewrap) of the same PWA, so it can go to the store later with no rewrite.

## 3. Users and core jobs

1. **Commuter (primary):** before or while leaving, check if their route is flooded, and get pinged if it floods.
2. **Reporter:** sees water and reports it in under 10 seconds.
3. **Resident / RWA:** follows their area and shares alerts to WhatsApp groups.

## 4. Features by milestone

### M0: "The map" (Days 1–3) → soft launch to friends, RWA groups
- Full-screen map of Bengaluru (MapLibre + OpenFreeMap tiles).
- **Known flood-prone spots** seeded (grey markers), so the map is never empty.
- **Report flow** (big button, bottom center):
  1. Uses the device GPS. The pin is draggable but must stay within **500 m of the GPS fix**, to stop remote spam.
  2. Pick severity: **Ankle-deep / Knee-deep / Impassable** (big buttons with icons).
  3. Optional photo (compress to ≤300 KB client-side, strip EXIF).
  4. Optional note (≤140 chars).
- Reverse-geocode the place name (Photon) and store it on the report.
- **Report lifecycle:**
  - Active for **2 h after last confirmation**, then fades out.
  - Others can tap **"Still flooded"** (+1, refreshes the 2 h timer) or **"Cleared"** (−1).
  - Hidden when `cleared_votes >= still_votes + 2`.
  - A new report within **200 m of an active report in the last 15 min** becomes a confirmation, not a duplicate.
- Marker colour by severity; opacity by age.
- Anonymous auth (Supabase anonymous sign-in). No signup wall.
- Rate limit: **5 reports/hour/user**.
- Safety copy on the report sheet: "Don't use your phone while riding. Pull over first."

### M1: "Rain-aware" (Days 4–7)
- Rainfall ingestion job every **30 min** from Open-Meteo for a ~5 km grid over Bengaluru (~100 points).
- **Risk overlay** on known spots: Low / Medium / High (rules in §6).
- "Likely flooded" badge on high-risk spots when there are no fresh reports.
- **Share pages:** `/r/[id]` with an OG image, e.g. *"Knee-deep water at Silk Board — reported 12 min ago"*, plus a one-tap WhatsApp share button.
- Area page: `/area/[slug]` (e.g. `/area/bellandur`) listing active reports and risk. Good for sharing in RWA groups.

### M2: "Alerts" (Days 8–12) → public launch
- **Saved routes:** pick start and end (Photon autocomplete, biased to the Bengaluru bbox), fetch the route once from the OpenRouteService Directions API, and store it as a LineString.
- Route settings: name ("Office"), active days (default Mon–Fri), time window (e.g. 08:00–11:00 and 17:00–21:00 IST).
- **Web push** (VAPID). Prompt only after a route is saved, never on first load.
- Alert triggers:
  - A new or escalated active report within `buffer_m` (default 150 m) of a route, during its active window.
  - A known spot on the route turns **High** risk.
- Dedupe: max one alert per (route, report) and one per (route, spot) per 3 h.
- PWA install prompt with iOS "Add to Home Screen" instructions (required for iOS push).
- "Route status" card: ✅ Clear / ⚠️ Risky / 🚫 Flooded, listing the spots along the route.

### M3: After launch
- Admin moderation page (hide reports, ban users), behind a Supabase role.
- Play Store release via TWA.
- ML risk model (§7).
- Optional Telegram channel per zone as a push fallback for iOS users who won't install.

## 5. Data model (Supabase Postgres + PostGIS)

All geometry is `geography(…, 4326)` (lon/lat, distances in metres).

```sql
create extension if not exists postgis;

create type severity as enum ('ankle', 'knee', 'impassable');

create table spots (               -- known flood-prone locations (seeded)
  id bigint generated always as identity primary key,
  name text not null,
  geom geography(Point, 4326) not null,
  source text,                     -- 'bbmp_list' | 'news' | 'community'
  notes text,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  geom geography(Point, 4326) not null,
  place_name text,
  severity severity not null,
  photo_path text,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  hidden boolean not null default false
);

create table report_votes (
  report_id uuid references reports on delete cascade,
  user_id uuid references auth.users on delete cascade,
  vote smallint not null check (vote in (-1, 1)),   -- +1 still flooded, -1 cleared
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  geom geography(LineString, 4326) not null,
  buffer_m int not null default 150,
  active_days int[] not null default '{1,2,3,4,5}', -- ISO weekday, 1 = Mon
  windows jsonb not null default '[{"start":"08:00","end":"11:00"},{"start":"17:00","end":"21:00"}]',
  created_at timestamptz not null default now()
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table rain_cells (
  id int primary key,
  geom geography(Point, 4326) not null
);

create table rain_obs (
  cell_id int references rain_cells,
  ts timestamptz not null,              -- hour bucket, UTC
  precip_mm numeric not null,
  primary key (cell_id, ts)
);

create table spot_risk (
  spot_id bigint primary key references spots,
  level text not null check (level in ('low', 'medium', 'high')),
  rain_1h_mm numeric,
  rain_3h_mm numeric,
  computed_at timestamptz not null default now()
);

create table alerts_sent (
  route_id uuid references routes on delete cascade,
  subject_type text not null,           -- 'report' | 'spot'
  subject_id text not null,
  sent_at timestamptz not null default now(),
  primary key (route_id, subject_type, subject_id)
);

create table config (key text primary key, value jsonb not null);

create index on spots using gist (geom);
create index on reports using gist (geom);
create index on reports (last_confirmed_at desc);
create index on routes using gist (geom);
create index on rain_cells using gist (geom);
```

**`active_reports` view:** non-hidden reports with `last_confirmed_at > now() - interval '2 hours'`, joined with vote counts. Exclude reports where `cleared >= still + 2`.

**RLS:**
- `spots`, `spot_risk`, `active_reports`: public read.
- `reports`, `report_votes`: insert only as yourself; public read through the view only.
- `routes`, `push_subscriptions`: owner-only, all operations.
- `rain_*`, `alerts_sent`, `config`: service role only.

## 6. Risk rules v0 (no ML)

Run after each rainfall ingest. For each spot, take its nearest rain cell:

| Level | Condition |
|---|---|
| **High** | rain_1h ≥ 20 mm **or** rain_3h ≥ 40 mm **or** an active knee/impassable report within 300 m |
| **Medium** | rain_1h ≥ 10 mm **or** rain_3h ≥ 20 mm **or** any active report within 300 m |
| **Low** | otherwise |

Keep all thresholds in `config` so they can be tuned without a deploy. Log every computation, because this logged data becomes the ML training set.

## 7. ML plan (after ~2–4 weeks of reports)

- **Label:** spot *s* was waterlogged in hour *t* (≥1 confirmed report within 300 m).
- **Features:** rain over the last 1, 3 and 6 h; rain over the previous 24 h (soil saturation); spot elevation relative to the 500 m neighbourhood (SRTM DEM); distance to nearest lake or drain (OSM); historical flood rate of the spot; hour of day.
- **Model:** gradient boosting (LightGBM or XGBoost), calibrated probabilities. Watch for class imbalance and report bias (busy roads get more reports).
- **Serve:** a Python FastAPI job writes `spot_risk.prob`; the app shows "70% likely flooded."

## 8. External services (all free tiers at launch)

| Need | Service | Notes |
|---|---|---|
| Map tiles | OpenFreeMap | No API key |
| Map lib | MapLibre GL JS via `react-map-gl` | |
| Geocoding | Photon (komoot) | Bias to bbox `77.35,12.75,77.85,13.20`; respect fair use and cache results |
| Routing | OpenRouteService | Free key; called only when a route is saved |
| Rainfall | Open-Meteo | Free tier is non-commercial; multi-location requests count per location. Check current limits |
| DB / auth / storage / realtime | Supabase | Enable anonymous sign-ins |
| Hosting | Vercel | Hobby cron runs only once a day, so schedule jobs with Supabase `pg_cron` + `pg_net` instead |
| Push | Web Push (VAPID) via `web-push` | Sent from a Next.js Node route |
| Analytics | PostHog or Plausible | |

## 9. Seeding known spots (do on Day 1)

Commonly reported waterlogging areas to geocode, then **verify manually on the map**. Pin the exact underpass or junction, not the locality centroid:

Silk Board junction · Hebbal flyover / underpass · Bellandur (ORR) · Ecospace / Kariyammana Agrahara · Yemalur · Panathur railway underbridge · Varthur · Marathahalli · Kundalahalli underpass · Mahadevapura · KR Puram · Hoodi · Sai Layout (Horamavu) · Hennur · Manyata Tech Park area · Sarjapur Road · HSR Layout · Koramangala (ST Bed) · Bommanahalli · Shanthinagar · Okalipuram underpass · Majestic underpasses.

Add more from BBMP's flood-vulnerable areas list and past news coverage. Target **50–100 verified spots** before soft launch.

## 10. Launch checklist

- [ ] Seeded spots verified
- [ ] OG share images render correctly in a WhatsApp preview
- [ ] Report flow works one-handed in under 10 s on a low-end Android
- [ ] Map loads in under 3 s on 4G
- [ ] Privacy note: what's stored (report location, optional photo); route data is private; no tracking
- [ ] Disclaimer visible
- [ ] Posts drafted: r/bangalore, RWA WhatsApp groups, Citizen Matters tip, Bengaluru Traffic Police tag
- [ ] Watch the IMD/KSNDMC forecast and launch publicly **on the morning before a heavy-rain day**

## 11. Success metrics (rainy days)

- Reports per rainy hour, and the % confirmed by a second user
- Daily active users on rain days vs dry days
- Saved routes and push opt-in rate
- Number of WhatsApp shares of `/r/[id]` pages
