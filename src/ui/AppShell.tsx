import { Link } from "@void/react";
import { useEffect, useRef, type ReactNode } from "react";
import { AnimatedBadge } from "@/components/motion/animated-badge";
import { AnimatedToastStack, useAnimatedToastStack } from "@/components/motion/animated-toast-stack";
import { Marquee } from "@/components/motion/marquee";
import type { Match, Snapshot } from "@/data/model";
import { matchState } from "@/data/model";
import { formatRelative, useHydrated } from "./time";
import type { Connection } from "./useLiveSnapshot";

function teamLabel(match: Match, side: 1 | 2) {
  return (side === 1 ? match.team1?.short : match.team2?.short) ?? "TBD";
}

function useScoreToasts(snapshot: Snapshot, now: number) {
  const { toasts, showToast, dismissToast } = useAnimatedToastStack({ defaultDuration: 7000, limit: 4 });
  const previous = useRef<Map<string, ReturnType<typeof matchState>> | null>(null);

  useEffect(() => {
    const next = new Map(snapshot.matches.map((m) => [m.id, matchState(m, now)]));
    const prev = previous.current;
    previous.current = next;
    if (!prev) return;
    for (const match of snapshot.matches) {
      const before = prev.get(match.id);
      const after = next.get(match.id)!;
      if (!before) continue;
      const score = `${teamLabel(match, 1)} ${after.wins1}–${after.wins2} ${teamLabel(match, 2)}`;
      if (after.winner && !before.winner) {
        showToast({ title: `${teamLabel(match, after.winner)} win the series`, description: score, status: "success" });
      } else if (after.playedMaps.length > before.playedMaps.length) {
        const map = after.playedMaps[after.playedMaps.length - 1]!;
        showToast({ title: `${teamLabel(match, map.winner as 1 | 2)} take ${map.map || `Map ${map.index}`}`, description: score, status: "info" });
      } else if (after.status === "live" && before.status === "upcoming") {
        showToast({ title: "Match is live", description: `${teamLabel(match, 1)} vs ${teamLabel(match, 2)} · ${match.round}`, status: "loading" });
      }
    }
  }, [snapshot, now, showToast]);

  return { toasts, dismissToast };
}

function SyncBadge({ snapshot, connection, now }: { snapshot: Snapshot; connection: Connection; now: number }) {
  const hydrated = useHydrated();
  const updated = snapshot.liquipediaUpdatedAt && hydrated ? `Liquipedia ${formatRelative(snapshot.liquipediaUpdatedAt, now)}` : "Liquipedia";
  return (
    <AnimatedBadge status={connection === "live" ? "success" : connection === "connecting" ? "loading" : "warning"} size="sm" contentKey={`${connection}-${updated}`}>
      {connection === "polling" ? `Polling · ${updated}` : updated}
    </AnimatedBadge>
  );
}

function ResultsTicker({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const recent = snapshot.matches
    .map((m) => ({ m, s: matchState(m, now) }))
    .filter(({ s }) => s.status !== "upcoming" && s.playedMaps.length > 0)
    .slice(-14)
    .reverse();
  if (recent.length === 0) return null;
  return (
    <div className="border-b bg-black/30">
      <Marquee speed={40} gap="2.5rem" className="mx-auto max-w-7xl py-2">
        {recent.map(({ m, s }) => (
          <Link key={m.id} href={`/match/${m.id}`} className="flex items-center gap-2 whitespace-nowrap text-xs">
            {s.status === "live" && <span className="live-dot size-1.5 rounded-full bg-live" />}
            <span className={s.winner === 1 ? "font-semibold text-win" : "text-muted-foreground"}>{teamLabel(m, 1)}</span>
            <span className="font-display text-sm font-bold tabular-nums">
              {s.wins1}–{s.wins2}
            </span>
            <span className={s.winner === 2 ? "font-semibold text-win" : "text-muted-foreground"}>{teamLabel(m, 2)}</span>
          </Link>
        ))}
      </Marquee>
    </div>
  );
}

export function AppShell({ snapshot, connection, now, children }: { snapshot: Snapshot; connection: Connection; now: number; children: ReactNode }) {
  const { toasts, dismissToast } = useScoreToasts(snapshot, now);
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="-skew-x-12 rounded-sm bg-primary px-2 py-0.5 font-display text-lg font-extrabold uppercase italic tracking-tight text-primary-foreground">Ignite</span>
            <span className="font-display text-lg font-bold uppercase tracking-wide">Live</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground">Matches</Link>
            <Link href="/events" className="hover:text-foreground">Events</Link>
            <span className="max-sm:hidden">
              <SyncBadge snapshot={snapshot} connection={connection} now={now} />
            </span>
          </nav>
        </div>
      </header>
      <ResultsTicker snapshot={snapshot} now={now} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-7xl px-4 pb-10 text-xs text-muted-foreground sm:px-6">
        Match data from{" "}
        <a className="underline hover:text-foreground" href="https://liquipedia.net/marvelrivals/" target="_blank" rel="noreferrer">
          Liquipedia
        </a>{" "}
        (CC BY-SA 3.0). Not affiliated with NetEase or Marvel.
      </footer>
      <AnimatedToastStack toasts={toasts} onDismiss={dismissToast} position="bottom-right" fixed />
    </div>
  );
}
