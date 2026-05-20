# LA Municipal Building Energy & Water Usage API

## Overview

A production-grade GraphQL API serving Los Angeles municipal building energy and water usage data from the Socrata dataset `rows.json`. Built with Pothos (code-first GraphQL), Prisma (PostgreSQL ORM), and Yoga (HTTP server), deployed via Docker Compose on a DigitalOcean VPS.

## Goals

- Serve 468 usage records (2014–2015) from 245 municipal buildings
- Support filtering, pagination, and aggregation queries
- Teach production-adjacent patterns: Docker Compose, CI/CD, TLS termination, database migrations, seed scripts

## Data Model

### Building

| Field | Type | Source |
|-------|------|--------|
| `id` | Int (PK) | `property_id` from JSON |
| `name` | String | `property_name` |
| `department` | String | `department` |
| `squareFootage` | Int? | `property_gfa___self_reported_ft` |
| `theGeom` | String? | `the_geom` (WKT) |
| `locationAddress` | String? | parsed from `location_1` JSON |
| `locationCity` | String? | parsed from `location_1` JSON |
| `locationState` | String? | parsed from `location_1` JSON |
| `locationZip` | String? | parsed from `location_1` JSON |
| `latitude` | Float? | parsed from `location_1` array |
| `longitude` | Float? | parsed from `location_1` array |

### UsageRecord

| Field | Type | Source |
|-------|------|--------|
| `id` | Int (auto, PK) | auto-generated |
| `buildingId` | Int (FK → Building) | mapped from `property_id` |
| `year` | Int | `year_ending` (2014 or 2015) |
| `energyStarScore` | Int? | `energy_star_score` |
| `siteEuiKbtuFt` | Float? | `site_eui_kbtu_ft` |
| `sourceEuiKbtuFt` | Float? | `source_eui_kbtu_ft` |
| `weatherNormalizedSiteEuiKbtuFt` | Float? | `weather_normalized_site_eui_kbtu_ft` |
| `weatherNormalizedSourceEuiKbtuFt` | Float? | `weather_normalized_source_eui_kbtu_ft` |
| `waterUseAllSourcesKGal` | Float? | `water_use_all_water_sources_kgal` |
| `indirectGhgEmissionsMetricTonsCo2e` | Float? | `indirect_ghg_emissions_metric_tons_co2e` |
| `directGhgEmissionsMetricTonsCo2e` | Float? | `direct_ghg_emissions_metric_tons_co2e` |
| `totalGhgEmissionsMetricTonsCo2e` | Float? | `total_ghg_emissions_metric_tons_co2e` |
| `totalGhgEmissionsIntensityKgCo2eFt` | Float? | `total_ghg_emissions_intensity_kgco2e_ft` |
| `indoorWaterUseKGal` | Float? | `indoor_water_use_all_water_sources_kgal` |

### Relationships

- Building 1→* UsageRecord (one per year of data)
- UsageRecord belongsTo Building

## GraphQL Schema

### Types

```graphql
type Building {
  id: Int!
  name: String!
  department: String!
  squareFootage: Int
  locationAddress: String
  locationCity: String
  locationState: String
  locationZip: String
  latitude: Float
  longitude: Float
  usageRecords: [UsageRecord!]
}

type UsageRecord {
  id: ID!
  buildingId: Int!
  year: Int!
  energyStarScore: Int
  siteEuiKbtuFt: Float
  sourceEuiKbtuFt: Float
  weatherNormalizedSiteEuiKbtuFt: Float
  weatherNormalizedSourceEuiKbtuFt: Float
  waterUseAllSourcesKGal: Float
  indirectGhgEmissionsMetricTonsCo2e: Float
  directGhgEmissionsMetricTonsCo2e: Float
  totalGhgEmissionsMetricTonsCo2e: Float
  totalGhgEmissionsIntensityKgCo2eFt: Float
  indoorWaterUseKGal: Float
  building: Building!
}

type DepartmentStats {
  department: String!
  year: Int
  buildingCount: Int!
  totalSiteEui: Float
  totalSourceEui: Float
  totalWaterKGal: Float
  totalGhgEmissions: Float
  avgEnergyStarScore: Float
  avgSiteEui: Float
  avgWaterUse: Float
}
```

### Queries

| Query | Arguments | Returns |
|-------|-----------|---------|
| `buildings` | `first`, `after`, `department`, `year`, `nameContains`, `minEnergyScore`, `maxEnergyScore`, `orderBy` | `BuildingConnection` (Relay paginated) |
| `building(id)` | `id: Int!` | `Building` |
| `departments` | — | `[String!]!` |
| `usageRecords` | `first`, `after`, `department`, `year`, `orderBy` | `UsageRecordConnection` |
| `departmentStats` | `department: String!`, `year: Int` | `DepartmentStats` |

### Pagination

Relay spec cursor-based pagination via `@pothos/plugin-relay`:
- `BuildingConnection` / `UsageRecordConnection` with `edges`, `pageInfo`
- Keyset pagination using Prisma's `cursor` + `take` (stable ordering)
- Default page size: 20

### Filtering

- `department`: exact match against `Building.department`
- `year`: exact match against `UsageRecord.year`
- `nameContains`: case-insensitive substring match on `Building.name`
- `minEnergyScore`/`maxEnergyScore`: range filter on `UsageRecord.energyStarScore`

### Sorting

- `orderBy`: `NAME_ASC`, `NAME_DESC`, `DEPARTMENT_ASC`, `DEPARTMENT_DESC`, `YEAR_ASC`, `YEAR_DESC`, `ENERGY_SCORE_DESC` (high-to-low), `EMISSIONS_DESC`

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| GraphQL framework | Pothos (code-first) | End-to-end TS type safety, Prisma plugin |
| ORM | Prisma | Auto-generated migrations, Pothos plugin integration |
| HTTP server | graphql-yoga | Lightweight, built-in Envelop plugins, CORS, health checks |
| Database | PostgreSQL | Production standard, Prisma supports it natively |
| Containerization | Docker + Docker Compose | Standard deployment unit |
| Reverse proxy | Caddy | Auto-TLS via LetsEncrypt, single binary |
| CI/CD | GitHub Actions → Docker Hub → VPS SSH | Industry pattern |
| Language | TypeScript | Type safety across the stack |

## Project Structure

```
los-angeles-energy-water--usage-api/
├── Dockerfile
├── docker-compose.yml
├── Caddyfile
├── .env
├── .github/workflows/deploy.yml
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── index.ts
│   ├── db.ts
│   ├── schema/
│   │   ├── builder.ts
│   │   ├── types/
│   │   │   ├── building.ts
│   │   │   ├── usage-record.ts
│   │   │   └── department-stats.ts
│   │   └── enums.ts
│   ├── resolvers/
│   │   ├── buildings.ts
│   │   ├── building.ts
│   │   ├── usage-records.ts
│   │   ├── departments.ts
│   │   └── department-stats.ts
│   └── data/
│       ├── parse.ts
│       └── types.ts
├── tsconfig.json
├── package.json
└── rows.json
```

## Error Handling

- **Schema validation**: Pothos/GraphQL-js validates argument types before resolvers run
- **Business errors**: Custom error classes returned as structured GraphQL errors with `extensions.code`
  - `BUILDING_NOT_FOUND` — `building(id)` with invalid ID
  - `INVALID_CURSOR` — malformed pagination cursor
  - `DEPARTMENT_NOT_FOUND` — `departmentStats` with unknown department
  - `INVALID_YEAR` — year must be 2014 or 2015
  - `INVALID_SCORE` — energy score outside 0–100 range
- **DB errors**: Prisma errors caught by Yoga's Envelop error handler, logged, returned as `INTERNAL_SERVER_ERROR`

## Data Pipeline

1. **Seed script** (`prisma/seed.ts`): parse `rows.json` → extract buildings + usage records → `prisma.building.createMany` / `prisma.usageRecord.createMany`
2. **Migration workflow**: `prisma migrate dev` during development → `prisma migrate deploy` in production
3. **Prisma client**: generated from schema, singleton exported from `src/db.ts`

## Deployment

### Infrastructure

- **VPS**: DigitalOcean Droplet ($6/mo basic plan, 1GB RAM, 1 CPU, 25GB SSD)
- **OS**: Ubuntu 24.04 LTS
- **Services**: Node (via Docker), PostgreSQL (via Docker), Caddy (native or via Docker)

### Docker Compose

```yaml
services:
  db:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    environment:
      POSTGRES_DB: la_energy_water
      POSTGRES_PASSWORD: ${DB_PASSWORD}
  api:
    build: .
    ports: ["4000:4000"]
    environment:
      DATABASE_URL: postgres://postgres:${DB_PASSWORD}@db:5432/la_energy_water
    depends_on: [db]
```

### CI/CD Pipeline

1. Push to `main` triggers GitHub Actions
2. Build Docker image, push to Docker Hub (or GHCR)
3. SSH into VPS, pull new image, `docker compose up -d`
4. Migration: `docker exec api npx prisma migrate deploy`
5. Seed (first deploy only): `docker exec api npx prisma db seed`

## Testing

### Unit Tests (Jest)
- Resolver tests: mock Prisma client, test each resolver independently
- Parse tests: verify `rows.json` parsed into correct building/usage record shapes
- Validation tests: verify input filters reject invalid values

### Integration Tests (Jest + testcontainers)
- Spin up PostgreSQL in Docker via `testcontainers`
- Run Prisma migrations + seed
- Run queries against the running Yoga server via `graphql-request`
- Assert correct shapes, counts, pagination behavior

## Future Considerations

- **Subscriptions**: Yoga supports SSE/WebSocket subscriptions if real-time updates are needed
- **Mutation support**: batch imports of new building data could be added via `importBuildings` mutation
- **Apollo Federation**: schema could be extended with Federation directives if part of a larger graph
- **Rate limiting**: Envelop plugin (`@envelop/rate-limiter`) for API protection
- **Metrics**: Prometheus metrics via `@envelop/prometheus`
