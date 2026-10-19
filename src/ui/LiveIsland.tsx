import { Link } from "@void/react";
import { useEffect, useState, type FocusEvent } from "react";

import { DynamicIsland, DynamicIslandView } from "@/components/motion/dynamic-island";
import { matchState } from "@/domain/matchState";
import type { Match, Snapshot } from "@/domain/model";

import { useMatchView } from "./spoilers";
import { LiveDot } from "./StatusLabel";
import { TeamLogo } from "./TeamMark";

const ROTATE_MS = 5_000;

function IslandMatch({
  match,
  snapshot,
  now,
  position,
}: {
  match: Match;
  snapshot: Snapshot;
  now: number;
  position: string | null;
}) {
  const { side1, side2, summary } = useMatchView(match, now, snapshot.matches);

  return (
    <Link
      href={`/match/${match.id}`}
      aria-label={summary}
      className="flex h-9 items-center gap-2.5 px-4 text-xs font-medium whitespace-nowrap"
    >
      <LiveDot />
      <TeamLogo
        team={side1.team}
        info={side1.team ? snapshot.teams[side1.team.name] : undefined}
        size={16}
      />
      <span>{side1.short}</span>
      <span className="font-mono tabular-nums">
        {side1.score === null || side2.score === null ? "vs" : `${side1.score}–${side2.score}`}
      </span>
      <span>{side2.short}</span>
      <TeamLogo
        team={side2.team}
        info={side2.team ? snapshot.teams[side2.team.name] : undefined}
        size={16}
      />
      {position && <span className="text-muted-foreground">{position}</span>}
    </Link>
  );
}

export function LiveIsland({ snapshot, now }: { snapshot: Snapshot; now: number }) {
  const live = snapshot.matches.filter((m) => matchState(m, now).status === "live");
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const current = live.length > 0 ? live[index % live.length] : undefined;
  const paused = hovered || (current !== undefined && focusedId === current.id);

  useEffect(() => {
    if (live.length < 2 || paused) return;
    const timer = setInterval(() => setIndex((i) => i + 1), ROTATE_MS);

    return () => clearInterval(timer);
  }, [live.length, paused]);

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setFocusedId(null);
  };

  if (!current) return null;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusedId(current.id)}
      onBlur={onBlur}
    >
      <DynamicIsland
        view={current.id}
        className="bg-black text-foreground ring-1 ring-border-strong"
      >
        {live.map((m) => (
          <DynamicIslandView key={m.id} id={m.id} className="p-0">
            <div aria-live="off">
              <IslandMatch
                match={m}
                snapshot={snapshot}
                now={now}
                position={live.length > 1 ? `${(index % live.length) + 1}/${live.length}` : null}
              />
            </div>
          </DynamicIslandView>
        ))}
      </DynamicIsland>
    </div>
  );
}
