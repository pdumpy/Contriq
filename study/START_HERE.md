# Start here

Contriq answers a practical question. Given the work records available for a fictional employee, which documented requirements were met, and can a reviewer trace the resulting calculation? You can use the app before reading the implementation.

The demo contains 200 fictional people across four technical job families. All are mid-level and share one 90-day window. Next.js renders the screens, PostgreSQL stores evidence and results, and a pure TypeScript function computes role-specific checklist ratios. The browser presents the stored calculation.

## Your 2–3-hour study route

| Time | Read and do | Evidence that you understand |
| --- | --- | --- |
| 0–15 minutes | Open the overview, filter People to Backend Engineering, search for a code and open a detail. Then inspect `CQ-001`. | Explain the difference between a numerical result and insufficient evidence. |
| 15–35 | Read [Project structure](PROJECT_STRUCTURE.md) and [How the app works](HOW_THE_APP_WORKS.md). Open each named module. | Point to the page, query, importer and scoring function without guessing. |
| 35–65 | Read [Database explained](DATABASE_EXPLAINED.md). Follow one employee's source records, facts, score and links. | Draw the route from `employees` to `score_evidence_links`. |
| 65–100 | Read [Scoring engine explained](SCORING_ENGINE_EXPLAINED.md). Reproduce Isha Mehta's `CQ-004` result. | Explain why the unrounded total is 43.875 and the displayed result is 43.88. |
| 100–120 | Read [Backend](BACKEND_EXPLAINED.md) and [Frontend](FRONTEND_EXPLAINED.md), then inspect a read endpoint. | Trace a search request from the URL into a published snapshot and back to the table. |
| 120–140 | Read [Testing and failure handling](TESTING_AND_FAILURE_HANDLING.md). Run the checks or ask Codex to run them. | Explain the rollback test and one real bug fixed during development. |
| 140–165 | Read [UI/UX](UI_UX_DESIGN.md) and answer [Technical defense questions](TECHNICAL_DEFENSE_QA.md) aloud. | Give a concrete source-file or screen example for each answer. |

Keep [the glossary](GLOSSARY.md) and [local troubleshooting](LOCAL_SETUP_AND_TROUBLESHOOTING.md) open when a term or command is unfamiliar. The engineering references under `docs/` explain the implementation contracts in more compact technical language.

## Five concepts to learn first

1. Raw records, normalized facts and calculated results have different jobs and separate tables.
2. A rubric describes which role-specific checks count and their percentage weights. The engine is shared.
3. Missing evidence withholds a numeric total. An observed false result can legitimately be zero.
4. A run pins the exact inputs and rules. Its publication is a whole-cohort transaction.
5. The UI explains stored results, which makes its displayed value auditable.

## A small review exercise

Open `CQ-004`, expand Accepted Work & Delivery, click a linked fact and inspect its source payload. Find its `workId`, metric key and observed check. Then inspect `scoreEmployee()` in [the engine](../src/domain/engine.ts). Find where those facts become a numerator and denominator. Finally open `CQ-001` and explain why its missing source causes a null overall total.

Before a review, explain the biggest limitation plainly. The dataset and rubric are intentionally constructed demonstrations. Reproducibility proves that the code follows its rules. It does not validate those rules as a general assessment of real employees.
