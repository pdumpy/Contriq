import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { getEmployees } from "@/server/queries";
import {
  FAMILY_LABELS,
  JOB_FAMILIES,
  type JobFamily,
  type ResultStatus,
} from "@/types";
import {
  PageHeading,
  Coverage,
  Score,
  Status,
  first,
  withRun,
  type SearchValues,
} from "@/components/ui";
import { DirectoryFilters } from "@/components/directory-filters";
export const dynamic = "force-dynamic";
export const metadata = { title: "People" };
export default async function People({
  searchParams,
}: {
  searchParams: Promise<SearchValues>;
}) {
  const values = await searchParams;
  const q = first(values.q) ?? "";
  const rawFamily = first(values.family);
  const family = JOB_FAMILIES.includes(rawFamily as JobFamily)
    ? (rawFamily as JobFamily)
    : undefined;
  const rawStatus = first(values.status);
  const status = ["calculated", "insufficient_evidence"].includes(
    rawStatus ?? "",
  )
    ? (rawStatus as ResultStatus)
    : undefined;
  const page = Math.max(1, Number.parseInt(first(values.page) ?? "1", 10) || 1);
  const requestedRun = first(values.run);
  if (requestedRun && !/^[1-9][0-9]*$/.test(requestedRun)) notFound();
  const data = await getEmployees({
    query: q,
    family,
    status,
    page,
    pageSize: 15,
    runId: requestedRun,
  });
  if (requestedRun && !data.runId) notFound();
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  function pageHref(nextPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (family) params.set("family", family);
    if (status) params.set("status", status);
    if (data.runId) params.set("run", data.runId);
    params.set("page", String(nextPage));
    return `/employees?${params}`;
  }
  return (
    <>
      <PageHeading
        title="People"
        description="Search the fictional cohort and inspect each person’s score and evidence."
      />
      <DirectoryFilters
        key={`${q}:${family}:${status}`}
        query={q}
        family={family ?? ""}
        status={status ?? ""}
        runId={data.runId}
      />
      <div className="directory-caption">
        <span>
          <strong>{data.total}</strong> {data.total === 1 ? "person" : "people"}
          {family ? ` in ${FAMILY_LABELS[family]}` : " across all job families"}
        </span>
        <span className="subdued">Mid-level · {data.period.label}</span>
      </div>
      {data.employees.length ? (
        <>
          <div className="table-wrap">
            <table className="people-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Job family / team</th>
                  <th>
                    Score <span className="th-note">/100</span>
                  </th>
                  <th>Coverage</th>
                  <th>Result status</th>
                  <th>
                    <span className="sr-only">View detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((person) => (
                  <tr key={person.id}>
                    <td>
                      <Link
                        className="person-name"
                        href={withRun(`/employees/${person.code}`, data.runId)}
                      >
                        <span className="avatar" aria-hidden="true">
                          {person.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <span>
                          {person.name}
                          <span className="person-code mono">
                            {person.code}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="family-text">
                        {FAMILY_LABELS[person.jobFamily]}
                      </span>
                      <span className="cell-secondary">{person.team}</span>
                    </td>
                    <td>
                      <Score
                        value={person.totalScore}
                        className="table-score"
                      />
                    </td>
                    <td>
                      <Coverage value={person.coverage} />
                    </td>
                    <td>
                      <Status status={person.status} />
                    </td>
                    <td>
                      <Link
                        className="row-link"
                        href={withRun(`/employees/${person.code}`, data.runId)}
                        aria-label={`View ${person.name}`}
                      >
                        View record
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span className="subdued small">
              Showing {(data.page - 1) * data.pageSize + 1}–
              {Math.min(data.page * data.pageSize, data.total)} of {data.total}
            </span>
            <div>
              {data.page > 1 ? (
                <Link
                  href={pageHref(data.page - 1)}
                  className="button secondary small-button"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Link>
              ) : (
                <span className="button secondary small-button disabled">
                  <ChevronLeft size={16} />
                  Previous
                </span>
              )}
              <span className="mono page-count">
                {data.page} / {pages}
              </span>
              {data.page < pages ? (
                <Link
                  href={pageHref(data.page + 1)}
                  className="button secondary small-button"
                >
                  Next
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <span className="button secondary small-button disabled">
                  Next
                  <ChevronRight size={16} />
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <SearchX size={32} strokeWidth={1.3} />
          <h2>
            {data.runId
              ? "No people match these filters."
              : "No evaluation has been published."}
          </h2>
          <p>Try another name, employee code, team, or job family.</p>
          <Link
            href={withRun("/employees", data.runId)}
            className="button secondary"
          >
            Clear filters
          </Link>
        </div>
      )}
      <p className="directory-note">
        Scores use role-specific rubrics. Compare results only within the same
        job family, level, window, and rubric version.
      </p>
    </>
  );
}
