import type { IgniteEvent } from "@/domain/model";
import { cn } from "@/lib/utils";

import { REGION_SHORT, REGION_TEXT, taggedRegion } from "./region";

export function RegionTag({
  event,
  className,
}: {
  event: IgniteEvent | undefined;
  className?: string;
}) {
  const region = taggedRegion(event?.region);

  if (!region) return null;

  return (
    <span
      title={event?.name}
      className={cn(
        "shrink-0 text-[0.7rem] font-semibold tracking-wide",
        REGION_TEXT[region],
        className,
      )}
    >
      {REGION_SHORT[region]}
    </span>
  );
}

export function RegionLead({ event }: { event: IgniteEvent }) {
  const region = taggedRegion(event.region);

  if (!region) return null;

  return (
    <>
      <span className={cn("font-semibold", REGION_TEXT[region])}>{REGION_SHORT[region]}</span>
      <span aria-hidden>·</span>
    </>
  );
}
