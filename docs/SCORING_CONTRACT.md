# Scoring contract — provisional V1

This is the implemented demonstration contract, not a validated employment assessment. The authoritative configuration is [`src/domain/rubrics.ts`](../src/domain/rubrics.ts); the pure calculation is [`scoreEmployee`](../src/domain/engine.ts). Rubric version is **1** within each family. Engine version is **`binary-checklist-1.0.1`**. Existing runs from an older engine build retain their version; the current runner rejects replay under a different engine version.

## Evaluation and units

The fixed period is **[2026-08-23 00:00 UTC, 2026-11-21 00:00 UTC)**: 90 days, start included and end excluded. All employees are fictional, mid-level, and evaluated with their own family's rubric. No ranking across professions is implied.

One measurement is one binary checklist observation for one metric and one canonical work item. Raw records identify the employee, source, source record, revision, observation time, `workId`, explicit `eligible` boolean and a `checks` object. `true` contributes numerator **1**, `false` contributes numerator **0**; either contributes denominator **1**. A missing check contributes neither and may make the metric unavailable. Quantities, commit counts, hours and subjective opinions are not inputs.

Every metric below uses the same operators, with a different role-specific property:

| Field | Implemented definition |
| --- | --- |
| Numerator | Count of unique eligible work items with a passing observed check for this metric. |
| Denominator | Count of unique eligible work items with a valid observed check for this metric. |
| Unit | Work items. |
| Metric score | `100 × numerator / denominator`; unavailable when denominator is zero. |
| Interpretation | Share of observed eligible units satisfying this checklist property, conditional on complete required-source coverage. |
| Main-dimension metric weights | Two checks, 50% each. |
| Collaboration metric weight | One check, 100% of its 2% dimension. |

Eligible means the source explicitly attributes an agreed work item to the evaluated employee, marks it `eligible: true`, and supplies a valid observation in the period. The fixture's acceptance and reviewer references describe this agreement; they are synthetic assertions, not external attestations. Ineligible records are preserved and excluded. There is no minimum sample-size threshold beyond a nonzero denominator; four units per metric in the normal fixture is a demonstration choice.

## Sources and weights

Each metric may use only its dimension's source namespace. A matching metric key from another source is excluded. The same work item can have distinct measurements for distinct properties; the same property cannot count twice.

| Dimension/key | Required source | Data Science | Backend | Full Stack | Agentic AI |
| --- | --- | ---: | ---: | ---: | ---: |
| Accepted Work & Delivery / `delivery` | `demo:delivery` | 24% | 28% | 30% | 24% |
| Technical Quality / `quality` | `demo:review` | 25% | 27% | 25% | 24% |
| Testing & Validation / `validation` | `demo:validation` | 27% | 20% | 18% | 29% |
| Execution Reliability / `reliability` | `demo:tracker` | 12% | 14% | 15% | 12% |
| Documentation & Maintainability / `maintainability` | `demo:docs` | 10% | 9% | 10% | 9% |
| Verified Collaboration / `collaboration` | `demo:collaboration` | 2% | 2% | 2% | 2% |
| Total | | 100% | 100% | 100% | 100% |

The 2% collaboration limit comes from the product brief. Its observed outcome is a work-linked review that unblocked another work item, never popularity, personality or message volume.

## Complete metric definitions

In the following tables, concatenate the family prefix, a dot and the suffix to obtain the exact metric key. For example, `backend_engineering` + `delivery.1` means `backend_engineering.delivery.1`. Source, numerator, denominator, unit and eligibility are specified above for every row. A passing source boolean asserts precisely the property in the second column. Deadline checks have the additional derivation below.

### Data Science — prefix `data_science`

| Metric suffix | Property required for a pass |
| --- | --- |
| `delivery.1` | Analysis accepted against agreed objective. |
| `delivery.2` | Result reproduced in handoff. |
| `quality.1` | Statistical assumptions reviewed. |
| `quality.2` | Data lineage review passed. |
| `validation.1` | Held-out evaluation passed. |
| `validation.2` | Leakage and subgroup checks passed. |
| `reliability.1` | Delivered by agreed deadline. |
| `reliability.2` | Scope changes recorded before deadline. |
| `maintainability.1` | Experiment notes complete. |
| `maintainability.2` | Reusable pipeline documented. |
| `collaboration.1` | Verified review unblocked another work item. |

### Backend Engineering — prefix `backend_engineering`

| Metric suffix | Property required for a pass |
| --- | --- |
| `delivery.1` | API change accepted against contract. |
| `delivery.2` | Change released with acceptance proof. |
| `quality.1` | Implementation review passed. |
| `quality.2` | Security and error-path review passed. |
| `validation.1` | Automated contract tests passed. |
| `validation.2` | Load or failure recovery check passed. |
| `reliability.1` | Delivered by agreed deadline. |
| `reliability.2` | Scope changes recorded before deadline. |
| `maintainability.1` | API and runbook updated. |
| `maintainability.2` | Operational ownership documented. |
| `collaboration.1` | Verified review unblocked another work item. |

### Full Stack Engineering — prefix `full_stack_engineering`

| Metric suffix | Property required for a pass |
| --- | --- |
| `delivery.1` | User flow accepted against criteria. |
| `delivery.2` | Integrated change released. |
| `quality.1` | Implementation review passed. |
| `quality.2` | Accessibility review passed. |
| `validation.1` | End-to-end flow tests passed. |
| `validation.2` | Responsive and error-state checks passed. |
| `reliability.1` | Delivered by agreed deadline. |
| `reliability.2` | Scope changes recorded before deadline. |
| `maintainability.1` | UI and API behavior documented. |
| `maintainability.2` | Component handoff documented. |
| `collaboration.1` | Verified review unblocked another work item. |

### Applied Agentic AI — prefix `applied_agentic_ai`

| Metric suffix | Property required for a pass |
| --- | --- |
| `delivery.1` | Agent workflow accepted against task contract. |
| `delivery.2` | Workflow released with outcome proof. |
| `quality.1` | Tool contracts and permissions reviewed. |
| `quality.2` | Failure and fallback review passed. |
| `validation.1` | Task evaluation suite passed. |
| `validation.2` | Adversarial and unsafe-action checks passed. |
| `reliability.1` | Delivered by agreed deadline. |
| `reliability.2` | Scope changes recorded before deadline. |
| `maintainability.1` | Agent prompts and tools versioned. |
| `maintainability.2` | Evaluation and recovery runbook updated. |
| `collaboration.1` | Verified review unblocked another work item. |

## Deadline and scope-change normalization

For tracker records carrying `originalDeadline`, [`normalizeEvidence`](../src/domain/evidence.ts) derives reliability checks from `originalDeadline`, `deliveredAt` and optional `scopeChange: { approved, agreedAt, revisedDeadline }`:

1. A revised deadline applies only when `approved === true`, both change times are valid, and `agreedAt < originalDeadline`.
2. `reliability.1` passes when `deliveredAt <= effectiveDeadline`.
3. `reliability.2` passes when there is no scope change, or the change meets rule 1.
4. An approval recorded exactly at or after the old deadline fails the timely-change check. A late revision never erases a delivery miss.
5. Invalid required times make the source record invalid. For tracker records without deadline fields, explicit boolean checklist observations remain the supported generic input.

These checks assess different properties: a late delivery can coexist with properly recorded scope, and an on-time delivery can coexist with a late scope-change record. The engine does not apply additional penalties.

## Validation, revisions and deduplication

`normalizeEvidence(records)` returns copied record validation states and normalized facts. It requires source identity, a positive integer revision, event time, canonical work ID, explicit eligibility and a nonempty map of boolean observations. An invalid/retracted record does not yield valid scoring facts. Ineligible facts carry a specific exclusion reason. Input checks are sorted before extraction to keep identities stable under JSON object property ordering.

The engine resolves the highest revision for `(source, sourceRecordId)` before filtering employee attribution or evaluation time. An invalid or retracted correction does not revive an earlier valid observation. The PostgreSQL ingestion layer additionally validates predecessor chains and rejects conflicting replay of one source/revision identity; the pure engine does not replace those database checks.

Eligible facts are grouped by **metric key + canonical work ID**, within the evaluated employee. Identical outcomes count once, choosing the lexically first fact UUID as the representative. Other copies receive exclusion links. Conflicting true/false outcomes for the same measurement withhold that metric, the containing dimension, and the overall result. Other canonical units cannot mask that conflict. A valid source work item with another supported metric but a missing required check makes that missing metric unavailable. Unknown metric keys are irrelevant and do not create an eligible unit for a known metric.

Facts with an invalid flag, missing canonical identity, non-finite/fractional numerator, a numerator outside `{0,1}`, denominator other than `1`, wrong source or out-of-period event are excluded. Used and excluded fact IDs are returned for persistence. Valid candidates withheld because the metric is unavailable also receive explicit exclusion reasons.

Fixture fact UUIDs retain their inspectable stable sequence. Other source UUIDs use a deterministic 128-bit identity hash of full source revision UUID plus metric key, formatted as a UUID. It is not a cryptographic or security mechanism; PostgreSQL uniqueness and conflicting-replay checks remain authoritative. This avoids overflowing the UUID suffix for ordinary arbitrary source UUIDs.

## Coverage, unavailable states and arithmetic

For each required source, take the newest coverage revision for the **exact** employee and period. No observation means unknown. `partial`, `unavailable`, `unknown` or conflicting latest observations make the associated metric unavailable. Complete coverage can legitimately contain zero events, in which case the zero denominator still withholds a numeric score.

```text
sourceCoveragePercent = 100 × completeDistinctRequiredSources / distinctRequiredSources
metricScore          = 100 × passingEligibleUnits / observedEligibleUnits
dimensionScore       = SUM(metricScore × metricWeightPercent) / 100
dimensionContribution= dimensionScore × dimensionWeightPercent / 100
totalScore           = SUM(unroundedDimensionContribution)
```

Coverage is independent of weights and outcomes: five complete sources out of six is **83.33%**, whether the missing dimension weighs 2% or 29%. Six complete sources can still produce `insufficient_evidence` when measurements conflict or there are no eligible observations. This is intentional: source availability and performance calculability answer different questions.

All required metrics must be available for a dimension score. All six dimensions must be available for an overall score. Otherwise the overall status is `insufficient_evidence`, total is `null`, and available dimensions remain visible. Weights are never redistributed, and missing evidence never becomes an observed zero.

The engine uses integer `BigInt` fractions, reducing fractions during arithmetic. It rounds **half up to two decimal places only at display outputs**: metric score, dimension score, contribution, coverage and overall score. It calculates the overall score from unrounded fractions, not rounded displayed values. `ROUNDING_POLICY` records this rule. JSON numeric values may omit trailing zeroes; the UI formats the display scale.

`validateRubric` rejects repeated/unknown dimensions, wrong dimension or metric weight totals, duplicate metric keys, invalid version/weights and a collaboration weight other than 2%. `scoreEmployee` also rejects a wrong-family rubric, non-mid-level employee or invalid period.

## Reproducible fixture and worked result

[`generateDataset(42)`](../src/domain/fixtures.ts) produces **200 employees**, 50 per family, **4,900 raw records**, **8,960 facts** and **1,212 coverage revisions**. It does not contain final scores. The normal cohort has four eligible work units per source; it includes mirrors, corrections, invalid imports, irrelevant records and conflicting evidence. Exactly twelve employees have insufficient evidence, three per family. There are no external employee integrations.

An executed example is **CQ-004, Isha Mehta**, employee UUID `0000000a-0000-4000-8000-000000000004`, Data Science, Measurement Lab. With default seed 42:

| Dimension | Passing counts, each / 4 | Dimension score | Weight | Exact contribution | Display contribution |
| --- | --- | ---: | ---: | ---: | ---: |
| Delivery | 1, 2 | 37.50 | 24% | 9 | 9.00 |
| Quality | 1, 2 | 37.50 | 25% | 9.375 | 9.38 |
| Validation | 2, 2 | 50.00 | 27% | 13.5 | 13.50 |
| Reliability | 1, 3 | 50.00 | 12% | 6 | 6.00 |
| Maintainability | 1, 3 | 50.00 | 10% | 5 | 5.00 |
| Collaboration | 2 | 50.00 | 2% | 1 | 1.00 |

Exact total: `9 + 9.375 + 13.5 + 6 + 5 + 1 = 43.875`. Displayed overall: **43.88 / 100**. All six sources are complete, so coverage is **100%**.

Delivery record `00000002-0000-4000-8000-00000000004e` is source record `CQ-004:78`, revision 1, work ID `CQ-004:work:1`, titled “Demand forecast calibration.” Both delivery checks are false. Fact `00000003-0000-4000-8000-0000000004e0` is `data_science.delivery.1`, numerator 0, denominator 1. Its companion ending `4e1` is `delivery.2`, also 0/1. These are observed failures, not missing evidence. The other three delivery source UUID suffixes are `04f`, `050`, `051`; their delivery-check pairs are `(false,true)`, `(false,false)`, `(true,true)`.

The tracker record ending `005b`, source ID `CQ-004:91`, has original deadline 14 Oct 18:00 UTC, change agreed 16 Oct 12:00 UTC, revised deadline 17 Oct 18:00 UTC and delivery 18 Oct 12:00 UTC. The change was recorded after the original deadline; both reliability checks fail. See the learner walkthrough in [`study/SCORING_ENGINE_EXPLAINED.md`](../study/SCORING_ENGINE_EXPLAINED.md) for the raw JSON and replay command.

## Verification and limitations

Run `npx tsx --test tests/scoring.test.ts`. The current **19 tests** cover exact role weights, hand arithmetic, final-only rounding, missing/partial/unknown coverage, coverage revision conflicts, source coverage independent of weights/outcomes, zero denominators, duplicate conflicts, corrected/invalid/retracted revisions, ownership corrections, JSON key-order stability, arbitrary UUID suffix overflow, invalid/irrelevant/ineligible records, missing checks, half-open period boundaries, deadline changes, wrong-family/invalid rubric rejection, malformed numeric facts and deterministic 200-person fixture replay. They were executed successfully during implementation.

The provisional checklist treats eligible work units equally; it does not estimate complexity, causal business impact or measurement reliability. It cannot discover a work item absent from every source: completeness is an explicit source assertion. Boolean acceptance assertions and review references are fictional, not real verification against repositories or evaluation systems. Tiny samples can produce large score differences. No claim of scientific fairness, cross-family comparability or suitability for employment decisions follows from deterministic arithmetic. An LLM does not participate in calculation.
