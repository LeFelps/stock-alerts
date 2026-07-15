"use client";

import { useState } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IndicatorSnapshot } from "@/features/indicators/domain/indicator-snapshot";
import { EMA_COLORS } from "@/features/indicators/ui/ema-colors";
import type { PriceSnapshot } from "@/features/market-data/domain/price-snapshot";
import {
  getTechnicalOutlook,
  type TechnicalOutlook,
} from "@/features/signals/domain/technical-outlook";
import { formatHumanDate } from "@/lib/format-date";

import { PreviousValue } from "./previous-value";

const CHART_WIDTH = 960;
const CHART_HEIGHT = 320;
const CHART_PADDING = { bottom: 40, left: 72, right: 24, top: 24 };

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
        <EmaChart snapshots={indicatorSnapshots.slice(-60)} />
      </ChartCard>

      <ChartCard
        description="Variação entre abertura, máxima, mínima e fechamento nos últimos 60 dias de mercado."
        title="Oscilação de preços"
      >
        <CandlestickChart snapshots={priceSnapshots.slice(-60)} />
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

function EmaChart({ snapshots }: { snapshots: IndicatorSnapshot[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const values = snapshots.flatMap((snapshot) =>
    [snapshot.close, snapshot.ema6, snapshot.ema13, snapshot.ema42].filter(
      (value): value is number => value != null,
    ),
  );

  if (snapshots.length === 0 || values.length === 0) {
    return <EmptyChart message="Sem indicadores calculados para este Ativo." />;
  }

  const scale = createChartScale(values, snapshots.length);
  const series = [
    { color: "var(--foreground)", key: "close", label: "Fechamento" },
    { color: EMA_COLORS.ema6, key: "ema6", label: "MME 6" },
    { color: EMA_COLORS.ema13, key: "ema13", label: "MME 13" },
    { color: EMA_COLORS.ema42, key: "ema42", label: "MME 42" },
  ] as const;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        {series.map((item) => (
          <span className="flex items-center gap-2" key={item.key}>
            <span
              aria-hidden="true"
              className="h-0.5 w-5"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <div className="relative min-w-[40rem]">
          <svg
            aria-label="Gráfico de linhas das médias móveis exponenciais"
            className="h-auto w-full"
            onPointerLeave={() => setActiveIndex(null)}
            role="img"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <ChartGrid scale={scale} snapshots={snapshots} />
            {series.map((item) => {
              const path = createLinePath(
                snapshots.map((snapshot) => snapshot[item.key]),
                scale,
              );

              return path ? (
                <path
                  d={path}
                  fill="none"
                  key={item.key}
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              ) : null;
            })}
            {activeIndex == null ? null : (
              <line
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                x1={scale.x(activeIndex)}
                x2={scale.x(activeIndex)}
                y1={CHART_PADDING.top}
                y2={CHART_HEIGHT - CHART_PADDING.bottom}
              />
            )}
            <ChartHitAreas
              accessibleLabel={(snapshot) =>
                `Exibir detalhes de ${formatMarketDate(snapshot.marketDate)} no gráfico de médias`
              }
              onActiveIndexChange={setActiveIndex}
              scale={scale}
              snapshots={snapshots}
            />
          </svg>
          {activeIndex == null ? null : (
            <ChartHoverCard
              alignRight={activeIndex >= snapshots.length / 2}
              left={scale.x(activeIndex)}
              title={formatMarketDate(snapshots[activeIndex].marketDate)}
            >
              {series.map((item) => (
                <ChartHoverValue
                  color={item.color}
                  key={item.key}
                  label={item.label}
                  value={formatCurrency(snapshots[activeIndex][item.key])}
                />
              ))}
            </ChartHoverCard>
          )}
        </div>
      </div>
    </div>
  );
}

function CandlestickChart({ snapshots }: { snapshots: PriceSnapshot[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const candles = snapshots.filter(
    (
      snapshot,
    ): snapshot is PriceSnapshot & {
      high: number;
      low: number;
      open: number;
    } => snapshot.high != null && snapshot.low != null && snapshot.open != null,
  );

  if (candles.length === 0) {
    return <EmptyChart message="Sem preços completos para exibir o gráfico." />;
  }

  const values = candles.flatMap((snapshot) => [snapshot.high, snapshot.low]);
  const scale = createChartScale(values, candles.length);
  const step = scale.plotWidth / Math.max(candles.length, 1);
  const candleWidth = Math.max(3, Math.min(12, step * 0.58));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 bg-emerald-600" />
          Alta
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 bg-red-600" />
          Baixa
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <div className="relative min-w-[40rem]">
          <svg
            aria-label="Gráfico de candles da oscilação de preços"
            className="h-auto w-full"
            onPointerLeave={() => setActiveIndex(null)}
            role="img"
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          >
            <ChartGrid scale={scale} snapshots={candles} />
            {candles.map((snapshot, index) => {
              const x = scale.x(index);
              const openY = scale.y(snapshot.open);
              const closeY = scale.y(snapshot.close);
              const rising = snapshot.close >= snapshot.open;
              const color = rising ? "#059669" : "#dc2626";
              const bodyY = Math.min(openY, closeY);
              const bodyHeight = Math.max(2, Math.abs(closeY - openY));

              return (
                <g key={`${snapshot.source}-${snapshot.marketDate}`}>
                  <line
                    stroke={color}
                    strokeWidth="1.5"
                    x1={x}
                    x2={x}
                    y1={scale.y(snapshot.high)}
                    y2={scale.y(snapshot.low)}
                  />
                  <rect
                    fill={color}
                    height={bodyHeight}
                    width={candleWidth}
                    x={x - candleWidth / 2}
                    y={bodyY}
                  />
                </g>
              );
            })}
            {activeIndex == null ? null : (
              <line
                stroke="var(--muted-foreground)"
                strokeDasharray="4 4"
                x1={scale.x(activeIndex)}
                x2={scale.x(activeIndex)}
                y1={CHART_PADDING.top}
                y2={CHART_HEIGHT - CHART_PADDING.bottom}
              />
            )}
            <ChartHitAreas
              accessibleLabel={(snapshot) =>
                `Exibir detalhes de ${formatMarketDate(snapshot.marketDate)} no gráfico de preços`
              }
              onActiveIndexChange={setActiveIndex}
              scale={scale}
              snapshots={candles}
            />
          </svg>
          {activeIndex == null ? null : (
            <ChartHoverCard
              alignRight={activeIndex >= candles.length / 2}
              left={scale.x(activeIndex)}
              title={formatMarketDate(candles[activeIndex].marketDate)}
            >
              <ChartHoverValue
                label="Abertura"
                value={formatCurrency(candles[activeIndex].open)}
              />
              <ChartHoverValue
                label="Fechamento"
                value={formatCurrency(candles[activeIndex].close)}
              />
            </ChartHoverCard>
          )}
        </div>
      </div>
    </div>
  );
}

type ChartScale = ReturnType<typeof createChartScale>;

function ChartHitAreas<TSnapshot extends { marketDate: string }>({
  accessibleLabel,
  onActiveIndexChange,
  scale,
  snapshots,
}: {
  accessibleLabel: (snapshot: TSnapshot) => string;
  onActiveIndexChange: (index: number | null) => void;
  scale: ChartScale;
  snapshots: TSnapshot[];
}) {
  return snapshots.map((snapshot, index) => {
    const previousX = index === 0 ? CHART_PADDING.left : scale.x(index - 1);
    const nextX =
      index === snapshots.length - 1
        ? CHART_WIDTH - CHART_PADDING.right
        : scale.x(index + 1);
    const x = index === 0 ? previousX : (previousX + scale.x(index)) / 2;
    const endX =
      index === snapshots.length - 1 ? nextX : (scale.x(index) + nextX) / 2;

    return (
      <rect
        aria-label={accessibleLabel(snapshot)}
        className="outline-none focus-visible:stroke-ring"
        fill="transparent"
        height={CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom}
        key={`${snapshot.marketDate}-${index}`}
        onBlur={() => onActiveIndexChange(null)}
        onFocus={() => onActiveIndexChange(index)}
        onPointerEnter={() => onActiveIndexChange(index)}
        stroke="transparent"
        strokeWidth="2"
        tabIndex={0}
        width={Math.max(1, endX - x)}
        x={x}
        y={CHART_PADDING.top}
      />
    );
  });
}

function ChartHoverCard({
  alignRight,
  children,
  left,
  title,
}: {
  alignRight: boolean;
  children: React.ReactNode;
  left: number;
  title: string;
}) {
  return (
    <div
      aria-label={`Detalhes do gráfico em ${title}`}
      className={`pointer-events-none absolute top-2 z-10 min-w-48 rounded-md border bg-card p-3 text-card-foreground shadow-lg ${alignRight ? "-translate-x-full" : ""}`}
      role="tooltip"
      style={{ left: `${(left / CHART_WIDTH) * 100}%` }}
    >
      <p className="border-b pb-2 text-xs font-medium">{title}</p>
      <div className="grid gap-1.5 pt-2">{children}</div>
    </div>
  );
}

function ChartHoverValue({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <p className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        {color ? (
          <span
            aria-hidden="true"
            className="size-2 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        {label}
      </span>
      <span className="font-medium tabular-nums">{value}</span>
    </p>
  );
}

function ChartGrid({
  scale,
  snapshots,
}: {
  scale: ChartScale;
  snapshots: Array<{ marketDate: string }>;
}) {
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4;
    return scale.max - ratio * (scale.max - scale.min);
  });
  const xTickIndexes = uniqueNumbers([
    0,
    Math.round((snapshots.length - 1) / 2),
    snapshots.length - 1,
  ]);

  return (
    <>
      {yTicks.map((value) => {
        const y = scale.y(value);
        return (
          <g key={value}>
            <line
              stroke="var(--border)"
              x1={CHART_PADDING.left}
              x2={CHART_WIDTH - CHART_PADDING.right}
              y1={y}
              y2={y}
            />
            <text
              fill="var(--muted-foreground)"
              fontSize="11"
              textAnchor="end"
              x={CHART_PADDING.left - 10}
              y={y + 4}
            >
              {formatCompactCurrency(value)}
            </text>
          </g>
        );
      })}
      {xTickIndexes.map((index) => (
        <text
          fill="var(--muted-foreground)"
          fontSize="11"
          key={snapshots[index].marketDate}
          textAnchor={
            index === 0
              ? "start"
              : index === snapshots.length - 1
                ? "end"
                : "middle"
          }
          x={scale.x(index)}
          y={CHART_HEIGHT - 10}
        >
          {formatShortDate(snapshots[index].marketDate)}
        </text>
      ))}
    </>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-md bg-muted/60 p-6 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function createChartScale(values: number[], itemCount: number) {
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = dataMax - dataMin || Math.max(Math.abs(dataMax) * 0.05, 1);
  const padding = range * 0.08;
  const min = dataMin - padding;
  const max = dataMax + padding;
  const plotWidth = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  return {
    max,
    min,
    plotWidth,
    x: (index: number) =>
      CHART_PADDING.left +
      (itemCount <= 1 ? plotWidth / 2 : (index / (itemCount - 1)) * plotWidth),
    y: (value: number) =>
      CHART_PADDING.top + ((max - value) / (max - min)) * plotHeight,
  };
}

function createLinePath(values: Array<number | null>, scale: ChartScale) {
  let path = "";
  let drawing = false;

  values.forEach((value, index) => {
    if (value == null) {
      drawing = false;
      return;
    }

    path += `${drawing ? " L" : "M"} ${scale.x(index)} ${scale.y(value)}`;
    drawing = true;
  });

  return path;
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)];
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

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatMarketDate(marketDate: string | null) {
  return marketDate ? formatHumanDate(marketDate) : "Sem dados";
}

function formatRelativeMarketDate(marketDate: string | null) {
  if (!marketDate) {
    return "Sem dados";
  }

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

  if (marketDate === today) {
    return `Hoje, ${formattedDate}`;
  }

  if (marketDate === yesterday) {
    return `Ontem, ${formattedDate}`;
  }

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

function formatShortDate(marketDate: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${marketDate}T00:00:00.000Z`));
}
