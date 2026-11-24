import type { Hero } from "./stats";

export const UNKNOWN_HERO_NAME = "New hero";

export interface RosterHero {
  id: string;
  name: string;
  role: NonNullable<Hero["role"]>;
  gameId: number;
}

/**
 * Every playable hero, from RivalsIsland's catalogue recorded 2026-10-17, named and keyed the way
 * mrvl.net scoreboards are so cached portraits line up. Ids for heroes mrvl hasn't shown yet are
 * slugs of the name.
 */
export const HERO_ROSTER: readonly RosterHero[] = [
  { id: "adam-warlock", name: "Adam Warlock", role: "Strategist", gameId: 1046 },
  { id: "angela", name: "Angela", role: "Vanguard", gameId: 1056 },
  { id: "black-cat", name: "Black Cat", role: "Duelist", gameId: 1061 },
  { id: "black-panther", name: "Black Panther", role: "Duelist", gameId: 1026 },
  { id: "black-widow", name: "Black Widow", role: "Duelist", gameId: 1033 },
  { id: "blade", name: "Blade", role: "Duelist", gameId: 1044 },
  { id: "captain-america", name: "Captain America", role: "Vanguard", gameId: 1022 },
  { id: "cloak-and-dagger", name: "Cloak & Dagger", role: "Strategist", gameId: 1025 },
  { id: "cyclops", name: "Cyclops", role: "Duelist", gameId: 1063 },
  { id: "daredevil", name: "Daredevil", role: "Duelist", gameId: 1055 },
  { id: "deadpool-duelist", name: "Deadpool (Duelist)", role: "Duelist", gameId: 10572 },
  { id: "deadpool-strategist", name: "Deadpool (Strategist)", role: "Strategist", gameId: 10573 },
  { id: "deadpool-vanguard", name: "Deadpool (Vanguard)", role: "Vanguard", gameId: 10571 },
  { id: "devil-dinosaur", name: "Devil Dinosaur", role: "Vanguard", gameId: 1062 },
  { id: "doctor-strange", name: "Doctor Strange", role: "Vanguard", gameId: 1018 },
  { id: "elsa-bloodstone", name: "Elsa Bloodstone", role: "Duelist", gameId: 1059 },
  { id: "emma-frost", name: "Emma Frost", role: "Vanguard", gameId: 1053 },
  { id: "gambit", name: "Gambit", role: "Strategist", gameId: 1058 },
  { id: "gorr", name: "Gorr", role: "Duelist", gameId: 1067 },
  { id: "groot", name: "Groot", role: "Vanguard", gameId: 1027 },
  { id: "hawkeye", name: "Hawkeye", role: "Duelist", gameId: 1021 },
  { id: "hela", name: "Hela", role: "Duelist", gameId: 1024 },
  { id: "hulk", name: "Hulk", role: "Vanguard", gameId: 1011 },
  { id: "human-torch", name: "Human Torch", role: "Duelist", gameId: 1017 },
  { id: "invisible-woman", name: "Invisible Woman", role: "Strategist", gameId: 1050 },
  { id: "iron-fist", name: "Iron Fist", role: "Duelist", gameId: 1052 },
  { id: "iron-man", name: "Iron Man", role: "Duelist", gameId: 1034 },
  { id: "jeff-the-land-shark", name: "Jeff the Land Shark", role: "Strategist", gameId: 1047 },
  { id: "jubilee", name: "Jubilee", role: "Strategist", gameId: 1064 },
  { id: "loki", name: "Loki", role: "Strategist", gameId: 1016 },
  { id: "luna-snow", name: "Luna Snow", role: "Strategist", gameId: 1031 },
  { id: "magik", name: "Magik", role: "Duelist", gameId: 1029 },
  { id: "magneto", name: "Magneto", role: "Vanguard", gameId: 1037 },
  { id: "mantis", name: "Mantis", role: "Strategist", gameId: 1020 },
  { id: "mister-fantastic", name: "Mister Fantastic", role: "Duelist", gameId: 1040 },
  { id: "moon-knight", name: "Moon Knight", role: "Duelist", gameId: 1030 },
  { id: "namor", name: "Namor", role: "Duelist", gameId: 1045 },
  { id: "nightcrawler", name: "Nightcrawler", role: "Strategist", gameId: 1068 },
  { id: "peni-parker", name: "Peni Parker", role: "Vanguard", gameId: 1042 },
  { id: "phoenix", name: "Phoenix", role: "Duelist", gameId: 1054 },
  { id: "psylocke", name: "Psylocke", role: "Duelist", gameId: 1048 },
  { id: "rocket-raccoon", name: "Rocket Raccoon", role: "Strategist", gameId: 1023 },
  { id: "rogue", name: "Rogue", role: "Vanguard", gameId: 1065 },
  { id: "scarlet-witch", name: "Scarlet Witch", role: "Duelist", gameId: 1038 },
  { id: "spider-man", name: "Spider-Man", role: "Duelist", gameId: 1036 },
  { id: "squirrel-girl", name: "Squirrel Girl", role: "Duelist", gameId: 1032 },
  { id: "star-lord", name: "Star-Lord", role: "Duelist", gameId: 1043 },
  { id: "storm", name: "Storm", role: "Duelist", gameId: 1015 },
  { id: "the-hood", name: "The Hood", role: "Vanguard", gameId: 1066 },
  { id: "the-punisher", name: "The Punisher", role: "Duelist", gameId: 1014 },
  { id: "the-thing", name: "The Thing", role: "Vanguard", gameId: 1051 },
  { id: "thor", name: "Thor", role: "Vanguard", gameId: 1039 },
  { id: "ultron", name: "Ultron", role: "Strategist", gameId: 1028 },
  { id: "venom", name: "Venom", role: "Vanguard", gameId: 1035 },
  { id: "white-fox", name: "White Fox", role: "Strategist", gameId: 1060 },
  { id: "winter-soldier", name: "Winter Soldier", role: "Duelist", gameId: 1041 },
  { id: "wolverine", name: "Wolverine", role: "Duelist", gameId: 1049 },
];

/** Fallback icons for heroes mrvl hasn't shown yet; mrvl's own art wins when it has it. */
export const ROSTER_ICONS: ReadonlyMap<string, string> = new Map([
  ["adam-warlock", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1046001.png"],
  ["angela", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1056001.png"],
  ["black-cat", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1061001.png"],
  [
    "black-panther",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1026001.png",
  ],
  ["black-widow", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1033001.png"],
  ["blade", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1044001.png"],
  [
    "captain-america",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1022001.png",
  ],
  [
    "cloak-and-dagger",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1025001.png",
  ],
  ["cyclops", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1063001.png"],
  ["daredevil", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1055001.png"],
  [
    "deadpool-duelist",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1057001.png",
  ],
  [
    "deadpool-strategist",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1057001.png",
  ],
  [
    "deadpool-vanguard",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1057001.png",
  ],
  [
    "devil-dinosaur",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1062001.png",
  ],
  [
    "doctor-strange",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1018001.png",
  ],
  [
    "elsa-bloodstone",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1059001.png",
  ],
  ["emma-frost", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1053001.png"],
  ["gambit", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1058001.png"],
  ["gorr", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1067001.png"],
  ["groot", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1027001.png"],
  ["hawkeye", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1021001.png"],
  ["hela", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1024001.png"],
  ["hulk", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1011001.png"],
  ["human-torch", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1017001.png"],
  [
    "invisible-woman",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1050001.png",
  ],
  ["iron-fist", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1052001.png"],
  ["iron-man", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1034001.png"],
  [
    "jeff-the-land-shark",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1047001.png",
  ],
  ["jubilee", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1064001.png"],
  ["loki", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1016001.png"],
  ["luna-snow", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1031001.png"],
  ["magik", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1029001.png"],
  ["magneto", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1037001.png"],
  ["mantis", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1020001.png"],
  [
    "mister-fantastic",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1040001.png",
  ],
  ["moon-knight", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1030001.png"],
  ["namor", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1045001.png"],
  ["nightcrawler", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1068001.png"],
  ["peni-parker", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1042001.png"],
  ["phoenix", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1054001.png"],
  ["psylocke", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1048001.png"],
  [
    "rocket-raccoon",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1023001.png",
  ],
  ["rogue", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1065001.png"],
  [
    "scarlet-witch",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1038001.png",
  ],
  ["spider-man", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1036001.png"],
  [
    "squirrel-girl",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1032001.png",
  ],
  ["star-lord", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1043001.png"],
  ["storm", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1015001.png"],
  ["the-hood", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1066001.png"],
  ["the-punisher", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1014001.png"],
  ["the-thing", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1051001.png"],
  ["thor", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1039001.png"],
  ["ultron", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1028001.png"],
  ["venom", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1035001.png"],
  ["white-fox", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1060001.png"],
  [
    "winter-soldier",
    "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1041001.png",
  ],
  ["wolverine", "https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_1049001.png"],
]);

const ROSTER_BY_GAME_ID: ReadonlyMap<number, RosterHero> = new Map(
  HERO_ROSTER.map((hero) => [hero.gameId, hero]),
);

const PLACEHOLDER_ID = /^hero-(\d+)$/;

/** mrvl sends "hero-0", with no portrait, for a ban its feed didn't capture; it is no hero at all. */
export function isUnrecordedHero(hero: { id: string }): boolean {
  return hero.id === "hero-0";
}

/**
 * mrvl sends `{ id: "hero-1068", name: "Hero 1068", role: "Duelist" }` with no portrait for a hero
 * it hasn't catalogued yet, and our stored copy of a finished series keeps it.
 */
export function resolveHero(raw: Hero): Hero {
  const gameId = PLACEHOLDER_ID.exec(raw.id)?.[1];

  if (gameId === undefined) return raw;
  const known = ROSTER_BY_GAME_ID.get(Number(gameId));

  if (known) {
    return {
      id: known.id,
      name: known.name,
      role: known.role,
      portraitUrl: ROSTER_ICONS.get(known.id) ?? null,
    };
  }

  return { id: raw.id, name: UNKNOWN_HERO_NAME, role: null, portraitUrl: null, unknown: true };
}
