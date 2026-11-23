# Backend explained

The backend supplies database-backed evidence and stored calculations to the pages. Its public interface serves reads. Trusted local scripts handle the write pipeline.

## Read a request

For `GET /api/employees?family=backend_engineering`, [the route handler](../app/api/employees/route.ts) calls [parseDirectoryParams()](../src/http.ts). Zod validates the family, query length, status, page and optional run identifier. Invalid parameters return a useful 400 response.

The handler calls [getEmployees()](../src/server/queries.ts). That module resolves a published run and reads PostgreSQL rows and its manifest. The manifest contains employee identity as captured for that run, so a later employee edit cannot change the explanation of an older result. For the bounded 200-person cohort, the module applies search/filter/pagination to that loaded snapshot. The API returns rows and pagination metadata.

The server-rendered People page calls the same query function directly. It avoids an unnecessary HTTP request back into itself. The response DTO shape comes from [src/types.ts](../src/types.ts).

## Write evidence safely

[seedDatabase()](../src/server/seed.ts) creates fictional identities and versioned rubrics. [ingestEvidence()](../src/server/ingest.ts) validates and normalizes source data and appends evidence/facts transactionally. A source key plus revision identifies a replay. Equivalent payloads are accepted idempotently. A different payload with the same identity raises a conflict.

Coverage is its own history because “the connector returned the complete period” is a different observation from “this check passed.” `ingestCoverage()` appends those source-availability revisions.

The [scoring runner](../src/server/scoring.ts) captures input IDs, calculates with a pure function, then publishes the entire cohort transactionally. The database guards and TypeScript validation both participate. A failed publication cannot make the website show a half-written result set.

## Connections and errors

[getPool()](../src/server/db.ts) selects the read-only web role. Trusted commands use `getPool(true)` and the owner variable. The local writer validates that its database URL targets loopback, protecting this session's local-only boundary. Query values are parameterized. `transaction()` holds one client for a whole transaction and releases it even after failure.

[apiError()](../src/http.ts) maps invalid input to 400 and database/read failure to 503. The public message suggests checking the local database and retrying. It omits SQL, connection strings and private error payloads. [The page error boundary](../app/error.tsx) offers a visible retry action.

The engine is separated from queries because arithmetic can then be tested with plain TypeScript objects, independent of PostgreSQL, React or network availability. [Scoring tests](../tests/scoring.test.ts) verify those rules, and [database tests](../tests/database.test.ts) verify the actual storage/transaction boundary.

To defend the backend, start from one route and trace it into the query module and reader pool. Then start from `scripts/score.ts` and trace the completely different trusted write path into the pure engine and publisher.
