# Technical defense questions

Practice answering each question in your own words, then open the referenced implementation to verify the explanation.

## Why PostgreSQL instead of flat JSON or MongoDB?

This app needs relationships, foreign keys, uniqueness, historical result references and atomic publication. PostgreSQL expresses those directly. Flat JSON is useful as an interchange format but would require us to implement reliable joins, concurrent writes and integrity ourselves. A document database could work, but the evidence-to-component relationships and transactional cohort publication fit this relational model. Open [the schema](../db/migrations/001_core.sql).

## Why use JSONB inside a relational database?

Original source payloads and role rules vary in shape. JSONB keeps that flexibility while employee IDs, rubric references, statuses, scores and indexed relationships remain typed columns. In Contriq, `raw_payload` and `rules` are examples. JSONB also reorders object keys, which is why replay comparison uses canonical structured content. Open [the importer](../src/server/ingest.ts).

## Explain the nine tables in one minute.

Employees identify fictional people. Rubrics define role-specific rules. Evidence records preserve source revisions. Facts are validated measurements. Coverage records which sources are complete. Runs pin exact inputs and an engine version. Scores store one employee's outcome. Components explain the dimensions and metrics. Evidence links connect those calculations to their exact facts. The separate `schema_migrations` table is infrastructure bookkeeping. Open [the database guide](DATABASE_EXPLAINED.md).

## How is an employee connected to a result?

`scores.employee_id` points to `employees.id`, and `scores.run_id` points to the captured evaluation. The pair is unique, so a run has at most one outcome per employee. Its rubric ID and family must match the correct versioned role. Historical employee identity/level is also stored in the run manifest. Open [scoring.ts](../src/server/scoring.ts).

## Why do four roles use one engine?

The mathematics and validation workflow are common. The definitions differ. Data Science checks analytical objectives, statistical/data-lineage reviews and held-out evaluation. Backend checks API acceptance, implementation/security review and contract/recovery tests. Full Stack checks integrated flows, accessibility and end-to-end/responsive validation. Agentic AI checks workflow outcomes, tool permissions and task/adversarial evaluation. Configuration captures these differences without four duplicated algorithms. Open [rubrics.ts](../src/domain/rubrics.ts).

## How does the score actually work?

Each metric counts passing binary observations divided by eligible observed work items, multiplied by 100. Two equally weighted metrics produce each of the first five dimension scores. Collaboration has one metric. The overall total is the exact sum of dimension score times its role weight divided by 100. The code keeps integer fractions until half-up presentation rounding. CQ-004 is the complete worked example. Open [engine.ts](../src/domain/engine.ts) and [the calculation guide](SCORING_ENGINE_EXPLAINED.md).

## Why is collaboration only 2%?

The brief deliberately minimized subjective peer opinion. V1 allocates 2% to an attributable work-linked review contribution and 98% to other observed technical checklists. This percentage is a demonstration assumption rather than a calibrated universal standard. It is explicit and versioned so a later review can change it responsibly. Open [the scoring contract](../docs/SCORING_CONTRACT.md).

## How are duplicates prevented?

Storage prevents a repeated source revision and a repeated extracted fact from being appended twice. Equivalent source replay is idempotent, while conflicting content under the same key fails. Scoring then groups equivalent measurements by canonical work identity within the particular metric. Mirrors count once and conflicting outcomes withhold that metric. These are two different boundaries. Open [ingest.ts](../src/server/ingest.ts), [evidence.ts](../src/domain/evidence.ts) and [engine.ts](../src/domain/engine.ts).

## What does missing evidence do?

A required incomplete source, absent required check, conflicting canonical outcome or zero denominator can make a metric unavailable. If any required dimension is unavailable, the overall total is null with `insufficient_evidence`. Available dimension information remains inspectable. The app does not redistribute weights to hide the gap. Open the detail for CQ-001 and inspect [the engine](../src/domain/engine.ts).

## Can zero be a valid result?

Yes. A complete set of eligible observations can all fail, giving numerator 0 and a positive denominator. That is a measured zero. A source that supplies no usable denominator cannot justify that same numeric interpretation. The regression tests distinguish these cases. Open [scoring tests](../tests/scoring.test.ts).

## How can you prove reproducibility?

A seeded generator produces the same observations, rules have permanent versions, a run pins exact input IDs and the pure function uses no clocks, network calls or randomness. Tests compare repeated calculations and changed input ordering. Stored operands and links allow an audit. Replay refuses an unsupported engine build. This proves behavior under the demonstration contract, while the rubric's real-world validity remains a separate question. Open [engine.ts](../src/domain/engine.ts) and [scoring.ts](../src/server/scoring.ts).

## What if someone changes the rubric or source evidence?

Activated rubric rules and source history are immutable. A new rubric gets a new ID/version. An evidence correction appends a revision. New runs capture the new inputs, while older scores retain their exact original references and stored explanation. The database tests verify a correction and replacement rubric without rewriting prior outcomes. Open [database.test.ts](../tests/database.test.ts).

## What if the final database insert fails halfway through scoring?

All new result rows and the published transition share one transaction. Failure rolls back those writes. The runner records a failed attempt separately where possible, and public reads continue to select the last published run. Stable attempt keys help reconcile a commit whose acknowledgment was lost. Open `publishRun()` and `scoreCohort()` in [the runner](../src/server/scoring.ts).

## What happens if PostgreSQL goes down?

Connection and query waits are bounded. The API returns a generic 503 with actionable wording. The page error boundary lets the reviewer retry after the local cluster is restored. The app does not fabricate fallback employee scores. Open [db.ts](../src/server/db.ts), [http.ts](../src/http.ts) and [error.tsx](../app/error.tsx).

## Why Next.js?

It provides page routing, server rendering, error/loading boundaries and HTTP route handlers in one TypeScript application. The data-heavy pages can read PostgreSQL on the server, and only filters/navigation/fact links need client state. This avoids a separate frontend and API service for the small demo. Open [app/layout.tsx](../app/layout.tsx) and [queries.ts](../src/server/queries.ts).

## What does Cloudflare provide later?

Cloudflare is the intended managed web/runtime host. A later deployment needs a compatible adapter, managed PostgreSQL and request-scoped database connectivity, such as the documented Hyperdrive path. The current delivery proves local Next.js/PostgreSQL behavior. Provider selection, bindings, network access, backups and actual Worker-runtime verification remain the hosting pass. Open [technical architecture](../docs/TECHNICAL_ARCHITECTURE.md).

## Why no RAG in V1?

The core task is to calculate and explain stored deterministic rules. Adding embeddings or a chatbot would not make that arithmetic more correct. A later retrieval feature could help find source evidence or explain an existing calculation with citations. It should preserve the numerical source of truth. Open [project context](../docs/PROJECT_CONTEXT.md).

## How did first-principles thinking affect the implementation?

We kept one product, one database and one engine. We deferred accounts, uploads and RAG so the first complete flow could work. Explicit ratios were chosen over opaque formulas, and the reader/publisher separation addresses the real failure risks. The decisions are documented alongside their trade-offs in [DECISIONS.md](../docs/DECISIONS.md).

## Which UX principles can you demonstrate?

Show progressive disclosure by expanding a dimension then opening one source fact. Show recognition through names and role labels. Show interruption recovery by copying a filtered run-specific URL. Show proximity and similarity in the aligned score/weight/coverage components, and constraints through typed filters. Open [the UX guide](UI_UX_DESIGN.md).

## What was actually tested?

The engine tests arithmetic and evidence rules, integration tests use real PostgreSQL transactions and guards, HTTP tests exercise live route responses, and browser checks cover navigation, filters, disclosures and narrow layouts. Static checks and the production build have separately recorded results. Use [VERIFICATION.md](../docs/VERIFICATION.md) for the final executed counts and limitations rather than memorizing a stale count.

## What would change at a larger scale?

The bounded 200-person snapshot can be filtered in application memory. A larger cohort needs indexed snapshot projections, SQL pagination and search, workload measurement, and possibly background chunk calculation with the same atomic publication contract. Real-source integrations would need explicit source inventories and attribution policies. Add those in response to measured needs.

## What is the most important limitation?

The binary work checklists, coverage declarations and weights are provisional synthetic assumptions. They demonstrate explainability and engineering correctness, not scientific performance validity. There are no real integrations or real employee decisions. The small dataset also cannot prove production throughput or availability.
