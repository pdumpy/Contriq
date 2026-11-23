# Decisions

Updated 23 November 2026 for the local V1 implementation. The user authorized implementation and sensible provisional scoring rules in the full development prompt. These demonstration choices make the synthetic application operational and remain open to later product review.

## Implemented V1 decisions

| Choice | Reason and trade-off |
| --- | --- |
| 200 fictional mid-level employees, 50 in each technical job family | The implementation prompt explicitly confirms this cohort and resolves the earlier mid-level status disagreement. |
| Fixed UTC half-open period 2026-08-23 through 2026-11-21 | Exactly 90 days. The UI displays the inclusive dates 23 Aug–20 Nov. A fixed window simplifies reproducibility. |
| PostgreSQL 17 with nine domain tables and JSONB for flexible fields | Relational constraints protect identities/history. JSONB retains heterogeneous evidence and versioned rules without replacing the relationships. |
| Next.js App Router with TypeScript and pg | One understandable full-stack codebase. Server pages and HTTP routes share the same PostgreSQL read module. |
| One pure scoring engine, four versioned role rubrics | Roles use different work-check definitions and dimension percentages without duplicating the engine. |
| Two binary metrics per main dimension, one collaboration metric | An explicit observed pass/fail checklist gives inspectable numerator/denominator arithmetic. It loses some real-world nuance and has no empirical validation. |
| Supplied demonstration weight sets and collaboration 2% | Implemented as provisional V1 configuration. Each role totals exactly 100%. These weights require calibration for any future purpose. |
| All required metrics need complete source coverage and a nonzero denominator | Withholds a total when a dimension is unavailable. It avoids redistribution of missing weights but is deliberately conservative. |
| Canonical work/metric keys and latest source revisions | Equivalent mirrors count once, conflicting duplicates withhold the metric and source corrections preserve old runs. |
| Exact integer fractions, half-up two-decimal presentation | Avoids floating-point accumulation and records an explainable rounding policy. Total calculation uses unrounded dimensions. |
| Source coverage is independent of score weights | Availability of the six required source inventories is distinct from performance and eligibility. |
| Atomic full-cohort publication with immutable inputs and database guards | A failed publication preserves the previous complete published run. It adds validation work to the trusted runner. |
| Loopback-only native PostgreSQL with reader and owner connections | Reuses the installed toolchain. Web reads cannot mutate data. Local trust authentication is confined to the development cluster. |
| Small bounded snapshot filtering for 200 employees | Keeps historical identity/role consistent. Indexed SQL search over persistent snapshots is the larger-scale alternative. |
| Local fonts, restrained dark UI and progressive evidence disclosure | Applies the WARCAMP visual language and makes detailed calculations available at the point of review. |

## Provisional measurement contract

See [SCORING_CONTRACT.md](SCORING_CONTRACT.md) for every actual role-specific metric, source, formula, eligibility rule and missing-data behavior. A low result describes the observed checklist ratios. The application produces no personality, popularity or employment recommendation.

## Hosting

Use vinext on Cloudflare Workers with Supabase Postgres and a read-only Hyperdrive connection. A single GitHub Actions workflow orders database migrations before Worker deployment. Hosting this fictional dataset keeps repository secrets separate from the public reader. Production authentication and backup requirements for real employee data remain open.

## Later decisions

V2/V3 features, real employee data, external imports, RAG, authentication and rankings require their own scoped product decisions. Existing synthetic scores cannot establish a scientifically validated HR rubric.
