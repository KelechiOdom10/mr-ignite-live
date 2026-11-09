import { z } from "zod";

import { type Json, JsonSchema } from "./json";

// Used by tests and by the dev server's fixtures mode, so both replay exactly what was recorded.
const bodies = import.meta.glob<string>("./fixtures/rivalstracker/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});

const headerFiles = import.meta.glob<string>("./fixtures/rivalstracker/*.headers", {
  query: "?raw",
  import: "default",
  eager: true,
});

const RECORDED = new Map<string, string>([
  ["GET /player/670067075", "player-sypeh"],
  ["GET /player/1364513129", "player-trqstme"],
  ["GET /player/999999999", "player-not-found"],
  ["GET /matches/5513337_1791844040_1311009_11001_12", "match-detail"],
  ["GET /matches/1_1_1_1_1", "match-not-found"],
  ["GET /leaderboard/data", "leaderboard-pc"],
]);

const SEARCHES = new Map<string, string>([
  ["Sypeh", "search-sypeh"],
  ["zzqxnoplayer77", "search-miss"],
]);

const SearchBodySchema = z.object({ name: z.string() });

export const RECORDED_UIDS = { trqstMe: "1364513129", sypeh: "670067075" } as const;
export const RECORDED_MATCH = "5513337_1791844040_1311009_11001_12";

export function rivalsTrackerFixture(name: string): Json {
  const raw = bodies[`./fixtures/rivalstracker/${name}.json`];

  if (raw === undefined) throw new Error(`No RivalsTracker fixture ${name}`);

  return JsonSchema.parse(JSON.parse(raw));
}

function rawFixture(name: string) {
  const body = bodies[`./fixtures/rivalstracker/${name}.json`];
  const headers = headerFiles[`./fixtures/rivalstracker/${name}.headers`] ?? "";
  const status = Number(/^HTTP\S*\s+(\d{3})/.exec(headers)?.[1] ?? 200);
  const contentType = /^content-type:\s*(.+)$/im.exec(headers)?.[1]?.trim() ?? "application/json";

  if (body === undefined) throw new Error(`No RivalsTracker fixture ${name}`);

  return { body, init: { status, headers: { "Content-Type": contentType } } };
}

/** The name from a POST body our client wrote; a body that isn't ours finds nobody. */
function searchName(init?: RequestInit): string {
  const parsed = z
    .string()
    .transform((raw) => JSON.parse(raw))
    .pipe(SearchBodySchema)
    .safeParse(init?.body);

  return parsed.success ? parsed.data.name : "";
}

export interface Scripted {
  status: number;
  body: Json;
}

/**
 * Serves recorded RivalsTracker responses. An unrecorded search finds nobody (200, `[]`) and
 * anything else unrecorded is a 404, as the API answers.
 */
export function fakeRivalsTracker(scripted: Record<string, Scripted> = {}) {
  const calls: string[] = [];

  const fetchFake = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input.toString());

    const method = (
      init?.method ?? (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    const pathname = url.pathname.replace(/^\/api/, "");
    const path = pathname + url.search;

    calls.push(`${method} ${path}`);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const script = scripted[`${method} ${path}`];

    if (script) return Response.json(script.body, { status: script.status });

    if (method === "POST" && pathname === "/find-player") {
      const fixture = SEARCHES.get(searchName(init));

      if (!fixture) return Response.json([], { status: 200 });

      const recorded = rawFixture(fixture);

      return new Response(recorded.body, recorded.init);
    }

    const name = RECORDED.get(`${method} ${pathname}`);
    const recorded = name ? rawFixture(name) : null;

    if (!recorded) return new Response("not found", { status: 404 });

    return new Response(recorded.body, recorded.init);
  };

  return { fetch: fetchFake, calls };
}
