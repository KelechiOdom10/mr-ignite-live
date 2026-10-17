import { defineHandler, defineHead, type InferProps } from "void";

import { scopeSnapshot } from "@/domain/scope";

import { readStats } from "../../src/store/stats";
import { currentSnapshot } from "../../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const id = c.req.param("id");
  const full = await currentSnapshot();
  const match = full.matches.find((m) => m.id === id);
  if (!match) {
    c.set("notFound", true);
    return {
      matchId: id,
      stats: null,
      snapshot: scopeSnapshot(full, { kind: "recent" }, Date.now()),
    };
  }
  return {
    matchId: match.id,
    stats: await readStats(match.id),
    snapshot: scopeSnapshot(full, { kind: "match", matchId: match.id }, Date.now()),
  };
});

export const head = defineHead<Props>((_c, props) => {
  const m = props.snapshot.matches.find((x) => x.id === props.matchId);
  if (!m) return { title: "Match not found" };
  return { title: `${m.team1?.short ?? "TBD"} vs ${m.team2?.short ?? "TBD"}` };
});
