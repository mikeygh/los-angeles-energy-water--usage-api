import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

interface SocrataRow {
  data: unknown[][];
}

interface ParsedRow {
  propertyId: number;
  propertyName: string;
  department: string;
  year: number;
  energyStarScore: number | null;
  siteEuiKbtuFt: number | null;
  waterUseKGal: number | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

function parseValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function parseIntValue(v: unknown): number | null {
  const n = parseValue(v);
  return n !== null ? Math.round(n) : null;
}

function parseRow(row: unknown[]): ParsedRow {
  const location = row[26] as unknown[];
  let addressJson: Record<string, string> | null = null;
  try {
    if (location?.[0]) {
      addressJson = JSON.parse(location[0] as string);
    }
  } catch { /* ignore */ }

  return {
    propertyId: Number(row[13]),
    propertyName: (row[16] as string) || "",
    department: (row[15] as string) || "",
    year: new Date(row[14] as string).getFullYear(),
    energyStarScore: parseIntValue(row[11]),
    siteEuiKbtuFt: parseValue(row[25]),
    waterUseKGal: parseValue(row[21]),
    locationAddress: addressJson?.address ?? null,
    latitude: location?.[1] != null ? Number(location[1]) : null,
    longitude: location?.[2] != null ? Number(location[2]) : null,
  };
}

describe("rows.json parser", () => {
  const filePath = join(import.meta.dirname, "..", "rows.json");
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
    expect(parsed.year).toBe(2014);
    expect(parsed.siteEuiKbtuFt).toBeCloseTo(47.7);
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
