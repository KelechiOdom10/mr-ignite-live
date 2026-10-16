import { defineHandler, defineHead, type InferProps } from "void";

import { scopeSnapshot } from "@/domain/scope";

import { currentSnapshot } from "../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const snapshot = await currentSnapshot();
  return { snapshot: scopeSnapshot(snapshot, { kind: "events" }, Date.now()) };
});

export const head = defineHead(() => ({ title: "Events" }));
