import type { ComponentProps } from "react";

import { TabsTrigger } from "@/components/motion/tabs";
import { cn } from "@/lib/utils";

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
