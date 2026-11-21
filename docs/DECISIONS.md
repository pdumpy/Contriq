# Decisions

Confirmed items come from the project brief. Proposed items describe this design for review. Pending items need a decision before the related behavior is implemented.

## Confirmed

| Decision | Reason | Alternatives considered | Trade-off |
| --- | --- | --- | --- |
| Use 200 fictional mid-level employees, four equal job families and one 90-day window. | Gives the demo a consistent scope. | Real employee data or a mix of job levels. | The results describe only the synthetic cohort. |
| Use six dimensions and one pure engine with versioned role rubrics. Reserve 2% for verified collaboration. | Keeps different types of work comparable within each family and results reproducible. | A shared rubric or separate engines per family. | Rubrics need their own validation and fixtures. |
| Keep evidence history, explicit missing-data states and explainable advisory scores. | A reviewer must be able to reproduce a result and inspect its limitations. | Store only the current score or fill missing inputs with zero. | Historical data and provenance take more storage. |
| Use Next.js and TypeScript, a Workers-compatible API and managed PostgreSQL with JSONB. | Gives V1 a modular web stack and relational audit trail with room for varied evidence. | A document store, or encoding each source's raw format in relational columns. | PostgreSQL connectivity and framework compatibility must be verified in the intended runtime. |
| Use WARCAMP's dark-first, progressively disclosed UI. | Makes methodology and uncertainty visible while keeping core screens easy to scan. | Put the full audit detail on the overview. | Detailed evidence takes an extra interaction. |

## Proposed

| Decision | Reason | Alternatives considered | Trade-off |
| --- | --- | --- | --- |
| Start from the [four weight sets](PROJECT_CONTEXT.md#scoring) in the brief. | Establishes an initial distribution for each role. | Equal dimension weights or a uniform distribution across roles. | The proposed differences need review alongside real rubric definitions. |
| Use the [nine-table schema](SCHEMA_DESIGN.md) with typed facts, immutable input revisions and exact rubric references. | Keeps ingest, validation and source corrections traceable. | Overwrite source records in place, or store the full model in JSONB. | Importers and the publisher must validate identities and references across rows. |
| Snapshot one full cohort per run and publish atomically. Use explicit UTC, half-open windows. | Keeps the directory, breakdowns and dashboard on one coherent result set. | Publish scores as individual employees finish. | A failed calculation blocks the new cohort. An explicit insufficient-evidence result counts as a completed outcome. |
| Prefer a small Workers deployment with a read-only web API and a trusted seed/scoring runner. Evaluate Hyperdrive for PostgreSQL. | Keeps database credentials and write operations out of the public UI. | Split the UI and API into independently deployed services, or use a provider-managed connection pool. | Runtime and transaction support need a local proof before choosing an adapter or driver. |

## Pending decisions

| Decision needed | Why it matters | Options and trade-off |
| --- | --- | --- |
| Role submetrics, measurement definitions, role expectations and normalization formulas | Defines what contributes to each dimension. | Ratios, rubrics with discrete bands and other measurement-specific functions have different data needs. Review definitions per role first. |
| Required evidence sources, thresholds, eligibility and handling of incomplete coverage or a zero denominator | Determines when a numeric score is justified. | Per-metric and per-dimension requirements differ in how much of a partial record they can explain. Agree when to report insufficient evidence. |
| Canonical identity and attribution rules by source and fact type | Prevents cross-source duplicates and resolves conflicting records. | Shared work IDs work where they exist. Source-specific mappings need explicit rules and tests. |
| Decimal precision, rounding and display scale | Keeps replay and presentation consistent. | Fixed-scale quantities and decimal arithmetic have different storage and implementation costs. Choose points at which rounding is allowed. |
| Window anchor, publication cadence and within-family ranking | Determines what runs the user sees and which comparisons the product makes. | A fixed demo period is simpler than rolling windows. Score distributions and ordered lists answer different questions. |
| PostgreSQL provider and version, driver, Next.js adapter and deployment layout | Affects transaction support, local parity and operating effort. | Check a Workers-compatible setup before committing to packages or a provider. |
| API routes, response versioning, search and pagination details | Determines the public contract. | A small fixed cohort can start with simple reads. Add pagination if the directory contract requires it. |
