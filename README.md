# Los Angeles Energy & Water Usage API

A GraphQL API for exploring energy and water usage data from Los Angeles municipal buildings (2014–2015). Built with [Pothos](https://pothos-graphql.dev/) (code-first GraphQL), [Prisma](https://www.prisma.io/), [PostgreSQL](https://www.postgresql.org/), and [graphql-yoga](https://the-guild.dev/graphql/yoga-server).

Data sourced from the [City of Los Angeles Socrata open data portal](https://data.lacity.org/) (dataset `8m62-bye6`), containing ~470 usage records across ~245 municipal buildings.

## Queries

| Query | Description |
|-------|-------------|
| `building(id)` | Fetch a single building by ID |
| `buildings` | Paginated (Relay cursor), filterable, sortable building list |
| `departments` | List all distinct city departments |
| `usageRecords` | Paginated, filterable, sortable usage records |
| `departmentStats` | Aggregated statistics for a department (buildings, EUI, water, GHG, Energy Star score) |

## Quick Start (Docker)

```bash
cp .env.example .env          # edit DB_PASSWORD
docker compose up -d          # starts PostgreSQL + API
# GraphQL endpoint: http://localhost:4000/graphql
# GraphiQL IDE available at the same URL
```

## Development (without Docker)

```bash
npm install
cp .env.example .env          # set DATABASE_URL for your local PostgreSQL
npx prisma generate
npx prisma db push
npm run db:seed
npm test
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with hot reload (via `tsx`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled server |
| `npm test` | Run tests (Vitest) |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed database |
| `npm run db:reset` | Reset database (destructive) |

## Stack

- **Runtime:** Node.js 22, TypeScript 5.8
- **GraphQL:** Pothos 4, graphql-yoga 5, graphql 16
- **Database:** PostgreSQL 16 via Prisma 6
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Caddy (TLS termination)
- **CI/CD:** GitHub Actions → DigitalOcean VPS

## Deployment

Push to `main` triggers the CI/CD pipeline which builds a Docker image, pushes to GHCR, and deploys to a VPS via SSH. See `.github/workflows/deploy.yml`.

## License

Data from the City of Los Angeles is public domain under [Socrata's terms of service](https://data.lacity.org/).
