import { HTTPException } from "hono/http-exception";
import { defineHandler, defineHead, type InferProps } from "void";

import { eventIdFromSlug, scopeSnapshot } from "@/domain/scope";

import { currentSnapshot } from "../../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const eventId = eventIdFromSlug(c.req.path.replace(/^\/event\//, ""));
  const full = await currentSnapshot();
  if (eventId === null || !full.events.some((e) => e.id === eventId))
    throw new HTTPException(404, { message: "Event not found" });
  return { eventId, snapshot: scopeSnapshot(full, { kind: "event", eventId }, Date.now()) };
});

export const head = defineHead<Props>((_c, props) => ({
  title: props.snapshot.events.find((e) => e.id === props.eventId)?.name ?? "Event",
}));
