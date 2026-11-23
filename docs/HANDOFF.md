# Handoff

Updated 23 November 2026 after the complete local V1 build.

| Item | Observed state |
| --- | --- |
| MacBook Air M2 workspace | `/Users/piyushagarwal/LEETCODE/OSWARwork/Contriq` |
| Office MacBook Neo historical path | `/Users/osmgx/Music/LC/Contriq` |
| Repository | `pdumpy/Contriq`, branch main |
| Repository HEAD | Original documentation commit 2e889d0. All implementation changes are local and uncommitted. |
| Local preview | http://127.0.0.1:3000, development server running |
| PostgreSQL | Private local PostgreSQL 17 cluster in `.local/postgres`, loopback port 55438, reader and owner roles |
| Dataset | 200 fictional mid-level employees, 50 per family, seed 42 |
| Period | UTC 2026-08-23 inclusive to 2026-11-21 exclusive, 90 days |
| Scoring | One pure engine, four versioned rubrics, six dimensions, eleven binary metrics per role |
| Engine | `binary-checklist-1.0.1` |
| Latest verified run | 22, 188 calculated and 12 insufficient outcomes |
| UI | Overview, searchable/filterable/paginated People, detailed calculation/evidence, methodology role views |
| Checks | Typecheck, zero-warning lint, 32 unit/integration + 5 HTTP tests, production build and production HTTP smoke passed |
| Documentation | Six engineering documents updated, detailed scoring contract, 12 study guides |
| Publishing | No commits, pushes, PRs or deployment in this build session |

## Review the local result

Open [the preview](http://127.0.0.1:3000). Inspect CQ-004 for a complete traceable 43.88 result and CQ-001 for insufficient evidence. Source availability is independent of work outcomes. Use the role filters to keep comparisons within context.

Start learning with [study/START_HERE.md](../study/START_HERE.md), then follow its 2–3-hour reading and source-tracing route. See [the verification record](VERIFICATION.md) for executed checks and actual defects fixed.

## Decisions made for this demonstration

The full implementation prompt confirmed the fixed 90-day mid-level cohort and authorized provisional rules. V1 uses observed binary check ratios, supplied role weights, eleven metrics per role, complete required source inventories, exact integer fraction math and half-up two-decimal presentation. Any unavailable required dimension withholds the total. These choices are documented in [Decisions](DECISIONS.md) and [Scoring contract](SCORING_CONTRACT.md).

## Later work

The next action is the owner's local application and study-material review. GitHub publishing and Cloudflare deployment require the separate authorization requested in the build prompt. A hosting pass must select/verify the adapter and managed PostgreSQL provider, replace local trust/network assumptions, connect request-scoped database access, test the Worker runtime and establish backups.

V2/V3 scope, real accounts, external uploads and RAG remain later product decisions. Prior development runs retain their stored components and source references. Replay rejects unsupported engine versions.

## Switching Macs

This build has not been published to GitHub. Review and authorize publication before expecting these local changes on the office Mac. Once published, inspect the other checkout's working tree and pull with fast-forward only. Preserve local work and use the selected branch. The original brief is retained in the local ignored context archive and personal knowledge vault.

## Latest UI review

On 23 November, all-caps interface labels were replaced with sentence case and wide positive tracking was removed. Inter is used for interface copy, including the formerly monospace labels. Technical values keep IBM Plex Mono. Type checking, lint and rendered desktop/390px checks passed after the change.
