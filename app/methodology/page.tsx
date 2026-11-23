import Link from "next/link";
import { ArrowDown, Check, FileCheck2, Fingerprint, Scale } from "lucide-react";
import { getMethodology } from "@/server/queries";
import { FAMILY_LABELS, JOB_FAMILIES, type DimensionKey } from "@/types";
import { RubricWeight } from "@/components/rubric-weight";
import {
  InfoNote,
  PageHeading,
  first,
  type SearchValues,
} from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Methodology" };

const notation: Record<DimensionKey, { symbol: string; label: string }> = {
  delivery: { symbol: "D", label: "Delivery" },
  quality: { symbol: "Q", label: "Quality" },
  validation: { symbol: "V", label: "Validation" },
  reliability: { symbol: "R", label: "Reliability" },
  maintainability: { symbol: "M", label: "Documentation & maintainability" },
  collaboration: { symbol: "C", label: "Collaboration" },
};

export default async function Methodology({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  const values = await searchParams;
  const data = await getMethodology();
  const rubric =
    data.rubrics.find(
      (r) => r.jobFamily === (first(values.family) ?? JOB_FAMILIES[0]),
    ) ?? data.rubrics[0];
  if (!rubric)
    return (
      <div className="empty-state">
        <h1>No published methodology.</h1>
        <p>Import the demonstration rubrics to view their rules.</p>
      </div>
    );

  const equationDescription = rubric.dimensions
    .map((d) => `${d.weight} times ${d.label}`)
    .join(" plus ");

  return (
    <div className="methodology-page">
      <PageHeading
        title="Scoring methodology"
        description="From verified work to an explainable score."
      />
      <nav className="role-tabs" aria-label="Job family methodology">
        {JOB_FAMILIES.map((family) => (
          <Link
            key={family}
            href={`/methodology?family=${family}`}
            aria-current={family === rubric.jobFamily ? "page" : undefined}
            className={family === rubric.jobFamily ? "selected" : ""}
          >
            {FAMILY_LABELS[family]}
          </Link>
        ))}
      </nav>

      <section
        className="role-equation-panel"
        aria-labelledby="role-equation-heading"
      >
        <header className="equation-heading">
          <div>
            <span className="eyebrow">Rubric version {rubric.version}</span>
            <h2 id="role-equation-heading">
              {FAMILY_LABELS[rubric.jobFamily]}
            </h2>
          </div>
          <span className="rubric-total">
            <Check size={16} />
            {rubric.dimensions.reduce((sum, d) => sum + d.weight, 0)}% total
          </span>
        </header>
        <div
          className="role-equation"
          role="math"
          aria-label={`Score equals ${equationDescription}, all divided by 100.`}
        >
          <span>S =</span>
          <span className="equation-fraction">
            <span className="equation-numerator">
              {rubric.dimensions.map((dimension, index) => (
                <span className="equation-term" key={dimension.key}>
                  {index > 0 && <span className="equation-plus">+</span>}
                  <span>
                    <b>{dimension.weight}</b>
                    <var>{notation[dimension.key].symbol}</var>
                  </span>
                </span>
              ))}
            </span>
            <span className="equation-denominator">100</span>
          </span>
        </div>
        <ul className="equation-key" aria-label="Rubric weight breakdown">
          {rubric.dimensions.map((dimension) => (
            <RubricWeight
              key={`${rubric.id}:${dimension.key}`}
              {...notation[dimension.key]}
              weight={dimension.weight}
              metrics={dimension.metrics.map(({ key, label, weight }) => ({
                key,
                label,
                weight,
              }))}
            />
          ))}
        </ul>
        <p className="equation-scale">
          Each dimension is scored from 0 to 100.
        </p>
      </section>

      <ol className="calculation-flow" aria-label="Evidence to score">
        <li>
          <FileCheck2 size={20} />
          <div>
            <strong>Verify</strong>
            <span>Valid, unique work records</span>
          </div>
        </li>
        <li>
          <Fingerprint size={20} />
          <div>
            <strong>Measure</strong>
            <span>Passed ÷ eligible checks × 100</span>
          </div>
        </li>
        <li>
          <Scale size={20} />
          <div>
            <strong>Combine</strong>
            <span>Metric weights → role weights</span>
          </div>
        </li>
      </ol>

      <section
        className="measurement-checks"
        aria-labelledby="measurement-heading"
      >
        <div className="measurement-heading">
          <h2 id="measurement-heading">Measurement checks</h2>
          <span>Open a dimension to inspect its checks.</span>
        </div>
        {rubric.dimensions.map((dimension) => (
          <details className="rubric-dimension" key={dimension.key}>
            <summary>
              <var className="dimension-symbol">
                {notation[dimension.key].symbol}
              </var>
              <span>{dimension.label}</span>
              <span className="mono">{dimension.weight}%</span>
              <ArrowDown size={16} />
            </summary>
            <div className="dimension-checks">
              <code className="dimension-formula">
                {notation[dimension.key].symbol} ={" "}
                {dimension.metrics
                  .map((metric, index) => `${metric.weight}% × m${index + 1}`)
                  .join(" + ")}
              </code>
              <div className="compact-metrics">
                {dimension.metrics.map((metric, index) => (
                  <article className="compact-metric" key={metric.key}>
                    <header>
                      <span className="metric-variable">m{index + 1}</span>
                      <h3>{metric.label}</h3>
                      <span className="metric-share">{metric.weight}%</span>
                    </header>
                    <details className="metric-definition">
                      <summary>Evidence definition</summary>
                      <dl>
                        <div>
                          <dt>Passed</dt>
                          <dd>{metric.numeratorLabel}</dd>
                        </div>
                        <div>
                          <dt>Eligible</dt>
                          <dd>{metric.denominatorLabel}</dd>
                        </div>
                        <div>
                          <dt>Source</dt>
                          <dd>
                            <code>{metric.source}</code> · {metric.unit}
                          </dd>
                        </div>
                      </dl>
                      <code className="definition-key">{metric.key}</code>
                    </details>
                  </article>
                ))}
              </div>
              {dimension.key === "reliability" && (
                <p className="deadline-note">
                  A revised deadline counts only when approved before the
                  original deadline.
                </p>
              )}
            </div>
          </details>
        ))}
      </section>

      <div className="evidence-rule-strip">
        <span>Duplicates count once</span>
        <span>Missing checks withhold the total</span>
        <span>Coverage is shown separately</span>
      </div>
      <details className="methodology-details">
        <summary>Evidence, eligibility and rounding rules</summary>
        <ul>
          <li>
            Each metric needs complete source coverage and at least one eligible
            observation.
          </li>
          <li>
            An observed failed check counts as zero. Missing evidence stays
            unavailable.
          </li>
          <li>
            Invalid, retracted, unrelated and out-of-window records are
            excluded. Conflicting duplicates withhold the metric.
          </li>
          <li>
            Every required dimension must be available. Missing weights are
            never redistributed.
          </li>
          <li>
            Calculations use exact ratios. Display values round half up to two
            decimals.
          </li>
          <li>
            Compare the same role, level, window and rubric version. Historical
            results keep their original inputs.
          </li>
          <li>
            Collaboration counts verified work-linked reviews and carries 2% of
            the total.
          </li>
        </ul>
        <p>
          Rubric ID <code>{rubric.id}</code>
        </p>
      </details>
      <div className="methodology-review">
        <InfoNote>
          Provisional demo weights. Real-world use requires validation.
        </InfoNote>
        <Link
          href={`/employees?family=${rubric.jobFamily}`}
          className="button primary"
        >
          Explore {FAMILY_LABELS[rubric.jobFamily]}
        </Link>
      </div>
    </div>
  );
}
