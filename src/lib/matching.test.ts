import { describe, expect, it } from "vitest";
import {
  findMatches,
  fuzzyAnswerMatch,
  MIN_MATCH_SCORE,
  scorePair,
  textSimilarity,
  tokenize,
} from "./matching";
import type { Report } from "./types";

function report(partial: Partial<Report> & Pick<Report, "id" | "kind" | "title" | "description">): Report {
  return {
    category: "wallet",
    location: [31.52, 74.35],
    radiusM: 500,
    createdAt: new Date().toISOString(),
    status: "open",
    reporter: { id: `u_${partial.id}`, name: "Tester", trust: 70 },
    privateFields: [],
    ...partial,
  };
}

describe("tokenize", () => {
  it("drops stop words and keeps content tokens", () => {
    const t = tokenize("I lost my black leather wallet");
    expect(t.has("black")).toBe(true);
    expect(t.has("leather")).toBe(true);
    expect(t.has("wallet")).toBe(true);
    expect(t.has("lost")).toBe(false);
  });
});

describe("textSimilarity", () => {
  it("matches synonyms (wallet ≈ purse)", () => {
    const score = textSimilarity("black leather wallet", "dark purse with leather");
    expect(score).toBeGreaterThan(0.3);
  });

  it("is low for unrelated items", () => {
    const score = textSimilarity("golden retriever dog", "macbook laptop nasa sticker");
    expect(score).toBeLessThan(0.2);
  });
});

describe("fuzzyAnswerMatch", () => {
  it("matches exact answers", () => {
    expect(fuzzyAnswerMatch("red", "red")).toBe(true);
  });

  it("matches '500 rupees' to 'Rs. 500'", () => {
    expect(fuzzyAnswerMatch("500 rupees", "Rs. 500")).toBe(true);
  });

  it("rejects wrong answers", () => {
    expect(fuzzyAnswerMatch("blue", "red")).toBe(false);
  });

  it("requires the claimant to type something", () => {
    expect(fuzzyAnswerMatch("", "red")).toBe(false);
  });
});

describe("findMatches / MIN_MATCH_SCORE", () => {
  it("exports a 60% floor", () => {
    expect(MIN_MATCH_SCORE).toBe(60);
  });

  it("only returns candidates at or above 60%", () => {
    const mine = report({
      id: "lost1",
      kind: "lost",
      title: "Brown leather wallet red stitching",
      description: "Worn brown leather bifold with red stitching inside near cafe",
      reporter: { id: "owner", name: "Owner", trust: 80 },
    });
    const strong = report({
      id: "found1",
      kind: "found",
      title: "Brown leather bifold wallet",
      description: "Worn brown leather wallet, red stitching inside, found near cafe",
      reporter: { id: "finder", name: "Finder", trust: 90 },
      privateFields: [{ question: "Stitching color?", answer: "red" }],
    });
    const weak = report({
      id: "found2",
      kind: "found",
      category: "keys",
      title: "House keys",
      description: "Silver keys on a green ring",
      reporter: { id: "other", name: "Other", trust: 50 },
    });

    const matches = findMatches(mine, [mine, strong, weak]);
    expect(matches.every((m) => m.score >= MIN_MATCH_SCORE)).toBe(true);
    expect(matches.some((m) => m.candidate.id === "found1")).toBe(true);
    expect(matches.some((m) => m.candidate.id === "found2")).toBe(false);
  });

  it("scores a strong wallet pair well above 60%", () => {
    const mine = report({
      id: "a",
      kind: "lost",
      title: "Black leather wallet with red stitching",
      description: "Lost black leather wallet red stitching near food street",
      reporter: { id: "a", name: "A", trust: 70 },
    });
    const found = report({
      id: "b",
      kind: "found",
      title: "Brown leather bifold wallet",
      description: "Worn brown leather wallet red stitching found near cafe",
      reporter: { id: "b", name: "B", trust: 90 },
    });
    const scored = scorePair(mine, found);
    expect(scored.score).toBeGreaterThanOrEqual(MIN_MATCH_SCORE);
  });
});
