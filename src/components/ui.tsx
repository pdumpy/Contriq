import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import type { ReactNode } from "react";
import type { ResultStatus } from "@/types";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="button primary" href={href}>
      {children}
    </Link>
  );
}
export function SectionTitle({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {children}
    </div>
  );
}
export function Status({ status }: { status: ResultStatus }) {
  return (
    <span
      className={`badge ${status === "calculated" ? "calculated" : "incomplete"}`}
    >
      <span />
      {status === "calculated" ? "Calculated" : "Insufficient evidence"}
    </span>
  );
}
export function Score({
  value,
  className = "",
}: {
  value: number | null;
  className?: string;
}) {
  return (
    <span className={`mono ${className}`}>
      {value === null ? "—" : value.toFixed(2)}
    </span>
  );
}
export function Coverage({ value }: { value: number }) {
  return (
    <div className="coverage-cell">
      <div className="thin-track">
        <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
      </div>
      <span className="mono">{value.toFixed(0)}%</span>
    </div>
  );
}
export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="info-note">
      <Info size={17} />
      <p>{children}</p>
    </div>
  );
}
export function Breadcrumb({ children }: { children: ReactNode }) {
  return (
    <div className="breadcrumb">
      <Link href="/employees">People</Link>
      <ChevronRight size={14} />
      <span>{children}</span>
    </div>
  );
}
export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link className="text-link" href={href}>
      {children}
    </Link>
  );
}
export type SearchValues = { [key: string]: string | string[] | undefined };
export function first(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
export function withRun(path: string, runId: string | null): string {
  return runId
    ? `${path}${path.includes("?") ? "&" : "?"}run=${encodeURIComponent(runId)}`
    : path;
}
