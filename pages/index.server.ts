import { defineHandler, defineHead, type InferProps } from "void";

import { homeViewFromQuery } from "@/domain/homeView";
import { scopeSnapshot } from "@/domain/scope";

import { currentSnapshot } from "../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const snapshot = await currentSnapshot();

  const view = homeViewFromQuery({
    region: c.req.query("region"),
    tab: c.req.query("tab"),
    events: c.req.query("events"),
  });

  return { snapshot: scopeSnapshot(snapshot, { kind: "recent" }, Date.now()), view };
});

export const head = defineHead(() => ({ title: "Marvel Rivals Ignite live scores" }));
