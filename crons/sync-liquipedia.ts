import { defineScheduled } from "void";

import { sync } from "../src/sync";

export const cron = "* * * * *";

export default defineScheduled(async () => {
  await sync();
});
