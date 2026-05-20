import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseRow, type RawRow } from "../src/data/parse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

interface SocrataRow {
  data: unknown[][];
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
