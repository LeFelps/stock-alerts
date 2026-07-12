import { z } from "zod";

const createWatchlistFormSchema = z.object({
  notes: z.string().trim().max(1000).nullable(),
  symbol: z.string().regex(/^[A-Z0-9]{4,12}$/),
});

const updateWatchlistFormSchema = z.object({
  notes: z.string().trim().max(1000).nullable(),
});

export type CreateWatchlistFormResult = z.infer<
  typeof createWatchlistFormSchema
>;
export type UpdateWatchlistFormResult = z.infer<
  typeof updateWatchlistFormSchema
>;

export function normalizeTickerSymbol(
  value: FormDataEntryValue | null,
): string {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, "").toUpperCase()
    : "";
}

export function parseCreateWatchlistForm(
  formData: FormData,
): CreateWatchlistFormResult {
  return createWatchlistFormSchema.parse({
    notes: optionalText(formData.get("notes")),
    symbol: normalizeTickerSymbol(formData.get("symbol")),
  });
}

export function parseUpdateWatchlistForm(
  formData: FormData,
): UpdateWatchlistFormResult {
  return updateWatchlistFormSchema.parse({
    notes: optionalText(formData.get("notes")),
  });
}

function optionalText(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}
