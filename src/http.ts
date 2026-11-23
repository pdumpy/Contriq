import { z } from "zod";
import { JOB_FAMILIES, type DirectoryParams } from "./types";

const directorySchema = z.object({
  q: z.string().trim().max(100).optional(),
  family: z.enum(JOB_FAMILIES).optional(),
  status: z.enum(["calculated", "insufficient_evidence"]).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  run: z
    .string()
    .regex(/^[1-9]\d{0,14}$/)
    .optional(),
});

export function parseDirectoryParams(search: URLSearchParams): DirectoryParams {
  const values: Record<string, string> = {};
  for (const key of ["q", "family", "status", "page", "run"]) {
    const entries = search.getAll(key);
    if (entries.length > 1) throw new Error("DUPLICATE_QUERY");
    if (entries[0]) values[key] = entries[0];
  }
  const parsed = directorySchema.parse(values);
  return {
    query: parsed.q,
    family: parsed.family,
    status: parsed.status,
    page: parsed.page,
    pageSize: 20,
    runId: parsed.run,
  };
}

export function parseRunId(search: URLSearchParams): string | undefined {
  return directorySchema.shape.run.parse(search.get("run") || undefined);
}

export function apiError(error: unknown): Response {
  if (
    error instanceof z.ZodError ||
    (error instanceof Error && error.message === "DUPLICATE_QUERY")
  ) {
    return Response.json(
      {
        error: {
          code: "INVALID_QUERY",
          message:
            "Check the search, job family, result state, page or run identifier.",
        },
      },
      { status: 400 },
    );
  }
  console.error("Contriq data request failed", {
    name: error instanceof Error ? error.name : "UnknownError",
  });
  return Response.json(
    {
      error: {
        code: "DATA_UNAVAILABLE",
        message:
          "Employee evidence is temporarily unavailable. Check the local database and try again.",
      },
    },
    { status: 503 },
  );
}
