import { useRouter } from "@void/react";
import { CalendarDays, ListOrdered, Swords, Trophy, UserRound, UserSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { matchState } from "@/domain/matchState";
import { matchView } from "@/domain/matchView";
import type { Snapshot } from "@/domain/model";
import { searchableName } from "@/domain/player";
import { eventSlug } from "@/domain/scope";

import { useRecentPlayers } from "./players/recentPlayers";
import { useSpoilersHidden } from "./spoilers";
import { formatDay } from "./time";

const PLACEHOLDER = "Search teams, matches, events and players";

/**
 * The vendored palette keeps its query to itself; this reads what's typed into our palette's
 * field so a player's name can be offered as a lookup. Cleared on close, as the palette's is.
 */
function usePaletteQuery(open: boolean) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!open) return;
    const onInput = (e: Event) => {
      const field = e.target;
      if (field instanceof HTMLInputElement && field.placeholder === PLACEHOLDER) {
        setQuery(field.value);
      }
    };
    document.addEventListener("input", onInput, true);
    return () => document.removeEventListener("input", onInput, true);
  }, [open]);
  return { query: open ? query : "", clear: () => setQuery("") };
}

export function SearchPalette({
  snapshot,
  now,
  open,
  onOpenChange,
}: {
  snapshot: Snapshot;
  now: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const hidden = useSpoilersHidden();
  const recent = useRecentPlayers();
  const palette = usePaletteQuery(open);
  const lookup = searchableName(palette.query);
  const items = useMemo<CommandItem[]>(() => {
    const events: CommandItem[] = snapshot.events.map((e) => ({
      id: `event:${e.id}`,
      label: e.name,
      group: "Events",
      hint: e.region,
      icon: Trophy,
      keywords: [e.ticker, e.region],
      onSelect: () => void router.visit(`/event/${eventSlug(e.id)}`),
    }));
    const rank = { live: 0, upcoming: 1, finished: 2 } as const;
    const bracket = { matches: snapshot.matches, now };
    const matches: CommandItem[] = snapshot.matches
      .filter((m) => m.team1 && m.team2)
      .map((m) => ({ m, status: matchState(m, now).status }))
      .toSorted((a, b) => {
        const byStatus = rank[a.status] - rank[b.status];
        if (byStatus !== 0) return byStatus;
        const order = (a.m.startsAt ?? "").localeCompare(b.m.startsAt ?? "");
        return a.status === "finished" ? -order : order;
      })
      .map(({ m, status }) => {
        const { side1, side2 } = matchView(m, matchState(m, now), hidden, bracket);
        return {
          id: `match:${m.id}`,
          label: `${side1.name} vs ${side2.name}`,
          group: status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Results",
          hint: m.startsAt ? formatDay(m.startsAt, now) : m.round,
          icon: status === "upcoming" ? CalendarDays : Swords,
          keywords: [side1.team?.short ?? "", side2.team?.short ?? "", m.round],
          onSelect: () => void router.visit(`/match/${m.id}`),
        };
      });
    const players: CommandItem[] = [
      ...recent.map((p) => ({
        id: `player:${p.uid}`,
        label: p.name,
        group: "Players",
        hint: "Recently viewed",
        icon: UserRound,
        keywords: [p.uid],
        onSelect: () => void router.visit(`/player/${p.uid}`),
      })),
      ...(lookup
        ? [
            {
              id: "players:lookup",
              label: `Search ranked players for “${lookup}”`,
              group: "Players",
              hint: "Exact in-game name",
              icon: UserSearch,
              onSelect: () =>
                void router.visit(`/players?name=${encodeURIComponent(lookup)}&focus=name`),
            },
          ]
        : []),
      {
        id: "players:find",
        label: "Find a player by name",
        group: "Players",
        hint: "Ranked profile",
        icon: UserSearch,
        keywords: ["player", "search", "profile", "ranked", "uid"],
        onSelect: () => void router.visit("/players?focus=name"),
      },
      {
        id: "players:leaderboard",
        label: "Leaderboard",
        group: "Players",
        hint: "Top ranked",
        icon: ListOrdered,
        keywords: ["ranked", "top", "players"],
        onSelect: () => void router.visit("/leaderboard"),
      },
    ];
    return [...matches, ...players, ...events];
  }, [snapshot, now, router, hidden, recent, lookup]);

  return (
    <CommandPalette
      items={items}
      open={open}
      onOpenChange={(next) => {
        if (!next) palette.clear();
        onOpenChange(next);
      }}
      placeholder={PLACEHOLDER}
      emptyMessage="No team, match, event or player matches that"
    />
  );
}
