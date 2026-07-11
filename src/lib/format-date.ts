const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function formatHumanDate(
  value: Date | string,
  now: Date | string = new Date(),
) {
  const date = toLocalDate(value);
  const dayDifference = differenceInCalendarDays(date, toLocalDate(now));

  if (dayDifference === 0) {
    return "Hoje";
  }

  if (dayDifference === -1) {
    return "Ontem";
  }

  return dateFormatter.format(date);
}

export function formatHumanDateTime(date: Date, now: Date = new Date()) {
  return `${formatHumanDate(date, now)}, ${timeFormatter.format(date)}`;
}

export function formatCalendarDateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function toLocalDate(value: Date | string) {
  if (value instanceof Date) {
    return value;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function differenceInCalendarDays(date: Date, comparisonDate: Date) {
  const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const comparisonDay = Date.UTC(
    comparisonDate.getFullYear(),
    comparisonDate.getMonth(),
    comparisonDate.getDate(),
  );

  return Math.round((dateDay - comparisonDay) / 86_400_000);
}
