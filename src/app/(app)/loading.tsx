/**
 * Shown immediately on navigation so a click gives feedback before the server
 * has finished querying, instead of the page appearing frozen.
 */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      <div className="space-y-2 rounded-md border p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
