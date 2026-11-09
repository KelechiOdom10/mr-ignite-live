import { defineEnv, number, oneOf } from "void/env";

export default defineEnv({
  // Optional so the esports section runs without it. `off` shows the unavailable state; production
  // must set `live` explicitly (an unset mode behaves like `off` there, never fixtures).
  PLAYER_DATA_MODE: oneOf(["fixtures", "live", "off"]).default("fixtures"),
  PLAYER_DATA_REQUESTS_PER_DAY: number().default(300),
});
