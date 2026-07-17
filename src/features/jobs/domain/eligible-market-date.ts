import { formatCalendarDateInTimeZone } from "@/lib/format-date";

export const MARKET_TIME_ZONE = "America/Sao_Paulo";

export function marketDataFetchThroughDateForAlertCheck(startedAt: Date) {
  return formatCalendarDateInTimeZone(startedAt, MARKET_TIME_ZONE);
}

export function eligibleMarketDateForAlertCheck(startedAt: Date) {
  const runDate = marketDataFetchThroughDateForAlertCheck(startedAt);
  const previousDate = new Date(`${runDate}T12:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);

  return previousDate.toISOString().slice(0, 10);
}
