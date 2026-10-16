import { defineHandler } from "void";

import { scopeFromQuery, scopeSnapshot } from "../../src/data/scope";
import { currentSnapshot } from "../../src/sync";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "no-store");
  return scopeSnapshot(await currentSnapshot(), scopeFromQuery(c.req.query("event")));
});
