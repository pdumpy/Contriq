import type { Employee, Rubric } from "../types";
export interface CapturedEmployee {
  employee: Employee;
  rubricId: string;
  evidenceIds: string[];
  factIds: string[];
  coverageIds: string[];
  coverageGaps: string[];
}
export interface InputManifest {
  employees: CapturedEmployee[];
  seed: number;
}
export interface RunRow {
  id: string;
  input_manifest: InputManifest;
  engine_version: string;
  status: string;
}
export function rubricFromRow(row: { rules: Rubric }): Rubric {
  return row.rules;
}
