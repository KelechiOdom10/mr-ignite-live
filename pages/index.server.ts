import { defineHandler, defineHead, type InferProps } from "void";
import { currentSnapshot } from "../src/sync";
import { scopeSnapshot } from "../src/data/scope";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  return { snapshot: scopeSnapshot(await currentSnapshot(), { kind: "recent" }) };
});

export const head = defineHead(() => ({ title: "Marvel Rivals Ignite live scores" }));
