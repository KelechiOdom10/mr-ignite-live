import { Link, useRouter } from "@void/react";
import { CalendarDays, Search, Trophy, Users, Zap } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/motion/animated-toast-stack";
import { matchState, type MatchState } from "@/domain/matchState";
import type { Snapshot } from "@/domain/model";
import { cn } from "@/lib/utils";

import { LiveIsland } from "./LiveIsland";
import { MatchStrip } from "./MatchStrip";
import { scoreToasts } from "./scoreToasts";
import { SearchPalette } from "./SearchPalette";
import { SpoilerToggle, useSpoilersHidden } from "./spoilers";
import { formatRelative, useHydrated } from "./time";
import type { Connection } from "./useLiveSnapshot";

function useScoreToasts(snapshot: Snapshot, now: number) {
  const hidden = useSpoilersHidden();
  const router = useRouter();
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({
    defaultDuration: 7000,
    limit: 4,
  });
  const previous = useRef<Map<string, MatchState> | null>(null);

  useEffect(() => {
    const next = new Map(snapshot.matches.map((m) => [m.id, matchState(m, now)]));
    const prev = previous.current;
    previous.current = next;
    if (!prev) return;
    for (const t of scoreToasts(snapshot.matches, prev, next, hidden, now)) {
      showToast({
        title: t.title,
        description: t.description,
        status: t.status,
        action: { label: "Open", onClick: () => void router.visit(`/match/${t.matchId}`) },
      });
    }
  }, [snapshot, now, showToast, hidden, router]);

  return { toasts, dismissToast };
}

function SyncStatus({
  snapshot,
  connection,
  now,
}: {
  snapshot: Snapshot;
  connection: Connection;
  now: number;
}) {
  const hydrated = useHydrated();
  const updated =
    hydrated && snapshot.liquipediaUpdatedAt
      ? formatRelative(snapshot.liquipediaUpdatedAt, now)
      : null;
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          connection === "live"
            ? "bg-win"
            : connection === "polling"
              ? "bg-region-emea"
              : "bg-muted-foreground",
        )}
      />
      {connection === "live"
        ? "Live updates on"
        : connection === "polling"
          ? "Checking every 45s"
          : "Connecting"}
      {updated && <span>· Liquipedia updated {updated}</span>}
    </span>
  );
}

const NAV = [
  { href: "/", label: "Matches", icon: CalendarDays },
  { href: "/events", label: "Events", icon: Trophy },
  { href: "/players", label: "Players", icon: Users },
] as const;

export function AppShell({
  snapshot,
  connection,
  now,
  children,
}: {
  snapshot: Snapshot;
  connection: Connection;
  now: number;
  children: ReactNode;
}) {
  const { toasts, dismissToast } = useScoreToasts(snapshot, now);
  const [searchOpen, setSearchOpen] = useState(false);
  const router = useRouter();
  const path = router.path;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto] items-center md:grid-cols-[1fr_auto_1fr] gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <Zap className="size-5 fill-primary text-primary" aria-hidden />
              <span>Rivals Hub</span>
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
              {NAV.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/"
                    ? path === "/" || path.startsWith("/match")
                    : path.startsWith(href.slice(0, -1));
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      active && "text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="hidden justify-center md:flex">
            <LiveIsland snapshot={snapshot} now={now} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Search className="size-4" aria-hidden />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden rounded bg-muted px-1.5 font-mono text-[0.7rem] lg:inline">
                ⌘K
              </kbd>
              <span className="sr-only lg:hidden">Search</span>
            </button>
            <div className="hidden sm:block">
              <SpoilerToggle />
            </div>
          </div>
        </div>
      </header>
      <MatchStrip snapshot={snapshot} now={now} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:pb-8">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-t px-4 py-5 pb-24 text-xs text-muted-foreground sm:px-6 sm:pb-5">
        <SyncStatus snapshot={snapshot} connection={connection} now={now} />
        <span>
          Data from{" "}
          <a
            className="underline hover:text-foreground"
            href="https://liquipedia.net/marvelrivals/"
            target="_blank"
            rel="noreferrer"
          >
            Liquipedia
          </a>{" "}
          (CC BY-SA). Not affiliated with NetEase or Marvel.
        </span>
      </footer>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] text-muted-foreground"
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
        <div className="flex h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] text-muted-foreground">
          <SpoilerToggle compact />
          Spoilers
        </div>
      </nav>
      <SearchPalette snapshot={snapshot} now={now} open={searchOpen} onOpenChange={setSearchOpen} />
      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        position="bottom-right"
        fixed
        className="bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)] sm:bottom-6"
      />
    </div>
  );
}
