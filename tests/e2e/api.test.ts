import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  DirectoryData,
  EmployeeDetail,
  OverviewData,
  Rubric,
} from "../../src/types";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";

async function read<T>(path: string): Promise<T> {
  const response = await fetch(base + path);
  assert.equal(response.status, 200, `${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

test("public overview, search, role filter and pagination use the published dataset", async () => {
  const overview = await read<OverviewData>("/api/overview");
  assert.equal(overview.employeeCount, 200);
  assert.equal(overview.calculatedCount + overview.insufficientCount, 200);
  assert.ok(overview.insufficientCount > 0);
  assert.equal(overview.families.length, 4);
  assert.ok(overview.families.every((family) => family.count === 50));
  const directory = await read<DirectoryData>(
    "/api/employees?family=backend_engineering",
  );
  assert.equal(directory.total, 50);
  assert.equal(directory.employees.length, 20);
  assert.ok(
    directory.employees.every(
      (employee) => employee.jobFamily === "backend_engineering",
    ),
  );
  const employee = directory.employees[0];
  const search = await read<DirectoryData>(
    `/api/employees?q=${encodeURIComponent(employee.code)}`,
  );
  assert.equal(search.total, 1);
  assert.equal(search.employees[0].code, employee.code);
  const page2 = await read<DirectoryData>(
    "/api/employees?family=backend_engineering&page=2",
  );
  assert.equal(page2.page, 2);
  assert.ok(!page2.employees.some((row) => row.id === employee.id));
  const empty = await read<DirectoryData>(
    "/api/employees?q=does-not-exist-zzzz",
  );
  assert.equal(empty.total, 0);
});

test("stored explanations reproduce each total and preserve evidence references", async () => {
  const directory = await read<DirectoryData>(
    "/api/employees?status=calculated",
  );
  const detail = await read<EmployeeDetail>(
    `/api/employees/${directory.employees[0].code}`,
  );
  assert.equal(detail.result.components.length, 6);
  assert.equal(detail.rubric.jobFamily, detail.employee.jobFamily);
  assert.equal(
    detail.result.components.reduce(
      (sum, component) => sum + component.weight,
      0,
    ),
    100,
  );
  const contribution = detail.result.components.reduce(
    (sum, component) => sum + (component.contribution ?? 0),
    0,
  );
  assert.ok(Math.abs(contribution - detail.result.totalScore!) <= 0.04);
  const factIds = new Set(
    detail.evidence.flatMap((record) => record.facts.map((fact) => fact.id)),
  );
  for (const component of detail.result.components) {
    assert.ok(
      component.score !== null &&
        component.score >= 0 &&
        component.score <= 100,
    );
    for (const metric of component.metrics) {
      assert.ok(metric.explanation.length > 0);
      assert.ok(metric.usedFactIds.every((id) => factIds.has(id)));
    }
  }
});

test("insufficient evidence remains explicit and never becomes a numeric score", async () => {
  const directory = await read<DirectoryData>(
    "/api/employees?status=insufficient_evidence",
  );
  assert.ok(directory.total > 0);
  const detail = await read<EmployeeDetail>(
    `/api/employees/${directory.employees[0].code}`,
  );
  assert.equal(detail.result.status, "insufficient_evidence");
  assert.equal(detail.result.totalScore, null);
  assert.ok(
    detail.result.components.some(
      (component) => component.status === "unavailable",
    ),
  );
});

test("methodology returns the actual four role definitions used by stored results", async () => {
  const methodology = await read<{ rubrics: Rubric[] }>("/api/methodology");
  assert.equal(methodology.rubrics.length, 4);
  for (const rubric of methodology.rubrics) {
    assert.equal(rubric.dimensions.length, 6);
    assert.equal(
      rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0),
      100,
    );
    const directory = await read<DirectoryData>(
      `/api/employees?family=${rubric.jobFamily}&status=calculated`,
    );
    const detail = await read<EmployeeDetail>(
      `/api/employees/${directory.employees[0].code}?run=${directory.runId}`,
    );
    assert.deepEqual(detail.rubric, rubric);
    assert.equal(
      detail.result.components.reduce(
        (sum, component) => sum + component.metrics.length,
        0,
      ),
      11,
    );
  }
});

test("API validates inputs and exposes reads", async () => {
  for (const path of [
    "/api/employees?family=invalid",
    "/api/employees?page=-1",
    "/api/employees/invalid",
    "/api/employees?run=abc",
  ]) {
    assert.equal((await fetch(base + path)).status, 400, path);
  }
  assert.equal((await fetch(base + "/api/employees/BE-999")).status, 404);
  assert.equal(
    (await fetch(base + "/api/employees", { method: "POST" })).status,
    405,
  );
  assert.equal((await read<{ status: string }>("/api/health")).status, "ok");
});
