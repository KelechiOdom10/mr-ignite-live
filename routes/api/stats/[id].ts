import { defineHandler } from "void";

import { readStats } from "../../../src/sync";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "no-store");
  const id = c.req.param("id");
  return { stats: id ? await readStats(id) : null };
});
