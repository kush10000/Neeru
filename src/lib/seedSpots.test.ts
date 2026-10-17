import { describe, expect, it } from "vitest";
import { parseCoordPair, renderSeedSql, type SeedSpot } from "./seedSpots";

describe("parseCoordPair", () => {
  it("swaps Google Maps' lat, lon order into [lon, lat]", () => {
    expect(parseCoordPair("12.9177, 77.6238")).toEqual([77.6238, 12.9177]);
  });
  it("accepts lon, lat order too", () => {
    expect(parseCoordPair("77.6238 12.9177")).toEqual([77.6238, 12.9177]);
  });
  it("reads a Google Maps URL", () => {
    expect(parseCoordPair("https://www.google.com/maps/@12.9177,77.6238,17z")).toEqual([77.6238, 12.9177]);
  });
  it("reads an OSM URL", () => {
    expect(parseCoordPair("https://www.openstreetmap.org/?mlat=12.9177&mlon=77.6238#map=18/12.9177/77.6238")).toEqual([
      77.6238, 12.9177,
    ]);
  });
  it("rejects points outside Bengaluru", () => {
    expect(parseCoordPair("19.07, 72.87")).toBeNull();
    expect(parseCoordPair("hello")).toBeNull();
  });
});

describe("renderSeedSql", () => {
  const spot: SeedSpot = {
    name: "St. Mark's Road underpass",
    lon: 77.6,
    lat: 12.97,
    source: "news",
    notes: "",
    verified: true,
  };

  it("escapes quotes and writes lon before lat", () => {
    const sql = renderSeedSql([spot]);
    expect(sql).toContain("('St. Mark''s Road underpass', 77.600000, 12.970000, 'news', null, true)");
  });
  it("produces valid SQL with no spots", () => {
    expect(renderSeedSql([])).toContain("where name is not null");
  });
});
