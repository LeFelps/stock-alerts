import * as React from "react";

import { cn } from "@/lib/utils";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto" data-slot="table-container">
      <table
        className={cn(
          "w-full border-separate border-spacing-0 text-left text-sm",
          className,
        )}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

export { Table };
