# Local verification

Verified on 23 November 2026 on the MacBook Air M2. The application is available at http://127.0.0.1:3000 with the local PostgreSQL cluster on port 55438.

## Automated checks executed

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with zero errors and zero warnings |
| `npm test` | 32 passed, zero failed or skipped |
| `npm run test:e2e` against dev on 3000 | 5 passed |
| `npm run build` | Passed, including Next.js production compilation and type checks |
| Built app started locally on 3001 | Ready, overview/detail/methodology each returned HTTP 200 |
| Same HTTP suite against built app on 3001 | 5 passed |
| `npm run setup` repeated | Migrations current, identical source import, new complete run published |
| Local Markdown references and required study file inventory | Checked after documentation completion |

The 37 distinct automated tests comprise 19 domain/scoring tests, 10 actual PostgreSQL integration tests, 3 query/error tests and 5 live HTTP tests. Repeating the five HTTP checks against the production process verifies that build separately. The temporary production process on 3001 was stopped after testing. The development process on 3000 remains running.

## Database observations

The final default-seed import contains 200 employees, 50 per family, 4,900 evidence revisions, 8,960 normalized facts and 1,212 source coverage observations. All four role rubrics are active at version 1. The final engine build is `binary-checklist-1.0.1`.

Latest published run at this verification is 22, containing exactly 200 outcomes, 188 calculated and 12 insufficient. Sequence gaps come from rollback-only integration tests and do not indicate incomplete public runs. The stored example CQ-004 has total 43.88 and source coverage 100%. Current captured source records total 4,876, of which 4,856 are valid and 20 are invalid. Excluded measurements count 172 in the final run.

## Rendered browser checks executed

The Codex in-app browser displayed the actual local app and was kept visible for review. Checks used both its normal 1366px desktop CSS width and 390px device-emulated mobile width.

- Overview displayed 200 employees, 188 calculated and 12 insufficient, plus four family rows.
- Name/code search found exactly CQ-004. A search with no matches displayed the empty state and clear-filter link.
- The job-family filter and result-state filter produced 3 insufficient Data Science employees. A Backend directory retained its family and run selection while paging to rows 16–30 of 50.
- CQ-004 displayed 43.88. Keyboard activation opened its delivery and metric disclosures. The first delivery metric displayed 1 passing out of 4, and its fact link opened the exact source record and scrolled to the corresponding normalized fact.
- CQ-001 displayed a withheld numeric total, available dimensions and a partial source reason.
- Methodology role navigation displayed the Backend API-acceptance checks and 28% delivery / 27% quality weights.
- All four main screens were checked at 390px. Final document scroll width equaled client width. Tables scrolled inside their own containers.
- Main explanatory body text was 16px and table labels 14px in the final desktop inspection.
- Browser console/app logs were inspected. A Next.js smooth-scroll configuration warning was corrected. The controlled outage generated the expected database errors, followed by successful recovery.

Screenshots are saved privately under `.local/qa/overview.jpg`, `.local/qa/employee-detail.jpg` and `.local/qa/mobile-detail.jpg`.

## Controlled database outage

The owned local PostgreSQL cluster was stopped after the ordinary tests. `GET /api/overview` returned 503 with a generic DATA_UNAVAILABLE message. The page visibly rendered its unavailable message and Try again button. PostgreSQL was restarted, the health endpoint returned 200, and the actual Try again control recovered the overview. The last complete published result remained intact.

## Real defects fixed

| Defect | Cause, correction and verification |
| --- | --- |
| Coverage disagreed across layers | Engine used dimension weights while queries counted available sources. Coverage now uses unique required source availability. A dedicated engine regression passes. |
| Normalized fact UUID overflow | Deriving an ID from an arbitrary large UUID suffix could overflow its field width. A stable full-identity/metric hash fallback fixes arbitrary inputs while preserving fixture IDs. The arbitrary-UUID regression passes. |
| Wrong latest run after IDs exceeded 9 | `SELECT id::text` made unqualified `ORDER BY id` sort text. The actual regression failed with run 6 instead of numeric maximum 22. Ordering by `scoring_runs.id` fixes it. The new database test checks numeric latest selection and explicit historical access. |
| Phone document overflow | Absolutely positioned hidden table labels escaped a static overflow container. Making `.table-wrap` a positioned container contains those labels. Executed browser regression measurements at 390px changed document width from 815 to 390, matching its client width. |

## Verification limits

This proves the local synthetic V1, its real PostgreSQL data flow and the built Node.js runtime. The demonstration weights/checklists lack real-world calibration. Cloudflare adapter/bindings, a managed database, backups, production networking and actual Worker-runtime behavior still belong to the separately authorized hosting work. Historical development runs keep stored explanations, while replay is limited to the supported engine build.

Repository HEAD remains the original documentation commit 2e889d0. Application changes are local and uncommitted. No GitHub push, pull request or Cloudflare deployment was performed.

## Typography follow-up

The subsequent label-only review replaced all-caps wordmark/context/section/status labels across the four screens, removed uppercase CSS transforms and positive tracking, and applied Inter to human-readable labels. Source searches found no remaining uppercase label text or forced uppercase styling. Technical acronyms, identifiers and source data retain their conventional spelling.

Type checking and lint passed. All four screens were inspected in the live browser. The renderer font inspection returned Inter-Regular for Work evidence and Evaluation window, Inter-Medium for the page heading, and IBMPlexMono-Regular for the numeric count. At 390px, overview, employee detail and methodology retained document width equal to client width. The screenshot is `.local/qa/typography-detail.jpg`.
