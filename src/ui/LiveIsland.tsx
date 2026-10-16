import { Link } from "@void/react";
import { useEffect, useState } from "react";

import { DynamicIsland, DynamicIslandView } from "@/components/motion/dynamic-island";
import { matchState } from "@/domain/matchState";
import type { Snapshot } from "@/domain/model";

import { useSpoilersHidden } from "./spoilers";
import { LiveDot } from "./StatusLabel";
import { TeamLogo } from "./TeamMark";

const ROTATE_MS = 5_000;

export function LiveIsland({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const hidden = useSpoilersHidden();
  const live = snapshot.matches.filter((m) => matchState(m, now).status === "live");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (live.length < 2) return;
    const timer = setInterval(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => clearInterval(timer);
  }, [live.length]);

  if (live.length === 0) return null;
  const current = live[index % live.length];
  if (!current) return null;

  return (
    <DynamicIsland view={current.id} className="bg-black text-foreground ring-1 ring-border-strong">
      {live.map((m) => {
        const s = matchState(m, now);
        return (
          <DynamicIslandView key={m.id} id={m.id} className="p-0">
            <Link
              href={`/match/${m.id}`}
              className="flex h-9 items-center gap-2.5 px-4 text-xs font-medium whitespace-nowrap"
            >
              <LiveDot />
              <TeamLogo
                team={m.team1}
                info={m.team1 ? snapshot.teams[m.team1.name] : undefined}
                size={16}
              />
              <span>{m.team1?.short}</span>
              <span className="font-mono tabular-nums">
                {hidden ? "vs" : `${s.wins1}–${s.wins2}`}
              </span>
              <span>{m.team2?.short}</span>
              <TeamLogo
                team={m.team2}
                info={m.team2 ? snapshot.teams[m.team2.name] : undefined}
                size={16}
              />
              {live.length > 1 && (
                <span className="text-muted-foreground">
                  {(index % live.length) + 1}/{live.length}
                </span>
              )}
            </Link>
          </DynamicIslandView>
        );
      })}
    </DynamicIsland>
  );
}
