import { Link, useRouter } from "@void/react";
import { CalendarDays, Clapperboard, Search, ShieldBan, Trophy, Users, Zap } from "lucide-react";
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
import { NAV_SECTIONS, sectionOf, showsFixtureStrip, type Section } from "./sections";
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

const ICONS: Record<Section, typeof Users> = {
  matches: CalendarDays,
  events: Trophy,
  drafts: ShieldBan,
  players: Users,
  review: Clapperboard,
};

const NAV = NAV_SECTIONS.map((item) => ({ ...item, icon: ICONS[item.section] }));

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
  const section = sectionOf(path);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid h-14 max-w-7xl grid-cols-[1fr_auto] items-center lg:grid-cols-[auto_minmax(0,1fr)_auto] gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              className="flex h-11 shrink-0 items-center gap-2 font-semibold whitespace-nowrap"
            >
              <Zap className="size-5 fill-primary text-primary" aria-hidden />
              <span>Rivals Hub</span>
            </Link>
            <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
              {NAV.map(({ href, label, icon: Icon, section: target }) => {
                const active = target === section;

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    title={label}
                    className={cn(
                      "inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                      active && "text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    <span className="sr-only xl:not-sr-only">{label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="hidden min-w-0 justify-center lg:flex">
            <LiveIsland snapshot={snapshot} now={now} />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group -mx-px inline-flex h-11 items-center px-px text-sm text-muted-foreground"
            >
              <span className="inline-flex h-9 items-center gap-2 rounded-md border px-3 transition-colors group-hover:bg-accent group-hover:text-foreground">
                <Search className="size-4" aria-hidden />
                <span className="hidden xl:inline">Search</span>
                <kbd className="hidden rounded bg-muted px-1.5 font-mono text-[0.7rem] xl:inline">
                  ⌘K
                </kbd>
                <span className="sr-only xl:hidden">Search</span>
              </span>
            </button>
            <div className="hidden sm:block xl:hidden">
              <SpoilerToggle compact />
            </div>
            <div className="sm:hidden xl:block">
              <SpoilerToggle />
            </div>
          </div>
        </div>
      </header>
      {showsFixtureStrip(section) && <MatchStrip snapshot={snapshot} now={now} />}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-24 sm:px-6 sm:pb-8">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 border-t px-4 py-5 pb-24 text-xs text-muted-foreground sm:px-6 sm:pb-5">
        <SyncStatus snapshot={snapshot} connection={connection} now={now} />
        {section === "review" ? (
          <span>
            Recordings and notes stay in this browser; live scores from Liquipedia (CC BY-SA). Not
            affiliated with NetEase or Marvel.
          </span>
        ) : section === "drafts" ? (
          <span>
            Draft data from{" "}
            <a
              className="underline hover:text-foreground"
              href="https://www.mrvl.net"
              target="_blank"
              rel="noreferrer"
            >
              mrvl.net
            </a>
            ; live scores from Liquipedia (CC BY-SA). Not affiliated with NetEase or Marvel.
          </span>
        ) : section === "players" ? (
          <span>
            Player data from{" "}
            <a
              className="underline hover:text-foreground"
              href="https://rivalstracker.com"
              target="_blank"
              rel="noreferrer"
            >
              RivalsTracker
            </a>
            ; live scores from Liquipedia (CC BY-SA). Not affiliated with NetEase or Marvel.
          </span>
        ) : (
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
        )}
      </footer>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      >
        {NAV.map(({ href, label, icon: Icon, section: target }) => (
          <Link
            key={href}
            href={href}
            aria-current={target === section ? "page" : undefined}
            className={cn(
              "flex h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] text-muted-foreground",
              target === section && "text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        ))}
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
