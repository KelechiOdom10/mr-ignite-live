import { defineHandler } from "void";

import { scopeFromQuery, scopeSnapshot } from "@/domain/scope";

import { currentSnapshot } from "../../src/sync";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "no-store");
  const snapshot = await currentSnapshot();
  return scopeSnapshot(
    snapshot,
    scopeFromQuery({
      event: c.req.query("event"),
      match: c.req.query("match"),
      view: c.req.query("view"),
    }),
    Date.now(),
  );
});
