import { UidSchema, type Freshness, type Leaderboard, type Uid } from "@/domain/player";

import type { ResponseOf } from "./endpoints";

/** A response uid we can link to, or null for bots and hidden players. */
export function linkableUid(uid: string): Uid | null {
  const parsed = UidSchema.safeParse(uid);
  return parsed.success ? parsed.data : null;
}

export function toLeaderboard(res: ResponseOf<"leaderboard">, freshness: Freshness): Leaderboard {
  return {
    season: res.season.number,
    device: res.device_type,
    rows: res.entries.flatMap((e) => {
      const uid = linkableUid(e.player.uid);
      if (!uid) return [];
      return [
        {
          position: e.position,
          uid,
          name: e.player.name ?? "Hidden name",
          iconUrl: e.player.head_icon,
          rank: { name: e.rank.rank, level: e.rank.rank_level, score: e.rank.rs },
          matches: e.matches,
          winRate: e.win_rate,
          lastPlayedAt: e.last_played_at,
        },
      ];
    }),
    freshness,
  };
}
