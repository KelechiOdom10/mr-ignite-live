import { defineHandler, defineHead, type InferProps } from "void";
import { currentSnapshot } from "../src/sync";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const snapshot = await currentSnapshot();
  return { snapshot: { ...snapshot, matches: snapshot.matches.filter((m) => m.startsAt && Date.parse(m.startsAt) > Date.now() - 2 * 86_400_000) } };
});

export const head = defineHead(() => ({ title: "Events" }));
