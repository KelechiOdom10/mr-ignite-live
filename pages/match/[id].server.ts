import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";
import { currentSnapshot } from "../../src/sync";
import { scopeSnapshot } from "../../src/data/scope";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const id = c.req.param("id");
  const full = await currentSnapshot();
  const match = full.matches.find((m) => m.id === id);
  if (!match) throw new HTTPException(404, { message: "Match not found" });
  return {
    matchId: match.id,
    snapshot: scopeSnapshot(full, { kind: "event", eventId: match.eventId }),
  };
});

export const head = defineHead<Props>((_c, props) => {
  const m = props.snapshot.matches.find((x) => x.id === props.matchId);
  return { title: `${m?.team1?.short ?? "TBD"} vs ${m?.team2?.short ?? "TBD"}` };
});
