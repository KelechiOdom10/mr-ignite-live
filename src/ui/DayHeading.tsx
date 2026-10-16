import { formatDate, formatDay } from "./time";

const RELATIVE = new Set(["Today", "Tomorrow", "Yesterday"]);

export function DayHeading({ date, now }: { date: string | null; now: number }) {
  if (!date) return <h3 className="h-6" aria-hidden />;
  const relative = formatDay(date, now);
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      {formatDate(date)}
      {RELATIVE.has(relative) && (
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {relative}
        </span>
      )}
    </h3>
  );
}
