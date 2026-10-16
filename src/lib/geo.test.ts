import { describe, expect, it } from "vitest";
import { BENGALURU_CENTER, clampToRadius, destination, distanceM, inBengaluru, type LonLat } from "./geo";

const silkBoard: LonLat = [77.6238, 12.9177];

describe("inBengaluru", () => {
  it("accepts a point in the city", () => expect(inBengaluru(silkBoard)).toBe(true));
  it("rejects swapped lat/lon", () => expect(inBengaluru([12.9177, 77.6238])).toBe(false));
});

describe("distanceM", () => {
  it("is zero for the same point", () => expect(distanceM(silkBoard, silkBoard)).toBe(0));
  it("0.1° of latitude ≈ 11.12 km", () => {
    expect(distanceM([77.6, 12.9], [77.6, 13.0])).toBeCloseTo(11_119.5, 0);
  });
});

describe("destination", () => {
  it("round-trips with distanceM", () => {
    const p = destination(BENGALURU_CENTER, 500, Math.PI / 3);
    expect(distanceM(BENGALURU_CENTER, p)).toBeCloseTo(500, 3);
  });
});

describe("clampToRadius", () => {
  it("leaves points inside the radius alone", () => {
    const p = destination(silkBoard, 300, 1);
    expect(clampToRadius(silkBoard, p, 500)).toEqual(p);
  });
  it("pulls far points back inside the radius, same direction", () => {
    const far = destination(silkBoard, 2000, 1);
    const clamped = clampToRadius(silkBoard, far, 500);
    expect(distanceM(silkBoard, clamped)).toBeLessThanOrEqual(500);
    expect(distanceM(silkBoard, clamped)).toBeGreaterThan(480);
    expect(distanceM(clamped, far)).toBeCloseTo(2000 - distanceM(silkBoard, clamped), -1);
  });
});
