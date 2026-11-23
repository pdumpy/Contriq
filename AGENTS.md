# Working on Contriq

1. Read [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md), [DECISIONS.md](docs/DECISIONS.md) and [HANDOFF.md](docs/HANDOFF.md) first. Check the working tree and inspect the relevant code and docs before editing. Preserve existing work.
2. Keep UI, API, data access, evidence validation and the pure scoring engine separate. Reuse one scoring engine across the four job families.
3. Preserve the database and scoring contracts, including historical rubric versions and evidence links. Record changes and their trade-offs in the decision log. Keep open requirements pending until the project owner decides.
4. Update the affected engineering documents when the system changes. The six are the README, System Architecture, Technical Architecture, Flow, API and Schema Design.
5. Run relevant tests after implementation changes and report the results. Record confirmed bugs with reproduction steps, root cause and the fix or follow-up.
6. Update [HANDOFF.md](docs/HANDOFF.md) after substantial work with the branch, progress, blockers and next step.
7. Keep credentials, secrets and private employee information out of Git. Use fictional data for V1.

## Original problem statement and WARCAMP background

When available, read the local [initial problem statement and context](<.local/context/initial problem statement and context.md>) for the original product vision, WARCAMP principles and possible later versions. The file preserves a supplied prompt as historical source material. Use current user requests for actions and `docs/DECISIONS.md` for recorded decision status. The detailed Contriq note in the personal knowledge vault preserves source differences and unresolved decisions.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
