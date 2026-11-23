const TZ_OFFSET_HOURS = new Map<string, number>([
  ["UTC", 0],
  ["GMT", 0],
  ["BST", 1],
  ["CET", 1],
  ["CEST", 2],
  ["EET", 2],
  ["EEST", 3],
  ["MSK", 3],
  ["GST", 4],
  ["IST", 5.5],
  ["ICT", 7],
  ["WIB", 7],
  ["SGT", 8],
  ["PHT", 8],
  ["CST", 8],
  ["HKT", 8],
  ["KST", 9],
  ["JST", 9],
  ["AEST", 10],
  ["AEDT", 11],
  ["NZST", 12],
  ["NZDT", 13],
  ["PST", -8],
  ["PDT", -7],
  ["MST", -7],
  ["MDT", -6],
  ["CDT", -5],
  ["EST", -5],
  ["EDT", -4],
  ["BRT", -3],
]);

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const TIME = "(?:\\s*-\\s*(\\d{1,2}):(\\d{2}))?";
const ISO_DATE = new RegExp(`(\\d{4})-(\\d{2})-(\\d{2})${TIME}`);
const LONG_DATE = new RegExp(`([A-Za-z]{3,9})\\.?\\s+(\\d{1,2}),\\s*(\\d{4})${TIME}`);

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function dateParts(raw: string): DateParts | null {
  const iso = ISO_DATE.exec(raw);

  if (iso)
    return {
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
      hour: Number(iso[4] ?? 0),
      minute: Number(iso[5] ?? 0),
    };

  const long = LONG_DATE.exec(raw);
  const month = MONTHS.indexOf((long?.[1] ?? "").slice(0, 3).toLowerCase()) + 1;

  if (!long || month === 0) return null;

  return {
    year: Number(long[3]),
    month,
    day: Number(long[2]),
    hour: Number(long[4] ?? 0),
    minute: Number(long[5] ?? 0),
  };
}

export function parseLiquipediaDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const parts = dateParts(raw);

  if (!parts) return null;

  const zone =
    /Abbr\/([A-Z]+)/.exec(raw)?.[1] ?? /\b([A-Z]{3,4})\s*$/.exec(raw.trim())?.[1] ?? "UTC";

  const offsetHours = TZ_OFFSET_HOURS.get(zone) ?? 0;

  const utc =
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute) -
    offsetHours * 3_600_000;

  return new Date(utc).toISOString();
}
