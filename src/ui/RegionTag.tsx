import type { IgniteEvent } from "@/domain/model";
import { cn } from "@/lib/utils";

import { REGION_SHORT, REGION_TEXT, regionKey } from "./region";

export function RegionTag({
  event,
  className,
}: {
  event: IgniteEvent | undefined;
  className?: string;
}) {
  const region = regionKey(event?.region);
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
