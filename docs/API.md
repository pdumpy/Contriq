# API

The web API exposes GET operations for the synthetic published dataset. It shares the same read functions as server-rendered pages. Route handlers live under `app/api/`. `src/http.ts` validates public parameters and shapes safe error responses.

| Endpoint | Parameters | Response |
| --- | --- | --- |
| `GET /api/overview` | None | Counts, per-family distributions, coverage, evidence counts, period and selected run ID |
| `GET /api/employees` | `q`, `family`, `status`, `page`, `run` | Employee rows, matching total, page, pageSize 20, run ID and period |
| `GET /api/employees/{code}` | Optional `run` | Identity, exact rubric, stored result/components, source coverage and original records/facts |
| `GET /api/methodology` | None | Active four role rubrics from PostgreSQL and evaluation period |
| `GET /api/health` | None | `status` of a bounded database readiness query |

The HTML directory uses 15 rows per page for its layout. API pages use 20. Both call `getEmployees()` and retain the selected published run.

`q` matches a name, employee code or team and has a 100-character limit. `family` must be one of the four `JobFamily` keys in `src/types.ts`. `status` is `calculated` or `insufficient_evidence`. `page` is a positive integer. `run` is a positive integer identifier. Duplicate directory parameters are rejected. Unknown employee codes return 404.

```sh
curl 'http://127.0.0.1:3000/api/employees?family=backend_engineering&page=2'
curl 'http://127.0.0.1:3000/api/employees/CQ-004'
curl 'http://127.0.0.1:3000/api/employees?status=insufficient_evidence'
```

## Result semantics

A calculated result has a numeric total, including an observed zero. An insufficient result has `totalScore: null`, an explicit reason and available component details. Components contain weight, ratio metrics, score, contribution and exact fact links. The total uses unrounded ratios, so independently rounded displayed contributions can differ by a cent from their displayed sum.

Coverage is the percentage of required source inventories marked complete for the exact period. It measures source availability independently of scoring weights and outcomes. A fully available source can still contain a conflicting or unusable measurement that prevents a numeric result.

`evidenceCounts.excluded` counts distinct excluded measurements/facts. `valid` and `invalid` count selected source records. The UI labels those units explicitly.

## Errors

| Status | Meaning |
| --- | --- |
| 200 | Successful read, including a deliberate insufficient-evidence result or an empty search |
| 400 | Invalid query or malformed employee identifier |
| 404 | Unknown employee or a requested detail that has no matching published run |
| 405 | Unsupported HTTP method |
| 503 | Database/read service unavailable |

An error body contains `error.code` and a concise `error.message`. Internal SQL errors and connection details stay server-side. Import, migration and scoring publication are trusted CLI functions and have no public mutation endpoint.
