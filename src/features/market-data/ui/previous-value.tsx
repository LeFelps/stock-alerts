"use client";

import { Info } from "lucide-react";
import { useId } from "react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { formatHumanDate } from "@/lib/format-date";

export function PreviousValue({
  label,
  marketDate,
  value,
}: {
  label: string;
  marketDate: string | null;
  value: string;
}) {
  const descriptionId = useId();
  const description = marketDate
    ? `Valor anterior registrado em ${formatHumanDate(marketDate)}.`
    : "A data do valor anterior não está disponível.";

  return (
    <span className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
      <span>
        <span className="sr-only">Valor anterior: </span>
        {value}
      </span>
      <span className="sr-only" id={descriptionId}>
        {description}
      </span>
      <HoverCard closeDelay={100} openDelay={150}>
        <HoverCardTrigger asChild>
          <button
            aria-describedby={descriptionId}
            aria-label={`Data do valor anterior de ${label}`}
            className="inline-flex size-5 cursor-help items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
          >
            <Info aria-hidden="true" className="size-3.5" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          className="w-auto max-w-64 p-3"
          collisionPadding={16}
          role="tooltip"
          side="top"
        >
          <p className="text-sm">{description}</p>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
}
