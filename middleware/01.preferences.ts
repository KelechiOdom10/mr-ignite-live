import { defineMiddleware } from "void";

import { spoilersHiddenIn } from "../src/ui/spoilerCookie";

declare module "void" {
  interface CloudContextVariables {
    shared: { spoilersHidden: boolean };
  }
}

export default defineMiddleware(async (c, next) => {
  c.set("shared", { spoilersHidden: spoilersHiddenIn(c.req.header("Cookie")) });
  await next();
});
