import { defineHandler, defineHead, type InferProps } from "void";

import { scopeSnapshot } from "@/domain/scope";

import { favourites } from "../src/players";
import { currentSnapshot } from "../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const [snapshot, saved] = await Promise.all([currentSnapshot(), favourites.list()]);
  return {
    snapshot: scopeSnapshot(snapshot, { kind: "events" }, Date.now()),
    favourites: saved,
  };
});

export const head = defineHead(() => ({ title: "Players" }));
