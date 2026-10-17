import { Link } from "@void/react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/players", label: "Search & favourites" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

export function PlayersTabs({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav aria-label="Players" className="flex gap-1 border-b">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={t.href === current ? "page" : undefined}
          className={cn(
            "-mb-px border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
            t.href === current && "border-primary text-foreground",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
