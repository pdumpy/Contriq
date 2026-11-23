# Local setup and troubleshooting

The project lives at `/Users/piyushagarwal/LEETCODE/OSWARwork/Contriq`. Use Node.js 22+, npm and the installed PostgreSQL 17 tools. Ask Codex, “Start Contriq from its existing local checkout and show the preview.” It can run the following commands.

```sh
cd /Users/piyushagarwal/LEETCODE/OSWARwork/Contriq
npm ci
npm run setup
npm run dev
```

Open [the local app](http://127.0.0.1:3000). The database uses port 55438 and the app uses 3000. Keep the development-server terminal open while reviewing.

## What setup actually does

[scripts/setup-local.sh](../scripts/setup-local.sh) creates `.local/postgres` if needed, starts that cluster on loopback, creates the local database and reader role, and initializes `.env.local` from the example when absent. It runs migration, seed and score commands, then grants SELECT to the web role.

This cluster is independent of other projects' databases. Its data and log are ignored by Git. The local environment has separate reader and owner connection variables. The demonstration cluster uses local trust authentication confined to loopback. A later hosted database needs real managed credentials and network controls.

| Need | Command or Codex request |
| --- | --- |
| Apply pending migrations | `npm run db:migrate` or “Apply Contriq's pending local migrations and report checksums.” |
| Reimport identical seed | `npm run db:seed` or “Verify that rerunning seed 42 preserves existing evidence.” |
| Publish another snapshot | `npm run db:score` or “Calculate a fresh complete local cohort.” |
| Run engine/query/database tests | `npm test` |
| Test the HTTP app | Start dev, then `npm run test:e2e` |
| Static checks | `npm run typecheck` and `npm run lint` |
| Build production output | `npm run build` |
| Serve production build | Stop dev on 3000, then `npm run start` |
| Stop owned database | `pg_ctl -D .local/postgres stop` |

## Diagnose a failure

If the app says evidence is temporarily unavailable, ask Codex to check `pg_ctl -D .local/postgres status`, the health endpoint and `.local/postgres.log`. Restart this cluster through setup. A database failure should show an error, while a missing-evidence employee remains a valid published result.

If the required environment variable is missing, setup creates `.env.local` when absent. Check variable names against [.env.example](../.env.example). Share variable names and the error class with Codex rather than pasting secrets. A malformed or nonlocal owner URL is deliberately rejected by the trusted scripts.

If the app port is occupied, identify its process before changing anything. Use another explicit Next.js port for review and set `TEST_BASE_URL` for the HTTP tests. Avoid stopping an unrelated service.

If a migration checksum changed, restore the applied SQL from your intended source and create a new migration for the new change. Ask Codex to compare the checksum record and file. Deleting the cluster or resetting history is unnecessary for ordinary failures.

If seed replay conflicts, the same source revision has different content. Preserve the original record and append a proper correction revision. This is how historical scores keep their original evidence.

If a source fact link seems absent, open a detail in the current run and inspect its record disclosure. Historical pages deliberately retain their selected run. A fresh publication does not rewrite an old URL's result.
