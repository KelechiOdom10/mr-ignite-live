import { defineHandler, defineHead, type InferProps } from "void";

import { scopeSnapshot } from "../src/data/scope";
import { currentSnapshot } from "../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  return { snapshot: scopeSnapshot(await currentSnapshot(), { kind: "recent" }) };
});

export const head = defineHead(() => ({ title: "Marvel Rivals Ignite live scores" }));
