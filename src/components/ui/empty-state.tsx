import { cn } from "@/lib/utils";

function EmptyState({
  className,
  description,
  title,
}: {
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/40 px-6 py-10 text-center",
        className,
      )}
      data-slot="empty-state"
    >
      <p className="font-medium">{title}</p>
      <p className="pt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export { EmptyState };
