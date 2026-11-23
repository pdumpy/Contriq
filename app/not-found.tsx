import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <div className="eyebrow">Record not found</div>
      <h1>This record isn’t available.</h1>
      <p>
        The person, evaluation run, or page you requested could not be found.
      </p>
      <Link href="/employees" className="button primary">
        Back to people
      </Link>
    </div>
  );
}
