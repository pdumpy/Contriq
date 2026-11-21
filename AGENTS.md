# Working on Contriq

1. Read [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md), [DECISIONS.md](docs/DECISIONS.md) and [HANDOFF.md](docs/HANDOFF.md) first. Check the working tree and inspect the relevant code and docs before editing. Preserve existing work.
2. Keep UI, API, data access, evidence validation and the pure scoring engine separate. Reuse one scoring engine across the four job families.
3. Preserve the database and scoring contracts, including historical rubric versions and evidence links. Record changes and their trade-offs in the decision log. Keep open requirements pending until the project owner decides.
4. Update the affected engineering documents when the system changes. The six are the README, System Architecture, Technical Architecture, Flow, API and Schema Design.
5. Run relevant tests after implementation changes and report the results. Record confirmed bugs with reproduction steps, root cause and the fix or follow-up.
6. Update [HANDOFF.md](docs/HANDOFF.md) after substantial work with the branch, progress, blockers and next step.
7. Keep credentials, secrets and private employee information out of Git. Use fictional data for V1.
