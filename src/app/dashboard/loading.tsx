export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl content-start gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="h-12 w-full max-w-sm animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
          <div className="hidden h-48 animate-pulse rounded-md bg-muted lg:block" />
          <div className="grid gap-5">
            <div className="h-28 animate-pulse rounded-md bg-muted" />
            <div className="h-72 animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
