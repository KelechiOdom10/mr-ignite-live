// Match times are written in the caster's local zone, e.g. "2026-10-16 - 06:00 {{Abbr/AEST}}".
const TZ_OFFSET_HOURS: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  BST: 1,
  CET: 1,
  CEST: 2,
  EET: 2,
  EEST: 3,
  MSK: 3,
  GST: 4,
  IST: 5.5,
  ICT: 7,
  WIB: 7,
  SGT: 8,
  PHT: 8,
  CST: 8,
  HKT: 8,
  KST: 9,
  JST: 9,
  AEST: 10,
  AEDT: 11,
  NZST: 12,
  NZDT: 13,
  PST: -8,
  PDT: -7,
  MST: -7,
  MDT: -6,
  CDT: -5,
  EST: -5,
  EDT: -4,
  BRT: -3,
};

const DATE_PATTERN = /(\d{4})-(\d{2})-(\d{2})(?:\s*-\s*(\d{1,2}):(\d{2}))?/;

export function parseLiquipediaDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = DATE_PATTERN.exec(raw);
  if (!m) return null;
  const [, year, month, day, hour = "0", minute = "0"] = m;
  if (year === undefined || month === undefined || day === undefined) return null;
  const zone =
    /Abbr\/([A-Z]+)/.exec(raw)?.[1] ?? /\b([A-Z]{3,4})\s*$/.exec(raw.trim())?.[1] ?? "UTC";
  const offsetHours = TZ_OFFSET_HOURS[zone] ?? 0;
  const utc =
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)) -
    offsetHours * 3_600_000;
  return new Date(utc).toISOString();
}
