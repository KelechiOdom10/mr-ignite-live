import { defineLiveStream } from "void/live";

export const SCORES_TOPIC = "scores";

export const live = defineLiveStream({
  id: "scores",
  allowAnonymousControl: true,
  onSubscribe(ctx) {
    if (ctx.topic !== SCORES_TOPIC) return new Response("Forbidden", { status: 403 });
  },
});
