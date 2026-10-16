import { defineHandler } from "void";

import { scopeFromQuery, scopeSnapshot } from "@/domain/scope";

import { currentSnapshot } from "../../src/sync";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "no-store");
  const snapshot = await currentSnapshot();
  return scopeSnapshot(snapshot, scopeFromQuery(c.req.query("event")), Date.now());
});
