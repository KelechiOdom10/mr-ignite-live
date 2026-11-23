import type { Group, IgniteEvent, Match } from "@/domain/model";
import { groupOf } from "@/domain/standings";
import { cn } from "@/lib/utils";

import { REGION_SHORT, REGION_TEXT, regionKey, regionLabel } from "./region";

export function RegionTag({
  event,
  match,
  groups,
  className,
}: {
  event: IgniteEvent | undefined;
  match?: Match;
  groups?: readonly Group[];
  className?: string;
}) {
  const { key, text } = regionLabel(
    event?.region,
    match && groups ? (groupOf(match, groups)?.title ?? null) : null,
  );

  return (
    <span
      title={event?.name}
      className={cn(
        "shrink-0 text-[0.7rem] font-semibold tracking-wide",
        REGION_TEXT[key],
        className,
      )}
    >
      {text}
    </span>
  );
}

export function RegionLead({ event }: { event: IgniteEvent }) {
  const key = regionKey(event.region);

  return (
    <>
      <span className={cn("font-semibold", REGION_TEXT[key])}>{REGION_SHORT[key]}</span>
      <span aria-hidden>·</span>
    </>
  );
}
