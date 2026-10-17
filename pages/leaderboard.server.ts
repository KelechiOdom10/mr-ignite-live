import { defineHandler, defineHead, type InferProps } from "void";

import { DeviceSchema } from "@/domain/player";
import { toLeaderboard } from "@/rivalsisland/toDomain";

import { loadPlayers, shellSnapshot } from "../src/players";

export type Props = InferProps<typeof loader>;

export const loader = defineHandler(async (c) => {
  const device = DeviceSchema.catch("pc").parse(c.req.query("device"));
  const [snapshot, leaderboard] = await Promise.all([
    shellSnapshot(),
    loadPlayers(async (data) => {
      const { data: res, fetchedAt, stale } = await data.get("leaderboard", { device });
      return toLeaderboard(res, { fetchedAt, stale });
    }),
  ]);
  return { snapshot, device, leaderboard };
});

export const head = defineHead(() => ({ title: "Leaderboard" }));
