import { defineEnv, number, oneOf, string } from "void/env";

export default defineEnv({
  // Optional so the esports section runs without it; the players section needs it only in live mode.
  RIVALSISLAND_API_KEY: string().optional(),
  RIVALSISLAND_MODE: oneOf(["fixtures", "live"]).default("fixtures"),
  RIVALSISLAND_CREDIT_BUDGET: number().default(200),
});
