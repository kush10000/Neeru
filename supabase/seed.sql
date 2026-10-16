-- Known flood-prone spots (SPEC.md §9).
-- Coordinates are APPROXIMATE starting points: verify each one on the map and
-- move the pin to the exact underpass/junction before soft launch.
-- ST_MakePoint(lon, lat): longitude first.

insert into public.spots (name, geom, source, notes)
select name, extensions.st_setsrid(extensions.st_makepoint(lon, lat), 4326)::extensions.geography,
       'community', 'approx — verify'
from (values
  ('Silk Board junction',                    77.6238, 12.9177),
  ('Hebbal flyover / underpass',             77.5970, 13.0358),
  ('Bellandur (ORR)',                        77.6762, 12.9260),
  ('Ecospace / Kariyammana Agrahara',        77.6810, 12.9255),
  ('Yemalur',                                77.6880, 12.9530),
  ('Panathur railway underbridge',           77.6993, 12.9378),
  ('Varthur',                                77.7464, 12.9437),
  ('Marathahalli bridge',                    77.7011, 12.9569),
  ('Kundalahalli underpass',                 77.7154, 12.9636),
  ('Mahadevapura (ORR)',                     77.6960, 12.9960),
  ('KR Puram',                               77.6960, 13.0071),
  ('Hoodi junction',                         77.7155, 12.9930),
  ('Sai Layout, Horamavu',                   77.6645, 13.0280),
  ('Hennur',                                 77.6305, 13.0258),
  ('Manyata Tech Park area',                 77.6200, 13.0450),
  ('Sarjapur Road (Doddakannelli)',          77.6870, 12.9135),
  ('HSR Layout',                             77.6389, 12.9116),
  ('Koramangala (ST Bed)',                   77.6235, 12.9345),
  ('Bommanahalli',                           77.6240, 12.9010),
  ('Shanthinagar',                           77.5960, 12.9561),
  ('Okalipuram underpass',                   77.5650, 12.9790),
  ('Majestic underpass',                     77.5713, 12.9767)
) as t(name, lon, lat);
