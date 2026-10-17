// Used by tests and by the dev server's fixtures mode, so both replay exactly what was recorded.
const bodies = import.meta.glob<string>("./fixtures/rivalsisland/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});
const headerFiles = import.meta.glob<string>("./fixtures/rivalsisland/*.headers", {
  query: "?raw",
  import: "default",
  eager: true,
});

const RECORDED: Record<string, string> = {
  "/heroes": "heroes",
  "/leaderboard?device_type=pc&limit=100": "leaderboard-100",
  "/players/search?name=NAVI%20TrqstMe": "player-search",
  "/players/1364513129/career": "player-career",
  "/players/670067075/heroes/1011": "player-hero",
  "/matches/5513337_1791844040_1311009_11001_12": "match-detail",
};

export const RECORDED_UIDS = { trqstMe: "1364513129", sypeh: "670067075" } as const;
export const RECORDED_MATCH = "5513337_1791844040_1311009_11001_12";

export function rivalsIslandFixture(name: string): unknown {
  const raw = bodies[`./fixtures/rivalsisland/${name}.json`];
  if (raw === undefined) throw new Error(`No RivalsIsland fixture ${name}`);
  return JSON.parse(raw);
}

function recordedHeaders(name: string): Record<string, string> {
  const raw = headerFiles[`./fixtures/rivalsisland/${name}.headers`] ?? "";
  const headers: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^(x-credit-cost|x-credit-balance):\s*(\S+)/i.exec(line);
    if (match?.[1] && match[2]) headers[match[1].toLowerCase()] = match[2];
  }
  return headers;
}

export interface Scripted {
  status: number;
  body: unknown;
  cost: number;
}

/**
 * Serves recorded RivalsIsland responses with their recorded credit headers. An unrecorded search
 * finds nobody (200, 5 credits) and anything else unrecorded is a free 404, as the API answers.
 */
export function fakeRivalsIsland(scripted: Record<string, Scripted> = {}) {
  const calls: string[] = [];
  const fetchFake = async (input: RequestInfo | URL): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const path = url.pathname + url.search;
    calls.push(path);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const script = scripted[path];
    if (script) {
      return Response.json(script.body, {
        status: script.status,
        headers: { "x-credit-cost": String(script.cost) },
      });
    }
    const name = RECORDED[path];
    if (!name && url.pathname === "/players/search") {
      const query = url.searchParams.get("name") ?? "";
      return Response.json({ query, player: null }, { headers: { "x-credit-cost": "5" } });
    }
    if (!name) {
      return Response.json(
        { error: "player not found", code: "player_not_found" },
        { status: 404, headers: { "x-credit-cost": "0" } },
      );
    }
    return Response.json(rivalsIslandFixture(name), { headers: recordedHeaders(name) });
  };
  return { fetch: fetchFake, calls };
}
