import { notFound } from "next/navigation";
import { ArrowDown, Check, Database, FileText, Layers3 } from "lucide-react";
import { getEmployee } from "@/server/queries";
import { FactLink } from "@/components/fact-link";
import { EmployeeAvatar } from "@/components/employee-avatar";
import {
  FAMILY_LABELS,
  type EvidenceView,
  type MetricResult,
  type MetricDefinition,
} from "@/types";
import {
  Breadcrumb,
  Coverage,
  InfoNote,
  Score,
  SectionTitle,
  Status,
  TextLink,
  first,
  withRun,
  type SearchValues,
} from "@/components/ui";
export const dynamic = "force-dynamic";
export const metadata = { title: "Evidence record" };
function MetricTrace({
  metric,
  definition,
}: {
  metric: MetricResult;
  definition: MetricDefinition | undefined;
}) {
  return (
    <details className="metric-trace">
      <summary>
        <div>
          <span className="metric-name">{metric.label}</span>
          <span className="metric-source">
            {metric.source} · {metric.weight}% of dimension
          </span>
        </div>
        <div className="metric-summary">
          <span className="mono">
            {metric.numerator} / {metric.denominator}
          </span>
          <Score value={metric.score} />
          <ArrowDown size={14} />
        </div>
      </summary>
      <div className="trace-body">
        <p>{definition?.description}</p>
        <div className="formula-line">
          <span className="eyebrow">Measurement</span>
          <code>
            ({definition?.numeratorLabel ?? "Numerator"} ÷{" "}
            {definition?.denominatorLabel ?? "Denominator"}) × 100
          </code>
        </div>
        <div className="operand-grid">
          <div>
            <span>{definition?.numeratorLabel ?? "Numerator"}</span>
            <strong className="mono">{metric.numerator}</strong>
          </div>
          <div>
            <span>{definition?.denominatorLabel ?? "Denominator"}</span>
            <strong className="mono">{metric.denominator}</strong>
          </div>
          <div>
            <span>Metric score</span>
            <strong>
              <Score value={metric.score} />
              <span className="score-scale"> /100</span>
            </strong>
          </div>
        </div>
        <p>{metric.explanation}</p>
        {metric.reason && <p className="reason-message">{metric.reason}</p>}
        <div className="fact-groups">
          <div>
            <h4>
              Used facts{" "}
              <span className="mono">{metric.usedFactIds.length}</span>
            </h4>
            {metric.usedFactIds.length ? (
              <ul className="id-list">
                {metric.usedFactIds.map((id) => (
                  <li key={id}>
                    <FactLink id={id}>{id}</FactLink>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No facts used.</p>
            )}
          </div>
          <div>
            <h4>
              Excluded facts{" "}
              <span className="mono">{metric.exclusions.length}</span>
            </h4>
            {metric.exclusions.length ? (
              <ul className="excluded-list">
                {metric.exclusions.map((ex) => (
                  <li key={`${metric.key}-${ex.factId}`}>
                    <FactLink id={ex.factId}>{ex.factId}</FactLink>
                    <span>{ex.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No relevant exclusions.</p>
            )}
          </div>
        </div>
      </div>
    </details>
  );
}
function EvidenceRecord({ record }: { record: EvidenceView }) {
  return (
    <details className={`evidence-record ${record.usage}`}>
      <summary>
        <FileText size={17} />
        <div>
          <span className="evidence-title">{record.title}</span>
          <span className="metric-source">
            {record.source} · {record.sourceRecordId} · rev {record.revision}
          </span>
        </div>
        <span className={`record-usage ${record.usage}`}>
          {record.usage === "used" ? "Used" : "Excluded"}
        </span>
        <ArrowDown size={14} />
      </summary>
      <div className="trace-body">
        <div className="record-metadata">
          <div>
            <span>Record ID</span>
            <code>{record.id}</code>
          </div>
          <div>
            <span>Validation</span>
            <strong>{record.status}</strong>
          </div>
          <div>
            <span>Observed</span>
            <strong>
              {record.observedAt
                ? new Date(record.observedAt)
                    .toISOString()
                    .replace("T", " ")
                    .slice(0, 19) + " UTC"
                : "Not available"}
            </strong>
          </div>
          <div>
            <span>Record type</span>
            <strong>{record.recordType}</strong>
          </div>
        </div>
        {record.reason && <p className="reason-message">{record.reason}</p>}
        {record.facts.length > 0 && (
          <div className="normalized-facts">
            <h4>Normalized facts</h4>
            {record.facts.map((fact) => (
              <div
                id={`fact-${fact.id}`}
                key={fact.id}
                className="normalized-fact"
              >
                <code>{fact.id}</code>
                <div>
                  <span className="mono">{fact.metricKey}</span>
                  <span className="mono">
                    {fact.numerator} / {fact.denominator}
                  </span>
                  <span className={`fact-status ${fact.status}`}>
                    {fact.status}
                  </span>
                </div>
                <p>
                  Canonical identity: <code>{fact.canonicalKey}</code>
                </p>
                {fact.reason && <p>{fact.reason}</p>}
              </div>
            ))}
          </div>
        )}
        <details className="raw-record">
          <summary>
            <Database size={14} />
            Original source payload
          </summary>
          <pre>{JSON.stringify(record.rawPayload, null, 2)}</pre>
        </details>
      </div>
    </details>
  );
}
export default async function PersonDetail({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<SearchValues>;
}) {
  const [{ code }, values] = await Promise.all([params, searchParams]);
  const requestedRun = first(values.run);
  if (requestedRun && !/^[1-9][0-9]*$/.test(requestedRun)) notFound();
  const data = await getEmployee(code, requestedRun);
  if (!data) notFound();
  const { employee, result, rubric } = data;
  const weightTotal = result.components.reduce(
    (sum, component) => sum + component.weight,
    0,
  );
  const usedCount = data.evidence.filter(
    (record) => record.usage === "used",
  ).length;
  const missing = data.coverage.filter(
    (source) => source.status !== "complete",
  );
  const lowest = [...result.components]
    .filter((c) => c.score !== null)
    .sort((a, b) => (a.score as number) - (b.score as number))[0];
  return (
    <>
      <Breadcrumb>{employee.code}</Breadcrumb>
      <header className="person-heading">
        <div className="person-identity">
          <EmployeeAvatar code={employee.code} status={result.status} size={56} />
          <div>
            <div className="eyebrow">Individual evidence record</div>
            <h1>{employee.name}</h1>
            <div className="person-context">
              <span className="mono">{employee.code}</span>
              <span>{FAMILY_LABELS[employee.jobFamily]}</span>
              <span>{employee.team}</span>
              <span>Mid-level</span>
            </div>
          </div>
        </div>
        <Status status={result.status} />
      </header>
      <section className="result-overview">
        <div className="total-score">
          <span className="stat-label">Weighted total</span>
          <div>
            <Score value={result.totalScore} />
            {result.totalScore !== null && (
              <span className="total-scale">/ 100</span>
            )}
          </div>
          <span className="score-caption">
            {result.totalScore === null
              ? "Numeric total withheld"
              : "Role-specific demonstration score"}
          </span>
        </div>
        <div className="result-context">
          <div>
            <span>Evaluation window</span>
            <strong>{data.period.label}</strong>
          </div>
          <div>
            <span>Rubric</span>
            <strong>
              {FAMILY_LABELS[employee.jobFamily]}{" "}
              <span className="mono">/ v{rubric.version}</span>
            </strong>
          </div>
          <div>
            <span>Evidence coverage</span>
            <Coverage value={result.coverage} />
          </div>
          <div>
            <span>Published run</span>
            <strong className="mono">
              {result.runId}{" "}
              <span className="subdued">· {result.engineVersion}</span>
            </strong>
          </div>
        </div>
      </section>
      {result.reason && (
        <InfoNote>
          {result.reason} A missing measurement is not treated as a zero.
          Available dimension scores are shown below.
        </InfoNote>
      )}
      <section className="section-block">
        <SectionTitle title="How the score adds up">
          <TextLink href={`/methodology?family=${employee.jobFamily}`}>
            Role methodology
          </TextLink>
        </SectionTitle>
        <p className="section-description">
          Six dimensions, weighted for this role. Open a dimension to inspect
          its measurements and contributing facts.
        </p>
        <div className="dimension-header">
          <span>Dimension</span>
          <span>Weight</span>
          <span>Score /100</span>
          <span>Contribution</span>
          <span />
        </div>
        <div className="dimension-list">
          {result.components.map((component) => (
            <details
              className={`dimension ${component.status}`}
              key={component.key}
            >
              <summary>
                <div className="dimension-name">
                  <span>
                    {component.label}
                    {component.score === null && (
                      <span className="missing-inline">Missing evidence</span>
                    )}
                  </span>
                </div>
                <span className="mono">{component.weight}%</span>
                <Score value={component.score} />
                <Score value={component.contribution} />
                <ArrowDown size={15} />
              </summary>
              <div className="dimension-body">
                <div className="dimension-explanation">
                  <p>{component.explanation}</p>
                  {component.reason && (
                    <p className="reason-message">{component.reason}</p>
                  )}
                  <code>
                    {component.score === null
                      ? "Unavailable"
                      : component.score.toFixed(2)}{" "}
                    × {component.weight}% ={" "}
                    {component.contribution === null
                      ? "Unavailable"
                      : component.contribution.toFixed(2)}{" "}
                    points
                  </code>
                </div>
                {component.metrics.map((metric) => (
                  <MetricTrace
                    metric={metric}
                    definition={rubric.dimensions
                      .find((d) => d.key === component.key)
                      ?.metrics.find((m) => m.key === metric.key)}
                    key={metric.key}
                  />
                ))}
              </div>
            </details>
          ))}
        </div>
        <div className="dimension-total">
          <span>
            <Check size={15} />
            {weightTotal}% total weight
          </span>
          <span className="mono">
            Sum(score × weight ÷ 100) = <Score value={result.totalScore} />
          </span>
        </div>
      </section>
      <section className="section-block">
        <SectionTitle title="Evidence availability" />
        <p className="section-description">
          Coverage describes whether required source records are complete. It
          measures availability, separately from work outcomes.
        </p>
        <div className="coverage-sources">
          {data.coverage.map((source) => (
            <div key={source.source} className={`source-row ${source.status}`}>
              <Layers3 size={17} />
              <div>
                <span>{source.source}</span>
                <p>
                  {source.reason ??
                    (source.status === "complete"
                      ? "Source available for the complete evaluation window."
                      : "Source completeness has not been confirmed.")}
                </p>
              </div>
              <span className="source-status">{source.status}</span>
            </div>
          ))}
        </div>
        <div className="review-guidance">
          <span className="eyebrow">What to review</span>
          <p>
            {missing.length
              ? `Verify ${missing.map((s) => s.source).join(", ")} before interpreting a total. Complete source coverage is required by this demonstration rubric.`
              : lowest
                ? `${lowest.label} is the lowest observed dimension (${lowest.score?.toFixed(1)}/100). Review the underlying accepted measurements and exclusions before drawing a conclusion.`
                : "Inspect each dimension and its source records before interpreting this result."}
          </p>
        </div>
      </section>
      <section className="section-block" id="source-records">
        <SectionTitle title="The source record">
          <span className="subdued small">
            {usedCount} used · {data.evidence.length - usedCount} excluded
          </span>
        </SectionTitle>
        <p className="section-description">
          Every original record remains inspectable, including duplicates,
          invalid inputs, and records outside the scoring criteria.
        </p>
        <div className="evidence-list">
          {data.evidence.map((record) => (
            <EvidenceRecord key={record.id} record={record} />
          ))}
        </div>
      </section>
      <div className="detail-audit">
        <span>
          Rubric <span className="mono">{rubric.id}</span>
        </span>
        <span>
          Calculated{" "}
          <span className="mono">
            {new Date(result.calculatedAt)
              .toISOString()
              .replace("T", " ")
              .slice(0, 19)}{" "}
            UTC
          </span>
        </span>
      </div>
      <InfoNote>
        Fictional employee and synthetic work evidence. Scores reflect the
        selected demonstration rubric and evidence window; they are not suitable
        for employment decisions.
      </InfoNote>
      <div className="back-directory">
        <TextLink
          href={withRun(
            `/employees?family=${employee.jobFamily}`,
            result.runId,
          )}
        >
          Back to {FAMILY_LABELS[employee.jobFamily]}
        </TextLink>
      </div>
    </>
  );
}
