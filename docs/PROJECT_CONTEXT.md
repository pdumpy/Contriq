# Project context

Contriq demonstrates how to score work performance from verifiable evidence and explain the result. A reviewer should be able to trace a total back to the role rubric, the inputs that counted and the calculations that used them. A result with gaps should show exactly where the evidence is missing.

The demo is for engineering leads and reviewers who want to inspect the methodology, and for someone opening an employee's record to understand the result. Scores are advisory demonstration results. They are unsuitable for employment decisions.

## V1 scope

| Area | V1 |
| --- | --- |
| Dataset | 200 fictional employees, 50 per family |
| Job families | Data Scientists, Backend Engineers, Full Stack Engineers, Applied Agentic AI Engineers |
| Evaluation | Mid-level employees and a common 90-day window |
| Screens | Overview dashboard, searchable and filterable directory, individual score and evidence, methodology |
| Backend | PostgreSQL-backed API, synthetic data seeding, evidence validation and deduplication |
| Scoring | One deterministic TypeScript engine, four versioned role rubrics, six dimensions and traceable explanations |
| Delivery | Automated tests and a working full-stack demo. The preferred deployment target is Cloudflare Workers on `workers.dev`. |

Show cohort counts and evidence coverage on the overview. Keep any score comparisons within the same job family, level, evaluation window and rubric version. The decision to show within-family rankings is open.

## Scoring

The rubric defines how a role's work maps to the six dimensions. The engine takes validated, deduplicated facts, coverage, the evaluation period and one exact rubric version. It returns a result with dimension and submetric calculations where applicable, plus the reasoning and evidence references needed to replay it.

| Dimension | Data Science | Backend | Full Stack | Applied Agentic AI |
| --- | ---: | ---: | ---: | ---: |
| Accepted Work & Delivery | 24% | 28% | 30% | 24% |
| Technical Quality | 25% | 27% | 25% | 24% |
| Testing & Validation | 27% | 20% | 18% | 29% |
| Execution Reliability | 12% | 14% | 15% | 12% |
| Documentation & Maintainability | 10% | 9% | 10% | 9% |
| Verified Collaboration | 2% | 2% | 2% | 2% |
| **Total** | **100%** | **100%** | **100%** | **100%** |

These are provisional V1 demonstration weights, implemented under the full-build authorization. Verified collaboration carries 2% and requires work evidence. For a numeric result, each dimension is scored from 0 to 100 and the overall score is `SUM(dimension_score × weight_percent) / 100`.

- Measure accepted work and verified outcomes. Keep popularity, personality and subjective peer opinions outside the rubric.
- Count each underlying measurement once per calculation. Ignore unrelated records and explain relevant exclusions where possible.
- Track evidence availability separately from outcomes. Distinguish missing data from an observed zero and surface insufficient evidence explicitly.
- Pin every result to its rubric version and input revisions. A repeat with the same engine and inputs must produce the same calculation.
- The provisional checklist submetrics, exact arithmetic, source-completeness requirement and eligibility rules are implemented in [the scoring contract](SCORING_CONTRACT.md). Later product calibration remains open.

## Experience

Use OSWAR/teck's WARCAMP language. Default to dark mode, with black, grey and white as the base and gold used sparingly. Use Inter for UI copy and IBM Plex Mono for score tables, formulas and identifiers.

| Step | What the reviewer sees |
| --- | --- |
| Observe | Score or evidence state, job family, evaluation period and scope |
| Contextualise | Dimension weights, coverage, exact rubric version, formula and expandable evidence |
| Recommend | Guidance based on verified evidence, such as which missing source to check or which dimension to review |

Keep names, units and statuses visible where the user needs them. Reveal formulas and evidence progressively and use text alongside color for missing data and uncertainty. Design for keyboard navigation, readable contrast and narrow screens. Keep the methodology reachable from the score view.

## Architecture

Use Next.js and TypeScript for the UI, a Workers-compatible API, managed PostgreSQL for relational data and JSONB for flexible evidence and rubric definitions. Keep the scoring engine pure TypeScript and independent of UI, queries and future AI features. The source repository is `pdumpy/Contriq`. Keep V1 small with one product and one database. Question each requirement, remove unnecessary parts, simplify the rest, shorten feedback loops and automate once the workflow is understood.

## Outside V1

Real employee data, external uploads, employee authentication, RAG or embeddings, payroll, attendance monitoring, behavioral or personality scoring, and automatic hiring, promotion or termination decisions are outside V1.

Potential later phases include real-user authentication, external evidence uploads and RAG-assisted explanations. Any future explanation feature should use the stored calculation and its citations as the source of truth.
