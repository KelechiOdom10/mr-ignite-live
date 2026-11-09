import { defineHandler } from "void";

import { playerDataMode, players } from "../../src/players";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "no-store");
  const data = await players();

  return { mode: playerDataMode(), ...(await data.usage()) };
});
