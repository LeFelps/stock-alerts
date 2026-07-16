import { afterEach, describe, expect, it, vi } from "vitest";

import { DIGEST_ASSET_FALLBACK_ICON_PNG_BASE64 } from "@/features/alerts/ui/email-assets";

import { GET } from "./route";

describe("alert asset logo route", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns and caches an available asset logo", async () => {
    const fetchLogo = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("<svg>logo</svg>", {
        headers: { "content-type": "image/svg+xml" },
      }),
    );
    vi.stubGlobal("fetch", fetchLogo);

    const response = await GET(
      new Request(
        "https://stock-alerts.example.com/api/alert-asset-logos/PETR4",
      ),
      { params: Promise.resolve({ symbol: "petr4" }) },
    );

    expect(fetchLogo).toHaveBeenCalledWith(
      new URL("https://icons.brapi.dev/icons/PETR4.svg"),
      expect.objectContaining({
        headers: { Accept: "image/*" },
        next: { revalidate: 86_400 },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
    expect(response.headers.get("cache-control")).toContain("s-maxage=86400");
    await expect(response.text()).resolves.toBe("<svg>logo</svg>");
  });

  it("returns the app fallback icon when the remote logo is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response("Not found", {
          headers: { "content-type": "text/html" },
          status: 404,
        }),
      ),
    );

    const response = await GET(
      new Request(
        "https://stock-alerts.example.com/api/alert-asset-logos/XPML11",
      ),
      { params: Promise.resolve({ symbol: "XPML11" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("s-maxage=3600");
    expect(Buffer.from(await response.arrayBuffer()).toString("base64")).toBe(
      DIGEST_ASSET_FALLBACK_ICON_PNG_BASE64,
    );
  });

  it("rejects invalid ticker symbols without contacting the logo host", async () => {
    const fetchLogo = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchLogo);

    const response = await GET(
      new Request(
        "https://stock-alerts.example.com/api/alert-asset-logos/invalid",
      ),
      { params: Promise.resolve({ symbol: "not-a-symbol" }) },
    );

    expect(response.status).toBe(404);
    expect(fetchLogo).not.toHaveBeenCalled();
  });
});
