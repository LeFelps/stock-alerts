import { DIGEST_ASSET_FALLBACK_ICON_PNG_BASE64 } from "@/features/alerts/ui/email-assets";

const CACHE_FOR_ONE_DAY =
  "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800";
const CACHE_FOR_ONE_HOUR =
  "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400";
const TICKER_SYMBOL_PATTERN = /^[A-Z0-9]{4,12}$/;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ symbol: string }> },
) {
  const symbol = (await params).symbol.toUpperCase();

  if (!TICKER_SYMBOL_PATTERN.test(symbol)) {
    return new Response(null, { status: 404 });
  }

  try {
    const logoUrl = new URL(
      `/icons/${encodeURIComponent(symbol)}.svg`,
      "https://icons.brapi.dev",
    );
    const response = await fetch(logoUrl, {
      headers: { Accept: "image/*" },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(2_000),
    });
    const contentType = response.headers.get("content-type");

    if (response.ok && contentType?.toLowerCase().startsWith("image/")) {
      return new Response(await response.arrayBuffer(), {
        headers: {
          "Cache-Control": CACHE_FOR_ONE_DAY,
          "Content-Type": contentType,
        },
      });
    }
  } catch {
    // The email must still display the app-equivalent fallback icon.
  }

  return fallbackResponse();
}

function fallbackResponse() {
  return new Response(
    Uint8Array.from(
      Buffer.from(DIGEST_ASSET_FALLBACK_ICON_PNG_BASE64, "base64"),
    ),
    {
      headers: {
        "Cache-Control": CACHE_FOR_ONE_HOUR,
        "Content-Type": "image/png",
      },
    },
  );
}
