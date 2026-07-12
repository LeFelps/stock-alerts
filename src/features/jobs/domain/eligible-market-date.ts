import { formatCalendarDateInTimeZone } from "@/lib/format-date";

export const MARKET_TIME_ZONE = "America/Sao_Paulo";

export function eligibleMarketDateForAlertCheck(startedAt: Date) {
  const runDate = formatCalendarDateInTimeZone(startedAt, MARKET_TIME_ZONE);
  const previousDate = new Date(`${runDate}T12:00:00.000Z`);
  previousDate.setUTCDate(previousDate.getUTCDate() - 1);

  return previousDate.toISOString().slice(0, 10);
}
