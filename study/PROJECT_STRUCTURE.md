# Project structure

The app has one codebase and one database. Follow responsibility boundaries when reading it.

```text
Contriq/
├── app/
│   ├── layout.tsx, globals.css
│   ├── page.tsx
│   ├── employees/page.tsx
│   ├── employees/[code]/page.tsx
│   ├── methodology/page.tsx
│   ├── loading.tsx, error.tsx, not-found.tsx
│   └── api/{overview,employees,methodology,health}/
├── src/
│   ├── types.ts, http.ts
│   ├── components/{navigation,directory-filters,fact-link,ui}.tsx
│   ├── domain/{rubrics,evidence,fixtures,engine}.ts
│   └── server/{db,migrate,model,ingest,seed,scoring,queries}.ts
├── db/migrations/001_core.sql, 002_publication_guards.sql,
│   └── 003_run_and_rubric_validation.sql
├── scripts/{setup-local.sh,migrate.ts,seed.ts,score.ts}
├── tests/{scoring,http,database}.test.ts
│   └── e2e/api.test.ts
├── docs/
├── study/
└── .local/  ignored database and private context
```

## Files to open in order

| File | What it does and why it exists | Called by / calls | What would break without it |
| --- | --- | --- | --- |
| [src/types.ts](../src/types.ts) | Defines the shared shapes and role/dimension keys | Domain, read module and screens import it | The layers could disagree about fields and status values |
| [src/domain/rubrics.ts](../src/domain/rubrics.ts) | Names the actual checks, sources, role weights and engine version | Engine/fixture/seed imports it | No role-specific evaluation contract |
| [src/domain/evidence.ts](../src/domain/evidence.ts) | Normalizes raw checklists and derives facts | Fixture and importer call `normalizeEvidence()` | Source payloads could reach calculations without validation |
| [src/domain/engine.ts](../src/domain/engine.ts) | Computes ratios, exclusions and exact weighted totals | Trusted scoring runner calls `scoreEmployee()` | The app could only show arbitrary scores |
| [src/domain/fixtures.ts](../src/domain/fixtures.ts) | Generates reproducible fictional source observations | Seed script calls `generateDataset()` | No repeatable demonstration dataset |
| [src/server/db.ts](../src/server/db.ts) | Chooses reader/owner pools and manages transactions | Server modules call `getPool()` or `transaction()` | Queries lack connections and atomic error cleanup |
| [src/server/ingest.ts](../src/server/ingest.ts) | Appends records, facts and coverage, comparing replays | Seed module calls `ingestEvidence()` and `ingestCoverage()` | Duplicate imports or conflicting updates could be mishandled |
| [src/server/scoring.ts](../src/server/scoring.ts) | Captures, calculates and atomically publishes runs | Score CLI calls `scoreCohort()` | Partial or mixed results could become visible |
| [src/server/queries.ts](../src/server/queries.ts) | Reads PostgreSQL into UI/API DTOs | Pages and routes call the four query exports | The frontend cannot load stored data |
| [app/employees/[code]/page.tsx](../app/employees/[code]/page.tsx) | Renders stored components and evidence for one employee | Calls `getEmployee()` and shared components | No path from a score to its explanation |
| [src/components/directory-filters.tsx](../src/components/directory-filters.tsx) | Updates URL search/filter parameters | People page renders it | Search/filter controls would have no interaction behavior |
| [src/components/fact-link.tsx](../src/components/fact-link.tsx) | Opens the matching source disclosure and scrolls to its fact | Employee detail renders fact links | Provenance would be a label rather than an inspectable path |
| [src/http.ts](../src/http.ts) | Parses public query inputs and formats safe errors | API route handlers call it | Invalid filters could reach queries or leak internal error detail |
| [scripts/setup-local.sh](../scripts/setup-local.sh) | Starts the private cluster and runs setup stages | `npm run setup` invokes it | First-run setup becomes a series of manual guesses |

`src/server/model.ts` gives the pinned run manifest a type. `src/server/migrate.ts` reads SQL files and records checksums. The three small TypeScript CLI files call the corresponding server function and close their database pools. These are direct entry points with limited logic.

The six engineering references explain contracts. The study files teach those contracts through the actual code. Keep both synchronized when a later implementation changes behavior.
