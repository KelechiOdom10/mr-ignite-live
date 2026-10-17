import { defineHandler, defineHead, type InferProps } from "void";

import { favourites, shellSnapshot } from "../src/players";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => {
  const [snapshot, saved] = await Promise.all([shellSnapshot(), favourites.list()]);
  return { snapshot, favourites: saved };
});

export const head = defineHead(() => ({ title: "Players" }));
