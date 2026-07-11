import { describe, expect, it } from "vitest";
import { formatKm, timeAgo } from "./format";
import { haversineKm, DEFAULT_CENTER } from "./geo";
import { CATEGORIES, categoryDef } from "./categories";

describe("format", () => {
  it("formats short distances in meters", () => {
    expect(formatKm(0.4)).toBe("400 m");
  });

  it("formats longer distances in km", () => {
    expect(formatKm(2.5)).toBe("2.5 km");
  });

  it("timeAgo handles recent times", () => {
    const justNow = timeAgo(new Date().toISOString());
    expect(["just now", "0m ago", "1m ago"]).toContain(justNow);
  });
});

describe("geo", () => {
  it("haversine is ~0 for the same point", () => {
    expect(haversineKm(DEFAULT_CENTER, DEFAULT_CENTER)).toBeCloseTo(0, 5);
  });
});

describe("categories", () => {
  it("includes plan categories", () => {
    const ids = CATEGORIES.map((c) => c.id);
    expect(ids).toContain("wallet");
    expect(ids).toContain("phone");
    expect(ids).toContain("pet");
    expect(ids).toContain("person");
  });

  it("categoryDef falls back to other", () => {
    expect(categoryDef("wallet").label).toBe("Wallet");
  });
});
