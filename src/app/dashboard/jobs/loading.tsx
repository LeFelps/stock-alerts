export default function JobsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando execuções"
      className="grid gap-6"
      role="status"
    >
      <span className="sr-only">Carregando execuções…</span>
      <div className="h-14 max-w-2xl animate-pulse rounded-md bg-muted" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-24 animate-pulse rounded-md bg-muted" key={item} />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
