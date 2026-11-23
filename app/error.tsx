"use client";
import { DatabaseZap, RefreshCw } from "lucide-react";
export default function ErrorPage({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <div className="empty-state error-state">
      <DatabaseZap size={30} strokeWidth={1.4} />
      <div className="eyebrow">Data temporarily unavailable</div>
      <h1>We couldn’t load this evaluation.</h1>
      <p>
        The published records couldn’t be read. Check that the local database is
        running, then try again.
      </p>
      <button className="button primary" onClick={retry}>
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}
