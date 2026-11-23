export default function Loading() {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <div className="eyebrow">Reading published evidence</div>
      <div className="skeleton heading-skeleton" />
      <div className="skeleton text-skeleton" />
      <div className="skeleton-stats">
        {[1, 2, 3, 4].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
      <div className="skeleton table-skeleton" />
      <span className="muted">Loading the evaluation…</span>
    </div>
  );
}
