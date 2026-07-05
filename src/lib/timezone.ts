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

function getEasternDateTimeParts(value: Date | string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(asDate(value));
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  const hour = getPart("hour");
  const minute = getPart("minute");
  const second = getPart("second");
  if (!year || !month || !day || !hour || !minute || !second) {
    return null;
  }
  return { year, month, day, hour, minute, second };
}

function getEasternOffset(value: Date | string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EASTERN_TIMEZONE,
    timeZoneName: "longOffset",
  });
  const offsetPart = formatter
    .formatToParts(asDate(value))
    .find((part) => part.type === "timeZoneName")?.value;

  if (!offsetPart || offsetPart === "GMT") {
    return "+00:00";
  }

  const match = offsetPart.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return "+00:00";
  }

  const [, sign, hours, minutes = "00"] = match;
  return `${sign}${hours.padStart(2, "0")}:${minutes}`;
}

export function formatEasternIsoDateTime(value: Date | string) {
  const date = asDate(value);
  const parts = getEasternDateTimeParts(date);
  if (!parts) {
    return date.toISOString();
  }

  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}.${milliseconds}${getEasternOffset(date)}`;
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
