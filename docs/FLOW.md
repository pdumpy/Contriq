# Flow

V1 design draft

```mermaid
sequenceDiagram
    participant I as Synthetic importer
    participant D as PostgreSQL
    participant R as Scoring runner
    participant E as Scoring engine
    participant A as Read API
    I->>D: Write evidence revisions, facts and coverage
    R->>D: Capture cohort and exact inputs
    R->>E: Evaluate the four rubrics for the cohort
    E-->>R: Return outcomes, breakdowns and evidence links
    alt Complete cohort passes checks
        R->>D: Commit results and publish the run together
    else Calculation or write fails
        R->>D: Record the failure after rollback when possible
    end
    A->>D: Read a published run and pin its ID
    D-->>A: Return the stored result and evidence state
```

- Imports resolve employee codes and source identities before recording evidence. Invalid records with identifiable subjects can be kept with a reason. Repeat imports return the existing revision.
- The engine uses the job family from the captured cohort to choose the assigned rubric. A coverage gap is distinct from a complete source with zero activity.
- The UI starts with the result and period, then reveals dimension calculations, weights, coverage and evidence. It offers evidence-specific next steps, such as checking an unavailable source.
- The reader distinguishes a numeric zero, a published insufficient-evidence outcome, a window with no published run, and a service error. A failed run leaves the last published result available.

See [failure handling](SCHEMA_DESIGN.md#failure-handling) for database behavior.
