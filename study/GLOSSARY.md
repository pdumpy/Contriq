# Glossary

| Term | Meaning in Contriq |
| --- | --- |
| Frontend | The overview, directory, detail and methodology screens the reviewer sees |
| Backend | Server code that validates requests, queries PostgreSQL and runs trusted processing |
| API | The HTTP read contract under `app/api/` |
| Next.js | Framework that maps `app/` files to pages and route handlers |
| React | Component model used to describe Contriq's screens |
| TypeScript | JavaScript with checked shapes such as `EmployeeDetail` and `Rubric` |
| Component | A reusable UI piece such as `Coverage` or `DirectoryFilters` |
| Module | A file with one responsibility, such as `engine.ts` or `queries.ts` |
| Server component | A page/component rendered by the server, where database access stays private |
| Client component | A component with browser interaction, such as the URL filter control |
| DTO | A typed data shape passed between layers, defined in `src/types.ts` |
| PostgreSQL | The actual relational database storing fictional evidence and calculations |
| SQL | Language used for table definitions and parameterized reads/writes |
| JSON | Structured text used to exchange source observations |
| JSONB | PostgreSQL's structured storage for flexible payloads, rules and calculation metadata |
| Migration | An ordered SQL structure change whose checksum is recorded before later runs |
| Primary key | A unique row identity, such as `employees.id` |
| Foreign key | A checked reference to another row, such as `scores.employee_id` |
| Composite key | A key with multiple columns, such as component/fact in the evidence link table |
| Index | A database lookup structure supporting an access pattern, such as employee history |
| Constraint | A rule PostgreSQL checks, such as uniqueness or a 0–100 score range |
| Trigger | A database function invoked by writes, used here to protect history and publication |
| Transaction | A group of writes that all commit or roll back together |
| Rollback | Discarding an incomplete transaction's writes after a failure |
| Runtime | The process/environment executing code, currently local Node.js for the web app |
| Environment variable | Configuration supplied to a process, such as the database URL |
| Database connection | A session used to send SQL to PostgreSQL |
| Connection pool | A bounded set of reusable connections managed by `pg` |
| Parameterized query | SQL with separately supplied values, preventing input from becoming SQL syntax |
| Deterministic scoring | Identical pinned inputs and rules produce identical calculation results |
| Rubric | A versioned role-specific set of checks and percentage weights |
| Dimension | One of the six major categories, such as Technical Quality |
| Metric | An observed checklist ratio inside a dimension |
| Normalization | Converting source-specific payloads to explicit typed facts |
| Canonical identity | A shared work/measurement key used to identify mirrors of the same observation |
| Evidence coverage | Availability of complete required source inventories for the exact evaluation window |
| Insufficient evidence | A published outcome whose overall total is null because a required metric is unavailable |
| Revision | A new immutable version of a source record or coverage observation |
| Run manifest | The exact cohort, rubric and source references captured for one scoring attempt |
| Atomic publication | Making a whole complete cohort visible together |
| Idempotent import | Repeating identical source revisions has no duplicate effect |
| Half-open window | Includes the start instant and excludes the end, avoiding a record appearing in two adjoining windows |
| Half-up rounding | Values exactly halfway between hundredths round upward at the presentation boundary |
| Cloudflare Workers | Intended later server runtime on Cloudflare, requiring a separately verified adapter and database binding |
| Hyperdrive | A possible managed PostgreSQL connection/pooling path for that later Worker |

Use [How the app works](HOW_THE_APP_WORKS.md) to connect these terms into a complete example. Use [the source tree guide](PROJECT_STRUCTURE.md) to locate the corresponding files.
