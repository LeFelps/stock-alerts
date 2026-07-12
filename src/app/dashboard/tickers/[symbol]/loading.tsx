export default function TickerLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando detalhes do Ativo"
      className="grid gap-8"
      role="status"
    >
      <span className="sr-only">Carregando detalhes do Ativo…</span>
      <div className="h-5 max-w-xs animate-pulse rounded bg-muted" />
      <div className="h-14 max-w-2xl animate-pulse rounded-md bg-muted" />
      <div className="flex justify-between gap-6">
        <div className="h-20 w-52 animate-pulse rounded-md bg-muted" />
        <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div className="h-20 animate-pulse rounded-md bg-muted" key={item} />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-md bg-muted" />
    </div>
  );
}
