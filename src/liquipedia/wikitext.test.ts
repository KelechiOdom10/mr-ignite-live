import { describe, expect, it } from "vitest";

import { findTemplates, parseTemplateAt, stripMarkup } from "./wikitext";

describe("parseTemplateAt", () => {
  it("keeps a nested template's pipes inside its parent param", () => {
    // Bug: splitting on every `|` would cut `{{Map|map=Krakoa|score1=2}}` into fragments.
    const text = "{{Match|map1={{Map|map=Krakoa|score1=2}}|bestof=5}}";
    const tpl = parseTemplateAt(text, 0);
    expect(tpl?.params.map1).toBe("{{Map|map=Krakoa|score1=2}}");
    expect(tpl?.params.bestof).toBe("5");
  });

  it("keeps a wiki link's pipe inside its param", () => {
    // Bug: `[[Liquid Citadel|TLC]]` would split into a stray positional param.
    const tpl = parseTemplateAt("{{T|team=[[Liquid Citadel|TLC]]|x=1}}", 0);
    expect(tpl?.params.team).toBe("[[Liquid Citadel|TLC]]");
    expect(tpl?.params.x).toBe("1");
  });

  it("treats a param whose first `=` sits inside a nested template as positional", () => {
    // Bug: `{{TeamOpponent|template=x}}` would be read as a param named `{{TeamOpponent|template`.
    const tpl = parseTemplateAt("{{T|{{TeamOpponent|template=x}}}}", 0);
    expect(tpl?.params["1"]).toBe("{{TeamOpponent|template=x}}");
  });

  it("returns null for an unclosed template instead of reading to the end", () => {
    expect(parseTemplateAt("{{Match|bestof=5", 0)).toBeNull();
  });
});

describe("findTemplates", () => {
  it("does not match a template whose name only starts with the wanted name", () => {
    // Bug: searching "Match" would also pick up `{{Matchlist`.
    const found = findTemplates("{{Matchlist|M1={{Match|bestof=3}}}}", "Match");
    expect(found.map((t) => t.name)).toEqual(["Match"]);
  });
});

describe("stripMarkup", () => {
  it("removes comments and keeps a link's label", () => {
    expect(stripMarkup("kOKqgtPHq4\n<!-- Upper Bracket -->")).toBe("kOKqgtPHq4");
    expect(stripMarkup("[[Liquid Citadel|TLC]]")).toBe("TLC");
  });
});
