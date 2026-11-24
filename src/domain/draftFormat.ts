import { z } from "zod";

import { type DraftFormat, IGNITE_2026, RANKED_SEASON_10_OBSERVED } from "./draft";

export const SIM_FORMAT_IDS = ["ignite-2026", "ranked"] as const;

export type SimFormatId = (typeof SIM_FORMAT_IDS)[number];

export const SIM_FORMATS: Record<SimFormatId, DraftFormat> = {
  "ignite-2026": IGNITE_2026,
  ranked: RANKED_SEASON_10_OBSERVED,
};

const SimFormatQuery = z.enum(SIM_FORMAT_IDS).catch("ignite-2026");

export function parseSimFormatId(value: string | null | undefined): SimFormatId {
  return SimFormatQuery.parse(value);
}
