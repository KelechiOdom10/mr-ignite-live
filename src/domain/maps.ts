export type GameMode = "Domination" | "Convoy" | "Convergence";

interface MapInfo {
  mode: GameMode;
  image: string;
}

const MRVL_IMAGES = "https://www.mrvl.net/images/maps/";

// Image file names come from mrvl's map catalogue and aren't derivable from the map name.
const MAPS: Record<string, MapInfo> = {
  "hall of djalia": { mode: "Convergence", image: "hall-of-djalia.webp" },
  "symbiotic surface": { mode: "Convergence", image: "symbiotic-surface.webp" },
  "shin shibuya": { mode: "Convergence", image: "shin-shibuya.webp" },
  "central park": { mode: "Convergence", image: "central-park.webp" },
  "heart of heaven": { mode: "Convergence", image: "heart-of-heaven.webp" },
  "lower manhattan": { mode: "Convergence", image: "lower-manhattan.webp" },
  "celestial husk": { mode: "Domination", image: "celestial-husk.webp" },
  "god quarry": { mode: "Domination", image: "god-quarry.png" },
  "hells heaven": { mode: "Domination", image: "hells-haven.webp" },
  "birnin tchalla": { mode: "Domination", image: "birnin-tchalla.webp" },
  "royal palace": { mode: "Domination", image: "royal-palace.webp" },
  krakoa: { mode: "Domination", image: "karoka.webp" },
  thebes: { mode: "Convoy", image: "thebes.png" },
  "yggdrasill path": { mode: "Convoy", image: "yggdrasil-path.webp" },
  "yggdrasil path": { mode: "Convoy", image: "yggdrasil-path.webp" },
  "spider islands": { mode: "Convoy", image: "spider-islands.webp" },
  midtown: { mode: "Convoy", image: "midtown.webp" },
  arakko: { mode: "Convoy", image: "arakko.webp" },
  "museum of contemplation": { mode: "Convoy", image: "museum-of-contemplation.webp" },
};

function key(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function mapInfo(name: string): { mode: GameMode; imageUrl: string } | null {
  const info = MAPS[key(name)];
  return info ? { mode: info.mode, imageUrl: MRVL_IMAGES + info.image } : null;
}

/**
 * The known map a name refers to, matched on whole words so long forms ("Yggsgard: Yggdrasill
 * Path") resolve too. Null for placeholders like "tbd" or "Map 3".
 */
function knownMap(name: string): MapInfo | null {
  const words = ` ${key(name)} `;
  let best: { length: number; info: MapInfo } | null = null;
  for (const [k, info] of Object.entries(MAPS)) {
    if (words.includes(` ${k} `) && (!best || k.length > best.length)) {
      best = { length: k.length, info };
    }
  }
  return best?.info ?? null;
}

export interface MapNameConflict {
  index: number;
  liquipedia: string;
  mrvl: string;
}

/**
 * Map slots where Liquipedia and mrvl name two different known maps. Neither source is treated as
 * right: the page shows both names and says they disagree. A name we can't place is no evidence
 * of disagreement, so it isn't flagged.
 */
export function mapNameConflicts(
  liquipedia: readonly { index: number; map: string }[],
  mrvl: readonly { index: number; map: string }[],
): MapNameConflict[] {
  return liquipedia.flatMap((slot) => {
    const other = mrvl.find((m) => m.index === slot.index);
    if (!other) return [];
    const [ours, theirs] = [knownMap(slot.map), knownMap(other.map)];
    if (!ours || !theirs || ours.image === theirs.image) return [];
    return [{ index: slot.index, liquipedia: slot.map, mrvl: other.map }];
  });
}
