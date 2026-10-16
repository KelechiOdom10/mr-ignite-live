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
