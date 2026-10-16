-- Initial schema (SPEC.md §5) + M0 report lifecycle functions.
-- All geometry is geography(…, 4326), coordinate order [lon, lat].

create extension if not exists postgis with schema extensions;

create type public.severity as enum ('ankle', 'knee', 'impassable');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.spots (               -- known flood-prone locations (seeded)
  id bigint generated always as identity primary key,
  name text not null,
  geom extensions.geography(Point, 4326) not null,
  source text,                            -- 'bbmp_list' | 'news' | 'community'
  notes text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  geom extensions.geography(Point, 4326) not null,
  place_name text,
  severity public.severity not null,
  photo_path text,
  note text check (char_length(note) <= 140),
  created_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now(),
  hidden boolean not null default false
);

create table public.report_votes (
  report_id uuid references public.reports on delete cascade,
  user_id uuid references auth.users on delete cascade,
  vote smallint not null check (vote in (-1, 1)),   -- +1 still flooded, -1 cleared
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);

create table public.routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  geom extensions.geography(LineString, 4326) not null,
  buffer_m int not null default 150,
  active_days int[] not null default '{1,2,3,4,5}', -- ISO weekday, 1 = Mon
  windows jsonb not null default '[{"start":"08:00","end":"11:00"},{"start":"17:00","end":"21:00"}]',
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table public.rain_cells (
  id int primary key,
  geom extensions.geography(Point, 4326) not null
);

create table public.rain_obs (
  cell_id int references public.rain_cells,
  ts timestamptz not null,                -- hour bucket, UTC
  precip_mm numeric not null,
  primary key (cell_id, ts)
);

create table public.spot_risk (
  spot_id bigint primary key references public.spots,
  level text not null check (level in ('low', 'medium', 'high')),
  rain_1h_mm numeric,
  rain_3h_mm numeric,
  computed_at timestamptz not null default now()
);

create table public.alerts_sent (
  route_id uuid references public.routes on delete cascade,
  subject_type text not null,             -- 'report' | 'spot'
  subject_id text not null,
  sent_at timestamptz not null default now(),
  primary key (route_id, subject_type, subject_id)
);

create table public.config (key text primary key, value jsonb not null);

create index on public.spots using gist (geom);
create index on public.reports using gist (geom);
create index on public.reports (last_confirmed_at desc);
create index on public.reports (user_id, created_at desc);  -- rate limit lookups
create index on public.routes using gist (geom);
create index on public.rain_cells using gist (geom);

-- ---------------------------------------------------------------------------
-- Config (tunable without a deploy)
-- ---------------------------------------------------------------------------

insert into public.config (key, value) values
  ('report_active_minutes', '120'),   -- active for 2 h after last confirmation
  ('hide_vote_margin', '2'),          -- hidden when cleared >= still + margin
  ('merge_radius_m', '200'),          -- new report near an active one becomes a confirmation…
  ('merge_window_minutes', '15'),     -- …if that one was confirmed in the last 15 min
  ('max_gps_distance_m', '500'),      -- pin must be within 500 m of the GPS fix
  ('reports_per_hour', '5');          -- per user

create function public.cfg_num(k text) returns numeric
language sql stable security definer set search_path = public
as $$ select (value #>> '{}')::numeric from public.config where key = k $$;

-- ---------------------------------------------------------------------------
-- Read views
-- ---------------------------------------------------------------------------

-- Public read path for reports. Runs with the owner's rights (bypasses RLS on
-- reports/report_votes) and deliberately omits user_id.
create view public.active_reports as
select
  r.id,
  r.severity,
  r.place_name,
  r.photo_path,
  r.note,
  r.created_at,
  r.last_confirmed_at,
  extensions.st_x(r.geom::extensions.geometry) as lon,
  extensions.st_y(r.geom::extensions.geometry) as lat,
  coalesce(v.still, 0)::int as still_votes,
  coalesce(v.cleared, 0)::int as cleared_votes
from public.reports r
left join lateral (
  select
    count(*) filter (where vote = 1) as still,
    count(*) filter (where vote = -1) as cleared
  from public.report_votes
  where report_id = r.id
) v on true
where not r.hidden
  and r.last_confirmed_at > now() - make_interval(mins => public.cfg_num('report_active_minutes')::int)
  and coalesce(v.cleared, 0) < coalesce(v.still, 0) + public.cfg_num('hide_vote_margin');

revoke all on public.active_reports from anon, authenticated;
grant select on public.active_reports to anon, authenticated;

-- Spots with lon/lat and current risk level (risk is filled in M1).
create view public.spot_points with (security_invoker = true) as
select
  s.id,
  s.name,
  extensions.st_x(s.geom::extensions.geometry) as lon,
  extensions.st_y(s.geom::extensions.geometry) as lat,
  sr.level as risk_level
from public.spots s
left join public.spot_risk sr on sr.spot_id = s.id;

revoke all on public.spot_points from anon, authenticated;
grant select on public.spot_points to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.spots enable row level security;
alter table public.reports enable row level security;
alter table public.report_votes enable row level security;
alter table public.routes enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.rain_cells enable row level security;
alter table public.rain_obs enable row level security;
alter table public.spot_risk enable row level security;
alter table public.alerts_sent enable row level security;
alter table public.config enable row level security;

create policy "public read" on public.spots for select to anon, authenticated using (true);
create policy "public read" on public.spot_risk for select to anon, authenticated using (true);

-- DECISION: SPEC §5 allows users to insert reports/votes as themselves, but a
-- direct insert would skip the GPS-distance, rate-limit and merge checks.
-- Writes go only through /api/reports and /api/votes (service role → the
-- functions below), so reports/report_votes get no client policies at all.

create policy "owner all" on public.routes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "owner all" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- rain_*, alerts_sent, config: RLS on, no policies → service role only.

-- ---------------------------------------------------------------------------
-- Write functions (service role only; called from Next.js API routes)
-- ---------------------------------------------------------------------------

-- Creates a report, or merges it into a nearby recently-confirmed one.
-- Raises 'too_far_from_gps' or 'rate_limited'.
create function public.submit_report(
  p_user_id uuid,
  p_lon double precision,
  p_lat double precision,
  p_gps_lon double precision,
  p_gps_lat double precision,
  p_severity public.severity,
  p_note text default null,
  p_photo_path text default null
) returns table (report_id uuid, outcome text)
language plpgsql security definer set search_path = public, extensions
as $$
declare
  v_point geography := st_setsrid(st_makepoint(p_lon, p_lat), 4326)::geography;
  v_gps geography := st_setsrid(st_makepoint(p_gps_lon, p_gps_lat), 4326)::geography;
  v_existing uuid;
begin
  if not st_dwithin(v_point, v_gps, cfg_num('max_gps_distance_m')) then
    raise exception 'too_far_from_gps';
  end if;

  if (select count(*) from reports r
      where r.user_id = p_user_id and r.created_at > now() - interval '1 hour')
     >= cfg_num('reports_per_hour') then
    raise exception 'rate_limited';
  end if;

  -- Serialise submissions so two simultaneous reports at one spot can't both create.
  perform pg_advisory_xact_lock(hashtext('submit_report'));

  -- DECISION: "active report in the last 15 min" = confirmed in the last 15 min.
  select r.id into v_existing
  from reports r
  where not r.hidden
    and r.last_confirmed_at > now() - make_interval(mins => cfg_num('merge_window_minutes')::int)
    and st_dwithin(r.geom, v_point, cfg_num('merge_radius_m'))
  order by r.geom <-> v_point
  limit 1;

  if v_existing is not null then
    update reports r set
      last_confirmed_at = now(),
      severity = greatest(r.severity, p_severity),     -- escalate, never downgrade
      photo_path = coalesce(r.photo_path, p_photo_path),
      note = coalesce(r.note, p_note)
    where r.id = v_existing;

    insert into report_votes (report_id, user_id, vote)
    values (v_existing, p_user_id, 1)
    on conflict on constraint report_votes_pkey do update set vote = 1, created_at = now();

    return query select v_existing, 'merged'::text;
    return;
  end if;

  return query
    insert into reports (user_id, geom, severity, note, photo_path)
    values (p_user_id, v_point, p_severity, p_note, p_photo_path)
    returning reports.id, 'created'::text;
end;
$$;

-- +1 "Still flooded" (refreshes the active timer) or -1 "Cleared".
-- Raises 'report_not_active'.
create function public.cast_vote(p_user_id uuid, p_report_id uuid, p_vote smallint)
returns table (still_votes int, cleared_votes int)
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from active_reports a where a.id = p_report_id) then
    raise exception 'report_not_active';
  end if;

  insert into report_votes (report_id, user_id, vote)
  values (p_report_id, p_user_id, p_vote)
  on conflict on constraint report_votes_pkey do update set vote = excluded.vote, created_at = now();

  if p_vote = 1 then
    update reports set last_confirmed_at = now() where id = p_report_id;
  end if;

  return query
    select
      (count(*) filter (where v.vote = 1))::int,
      (count(*) filter (where v.vote = -1))::int
    from report_votes v where v.report_id = p_report_id;
end;
$$;

revoke execute on function public.submit_report from public, anon, authenticated;
revoke execute on function public.cast_vote from public, anon, authenticated;
grant execute on function public.submit_report to service_role;
grant execute on function public.cast_vote to service_role;

-- ---------------------------------------------------------------------------
-- Storage: report photos (compressed client-side to ≤300 KB, EXIF stripped)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 512000, array['image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Anonymous users have the authenticated role. Each user uploads under <uid>/.
create policy "upload own report photos" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
