import { z } from "zod";

import type { Driver } from "./cdp";

const RECORDED_PLAYER = "/player/670067075";

export interface Surface {
  name: string;
  path: string;
  prepare?: (driver: Driver) => Promise<void>;
}

export interface Discovered {
  match: string;
  player: string;
  event: string;
}

export async function discover(driver: Driver, base: string): Promise<Discovered> {
  await driver.visit(`${base}/matches?tab=results`);
  const match = await driver.href('a[href^="/match/"]');
  const player = RECORDED_PLAYER;

  await driver.visit(`${base}/events`);

  const events = await driver.evaluate(
    `Array.from(document.querySelectorAll('a[href^="/event/"]')).map((a) => a.getAttribute("href")).filter((h) => Boolean(h)).sort((a, b) => a.length - b.length)`,
    z.array(z.string()),
  );

  const event = events[0];

  if (!match || !player || !event) {
    throw new Error(`could not resolve sample paths: ${JSON.stringify({ match, player, event })}`);
  }

  return { match, player, event };
}

export function surfaces(found: Discovered): readonly Surface[] {
  return [
    { name: "home", path: "/" },
    { name: "matches-upcoming", path: "/matches?tab=upcoming" },
    { name: "matches-results", path: "/matches?tab=results" },
    {
      name: "matches-results-filter",
      path: "/matches?tab=results",
      prepare: (driver) => driver.openSelect(),
    },
    { name: "events", path: "/events" },
    { name: "event", path: found.event },
    { name: "drafts", path: "/drafts" },
    { name: "drafts-simulator", path: "/drafts/simulator" },
    {
      name: "drafts-simulator-picker",
      path: "/drafts/simulator",
      prepare: (driver) => driver.openSelect(),
    },
    { name: "players", path: "/players" },
    { name: "leaderboard", path: "/leaderboard" },
    { name: "player", path: found.player },
    { name: "match", path: found.match },
    { name: "review", path: "/review" },
  ];
}
