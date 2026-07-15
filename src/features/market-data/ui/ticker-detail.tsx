import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import { EMA_COLORS } from "@/features/indicators/ui/ema-colors";
import type { PriceSnapshot } from "@/features/market-data/domain/price-snapshot";
import {
  getTechnicalOutlook,
  type TechnicalOutlook,
} from "@/features/signals/domain/technical-outlook";

import { PreviousValue } from "./previous-value";
import { CandlestickChart, EmaChart } from "./ticker-charts";

export function TickerDetail({
  indicatorSnapshots,
  priceSnapshots,
}: {
  indicatorSnapshots: IndicatorSnapshot[];
  priceSnapshots: PriceSnapshot[];
}) {
  const latestPrice = priceSnapshots.at(-1) ?? null;
  const previousPrice = priceSnapshots.at(-2) ?? null;
  const latestIndicator = indicatorSnapshots.at(-1) ?? null;
  const previousIndicator = indicatorSnapshots.at(-2) ?? null;
  const latestMarketDate =
    latestPrice?.marketDate ?? latestIndicator?.marketDate ?? null;
  const technicalOutlook = getTechnicalOutlook(latestIndicator);

  return (
    <div className="grid gap-8">
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            Última atualização
          </span>
          <span aria-hidden="true"> · </span>
          <span>{formatRelativeMarketDate(latestMarketDate)}</span>
        </p>
        <section
          aria-label="Resumo do Ativo"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Metric
            label="Último preço"
            previousMarketDate={previousPrice?.marketDate ?? null}
            previousValue={formatCurrency(previousPrice?.close)}
            value={formatCurrency(latestPrice?.close)}
          />
          <Metric
            accentColor={EMA_COLORS.ema6}
            label="MME6"
            previousMarketDate={previousIndicator?.marketDate ?? null}
            previousValue={formatCurrency(previousIndicator?.ema6)}
            value={formatCurrency(latestIndicator?.ema6)}
          />
          <Metric
            accentColor={EMA_COLORS.ema13}
            label="MME13"
            previousMarketDate={previousIndicator?.marketDate ?? null}
            previousValue={formatCurrency(previousIndicator?.ema13)}
            value={formatCurrency(latestIndicator?.ema13)}
          />
          <Metric
            accentColor={EMA_COLORS.ema42}
            label="MME42"
            previousMarketDate={previousIndicator?.marketDate ?? null}
            previousValue={formatCurrency(previousIndicator?.ema42)}
            value={formatCurrency(latestIndicator?.ema42)}
          />
        </section>
        <TechnicalSignal outlook={technicalOutlook} />
      </div>

      <ChartCard
        description="Fechamento e médias móveis exponenciais dos últimos 60 dias de mercado."
        title="Médias móveis exponenciais"
      >
        <EmaChart
          snapshots={indicatorSnapshots.slice(-60).map((snapshot) => ({
            close: snapshot.close,
            ema6: snapshot.ema6,
            ema13: snapshot.ema13,
            ema42: snapshot.ema42,
            marketDate: snapshot.marketDate,
          }))}
        />
      </ChartCard>

      <ChartCard
        description="Variação entre abertura, máxima, mínima e fechamento nos últimos 60 dias de mercado."
        title="Oscilação de preços"
      >
        <CandlestickChart
          snapshots={priceSnapshots.slice(-60).map((snapshot) => ({
            close: snapshot.close,
            high: snapshot.high,
            low: snapshot.low,
            marketDate: snapshot.marketDate,
            open: snapshot.open,
          }))}
        />
      </ChartCard>
    </div>
  );
}

function Metric({
  accentColor,
  label,
  previousMarketDate,
  previousValue,
  value,
}: {
  accentColor?: string;
  label: string;
  previousMarketDate: string | null;
  previousValue: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="grid gap-1.5 p-5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className="text-xl font-semibold tabular-nums"
          style={accentColor ? { color: accentColor } : undefined}
        >
          {value}
        </span>
        <PreviousValue
          label={label}
          marketDate={previousMarketDate}
          value={previousValue}
        />
      </CardContent>
    </Card>
  );
}

function TechnicalSignal({ outlook }: { outlook: TechnicalOutlook }) {
  const signalLabels: Record<TechnicalOutlook["signal"], string> = {
    BEARISH: "Tendência de baixa",
    BULLISH: "Tendência de alta",
    MIXED: "Sinal misto",
    UNAVAILABLE: "Dados insuficientes",
  };
  const suggestionLabels: Record<TechnicalOutlook["suggestion"], string> = {
    BUY: "Comprar",
    HOLD: "Manter",
    SELL: "Vender",
  };
  const suggestionStyles: Record<TechnicalOutlook["suggestion"], string> = {
    BUY: "border-transparent bg-emerald-600 text-white",
    HOLD: "border-transparent bg-muted text-foreground",
    SELL: "border-transparent bg-red-600 text-white",
  };

  return (
    <section
      aria-labelledby="technical-signal-title"
      className="grid gap-3 border-b py-3 sm:grid-cols-[1fr_auto] sm:items-end"
    >
      <h3 className="text-sm font-semibold" id="technical-signal-title">
        {signalLabels[outlook.signal]}
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sugestão</span>
        <Badge className={suggestionStyles[outlook.suggestion]}>
          {suggestionLabels[outlook.suggestion]}
        </Badge>
      </div>
    </section>
  );
}

function ChartCard({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function formatCurrency(value: number | null | undefined) {
  return value == null
    ? "Sem dados"
    : new Intl.NumberFormat("pt-BR", {
        currency: "BRL",
        maximumFractionDigits: 2,
        minimumFractionDigits: 2,
        style: "currency",
      }).format(value);
}

function formatRelativeMarketDate(marketDate: string | null) {
  if (!marketDate) return "Sem dados";

  const today = getDateInSaoPaulo(new Date());
  const yesterday = getDateInSaoPaulo(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  const date = new Date(`${marketDate}T00:00:00.000Z`);
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    ...(marketDate.slice(0, 4) === today.slice(0, 4)
      ? {}
      : { year: "numeric" as const }),
  }).format(date);

  if (marketDate === today) return `Hoje, ${formattedDate}`;
  if (marketDate === yesterday) return `Ontem, ${formattedDate}`;
  return formattedDate;
}

function getDateInSaoPaulo(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(date);
}
