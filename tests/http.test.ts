import { test } from "node:test";
import assert from "node:assert/strict";
import { apiError, parseDirectoryParams, parseRunId } from "../src/http";

test("directory query supports a role, result state, name and historical run", () => {
  assert.deepEqual(
    parseDirectoryParams(
      new URLSearchParams(
        "q=  Mira &family=data_science&status=insufficient_evidence&page=2&run=12",
      ),
    ),
    {
      query: "Mira",
      family: "data_science",
      status: "insufficient_evidence",
      page: 2,
      pageSize: 25,
      runId: "12",
    },
  );
});

test("invalid role, pagination and ambiguous query parameters are rejected", () => {
  for (const query of [
    "family=unknown",
    "page=-1",
    "page=1.5",
    "q=one&q=two",
    "run=0",
    "run=foo",
  ]) {
    assert.throws(() => parseDirectoryParams(new URLSearchParams(query)));
  }
  assert.throws(() => parseRunId(new URLSearchParams("run=abc")));
});

test("query failures return a useful 400 without exposing the error payload", async () => {
  const reply = apiError(new Error("DUPLICATE_QUERY"));
  assert.equal(reply.status, 400);
  assert.equal((await reply.json()).error.code, "INVALID_QUERY");
});
