import { describe, expect, it, beforeEach } from "vitest";
import {
  addReport,
  getNetworkState,
  makeId,
  mintTag,
  recordTagScan,
  resetNetwork,
} from "./store";
import type { Report } from "./types";

describe("store mint + reports", () => {
  beforeEach(() => {
    resetNetwork();
  });

  it("makeId produces unique prefixed ids", () => {
    const a = makeId("r");
    const b = makeId("r");
    expect(a).toMatch(/^r_/);
    expect(a).not.toBe(b);
  });

  it("mints a QR tag and records scans", () => {
    mintTag({
      id: "TAG-ABC123",
      label: "Backpack",
      category: "bag",
      ownerId: "user_1",
      createdAt: new Date().toISOString(),
      scans: [],
      active: true,
    });
    expect(getNetworkState().tags[0]?.id).toBe("TAG-ABC123");
    recordTagScan("TAG-ABC123", "gate scan");
    expect(getNetworkState().tags[0]?.scans).toHaveLength(1);
    expect(getNetworkState().tags[0]?.scans[0]?.note).toBe("gate scan");
  });

  it("adds a lost report without private fields", () => {
    const report: Report = {
      id: makeId("r"),
      kind: "lost",
      category: "phone",
      title: "Pixel 7a",
      description: "Lost my Pixel 7a near the metro yesterday evening",
      location: [31.52, 74.35],
      radiusM: 500,
      createdAt: new Date().toISOString(),
      status: "open",
      reporter: { id: "guest", name: "Guest", trust: 50 },
      privateFields: [],
    };
    addReport(report);
    const saved = getNetworkState().reports.find((r) => r.id === report.id);
    expect(saved?.kind).toBe("lost");
    expect(saved?.privateFields).toEqual([]);
  });
});
