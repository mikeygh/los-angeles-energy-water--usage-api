import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRow } from "../src/data/parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface SocrataRow {
  data: unknown[][];
}

describe("rows.json parser", () => {
  const filePath = join(__dirname, "..", "rows.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as SocrataRow;

  it("parses all data rows", () => {
    expect(raw.data.length).toBeGreaterThan(400);
  });

  it("parses a Malabar Library row correctly", () => {
    const row = raw.data.find(
      (r: unknown[]) => (r[16] as string).includes("Malabar Library")
    );
    expect(row).toBeDefined();
    const parsed = parseRow(row!);
    expect(parsed.propertyId).toBe(3935383);
    expect(parsed.department).toBe("Libraries:");
    expect(new Date(parsed.yearEnding).getFullYear()).toBe(2014);
    expect(parsed.siteEui).toBeCloseTo(47.7);
    expect(parsed.waterUseKGal).toBeCloseTo(287.8);
    expect(parsed.latitude).toBeCloseTo(34.050589);
    expect(parsed.longitude).toBeCloseTo(-118.197849);
    expect(parsed.locationAddress).toBe("2801 Wabash Avenue");
  });

  it("parses City Hall row correctly", () => {
    const row = raw.data.find(
      (r: unknown[]) => (r[16] as string).includes("Los Angeles City Hall")
    );
    expect(row).toBeDefined();
    const parsed = parseRow(row!);
    expect(parsed.propertyId).toBe(3935256);
    expect(parsed.energyStarScore).toBe(25);
    expect(parsed.waterUseKGal).toBeCloseTo(9645.3);
  });
});
