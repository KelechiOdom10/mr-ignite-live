import { defineHandler, defineHead, type InferProps } from "void";

import { eventOptions, teamOptions } from "@/domain/matchesOptions";
import { matchesViewFromQuery } from "@/domain/matchesView";
import { scopeSnapshot } from "@/domain/scope";

import { currentSnapshot } from "../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const snapshot = await currentSnapshot();
  const now = Date.now();

  const view = matchesViewFromQuery({
    region: c.req.query("region"),
    tab: c.req.query("tab"),
    events: c.req.query("events"),
    event: c.req.query("event"),
    team: c.req.query("team"),
    range: c.req.query("range"),
  });

  const scoped = scopeSnapshot(
    snapshot,
    { kind: "matches", eventId: view.event ?? undefined, team: view.team ?? undefined },
    now,
  );

  return {
    snapshot: scoped,
    events: eventOptions(snapshot),
    teams: teamOptions(snapshot, now),
    view,
  };
});

export const head = defineHead(() => ({ title: "Matches" }));
