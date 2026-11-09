import { heroDisplayName } from "@/domain/heroes";
import { HeroRoleSchema, type Hero } from "@/domain/player";

/**
 * The 56 heroes we know by numeric id, named and roled as the game names them (recorded from
 * RivalsIsland's catalogue before it went dark; ids are the game's own). RivalsTracker payloads
 * carry only ids, so this is the only place a name or role comes from.
 */
const CATALOGUE = new Map<number, { name: string; role: string }>([
  [1011, { name: "BRUCE BANNER", role: "Vanguard" }],
  [1014, { name: "THE PUNISHER", role: "Duelist" }],
  [1015, { name: "STORM", role: "Duelist" }],
  [1016, { name: "LOKI", role: "Strategist" }],
  [1017, { name: "HUMAN TORCH", role: "Duelist" }],
  [1018, { name: "DOCTOR STRANGE", role: "Vanguard" }],
  [1020, { name: "MANTIS", role: "Strategist" }],
  [1021, { name: "HAWKEYE", role: "Duelist" }],
  [1022, { name: "CAPTAIN AMERICA", role: "Vanguard" }],
  [1023, { name: "ROCKET RACCOON", role: "Strategist" }],
  [1024, { name: "HELA", role: "Duelist" }],
  [1025, { name: "CLOAK & DAGGER", role: "Strategist" }],
  [1026, { name: "BLACK PANTHER", role: "Duelist" }],
  [1027, { name: "GROOT", role: "Vanguard" }],
  [1028, { name: "ULTRON", role: "Strategist" }],
  [1029, { name: "MAGIK", role: "Duelist" }],
  [1030, { name: "MOON KNIGHT", role: "Duelist" }],
  [1031, { name: "LUNA SNOW", role: "Strategist" }],
  [1032, { name: "SQUIRREL GIRL", role: "Duelist" }],
  [1033, { name: "BLACK WIDOW", role: "Duelist" }],
  [1034, { name: "IRON MAN", role: "Duelist" }],
  [1035, { name: "VENOM", role: "Vanguard" }],
  [1036, { name: "SPIDER-MAN", role: "Duelist" }],
  [1037, { name: "MAGNETO", role: "Vanguard" }],
  [1038, { name: "SCARLET WITCH", role: "Duelist" }],
  [1039, { name: "THOR", role: "Vanguard" }],
  [1040, { name: "MISTER FANTASTIC", role: "Duelist" }],
  [1041, { name: "WINTER SOLDIER", role: "Duelist" }],
  [1042, { name: "PENI PARKER", role: "Vanguard" }],
  [1043, { name: "STAR-LORD", role: "Duelist" }],
  [1044, { name: "BLADE", role: "Duelist" }],
  [1045, { name: "NAMOR", role: "Duelist" }],
  [1046, { name: "ADAM WARLOCK", role: "Strategist" }],
  [1047, { name: "JEFF THE LAND SHARK", role: "Strategist" }],
  [1048, { name: "PSYLOCKE", role: "Duelist" }],
  [1049, { name: "WOLVERINE", role: "Duelist" }],
  [1050, { name: "INVISIBLE WOMAN", role: "Strategist" }],
  [1051, { name: "THE THING", role: "Vanguard" }],
  [1052, { name: "IRON FIST", role: "Duelist" }],
  [1053, { name: "EMMA FROST", role: "Vanguard" }],
  [1054, { name: "PHOENIX", role: "Duelist" }],
  [1055, { name: "DAREDEVIL", role: "Duelist" }],
  [1056, { name: "ANGELA", role: "Vanguard" }],
  [1058, { name: "GAMBIT", role: "Strategist" }],
  [1059, { name: "ELSA BLOODSTONE", role: "Duelist" }],
  [1060, { name: "WHITE FOX", role: "Strategist" }],
  [1061, { name: "BLACK CAT", role: "Duelist" }],
  [1062, { name: "DEVIL DINOSAUR", role: "Vanguard" }],
  [1063, { name: "CYCLOPS", role: "Duelist" }],
  [1064, { name: "JUBILEE", role: "Strategist" }],
  [1065, { name: "ROGUE", role: "Vanguard" }],
  [1066, { name: "THE HOOD", role: "Vanguard" }],
  [1067, { name: "GORR THE GOD BUTCHER", role: "Duelist" }],
  [10571, { name: "Deadpool Vanguard", role: "Vanguard" }],
  [10572, { name: "Deadpool Duelist", role: "Duelist" }],
  [10573, { name: "Deadpool Strategist", role: "Strategist" }],
]);

/** RivalsTracker hosts the game's own portraits; verified 200 for every id in the catalogue. */
export function heroIconUrl(id: number): string {
  return `https://rivalstracker.com/images/heroes/SelectHero/img_selecthero_${id}001.png`;
}

/** A hero id from a match or ban/pick entry, named from the catalogue or shown as its id. */
export function catalogueHero(id: number): Hero {
  const known = CATALOGUE.get(id);

  return {
    id,
    name: known ? heroDisplayName(known.name) : `Hero ${id}`,
    role: known ? (HeroRoleSchema.safeParse(known.role).data ?? null) : null,
    iconUrl: known ? heroIconUrl(id) : null,
  };
}

/** The `heroes` endpoint's payload. It never reaches the network. */
export const HERO_CATALOGUE: readonly Hero[] = [...CATALOGUE.keys()].map(catalogueHero);
