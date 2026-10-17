-- GENERATED from supabase/spots.json by the /dev/spots editor. Don't edit by hand.
-- Known flood-prone spots (SPEC.md §9). verified = pin checked against the real location.

insert into public.spots (name, geom, source, notes)
select name, extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)::extensions.geography, source, notes
from (values
  ('Silk Board junction', 77.623800, 12.917700, 'community', null, false),
  ('Hebbal flyover / underpass', 77.597000, 13.035800, 'community', null, false),
  ('Bellandur (ORR)', 77.676200, 12.926000, 'community', null, false),
  ('Ecospace / Kariyammana Agrahara', 77.681000, 12.925500, 'community', null, false),
  ('Yemalur', 77.688000, 12.953000, 'community', null, false),
  ('Panathur railway underbridge', 77.699300, 12.937800, 'community', null, false),
  ('Varthur', 77.746400, 12.943700, 'community', null, false),
  ('Marathahalli bridge', 77.701100, 12.956900, 'community', null, false),
  ('Kundalahalli underpass', 77.715400, 12.963600, 'community', null, false),
  ('Mahadevapura (ORR)', 77.696000, 12.996000, 'community', null, false),
  ('KR Puram', 77.696000, 13.007100, 'community', null, false),
  ('Hoodi junction', 77.715500, 12.993000, 'community', null, false),
  ('Sai Layout, Horamavu', 77.664500, 13.028000, 'community', null, false),
  ('Hennur', 77.630500, 13.025800, 'community', null, false),
  ('Manyata Tech Park area', 77.620000, 13.045000, 'community', null, false),
  ('Sarjapur Road (Doddakannelli)', 77.687000, 12.913500, 'community', null, false),
  ('HSR Layout', 77.638900, 12.911600, 'community', null, false),
  ('Koramangala (ST Bed)', 77.623500, 12.934500, 'community', null, false),
  ('Bommanahalli', 77.624000, 12.901000, 'community', null, false),
  ('Shanthinagar', 77.596000, 12.956100, 'community', null, false),
  ('Okalipuram underpass', 77.565000, 12.979000, 'community', null, false),
  ('Majestic underpass', 77.571300, 12.976700, 'community', null, false)
) as t(name, lon, lat, source, notes, verified)
where name is not null;
