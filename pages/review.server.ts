import { defineHandler, defineHead, type InferProps } from "void";

import { shellSnapshot } from "../src/players";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async () => ({ snapshot: await shellSnapshot() }));

export const head = defineHead(() => ({ title: "Review" }));
