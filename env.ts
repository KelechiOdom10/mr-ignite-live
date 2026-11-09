import { defineEnv, number, oneOf } from "void/env";

export default defineEnv({
  PLAYER_DATA_MODE: oneOf(["fixtures", "live", "off"]).default("fixtures"),
  PLAYER_DATA_REQUESTS_PER_DAY: number().default(300),
});
