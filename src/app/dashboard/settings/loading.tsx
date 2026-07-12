export default function SettingsLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando configurações"
      className="grid gap-6"
      role="status"
    >
      <span className="sr-only">Carregando configurações…</span>
      <div className="h-14 max-w-2xl animate-pulse rounded-md bg-muted" />
      <div className="grid gap-8">
        <div className="h-28 animate-pulse rounded-md bg-muted" />
        <div className="h-80 animate-pulse rounded-md bg-muted" />
      </div>
    </div>
  );
}
