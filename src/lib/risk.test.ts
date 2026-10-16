import { describe, expect, it } from "vitest";
import { formatAgo, isActive, isHiddenByVotes, MIN_REPORT_OPACITY, reportOpacity } from "./risk";

const now = new Date("2026-10-16T10:00:00Z");
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();

describe("isActive", () => {
  it("is active within 2 h of last confirmation", () => expect(isActive(minsAgo(119), now)).toBe(true));
  it("expires at 2 h", () => expect(isActive(minsAgo(120), now)).toBe(false));
});

describe("isHiddenByVotes", () => {
  it("hides when cleared >= still + 2", () => {
    expect(isHiddenByVotes(0, 2)).toBe(true);
    expect(isHiddenByVotes(3, 5)).toBe(true);
  });
  it("keeps when cleared < still + 2", () => {
    expect(isHiddenByVotes(0, 1)).toBe(false);
    expect(isHiddenByVotes(3, 4)).toBe(false);
  });
});

describe("reportOpacity", () => {
  it("is fully opaque when fresh", () => expect(reportOpacity(minsAgo(0), now)).toBe(1));
  it("fades halfway at 1 h", () => expect(reportOpacity(minsAgo(60), now)).toBeCloseTo((1 + MIN_REPORT_OPACITY) / 2));
  it("bottoms out at expiry and beyond", () => {
    expect(reportOpacity(minsAgo(120), now)).toBeCloseTo(MIN_REPORT_OPACITY);
    expect(reportOpacity(minsAgo(500), now)).toBeCloseTo(MIN_REPORT_OPACITY);
  });
});

describe("formatAgo", () => {
  it("formats minutes and hours", () => {
    expect(formatAgo(minsAgo(0), now)).toBe("just now");
    expect(formatAgo(minsAgo(12), now)).toBe("12 min ago");
    expect(formatAgo(minsAgo(75), now)).toBe("1 h 15 min ago");
  });
});
