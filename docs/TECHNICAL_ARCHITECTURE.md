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

## Cloudflare compatibility research

Cloudflare currently recommends vinext for its Next.js API surface on Workers, and labels it beta. This local delivery keeps standard Next.js development while the hosting choice awaits a separately authorized deployment review. The repository's earlier OpenNext alternative is a deployment candidate whose support needs checking against the selected Next.js version. [Cloudflare Next.js guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

The installed pg version exceeds Cloudflare Hyperdrive's documented minimum. A future Worker needs the appropriate Node.js compatibility flag and a request-scoped Client using the Hyperdrive binding. The local Node pool is the local-development implementation. Worker bindings, managed credentials, region placement, backups and a Worker-runtime smoke test remain part of the later hosting work. [Cloudflare node-postgres guide](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/node-postgres/)
