"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, LoaderCircle } from "lucide-react";
import { FAMILY_LABELS, JOB_FAMILIES } from "@/types";
export function DirectoryFilters({
  query,
  family,
  status,
  runId,
}: {
  query: string;
  family: string;
  status: string;
  runId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(query);
  function navigate(next: { q?: string; family?: string; status?: string }) {
    const params = new URLSearchParams();
    const q = next.q ?? text;
    const f = next.family ?? family;
    const s = next.status ?? status;
    if (q.trim()) params.set("q", q.trim());
    if (f) params.set("family", f);
    if (s) params.set("status", s);
    if (runId) params.set("run", runId);
    startTransition(() => router.push(`/employees?${params}`));
  }
  return (
    <form
      className="directory-filters"
      role="search"
      aria-busy={pending}
      onSubmit={(e) => {
        e.preventDefault();
        navigate({ q: text });
      }}
    >
      <label className="search-box">
        <Search size={18} />
        <span className="sr-only">Search by name, code or team</span>
        <input
          name="q"
          placeholder="Search name, employee code or team…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" aria-label="Search people">
          {pending ? (
            <LoaderCircle className="spin" size={17} />
          ) : (
            <span>Search</span>
          )}
        </button>
      </label>
      <label className="select-field">
        <span className="sr-only">Job family</span>
        <select
          name="family"
          value={family}
          onChange={(e) => navigate({ family: e.target.value })}
        >
          <option value="">All job families</option>
          {JOB_FAMILIES.map((f) => (
            <option value={f} key={f}>
              {FAMILY_LABELS[f]}
            </option>
          ))}
        </select>
      </label>
      <label className="select-field">
        <span className="sr-only">Result status</span>
        <select
          name="status"
          value={status}
          onChange={(e) => navigate({ status: e.target.value })}
        >
          <option value="">All result statuses</option>
          <option value="calculated">Calculated</option>
          <option value="insufficient_evidence">Insufficient evidence</option>
        </select>
      </label>
    </form>
  );
}
