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
  "/leaderboard?device_type=pc&limit=100": "leaderboard-pc",
  "/players/search?name=NAVI%20TrqstMe": "player-search",
  "/players/search?name=Sypeh": "search-sypeh",
  "/players/search?name=zzqxnoplayer77": "search-miss",
  "/players/1364513129/career": "player-career",
  "/players/670067075/career": "career-sypeh",
  "/players/1/career": "career-not-found",
  "/players/670067075/heroes/1011": "player-hero",
  "/players/670067075/match-history?page=0&page_size=20&category=2": "history-sypeh",
  "/players/1364513129/match-history?page=0&page_size=20&category=2": "history-private",
  "/matches/5513337_1791844040_1311009_11001_12": "match-detail",
  "/matches/1_1_1_1_1": "match-not-found",
};

export const RECORDED_UIDS = { trqstMe: "1364513129", sypeh: "670067075" } as const;
export const RECORDED_MATCH = "5513337_1791844040_1311009_11001_12";

export function rivalsIslandFixture(name: string): unknown {
  const raw = bodies[`./fixtures/rivalsisland/${name}.json`];

  if (raw === undefined) throw new Error(`No RivalsIsland fixture ${name}`);

  return JSON.parse(raw);
}

function recorded(name: string): { status: number; headers: Record<string, string> } {
  const raw = headerFiles[`./fixtures/rivalsisland/${name}.headers`] ?? "";
  const status = Number(/^HTTP\S*\s+(\d{3})/.exec(raw)?.[1] ?? 200);
  const headers: Record<string, string> = {};

  for (const line of raw.split(/\r?\n/)) {
    const match = /^(x-credit-cost|x-credit-balance):\s*(\S+)/i.exec(line);

    if (match?.[1] && match[2]) headers[match[1].toLowerCase()] = match[2];
  }

  return { status, headers };
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

    return Response.json(rivalsIslandFixture(name), recorded(name));
  };

  return { fetch: fetchFake, calls };
}
