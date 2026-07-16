import {
  formatSignalTrigger,
  formatSignalType,
  getSignalTriggerSegments,
} from "@/features/signals/ui/signal-presentation";

import type {
  BuySignalDigestAsset,
  BuySignalDigestEmail,
} from "../domain/email-delivery";
import {
  DIGEST_ASSET_FALLBACK_ICON_DATA_URI,
  DIGEST_EXTERNAL_LINK_ICON_DATA_URI,
} from "./email-assets";

type DigestHtmlOptions = {
  assetFallbackIconSrc?: string;
  externalLinkIconSrc?: string;
};

export function buildDigestSubject(marketDate: string) {
  return `[Stock Alerts] Sinais de compra — ${formatMarketDate(marketDate)}`;
}

export function buildDigestTextBody(
  email: BuySignalDigestEmail,
  appBaseUrl: string,
) {
  const entries = sortedAssets(email.assets).flatMap((asset) => {
    const triggers = signalsForAsset(email, asset).map(
      (signal) => `- Gatilho: ${formatSignalTrigger(signal.reason)}`,
    );

    return [
      `${asset.symbol} — ${asset.longName ?? asset.symbol}`,
      `Preço: ${formatCurrency(asset.currentPrice, asset.currency)}`,
      `Sinal: ${formatSignalType("BUY")}`,
      ...triggers,
      `Ver detalhes: ${buildAssetDetailsUrl(appBaseUrl, asset.symbol)}`,
      "",
    ];
  });

  return [
    `Sinais de compra detectados em ${formatMarketDate(email.marketDate)}`,
    "",
    "As regras técnicas monitoradas identificaram os seguintes sinais:",
    "",
    ...entries,
    "Este alerta é gerado mecanicamente por regras técnicas configuradas no app e não constitui recomendação de investimento.",
  ].join("\n");
}

export function buildDigestHtmlBody(
  email: BuySignalDigestEmail,
  appBaseUrl: string,
  {
    assetFallbackIconSrc = DIGEST_ASSET_FALLBACK_ICON_DATA_URI,
    externalLinkIconSrc = DIGEST_EXTERNAL_LINK_ICON_DATA_URI,
  }: DigestHtmlOptions = {},
) {
  const assets = sortedAssets(email.assets);
  const assetRows = assets
    .map((asset) =>
      buildAssetRow(
        email,
        asset,
        appBaseUrl,
        assetFallbackIconSrc,
        externalLinkIconSrc,
      ),
    )
    .join("");
  const assetCount = assets.length;

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(buildDigestSubject(email.marketDate))}</title>
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }

      @media only screen and (max-width: 620px) {
        .email-shell { width: 100% !important; }
        .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
        .email-title { font-size: 22px !important; }
        .asset-name, .asset-price, .asset-signal {
          display: block !important;
          width: auto !important;
          padding-left: 0 !important;
          text-align: left !important;
        }
        .asset-price, .asset-signal { padding-top: 12px !important; }
      }

      @media (prefers-color-scheme: dark) {
        .email-bg { background: #0a0a0a !important; color: #ededed !important; }
        .email-card { background: #18181b !important; border-color: #3f3f46 !important; }
        .email-muted-bg { background: #27272a !important; }
        .email-text { color: #ededed !important; }
        .email-muted-text { color: #a1a1aa !important; }
        .email-primary-text { color: #60a5fa !important; }
        .email-border { border-color: #3f3f46 !important; }
        .email-link { color: #60a5fa !important; border-color: #52525b !important; }
        .email-logo-fallback { background-color: #172554 !important; }
        .email-buy-badge {
          background: #052e16 !important;
          border-color: #166534 !important;
          color: #86efac !important;
        }
      }
    </style>
  </head>
  <body class="email-bg" style="margin:0;padding:0;background:#fafafa;color:#18181b;font-family:Geist,Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${assetCount} ${assetCount === 1 ? "Ativo apresentou" : "Ativos apresentaram"} sinal de compra em ${escapeHtml(formatMarketDate(email.marketDate))}.
    </div>
    <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#fafafa;">
      <tr>
        <td align="center" style="padding:28px 12px;">
          <table role="presentation" class="email-shell email-card email-border" width="760" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:760px;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
            <tr>
              <td class="email-padding email-border" style="padding:24px 32px;border-bottom:1px solid #e4e4e7;">
                <div class="email-text" style="color:#18181b;font-size:30px;font-weight:800;letter-spacing:-0.025em;line-height:1.2;">Stock Alerts</div>
              </td>
            </tr>
            <tr>
              <td class="email-padding" style="padding:30px 32px 26px;">
                <h1 class="email-title email-text" style="margin:0;color:#18181b;font-size:24px;font-weight:700;line-height:1.3;">Sinais de compra detectados</h1>
                <div class="email-primary-text" style="margin-top:8px;color:#2563eb;font-size:18px;font-weight:700;line-height:1.4;">${escapeHtml(formatMarketDateLong(email.marketDate))}</div>
                <p class="email-muted-text" style="margin:12px 0 0;color:#52525b;font-size:16px;line-height:1.6;">As regras técnicas monitoradas identificaram ${assetCount === 1 ? "um Ativo" : `${assetCount} Ativos`} para sua atenção.</p>
              </td>
            </tr>
            <tr>
              <td class="email-padding" style="padding:0 32px 30px;">
                <table role="presentation" class="email-border" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
                  ${assetRows}
                </table>
              </td>
            </tr>
            <tr>
              <td class="email-padding email-muted-bg email-muted-text email-border" style="padding:20px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;color:#52525b;font-size:14px;line-height:1.6;">
                Este alerta é gerado mecanicamente por regras técnicas configuradas no app e não constitui recomendação de investimento.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function buildAssetRow(
  email: BuySignalDigestEmail,
  asset: BuySignalDigestAsset,
  appBaseUrl: string,
  assetFallbackIconSrc: string,
  externalLinkIconSrc: string,
) {
  const detailsUrl = buildAssetDetailsUrl(appBaseUrl, asset.symbol);
  const triggers = signalsForAsset(email, asset)
    .map((signal) => buildSignalTrigger(signal.reason))
    .join("");

  return `<tr>
    <td class="email-border" style="padding:18px 16px;border-bottom:1px solid #e4e4e7;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="52" valign="middle">${buildAssetLogo(asset, appBaseUrl, assetFallbackIconSrc)}</td>
          <td valign="middle" style="padding-left:12px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td class="asset-name" valign="middle">
                  <div class="email-text" style="color:#18181b;font-size:17px;font-weight:600;line-height:1.3;">${escapeHtml(asset.symbol)}</div>
                  <div class="email-muted-text" style="margin-top:3px;color:#52525b;font-size:14px;line-height:1.4;">${escapeHtml(asset.longName ?? asset.symbol)}</div>
                </td>
                <td class="asset-price" width="120" valign="middle" align="right" style="padding-left:16px;text-align:right;">
                  <div class="email-text" style="color:#18181b;font-size:17px;font-weight:600;line-height:1.3;white-space:nowrap;font-variant-numeric:tabular-nums;">${escapeHtml(formatCurrency(asset.currentPrice, asset.currency))}</div>
                </td>
                <td class="asset-signal" width="210" valign="middle" style="padding-left:20px;">
                  <span class="email-buy-badge" style="display:inline-block;padding:3px 9px;border:1px solid #bbf7d0;border-radius:5px;background:#dcfce7;color:#166534;font-size:12px;font-weight:600;line-height:1.35;">${escapeHtml(formatSignalType("BUY"))}</span>
                  ${triggers}
                </td>
              </tr>
            </table>
          </td>
          <td width="44" valign="middle" align="right" style="padding-left:12px;">
            <a class="email-link" href="${escapeHtml(detailsUrl)}" target="_blank" rel="noopener noreferrer" title="Ver detalhes de ${escapeHtml(asset.symbol)}" style="display:inline-block;width:38px;height:38px;border:1px solid #d4d4d8;border-radius:7px;color:#2563eb;text-align:center;text-decoration:none;">
              <img src="${escapeHtml(externalLinkIconSrc)}" alt="" width="24" height="24" style="display:block;width:24px;height:24px;margin:7px auto 0;border:0;">
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildSignalTrigger(
  reason: BuySignalDigestEmail["signals"][number]["reason"],
) {
  const content = getSignalTriggerSegments(reason)
    .map((segment, index) => {
      const separator =
        index === 0
          ? ""
          : '<span class="email-muted-text" style="color:#52525b;"> &gt; </span>';

      return `${separator}<span style="color:${segment.color};">${segment.label}</span>`;
    })
    .join("");

  return `<div style="margin-top:7px;font-size:14px;font-weight:600;line-height:1.4;white-space:nowrap;">${content}</div>`;
}

function buildAssetLogo(
  asset: BuySignalDigestAsset,
  appBaseUrl: string,
  fallbackIconSrc: string,
) {
  const logoUrl = safeRemoteUrl(asset.logoUrl);

  if (logoUrl) {
    return `<img class="email-logo-fallback" src="${escapeHtml(buildAssetLogoUrl(appBaseUrl, asset.symbol))}" alt="Logo de ${escapeHtml(asset.symbol)}" width="44" height="44" style="display:block;width:44px;height:44px;border:0;border-radius:8px;object-fit:contain;background:#eff6ff;">`;
  }

  return `<img class="email-logo-fallback" src="${escapeHtml(fallbackIconSrc)}" alt="Logo padrão de ${escapeHtml(asset.symbol)}" width="44" height="44" style="display:block;width:44px;height:44px;border:0;border-radius:8px;background:#eff6ff;">`;
}

function sortedAssets(assets: BuySignalDigestAsset[]) {
  return [...assets].sort((left, right) =>
    left.symbol.localeCompare(right.symbol),
  );
}

function signalsForAsset(
  email: BuySignalDigestEmail,
  asset: BuySignalDigestAsset,
) {
  return email.signals
    .filter((signal) => signal.symbol === asset.symbol)
    .sort((left, right) => left.reason.localeCompare(right.reason));
}

function buildAssetDetailsUrl(appBaseUrl: string, symbol: string) {
  return new URL(
    `/dashboard/tickers/${encodeURIComponent(symbol)}`,
    appBaseUrl,
  ).toString();
}

function buildAssetLogoUrl(appBaseUrl: string, symbol: string) {
  return new URL(
    `/api/alert-asset-logos/${encodeURIComponent(symbol)}`,
    appBaseUrl,
  ).toString();
}

function formatMarketDate(marketDate: string) {
  const [year, month, day] = marketDate.split("-");

  return `${day}/${month}/${year}`;
}

function formatMarketDateLong(marketDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${marketDate}T00:00:00.000Z`));
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function safeRemoteUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
