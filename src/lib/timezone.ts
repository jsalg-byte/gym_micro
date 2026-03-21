const EASTERN_TIMEZONE = "America/New_York";
const EASTERN_LOCALE = "en-US";

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function getEasternParts(value: Date | string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: EASTERN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(asDate(value));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return null;
  }
  return { year, month, day };
}

export function formatEasternDateTime(value: Date | string) {
  return new Intl.DateTimeFormat(EASTERN_LOCALE, {
    timeZone: EASTERN_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(asDate(value));
}

export function formatEasternDate(value: Date | string) {
  return new Intl.DateTimeFormat(EASTERN_LOCALE, {
    timeZone: EASTERN_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(asDate(value));
}

export function formatEasternTime(value: Date | string) {
  return new Intl.DateTimeFormat(EASTERN_LOCALE, {
    timeZone: EASTERN_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(asDate(value));
}

export function formatEasternMonthYear(value: Date | string) {
  return new Intl.DateTimeFormat(EASTERN_LOCALE, {
    timeZone: EASTERN_TIMEZONE,
    month: "long",
    year: "numeric",
  }).format(asDate(value));
}

export function formatEasternDayLabel(value: Date | string) {
  return new Intl.DateTimeFormat(EASTERN_LOCALE, {
    timeZone: EASTERN_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(asDate(value));
}

export function formatEasternDayKey(value: Date | string) {
  const parts = getEasternParts(value);
  if (!parts) {
    return "";
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}
