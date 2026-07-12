export default function DashboardLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando painel"
      className="grid gap-10"
      role="status"
    >
      <span className="sr-only">Carregando painel…</span>
      <div className="h-32 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-6">
        <div className="h-14 max-w-2xl animate-pulse rounded-md bg-muted" />
        <div className="h-72 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
