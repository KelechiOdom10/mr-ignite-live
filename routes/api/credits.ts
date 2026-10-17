import { defineHandler } from "void";

import { players, rivalsIslandMode } from "../../src/players";

export const GET = defineHandler(async (c) => {
  c.header("Cache-Control", "no-store");
  const data = await players();
  return { mode: rivalsIslandMode(), ...(await data.credits()) };
});
