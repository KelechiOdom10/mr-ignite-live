import { defineHandler, defineHead, type InferProps } from "void";

import { matchesViewFromQuery } from "@/domain/matchesView";
import { scopeSnapshot } from "@/domain/scope";

import { currentSnapshot } from "../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const tab = c.req.query("tab");

  // Home used to hold the match list and its tabs; bookmarks and the back button still point here.
  if (tab !== undefined) return c.redirect(`/matches${new URL(c.req.url).search}`, 302);

  const snapshot = await currentSnapshot();

  const view = matchesViewFromQuery({
    region: c.req.query("region"),
    events: c.req.query("events"),
  });

  return { snapshot: scopeSnapshot(snapshot, { kind: "recent" }, Date.now()), view };
});

export const head = defineHead(() => ({ title: "Marvel Rivals Ignite live scores" }));
