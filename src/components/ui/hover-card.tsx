"use client";

import * as React from "react";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";

import { cn } from "@/lib/utils";

const HoverCard = HoverCardPrimitive.Root;
const HoverCardTrigger = HoverCardPrimitive.Trigger;

function HoverCardContent({
  align = "center",
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  return (
    <HoverCardPrimitive.Portal>
      <HoverCardPrimitive.Content
        align={align}
        className={cn(
          "z-50 w-72 rounded-md border bg-card p-4 text-card-foreground shadow-lg outline-none",
          className,
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  );
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
