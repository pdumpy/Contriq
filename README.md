# Contriq

Contriq turns fictional work evidence into role-specific calculations that a reviewer can inspect. It includes 200 mid-level employees across four job families, a real PostgreSQL database, versioned rubrics, a pure TypeScript scoring engine and four working review screens.

## Run on this Mac

Requirements are Node.js 22 or newer, npm and PostgreSQL 17 command-line tools on PATH. All data is fictional. The local database binds to loopback on port 55438.

```sh
npm ci
npm run setup
npm run dev
```

Open [Contriq locally](http://127.0.0.1:3000). Setup creates an isolated cluster inside `.local/postgres`, applies checksum-tracked migrations, imports reproducible seed 42 and publishes a complete scoring run. Rerunning setup preserves evidence and historical results. It publishes a new run instead of overwriting the previous one.

The web app uses a read-only PostgreSQL role. Trusted CLI scripts use the separate owner connection. `.env.local` and the cluster are ignored by Git. `.env.example` describes the local connection variables. This loopback-only setup uses local trust authentication and is intended for the synthetic development environment.

## Inspect the product

- **Overview** shows cohort counts, per-family score distributions and source coverage.
- **People** searches names, codes and teams, filters by family/result status, and paginates a pinned published run.
- **Employee detail** shows six dimensions, metric ratios, weighted contributions, source availability and expandable raw evidence.
- **Methodology** explains the active rubric. Hover over or activate a dimension weight to see each metric's share and its maximum contribution to the overall score.

Scroll past the page footer to reveal the animated gold CONTRIQ wordmark.

Start with employee `CQ-004`, Isha Mehta. Her Data Science result is **43.88** with 100% source coverage. Employee `CQ-001` demonstrates insufficient evidence. Missing information produces a null total rather than an invented zero. Results are a synthetic demonstration and have no validated employment-decision meaning.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

`npm test` covers the pure engine, query validation and actual PostgreSQL integration. Run setup first. `test:e2e` needs the local server and tests the real HTTP endpoints. Its default URL is port 3000 and can be overridden through `TEST_BASE_URL`. Browser interaction and responsive QA are described in the [verification record](docs/VERIFICATION.md).

To refresh the evidence or calculation independently, use `npm run db:seed` and `npm run db:score`. `npm run db:migrate` applies pending migrations. Source imports reject conflicting replays.

To stop the development server, press Ctrl+C in its terminal. To stop the owned database, run `pg_ctl -D .local/postgres stop`. `npm run setup` starts it again. `npm run start` serves a previously built production bundle on port 3000.

## Learn and review

Start with [study/START_HERE.md](study/START_HERE.md). It gives a 2–3-hour route through the working app and its actual source files.

| Reference | Contents |
| --- | --- |
| [Project context](docs/PROJECT_CONTEXT.md) | Purpose, scope and WARCAMP expectations |
| [Decisions](docs/DECISIONS.md) | Implemented choices, demonstration assumptions and future choices |
| [System architecture](docs/SYSTEM_ARCHITECTURE.md) | Components and responsibility boundaries |
| [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md) | Runtime, dependencies, database access and hosting considerations |
| [Flow](docs/FLOW.md) | Import, snapshot, scoring, atomic publication and reads |
| [API](docs/API.md) | Implemented read endpoints and errors |
| [Schema](docs/SCHEMA_DESIGN.md) | Tables, constraints and historical references |
| [Scoring contract](docs/SCORING_CONTRACT.md) | Provisional role-specific measurements and exact mathematics |
| [Handoff](docs/HANDOFF.md) | Current local state and review entry points |

## Hosting

Contriq runs on Cloudflare Workers and reads the fictional dataset from Supabase Postgres. Pushes to `main` run the Worker build, apply pending database migrations, deploy the Worker and check the public app. [Open Contriq](https://contriq-oswarteck.pdumpy.workers.dev) · [Technical architecture](docs/TECHNICAL_ARCHITECTURE.md)
