const LOWERCASE = new Set(["the", "of", "and"]);

/** RivalsIsland sends hero names in capitals ("JEFF THE LAND SHARK"); show them as written in game. */
export function heroDisplayName(name: string): string {
  return name
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i > 0 && LOWERCASE.has(word)
        ? word
        : word.replace(
            /(^|-)(\p{L})/gu,
            (_, dash: string, letter: string) => dash + letter.toUpperCase(),
          ),
    )
    .join(" ");
}
