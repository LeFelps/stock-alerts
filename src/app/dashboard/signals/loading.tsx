export default function SignalsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando sinais"
      className="grid gap-6"
      role="status"
    >
      <span className="sr-only">Carregando sinais…</span>
      <div className="h-14 max-w-2xl animate-pulse rounded-md bg-muted" />
      <div className="h-80 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
