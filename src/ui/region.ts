export type RegionKey = "americas" | "emea" | "china" | "pacific" | "global";

export const REGION_FILTERS = [
  { value: "all", label: "All regions" },
  { value: "americas", label: "Americas" },
  { value: "emea", label: "EMEA" },
  { value: "china", label: "China" },
  { value: "pacific", label: "Pacific" },
] as const;

export type RegionFilter = (typeof REGION_FILTERS)[number]["value"];

export function regionKey(region: string | undefined): RegionKey {
  const r = (region ?? "").toLowerCase();

  if (r.startsWith("americas")) return "americas";

  if (r.startsWith("emea")) return "emea";

  if (r.startsWith("china")) return "china";

  if (r.startsWith("pacific") || r === "asia" || r === "oceania") return "pacific";

  return "global";
}

export const REGION_SHORT: Record<RegionKey, string> = {
  americas: "AMER",
  emea: "EMEA",
  china: "CN",
  pacific: "PAC",
  global: "INTL",
};

export interface RegionLabel {
  key: RegionKey;
  text: string;
}

/**
 * What a tag says: the region, or for an international event's group-stage series the group,
 * since "INTL" tells nobody which group they are looking at.
 */
export function regionLabel(
  region: string | undefined,
  groupTitle: string | null = null,
): RegionLabel {
  const key = regionKey(region);

  return { key, text: key === "global" && groupTitle ? groupTitle : REGION_SHORT[key] };
}

// Full class names so Tailwind's scanner sees each one.
export const REGION_TEXT: Record<RegionKey, string> = {
  americas: "text-region-americas",
  emea: "text-region-emea",
  china: "text-region-china",
  pacific: "text-region-pacific",
  global: "text-region-global",
};
