import { defineHandler, defineHead, type InferProps } from "void";

import { MatchUidSchema } from "@/domain/player";
import { toMatchDetail } from "@/rivalsisland/toDomain";

import { heroCatalogueOrEmpty, loadPlayers, shellSnapshot } from "../../src/players";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const matchUid = MatchUidSchema.safeParse(c.req.param("matchUid"));
  const snapshot = await shellSnapshot();
  if (!matchUid.success) {
    c.set("notFound", true);
    return { snapshot, match: { ok: false as const, problem: "not_found" as const } };
  }
  const match = await loadPlayers(async (data) => {
    const [{ data: res }, catalogue] = await Promise.all([
      data.get("match", { matchUid: matchUid.data }),
      heroCatalogueOrEmpty(data),
    ]);
    return toMatchDetail(res, catalogue);
  });
  if (!match.ok && match.problem === "not_found") c.set("notFound", true);
  return { snapshot, match };
});

export const head = defineHead<Props>((_c, props) => ({
  title: props.match.ok
    ? `${props.match.value.map ?? "Match"} · ${props.match.value.mode ?? ""}`
    : "Match",
}));
