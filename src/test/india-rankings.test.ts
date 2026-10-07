import { describe, expect, it } from "vitest";
import { geo, indiaStates, LEVELS, rankingAreas } from "@/lib/data";

describe("India-only rankings", () => {
  it("contains India only and starts with Indian states", () => {
    expect(geo.map((place) => place.name)).toEqual(["India"]);
    expect(rankingAreas([]).map((place) => place.name)).toEqual([
      "Uttar Pradesh", "Maharashtra", "Delhi NCT", "Kerala", "Sikkim", "Bihar",
    ]);
    expect(LEVELS).toEqual(["state", "district", "block", "village"]);
  });
  it("drills through state, district and block to Indian villages", () => {
    const state = indiaStates.find((place) => place.name === "Uttar Pradesh");
    if (!state) throw new Error("Missing state");
    const district = rankingAreas([state]).find((place) => place.name === "Lucknow");
    if (!district) throw new Error("Missing district");
    const block = rankingAreas([state, district]).find((place) => place.name === "Chinhat");
    if (!block) throw new Error("Missing block");
    expect(rankingAreas([state, district, block]).map((place) => place.name)).toEqual(["Malhaur", "Ujariyaon", "Juggaur"]);
  });
});