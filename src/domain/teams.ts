const SHORT_NAMES: Record<string, string> = {
  "100 Thieves": "100T",
  "Liquid Citadel": "TLC",
  "Team Liquid": "TL",
  "Spacestation Gaming": "SSG",
  "Swamp Gaming": "SG",
  "NRG Shock": "NRG",
  FlyQuest: "FLY",
  Dreamland: "DL",
  "Yeah We Lost": "YWL",
  Sentinels: "SEN",
  "Equinox Gaming": "EQX",
  "Straw Hats": "SH",
  TSM: "TSM",
  "Natus Vincere": "NAVI",
  "Team Vitality": "VIT",
  "Virtus.pro": "VP",
  "Rad Esports": "RAD",
  Shikigami: "SHIKI",
  "Twisted Minds": "TM",
  "Team Heretics": "TH",
  "Pulsar Esports": "PLSR",
  Everlast: "EVL",
  Dynasty: "DYN",
  "Team Nemesis": "NMS",
  "Crazy Raccoon": "CR",
  "Gen.G Esports": "GEN",
  "ZERO.PERCENT": "ZP",
  "Ex Oblivione": "EXO",
  "Kinship Gaming": "KIN",
};

export function teamShortName(name: string): string {
  const known = SHORT_NAMES[name];
  if (known) return known;
  const words = name
    .replace(/\b(Esports|Gaming|Team|Club)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const [only] = words;
  if (words.length === 1 && only) return only.slice(0, 5).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
}

export function teamHue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
