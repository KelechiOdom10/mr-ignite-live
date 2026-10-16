import { useRouter } from "@void/react";
import { CalendarDays, Swords, Trophy } from "lucide-react";
import { useMemo } from "react";

import { CommandPalette, type CommandItem } from "@/components/motion/command-palette";
import { matchState } from "@/domain/matchState";
import type { Snapshot } from "@/domain/model";
import { eventSlug } from "@/domain/scope";

import { formatDay } from "./time";

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
        return {
          id: `match:${m.id}`,
          label: `${m.team1?.name} vs ${m.team2?.name}`,
          group: status === "live" ? "Live" : status === "upcoming" ? "Upcoming" : "Results",
          hint: m.startsAt ? formatDay(m.startsAt, now) : m.round,
          icon: status === "upcoming" ? CalendarDays : Swords,
          keywords: [m.team1?.short ?? "", m.team2?.short ?? "", m.round],
          onSelect: () => void router.visit(`/match/${m.id}`),
        };
      });
    return [...matches, ...events];
  }, [snapshot, now, router]);

  return (
    <CommandPalette
      items={items}
      open={open}
      onOpenChange={onOpenChange}
      placeholder="Search teams, matches and events"
      emptyMessage="No team, match or event matches that"
    />
  );
}
