import { CircleCheck, FileSearch, ScanLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOverview } from "@/server/queries";
import { FAMILY_LABELS } from "@/types";
import {
  PageHeading,
  PrimaryLink,
  SectionTitle,
  Score,
  Coverage,
  InfoNote,
  first,
  withRun,
  type SearchValues,
} from "@/components/ui";
export const dynamic = "force-dynamic";
export default async function Overview({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  const values = await searchParams;
  const requestedRun = first(values.run);
  if (requestedRun && !/^[1-9][0-9]*$/.test(requestedRun)) notFound();
  const data = await getOverview(requestedRun);
  if (requestedRun && !data.runId) notFound();
  if (!data.runId)
    return (
      <>
        <PageHeading
          title="No published evaluation."
          description="There is no published result for this evaluation window yet."
        />
        <InfoNote>
          Once an evaluation is published, its people, role distributions, and
          evidence coverage will appear here.
        </InfoNote>
      </>
    );
  return (
    <>
      <PageHeading
        title="Evaluation overview"
        description="Review the cohort, role-specific score distributions, and evidence coverage."
        action={
          <PrimaryLink href={withRun("/employees", data.runId)}>
            Explore people
          </PrimaryLink>
        }
      />
      <div className="overview-intro">
        <span className="live-label">
          <span className="status-dot" />
          Published evaluation
        </span>
        <span className="subdued">
          {data.runId
            ? `Run ${data.runId} · 4 role rubrics`
            : "No published run"}
        </span>
      </div>
      <section className="stats-row" aria-label="Cohort summary">
        <div className="stat">
          <span className="stat-label">Fictional employees</span>
          <div className="stat-value">
            {data.employeeCount}
            <span className="stat-unit">people</span>
          </div>
          <p>Four technical job families</p>
        </div>
        <div className="stat">
          <span className="stat-label">Calculated results</span>
          <div className="stat-value">
            {data.calculatedCount}
            <span className="stat-unit">/ {data.employeeCount}</span>
          </div>
          <p>All required evidence available</p>
        </div>
        <div className="stat">
          <span className="stat-label">Evidence coverage</span>
          <div className="stat-value">
            {data.averageCoverage.toFixed(0)}
            <span className="stat-unit">%</span>
          </div>
          <p>Required sources marked complete</p>
        </div>
        <div className="stat">
          <span className="stat-label">Needs evidence</span>
          <div className="stat-value gold">
            {data.insufficientCount}
            <span className="stat-unit">people</span>
          </div>
          <Link
            className="stat-link"
            href={withRun(
              "/employees?status=insufficient_evidence",
              data.runId,
            )}
          >
            Review coverage gaps
          </Link>
        </div>
      </section>
      <section className="section-block">
        <SectionTitle title="The cohort, by job family">
          <span className="subdued small">
            Mid-level · Same evaluation window
          </span>
        </SectionTitle>
        <p className="section-description">
          Each family has its own rubric. Read distributions within a family,
          never as a cross-role ranking.
        </p>
        <div className="table-wrap">
          <table className="family-table">
            <thead>
              <tr>
                <th>Job family</th>
                <th>People</th>
                <th>
                  Score distribution <span className="th-note">0 → 100</span>
                </th>
                <th>Family mean</th>
                <th>Coverage</th>
                <th>
                  <span className="sr-only">Explore</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.families.map((family) => (
                <tr key={family.jobFamily}>
                  <td>
                    <Link
                      href={withRun(
                        `/employees?family=${family.jobFamily}`,
                        data.runId,
                      )}
                      className="family-name"
                    >
                      {FAMILY_LABELS[family.jobFamily]}
                    </Link>
                    <span className="family-meta">
                      Role rubric · {family.calculated} calculated
                      {family.insufficient > 0
                        ? ` · ${family.insufficient} missing evidence`
                        : ""}
                    </span>
                  </td>
                  <td className="mono">{family.count}</td>
                  <td>
                    <div
                      className="distribution"
                      role="img"
                      aria-label={family.distribution
                        .map((bin) => `${bin.label}: ${bin.count} people`)
                        .join(", ")}
                    >
                      {family.distribution.map((bin, j) => (
                        <div
                          key={bin.label}
                          className="distribution-bin"
                          title={`${bin.label}: ${bin.count} people`}
                        >
                          <span
                            style={{
                              height: `${Math.max(2, (bin.count / Math.max(1, ...family.distribution.map((b) => b.count))) * 33)}px`,
                              opacity: 0.27 + j * 0.12,
                            }}
                          />
                          <span className="sr-only">
                            {bin.label}: {bin.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <Score value={family.averageScore} />
                    <span className="score-scale"> /100</span>
                  </td>
                  <td>
                    <Coverage value={family.averageCoverage} />
                  </td>
                  <td>
                    <Link
                      href={withRun(
                        `/employees?family=${family.jobFamily}`,
                        data.runId,
                      )}
                      className="row-link"
                      aria-label={`Explore ${FAMILY_LABELS[family.jobFamily]}`}
                    >
                      View family
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="distribution-legend">
          Score bands, left to right:{" "}
          <span className="mono">0–49 · 50–69 · 70–84 · 85–100</span>
        </p>
        <div className="table-foot">
          <span className="legend">
            <span />
            Calculated scores only. Missing evidence receives no numeric total.
          </span>
          <span>{data.employeeCount} people / 4 families</span>
        </div>
      </section>
      <section className="evidence-summary">
        <div>
          <SectionTitle title="Behind the results" />
          <p className="section-description">
            Original records are validated before any calculation. Duplicates
            and invalid facts cannot inflate a result.
          </p>
          <div className="evidence-counts">
            <div>
              <CircleCheck size={18} />
              <span className="mono">
                {data.evidenceCounts.valid.toLocaleString()}
              </span>
              <span>valid records</span>
            </div>
            <div>
              <FileSearch size={18} />
              <span className="mono">
                {data.evidenceCounts.excluded.toLocaleString()}
              </span>
              <span>excluded measurements</span>
            </div>
            <div>
              <ScanLine size={18} />
              <span className="mono">
                {data.evidenceCounts.invalid.toLocaleString()}
              </span>
              <span>invalid records</span>
            </div>
          </div>
        </div>
        <Link href="/methodology" className="methodology-callout">
          <span className="eyebrow">Understand the calculation</span>
          <h3>
            Evidence first.
            <br />
            Then the score.
          </h3>
          <span className="text-link">Explore the methodology</span>
        </Link>
      </section>
      <InfoNote>
        All people and work records are fictional. These demonstration rubrics
        explain a calculation; they are not validated measures of employee value
        or a basis for employment decisions.
      </InfoNote>
    </>
  );
}
