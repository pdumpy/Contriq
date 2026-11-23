# Testing and failure handling

The tests are designed around failure modes that could silently change an explanation. They execute actual engine arithmetic and actual PostgreSQL operations.

| Test file | Responsibility and important assertions |
| --- | --- |
| [tests/scoring.test.ts](../tests/scoring.test.ts) | Four rubric families,100% weights, bounded deterministic scores, zero versus missing, duplicates/conflicts, revisions, wrong role, zero denominator, period boundaries, source coverage and reproducible fixtures |
| [tests/database.test.ts](../tests/database.test.ts) | Real200-person reads, filters, immutable history, replay safety, wrong references, complete publication and rollback after late insertion failure |
| [tests/http.test.ts](../tests/http.test.ts) | Public query parsing, invalid/ambiguous parameters and safe400 responses |
| [tests/e2e/api.test.ts](../tests/e2e/api.test.ts) | Actual HTTP overview/directory/detail/methodology plumbing, filtered results, calculation references, insufficiency and method/error status behavior |

Run `npm test` after setup. Run `npm run test:e2e` while the server is running. [docs/VERIFICATION.md](../docs/VERIFICATION.md) records the final executed outcomes, build/static checks and browser review.

## Why a failed publication is safe

The runner first captures exact inputs and calculates outcomes. Publication locks the running attempt and inserts all results inside one transaction. It changes status only after the complete cohort and links pass guards. A failed late insert rolls back new score rows. The previous published run remains selected by the read module.

The database tests create temporary attempts and mutations inside transactions that are rolled back. They deliberately force a failure after a partial set of result inserts and assert that those new rows disappear and the public published result is unchanged. The test exercises the actual database boundary.

## Genuine bugs found during development

### Coverage had two meanings

During integration review, the first engine implementation returned the sum of available dimension weights as coverage. The query layer reported complete required sources divided by expected sources. A missing quality source therefore produced different percentages depending on which layer answered.

The root cause was using scoring importance as an availability measure. The engine now counts unique complete required sources independently of the rubric weights and metric outcomes. The regression test named `source coverage is independent of rubric weights and observed outcomes` covers the corrected behavior. A source can be complete while a conflicting measurement still withholds the total.

### A normalized fact ID could overflow

The initial normalizer derived a fact UUID from a source UUID's suffix multiplied by a small factor. The synthetic fixture's tiny suffixes passed, but the backend reviewer tried a normal arbitrary UUID and found that the derived suffix could exceed the UUID field width.

The fix uses a stable whole-identity/metric hash fallback for arbitrary source IDs while preserving the small deterministic fixture IDs. The regression test named `arbitrary UUID source revisions normalize to valid stable fact UUIDs without suffix overflow` verifies valid, stable normalized IDs. This was an actual development defect, and it illustrates why testing only the happy-path fixture is insufficient.

## Read failures and unusable evidence

A lost PostgreSQL connection produces a generic 503 through the API and an explicit page error with retry. Invalid or unrelated source facts are retained with reasons and excluded from performance arithmetic. Source gaps and conflicting canonical outcomes can make a metric unavailable. A denominator of zero is never divided, and unavailable dimensions are never assigned zero or redistributed weights.

Exact old rubric/input references preserve historical explanations. The final engine identifies its build version. The runner refuses to replay an unsupported earlier engine version, instead of using changed logic under its name. Earlier development runs remain readable through stored components and source references.

## Two end-to-end regressions caught in final review

### Selecting the latest run numerically

After repeated setup created published run 22, the UI still selected run 6. PostgreSQL had resolved `ORDER BY id` to the selected text alias from `id::text`, giving lexical order. Qualifying the underlying bigint column as `scoring_runs.id` corrected the ordering. The added database regression was run before the fix and failed with 6 versus 22. It now compares overview/directory selection to the numeric maximum and also checks explicit older-run access.

### Keeping phone tables inside their scroll container

A 390px browser check found document width 815px. Hidden accessibility labels inside a wide table used absolute positioning, but their scroll wrapper had no positioning context. The wrapper now has `position: relative`, keeping those labels inside its own overflow boundary. Repeated rendered checks on all four screens showed document width equal to client width 390px. This is an executed browser layout regression check.
