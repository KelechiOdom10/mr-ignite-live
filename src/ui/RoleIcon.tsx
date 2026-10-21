import { LayoutGrid } from "lucide-react";

import type { HeroRole } from "@/domain/player";
import { cn } from "@/lib/utils";

import { proxiedImage } from "./images";

// The in-game role glyphs, white on transparent, from Liquipedia Commons.
const ROLE_ICONS = new Map<HeroRole, string>([
  [
    "Vanguard",
    "https://liquipedia.net/commons/images/8/85/Marvel_Rivals_gameasset_icon_Vanguard_darkmode.png",
  ],
  [
    "Duelist",
    "https://liquipedia.net/commons/images/c/cb/Marvel_Rivals_gameasset_icon_Duelist_darkmode.png",
  ],
  [
    "Strategist",
    "https://liquipedia.net/commons/images/1/1d/Marvel_Rivals_gameasset_icon_Strategist_darkmode.png",
  ],
]);

/**
 * A role's glyph in the current text colour: the image is a mask, so it follows hover and pressed
 * states like the label next to it. "All" has no in-game glyph, so it gets a grid.
 */
export function RoleIcon({ role, className }: { role: HeroRole | "All"; className?: string }) {
  const src = role === "All" ? undefined : proxiedImage(ROLE_ICONS.get(role));

  if (!src) return <LayoutGrid aria-hidden="true" className={cn("size-3.5", className)} />;

  return (
    <span
      aria-hidden="true"
      style={{ maskImage: `url("${src}")` }}
      className={cn(
        "inline-block h-3.5 w-4 bg-current mask-contain mask-center mask-no-repeat",
        className,
      )}
    />
  );
}
