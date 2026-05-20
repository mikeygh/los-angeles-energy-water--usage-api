export interface RawRow {
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

export function parseValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

export function parseIntValue(v: unknown): number | null {
  const n = parseValue(v);
  return n !== null ? Math.round(n) : null;
}

export function parseRow(row: unknown[]): RawRow {
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
