import { z } from "zod";

const watchlistFormSchema = z.object({
  displayName: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(1000).nullable(),
  symbol: z.string().regex(/^[A-Z0-9]{4,12}$/),
});

export type WatchlistFormResult = z.infer<typeof watchlistFormSchema>;

export function normalizeTickerSymbol(
  value: FormDataEntryValue | null,
): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, "").toUpperCase()
    : "";
}

export function parseWatchlistForm(formData: FormData): WatchlistFormResult {
  return watchlistFormSchema.parse({
    displayName: optionalText(formData.get("displayName")),
    notes: optionalText(formData.get("notes")),
    symbol: normalizeTickerSymbol(formData.get("symbol")),
  });
}

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}
