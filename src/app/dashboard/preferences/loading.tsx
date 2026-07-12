export default function PreferencesLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando preferências"
      className="grid gap-6"
      role="status"
    >
      <span className="sr-only">Carregando preferências…</span>
      <div className="h-14 max-w-2xl animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
