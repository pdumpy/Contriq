# Technical architecture

## Local runtime

The implementation uses Next.js 16.4.6 App Router, React 19.3.1, TypeScript 6, PostgreSQL 17 and node-postgres. The package lock records exact installed versions. `next dev` serves the local review at port 3000. Server pages and route handlers use asynchronous parameters according to the installed Next.js documentation.

Use `src/types.ts` for shared DTOs and literal job-family/dimension keys. Domain code imports no Next.js, React or database modules. `src/server/` owns persistence. Client components contain navigation/filter state and never receive connection variables.

| Package | Reason |
| --- | --- |
| next, react, react-dom | Routing, server rendering, layouts and small interactive controls |
| pg | Explicit PostgreSQL queries and single-connection transactions |
| zod | Runtime validation of public search/filter/run parameters |
| @fontsource/inter, @fontsource/ibm-plex-mono | Local font assets, avoiding a build-time remote font dependency |
| lucide-react | Consistent functional navigation and evidence icons |
| tsx, node:test, assert | Execute TypeScript commands and meaningful tests |
| eslint and TypeScript | Static correctness and maintainability checks |

## Database execution

`getPool()` selects the read-only `DATABASE_URL`. `getPool(true)` selects `DATABASE_ADMIN_URL` for trusted scripts. Pools have bounded connection/query waits. `transaction()` uses one checked-out client from BEGIN through COMMIT/ROLLBACK, then always releases it. SQL values use parameters.

`migrate()` serializes migration work with a PostgreSQL advisory lock, records file checksums in `schema_migrations` and applies each migration transactionally. The nine domain tables remain distinct from that small infrastructure table. Existing migration files must retain their checksums after application. Add a new migration for a later change.

`captureRun()` records an exact cohort, role/level, rubric IDs, evidence/fact IDs, coverage revisions and gaps under repeatable-read isolation. `calculateRun()` uses those pinned inputs. `publishRun()` locks the attempt, checks outcomes against recomputation, inserts the full cohort and changes status atomically. Terminal attempts and append-only rows retain history. The latest published run by ID is selected for reads.

The engine uses integer fractions with BigInt and rounds half up to two decimal places at presentation boundaries. The unrounded weighted values produce the total. Stored components include operands and exact input references. See [the scoring contract](SCORING_CONTRACT.md).

## Errors and consistency

Route handlers return structured 400, 404 or 503 responses. Pages render an explicit unavailable state with retry on a read failure. Database error payloads and connection strings are excluded from API responses. Empty searches and missing evidence have separate states from service outages.

The cohort is small and fixed at 200. The query module loads a published snapshot from PostgreSQL and applies directory search/filter/pagination to that bounded snapshot. This keeps historical role/name context consistent. Large datasets would need indexed SQL search and pagination over a persistent snapshot projection. Raw evidence is loaded only for one detail view.

## Hosted runtime

The production build uses vinext on Cloudflare Workers with Node.js compatibility. It opens a request-scoped `pg.Client` through Hyperdrive to the Mumbai Supabase project. Hyperdrive verifies the origin certificate and uses the read-only `contriq_reader` role. Standard Next.js uses the local reader pool.

GitHub Actions builds the Worker, applies pending migrations in the private `contriq` schema using the `contriq_release` role over verified TLS, then deploys and checks health. Releases retain the existing published run unless the scoring engine changes. `CONTRIQ_RELEASE_DATABASE_URL`, `CONTRIQ_RELEASE_DATABASE_CA` and `CLOUDFLARE_API_TOKEN` live in GitHub Actions secrets. [Deployment workflow](../.github/workflows/deploy.yml)
