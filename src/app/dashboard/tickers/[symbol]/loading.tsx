export default function TickerLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando detalhes do Ativo"
      className="grid gap-8"
      role="status"
    >
      <span className="sr-only">Carregando detalhes do Ativo…</span>
      <div className="h-5 w-20 animate-pulse rounded bg-muted" />
      <div className="h-16 max-w-2xl animate-pulse rounded-md bg-muted" />
      <div className="h-5 w-64 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div className="h-24 animate-pulse rounded-md bg-muted" key={item} />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-md bg-muted" />
      <div className="h-96 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
