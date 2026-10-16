import { defineHandler } from "void";
import { currentSnapshot } from "../../src/sync";
import { scopeFromQuery, scopeSnapshot } from "../../src/data/scope";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "no-store");
  return scopeSnapshot(await currentSnapshot(), scopeFromQuery(c.req.query("event")));
});
