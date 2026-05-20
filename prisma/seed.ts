import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

interface RawRow {
  cartodbId: number;
  theGeom: string | null;
  indoorWaterUseKGal: number | null;
  energyStarScore: number | null;
  propertyGfaSqFt: number | null;
  propertyId: number;
  yearEnding: string;
  department: string;
  propertyName: string;
  indirectGhgEmissions: number | null;
  directGhgEmissions: number | null;
  totalGhgEmissionsIntensity: number | null;
  totalGhgEmissionsMetricTons: number | null;
  waterUseKGal: number | null;
  weatherNormalizedSourceEui: number | null;
  weatherNormalizedSiteEui: number | null;
  sourceEui: number | null;
  siteEui: number | null;
  locationAddress: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationZip: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface SocrataRow {
  data: unknown[][];
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

function parseRow(row: unknown[]): RawRow {
  const location = row[26] as unknown[];
  let addressJson: Record<string, string> | null = null;
  try {
    if (location?.[0]) {
      addressJson = JSON.parse(location[0] as string);
    }
  } catch { /* ignore */ }

  return {
    cartodbId: Number(row[8]),
    theGeom: (row[9] as string) || null,
    indoorWaterUseKGal: parseValue(row[10]),
    energyStarScore: parseIntValue(row[11]),
    propertyGfaSqFt: parseIntValue(row[12]),
    propertyId: Number(row[13]),
    yearEnding: row[14] as string,
    department: (row[15] as string) || "",
    propertyName: (row[16] as string) || "",
    indirectGhgEmissions: parseValue(row[17]),
    directGhgEmissions: parseValue(row[18]),
    totalGhgEmissionsIntensity: parseValue(row[19]),
    totalGhgEmissionsMetricTons: parseValue(row[20]),
    waterUseKGal: parseValue(row[21]),
    weatherNormalizedSourceEui: parseValue(row[22]),
    weatherNormalizedSiteEui: parseValue(row[23]),
    sourceEui: parseValue(row[24]),
    siteEui: parseValue(row[25]),
    locationAddress: addressJson?.address ?? null,
    locationCity: addressJson?.city ?? null,
    locationState: addressJson?.state ?? null,
    locationZip: addressJson?.zip ?? null,
    latitude: location?.[1] != null ? Number(location[1]) : null,
    longitude: location?.[2] != null ? Number(location[2]) : null,
  };
}

async function main() {
  const filePath = join(__dirname, "..", "rows.json");
  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as SocrataRow;

  const rows = raw.data.map(parseRow);

  // Collect unique buildings
  const buildingMap = new Map<number, RawRow>();
  for (const row of rows) {
    if (!buildingMap.has(row.propertyId)) {
      buildingMap.set(row.propertyId, row);
    }
  }

  console.log(`Parsed ${rows.length} usage records across ${buildingMap.size} buildings`);

  // Insert buildings
  const buildings = Array.from(buildingMap.entries()).map(([id, row]) => ({
    id,
    name: row.propertyName,
    department: row.department,
    squareFootage: row.propertyGfaSqFt,
    locationAddress: row.locationAddress,
    locationCity: row.locationCity,
    locationState: row.locationState,
    locationZip: row.locationZip,
    latitude: row.latitude,
    longitude: row.longitude,
    theGeom: row.theGeom,
  }));

  await prisma.building.createMany({ data: buildings });
  console.log(`Inserted ${buildings.length} buildings`);

  // Insert usage records
  const records = rows.map((row) => {
    const year = new Date(row.yearEnding).getFullYear();
    return {
      buildingId: row.propertyId,
      year,
      energyStarScore: row.energyStarScore,
      siteEuiKbtuFt: row.siteEui,
      sourceEuiKbtuFt: row.sourceEui,
      weatherNormalizedSiteEuiKbtuFt: row.weatherNormalizedSiteEui,
      weatherNormalizedSourceEuiKbtuFt: row.weatherNormalizedSourceEui,
      waterUseAllSourcesKGal: row.waterUseKGal,
      indoorWaterUseKGal: row.indoorWaterUseKGal,
      indirectGhgEmissionsMetricTonsCo2e: row.indirectGhgEmissions,
      directGhgEmissionsMetricTonsCo2e: row.directGhgEmissions,
      totalGhgEmissionsMetricTonsCo2e: row.totalGhgEmissionsMetricTons,
      totalGhgEmissionsIntensityKgCo2eFt: row.totalGhgEmissionsIntensity,
    };
  });

  // Insert in batches of 100
  for (let i = 0; i < records.length; i += 100) {
    await prisma.usageRecord.createMany({ data: records.slice(i, i + 100) });
  }
  console.log(`Inserted ${records.length} usage records`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
