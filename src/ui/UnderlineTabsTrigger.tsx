import type { ComponentProps } from "react";

import { TabsTrigger } from "@/components/motion/tabs";
import { cn } from "@/lib/utils";

/**
 * beUI's underline trigger has no focus style of its own, and the browser's outline is clipped by
 * the scrolling row it sits in, so this draws one inside the trigger.
 */
export function UnderlineTabsTrigger({ className, ...props }: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        "rounded-md whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        className,
      )}
      {...props}
    />
  );
}
