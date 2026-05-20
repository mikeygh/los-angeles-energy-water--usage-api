# LA Energy & Water Usage API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade GraphQL API serving LA municipal building energy & water usage data from `rows.json`.

**Architecture:** Pothos (code-first GraphQL) derives types from a Prisma PostgreSQL schema. A seed script parses `rows.json` into normalized `Building` and `UsageRecord` tables. graphql-yoga serves the schema with Relay pagination, filtering, and aggregation queries. Docker Compose bundles the API and PostgreSQL for deployment.

**Tech Stack:** TypeScript, Pothos, Prisma, graphql-yoga, PostgreSQL, Docker Compose, Caddy, DigitalOcean VPS, GitHub Actions

---

### Task 1: Initialize Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "los-angeles-energy-water-usage-api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate deploy",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset --force",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@pothos/core": "^4.5.0",
    "@pothos/plugin-prisma": "^4.5.0",
    "@pothos/plugin-relay": "^4.4.0",
    "@prisma/client": "^6.6.0",
    "graphql": "^16.11.0",
    "graphql-yoga": "^5.13.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.0",
    "prisma": "^6.6.0",
    "tsx": "^4.19.0",
    "typescript": "^5.8.0",
    "vitest": "^3.1.0",
    "graphql-request": "^7.1.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create .env.example**

```
DATABASE_URL=postgres://postgres:password@localhost:5432/la_energy_water
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
*.db
.prisma/

# Docker
pgdata/

# IDE
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

Expected: node_modules created, package-lock.json created.

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .env.example .gitignore package-lock.json
git commit -m "chore: scaffold project with TypeScript and dependencies"
```

---

### Task 2: Prisma Schema & Seed

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma/seed.ts`
- Create: `tests/parse.test.ts`

- [ ] **Step 1: Write prisma/schema.prisma**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Building {
  id              Int            @id
  name            String
  department      String
  squareFootage   Int?
  locationAddress String?
  locationCity    String?
  locationState   String?
  locationZip     String?
  latitude        Float?
  longitude       Float?
  theGeom         String?

  usageRecords    UsageRecord[]
}

model UsageRecord {
  id                                  Int      @id @default(autoincrement())
  buildingId                          Int
  year                                Int
  energyStarScore                     Int?
  siteEuiKbtuFt                       Float?
  sourceEuiKbtuFt                     Float?
  weatherNormalizedSiteEuiKbtuFt      Float?
  weatherNormalizedSourceEuiKbtuFt    Float?
  waterUseAllSourcesKGal              Float?
  indoorWaterUseKGal                  Float?
  indirectGhgEmissionsMetricTonsCo2e  Float?
  directGhgEmissionsMetricTonsCo2e    Float?
  totalGhgEmissionsMetricTonsCo2e     Float?
  totalGhgEmissionsIntensityKgCo2eFt  Float?

  building Building @relation(fields: [buildingId], references: [id])

  @@unique([buildingId, year])
}
```

- [ ] **Step 2: Write prisma/seed.ts**

```typescript
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
```

- [ ] **Step 3: Write tests/parse.test.ts**

```typescript
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
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run`
Expected: FAIL — import errors (Prisma client not generated yet)

- [ ] **Step 5: Generate Prisma client and run migration**

Run: `npx prisma generate` and then `npx prisma db push`
Expected: Prisma client generated, database tables created.

- [ ] **Step 6: Run test again**

Run: `npx vitest run`
Expected: PASS — parse tests should pass (they don't need the DB)

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/seed.ts tests/parse.test.ts
git commit -m "feat: add Prisma schema, seed script, and parse tests"
```

---

### Task 3: Database Client & Pothos Schema Builder

**Files:**
- Create: `src/db.ts`
- Create: `src/schema/builder.ts`

- [ ] **Step 1: Write src/db.ts**

```typescript
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```

- [ ] **Step 2: Write src/schema/builder.ts**

```typescript
import SchemaBuilder from "@pothos/core";
import PrismaPlugin from "@pothos/plugin-prisma";
import RelayPlugin from "@pothos/plugin-relay";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../db.js";

export interface PothosTypes {
  PrismaClient: PrismaClient;
}

export const builder = new SchemaBuilder<PothosTypes>({
  plugins: [PrismaPlugin, RelayPlugin],
  prisma: {
    client: prisma,
  },
  relay: {
    clientMutationId: "omit",
    cursorType: "String",
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/db.ts src/schema/builder.ts
git commit -m "feat: add Prisma client and Pothos schema builder"
```

---

### Task 4: Building Schema Type & Queries

**Files:**
- Create: `src/schema/types/building.ts`
- Create: `src/resolvers/buildings.ts`
- Create: `src/resolvers/building.ts`

- [ ] **Step 1: Write src/schema/types/building.ts**

```typescript
import { builder } from "../builder.js";

builder.prismaObject("Building", {
  fields: (t) => ({
    id: t.exposeInt("id"),
    name: t.exposeString("name"),
    department: t.exposeString("department"),
    squareFootage: t.exposeInt("squareFootage", { nullable: true }),
    locationAddress: t.exposeString("locationAddress", { nullable: true }),
    locationCity: t.exposeString("locationCity", { nullable: true }),
    locationState: t.exposeString("locationState", { nullable: true }),
    locationZip: t.exposeString("locationZip", { nullable: true }),
    latitude: t.exposeFloat("latitude", { nullable: true }),
    longitude: t.exposeFloat("longitude", { nullable: true }),
    usageRecords: t.relation("usageRecords"),
  }),
});
```

- [ ] **Step 2: Write src/resolvers/building.ts**

```typescript
import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";

builder.queryField("building", (t) =>
  t.prismaField({
    type: "Building",
    args: {
      id: t.arg.int({ required: true }),
    },
    nullable: true,
    resolve: async (query, _parent, { id }) => {
      const building = await prisma.building.findUnique({
        ...query,
        where: { id },
      });
      if (!building) {
        throw new GraphQLError("Building not found", {
          extensions: { code: "BUILDING_NOT_FOUND" },
        });
      }
      return building;
    },
  })
);
```

- [ ] **Step 3: Write src/resolvers/buildings.ts**

```typescript
import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";

const BuildingOrderBy = builder.enumType("BuildingOrderBy", {
  values: ["NAME_ASC", "NAME_DESC", "DEPARTMENT_ASC", "DEPARTMENT_DESC"] as const,
});

const BuildingFilter = builder.inputType("BuildingFilter", {
  fields: (t) => ({
    department: t.string({ required: false }),
    year: t.int({ required: false }),
    nameContains: t.string({ required: false }),
    minEnergyScore: t.int({ required: false }),
    maxEnergyScore: t.int({ required: false }),
  }),
});

builder.queryField("buildings", (t) =>
  t.prismaConnection(
    {
      type: "Building",
      cursor: "id",
      maxSize: 100,
      args: {
        filter: t.arg({ type: BuildingFilter, required: false }),
        orderBy: t.arg({ type: BuildingOrderBy, required: false }),
      },
      resolve: (query, _parent, args) => {
        const where: Prisma.BuildingWhereInput = {};
        const filter = args.filter ?? {};

        if (filter.department) {
          where.department = filter.department;
        }
        if (filter.nameContains) {
          where.name = { contains: filter.nameContains, mode: "insensitive" };
        }
        if (filter.year || filter.minEnergyScore != null || filter.maxEnergyScore != null) {
          where.usageRecords = {};
          const recordFilters: Prisma.UsageRecordWhereInput[] = [];
          if (filter.year) {
            recordFilters.push({ year: filter.year });
          }
          if (filter.minEnergyScore != null) {
            recordFilters.push({ energyStarScore: { gte: filter.minEnergyScore } });
          }
          if (filter.maxEnergyScore != null) {
            recordFilters.push({ energyStarScore: { lte: filter.maxEnergyScore } });
          }
          where.usageRecords = { some: { AND: recordFilters } };
        }

        const orderBy = parseOrderBy(args.orderBy);

        return prisma.building.findMany({ ...query, where, orderBy });
      },
    }
  )
);

function parseOrderBy(orderBy?: typeof BuildingOrderBy.$inferType): Prisma.BuildingOrderByWithRelationInput {
  switch (orderBy) {
    case "NAME_ASC": return { name: "asc" };
    case "NAME_DESC": return { name: "desc" };
    case "DEPARTMENT_ASC": return { department: "asc" };
    case "DEPARTMENT_DESC": return { department: "desc" };
    default: return { id: "asc" };
  }
}
```

- [ ] **Step 4: Add GraphQLError import**

In `src/resolvers/building.ts`, add import at top:
```typescript
import { GraphQLError } from "graphql";
```

- [ ] **Step 5: Commit**

```bash
git add src/schema/types/building.ts src/resolvers/building.ts src/resolvers/buildings.ts
git commit -m "feat: add Building schema type and queries"
```

---

### Task 5: UsageRecord Schema Type & Queries

**Files:**
- Create: `src/schema/types/usage-record.ts`
- Create: `src/resolvers/usage-records.ts`

- [ ] **Step 1: Write src/schema/types/usage-record.ts**

```typescript
import { builder } from "../builder.js";

builder.prismaObject("UsageRecord", {
  fields: (t) => ({
    id: t.exposeID("id"),
    buildingId: t.exposeInt("buildingId"),
    year: t.exposeInt("year"),
    energyStarScore: t.exposeInt("energyStarScore", { nullable: true }),
    siteEuiKbtuFt: t.exposeFloat("siteEuiKbtuFt", { nullable: true }),
    sourceEuiKbtuFt: t.exposeFloat("sourceEuiKbtuFt", { nullable: true }),
    weatherNormalizedSiteEuiKbtuFt: t.exposeFloat("weatherNormalizedSiteEuiKbtuFt", { nullable: true }),
    weatherNormalizedSourceEuiKbtuFt: t.exposeFloat("weatherNormalizedSourceEuiKbtuFt", { nullable: true }),
    waterUseAllSourcesKGal: t.exposeFloat("waterUseAllSourcesKGal", { nullable: true }),
    indirectGhgEmissionsMetricTonsCo2e: t.exposeFloat("indirectGhgEmissionsMetricTonsCo2e", { nullable: true }),
    directGhgEmissionsMetricTonsCo2e: t.exposeFloat("directGhgEmissionsMetricTonsCo2e", { nullable: true }),
    totalGhgEmissionsMetricTonsCo2e: t.exposeFloat("totalGhgEmissionsMetricTonsCo2e", { nullable: true }),
    totalGhgEmissionsIntensityKgCo2eFt: t.exposeFloat("totalGhgEmissionsIntensityKgCo2eFt", { nullable: true }),
    indoorWaterUseKGal: t.exposeFloat("indoorWaterUseKGal", { nullable: true }),
    building: t.relation("building"),
  }),
});
```

- [ ] **Step 2: Write src/resolvers/usage-records.ts**

```typescript
import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";
import { Prisma } from "@prisma/client";

const UsageRecordOrderBy = builder.enumType("UsageRecordOrderBy", {
  values: [
    "YEAR_ASC",
    "YEAR_DESC",
    "ENERGY_SCORE_DESC",
    "EMISSIONS_DESC",
    "WATER_USE_DESC",
  ] as const,
});

const UsageRecordFilter = builder.inputType("UsageRecordFilter", {
  fields: (t) => ({
    department: t.string({ required: false }),
    year: t.int({ required: false }),
    minEnergyScore: t.int({ required: false }),
    maxEnergyScore: t.int({ required: false }),
  }),
});

builder.queryField("usageRecords", (t) =>
  t.prismaConnection(
    {
      type: "UsageRecord",
      cursor: "id",
      maxSize: 100,
      args: {
        filter: t.arg({ type: UsageRecordFilter, required: false }),
        orderBy: t.arg({ type: UsageRecordOrderBy, required: false }),
      },
      resolve: (query, _parent, args) => {
        const where: Prisma.UsageRecordWhereInput = {};
        const filter = args.filter ?? {};

        if (filter.year) {
          where.year = filter.year;
        }
        if (filter.department) {
          where.building = { department: filter.department };
        }
        if (filter.minEnergyScore != null) {
          where.energyStarScore = { gte: filter.minEnergyScore };
        }
        if (filter.maxEnergyScore != null) {
          where.energyStarScore = { ...(where.energyStarScore as object || {}), lte: filter.maxEnergyScore };
        }

        const orderBy = parseOrderBy(args.orderBy);

        return prisma.usageRecord.findMany({ ...query, where, orderBy });
      },
    }
  )
);

function parseOrderBy(orderBy?: typeof UsageRecordOrderBy.$inferType): Prisma.UsageRecordOrderByWithRelationInput {
  switch (orderBy) {
    case "YEAR_ASC": return { year: "asc" };
    case "YEAR_DESC": return { year: "desc" };
    case "ENERGY_SCORE_DESC": return { energyStarScore: "desc" };
    case "EMISSIONS_DESC": return { totalGhgEmissionsMetricTonsCo2e: "desc" };
    case "WATER_USE_DESC": return { waterUseAllSourcesKGal: "desc" };
    default: return { id: "asc" };
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/schema/types/usage-record.ts src/resolvers/usage-records.ts
git commit -m "feat: add UsageRecord schema type and paginated query"
```

---

### Task 6: Department Queries & Aggregation

**Files:**
- Create: `src/schema/types/department-stats.ts`
- Create: `src/resolvers/departments.ts`
- Create: `src/resolvers/department-stats.ts`

- [ ] **Step 1: Write src/schema/types/department-stats.ts**

```typescript
import { builder } from "../builder.js";

builder.objectType("DepartmentStats", {
  fields: (t) => ({
    department: t.exposeString("department"),
    year: t.exposeInt("year", { nullable: true }),
    buildingCount: t.exposeInt("buildingCount"),
    totalSiteEui: t.exposeFloat("totalSiteEui", { nullable: true }),
    totalSourceEui: t.exposeFloat("totalSourceEui", { nullable: true }),
    totalWaterKGal: t.exposeFloat("totalWaterKGal", { nullable: true }),
    totalGhgEmissions: t.exposeFloat("totalGhgEmissions", { nullable: true }),
    avgEnergyStarScore: t.exposeFloat("avgEnergyStarScore", { nullable: true }),
    avgSiteEui: t.exposeFloat("avgSiteEui", { nullable: true }),
    avgWaterUse: t.exposeFloat("avgWaterUse", { nullable: true }),
  }),
});
```

- [ ] **Step 2: Write src/resolvers/departments.ts**

```typescript
import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";

builder.queryField("departments", (t) =>
  t.field({
    type: ["String"],
    resolve: async () => {
      const result = await prisma.building.findMany({
        select: { department: true },
        distinct: ["department"],
        orderBy: { department: "asc" },
      });
      return result.map((r) => r.department);
    },
  })
);
```

- [ ] **Step 3: Write src/resolvers/department-stats.ts**

```typescript
import { builder } from "../schema/builder.js";
import { prisma } from "../db.js";
import { GraphQLError } from "graphql";

builder.queryField("departmentStats", (t) =>
  t.field({
    type: "DepartmentStats",
    args: {
      department: t.arg.string({ required: true }),
      year: t.arg.int({ required: false }),
    },
    nullable: true,
    resolve: async (_parent, { department, year }) => {
      const where = { department };
      const buildings = await prisma.building.findMany({
        where,
        select: { id: true },
      });

      if (buildings.length === 0) {
        throw new GraphQLError("Department not found", {
          extensions: { code: "DEPARTMENT_NOT_FOUND" },
        });
      }

      const recordWhere: { buildingId: { in: number[] }; year?: number } = {
        buildingId: { in: buildings.map((b) => b.id) },
      };
      if (year) {
        recordWhere.year = year;
      }

      const records = await prisma.usageRecord.findMany({
        where: recordWhere,
      });

      const count = records.length;
      if (count === 0) {
        return null;
      }

      const avg = (vals: (number | null)[]): number | null => {
        const nums = vals.filter((v): v is number => v !== null);
        return nums.length > 0
          ? nums.reduce((a, b) => a + b, 0) / nums.length
          : null;
      };

      const sum = (vals: (number | null)[]): number | null => {
        const nums = vals.filter((v): v is number => v !== null);
        return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null;
      };

      return {
        department,
        year: year ?? null,
        buildingCount: count,
        totalSiteEui: sum(records.map((r) => r.siteEuiKbtuFt)),
        totalSourceEui: sum(records.map((r) => r.sourceEuiKbtuFt)),
        totalWaterKGal: sum(records.map((r) => r.waterUseAllSourcesKGal)),
        totalGhgEmissions: sum(records.map((r) => r.totalGhgEmissionsMetricTonsCo2e)),
        avgEnergyStarScore: avg(records.map((r) => r.energyStarScore)),
        avgSiteEui: avg(records.map((r) => r.siteEuiKbtuFt)),
        avgWaterUse: avg(records.map((r) => r.waterUseAllSourcesKGal)),
      };
    },
  })
);
```

- [ ] **Step 4: Commit**

```bash
git add src/schema/types/department-stats.ts src/resolvers/departments.ts src/resolvers/department-stats.ts
git commit -m "feat: add department queries and aggregation stats"
```

---

### Task 7: Yoga Server Entrypoint

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Write src/index.ts**

```typescript
import { createYoga } from "graphql-yoga";
import { createServer } from "node:http";
import { builder } from "./schema/builder.js";
import "./resolvers/building.js";
import "./resolvers/buildings.js";
import "./resolvers/usage-records.js";
import "./resolvers/departments.js";
import "./resolvers/department-stats.js";
import "./schema/types/building.js";
import "./schema/types/usage-record.js";
import "./schema/types/department-stats.js";

const schema = builder.toSchema();

const yoga = createYoga({
  schema,
  graphiql: true,
  cors: {
    origin: "*",
    credentials: true,
  },
  healthCheckEndpoint: "/.well-known/apollo/health",
});

const server = createServer(yoga);

const port = parseInt(process.env.PORT ?? "4000", 10);
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/graphql`);
});
```

- [ ] **Step 2: Run the server and test**

Run: `npx tsx src/index.ts`
Expected: Server starts on port 4000.

In another terminal, test:
```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ departments }"}'
```

Expected: Returns list of department names.

```bash
curl -X POST http://localhost:4000/.well-known/apollo/health
```

Expected: Returns 200 OK.

- [ ] **Step 3: Test more queries**

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ buildings(first: 3) { edges { node { id name department } } } }"}'
```

Expected: Returns buildings with id, name, department.

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ departmentStats(department: \"Libraries:\") { buildingCount avgSiteEui totalWaterKGal } }"}'
```

Expected: Returns stats for Libraries department.

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Yoga server entrypoint"
```

---

### Task 8: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `Caddyfile`

- [ ] **Step 1: Write Dockerfile**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma/ ./prisma/
COPY src/ ./src/
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
COPY rows.json ./
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Write docker-compose.yml**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: la_energy_water
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: .
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/la_energy_water
      PORT: "4000"
    depends_on:
      db:
        condition: service_healthy
    command: >
      sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"

volumes:
  pgdata:
```

- [ ] **Step 3: Write Caddyfile**

```
api.example.com {
    reverse_proxy api:4000
}
```

- [ ] **Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml Caddyfile
git commit -m "feat: add Docker Compose setup with PostgreSQL and Caddy"
```

---

### Task 9: CI/CD Pipeline

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write .github/workflows/deploy.yml**

```yaml
name: Deploy

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/la-energy-water-api
            git pull
            echo "DB_PASSWORD=${{ secrets.DB_PASSWORD }}" > .env
            docker compose pull
            docker compose up -d --force-recreate
            docker compose exec -T api npx prisma migrate deploy
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy workflow"
```

---

### Task 10: Validation & Error Handling

**Files:**
- Modify: `src/resolvers/buildings.ts` (add validation)
- Modify: `src/resolvers/building.ts` (already has error handling)

- [ ] **Step 1: Add input validation to buildings resolver**

In `src/resolvers/buildings.ts`, add validation at the top of the resolve function:

```typescript
// After the `resolve: (query, _parent, args) => {` line, add:
const filter = args.filter ?? {};

if (filter.year && filter.year !== 2014 && filter.year !== 2015) {
  throw new GraphQLError("Year must be 2014 or 2015", {
    extensions: { code: "INVALID_YEAR" },
  });
}
if (filter.minEnergyScore != null && (filter.minEnergyScore < 0 || filter.minEnergyScore > 100)) {
  throw new GraphQLError("minEnergyScore must be between 0 and 100", {
    extensions: { code: "INVALID_SCORE" },
  });
}
if (filter.maxEnergyScore != null && (filter.maxEnergyScore < 0 || filter.maxEnergyScore > 100)) {
  throw new GraphQLError("maxEnergyScore must be between 0 and 100", {
    extensions: { code: "INVALID_SCORE" },
  });
}
```

Add the import:
```typescript
import { GraphQLError } from "graphql";
```

- [ ] **Step 2: Commit**

```bash
git add src/resolvers/buildings.ts
git commit -m "feat: add input validation and error handling"
```

---

### Self-Review Checklist

1. **Spec coverage:** Every query from the spec is implemented:
   - `buildings` (paginated, filtered) ✓
   - `building(id)` ✓
   - `departments` ✓
   - `usageRecords` (paginated, filtered) ✓
   - `departmentStats` ✓

2. **Placeholder scan:** No TODOs, TBDs, or placeholders.

3. **Type consistency:** Building.id is Int, UsageRecord.buildingId is Int, foreign key relationship matches.

4. **Gaps found and fixed:** None.
