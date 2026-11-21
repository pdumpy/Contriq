# Handoff

Updated 2026-11-21

| Item | Status |
| --- | --- |
| MacBook Neo workspace | `/Users/osmgx/Music/LC/Contriq` |
| Current Git branch | `main` in `pdumpy/Contriq` |
| Last committed work | Initial documentation covering the V1 architecture and database schema |
| Completed | Project context, decision log, Codex instructions and six WARCAMP documents, including the nine-table PostgreSQL design |
| Implementation | Documentation stage. Application code, migrations, seed data, API routes, tests and deployment are pending. |
| Review | Markdown files are ready for review. |

## Open work

- Review the [proposed schema](SCHEMA_DESIGN.md) and settle the [open scoring and runtime decisions](DECISIONS.md#pending-decisions). The missing rubric definitions and evidence rules block reliable numeric scoring.

## Next implementation step

After schema review and authorization to implement, create the first local PostgreSQL migration for the nine core tables. Use small synthetic fixtures to verify replay deduplication, rejection of a wrong-family rubric, and that a failed publication preserves the last complete result. Then implement source normalization and the pure scoring engine against approved rubrics.

## Switching Macs

Clone `https://github.com/pdumpy/Contriq.git` on the MacBook Air M2 if it has no checkout. GitHub is the shared source of truth.

1. Before starting, run `git status --short --branch`. Resolve local changes without discarding them, switch to the project branch and pull with `git pull --ff-only` if the branch tracks GitHub.
2. Work on the appropriate branch. Commit completed work and push it before switching Macs.
3. On the other Mac, check for local changes, switch to the same branch and pull before resuming.
