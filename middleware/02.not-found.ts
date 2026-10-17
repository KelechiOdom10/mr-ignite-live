import { defineMiddleware } from "void";

declare module "void" {
  interface CloudContextVariables {
    notFound: boolean;
  }
}

// Void renders every page response with status 200, so a loader that found nothing sets
// `notFound` and the status is rewritten here once the page has rendered.
export default defineMiddleware(async (c, next) => {
  await next();
  if (c.get("notFound")) {
    c.res = new Response(c.res.body, { status: 404, headers: c.res.headers });
  }
});
