import { type TeamInfo } from "@/domain/model";
import { teamShortName } from "@/domain/teams";

import type { LiquipediaClient } from "./client";
import { parseTeamShortExpansion, TEAM_TEMPLATE_SEPARATOR } from "./parse";

const NAMES_PER_EXPANSION = 40;
const LOGO_WIDTH_PX = 96;

export async function fetchTeamInfo(
  client: LiquipediaClient,
  names: string[],
): Promise<Record<string, TeamInfo>> {
  const templates = new Map<string, ReturnType<typeof parseTeamShortExpansion>>();
  for (let i = 0; i < names.length; i += NAMES_PER_EXPANSION) {
    const batch = names.slice(i, i + NAMES_PER_EXPANSION);
    const expanded = await client.expandTemplates(
      batch.map((n) => `{{TeamShort|${n}}}`).join(TEAM_TEMPLATE_SEPARATOR),
    );
    const chunks = expanded.split(TEAM_TEMPLATE_SEPARATOR);
    batch.forEach((name, j) => templates.set(name, parseTeamShortExpansion(chunks[j] ?? "")));
  }

  const files = [...templates.values()].flatMap((t) => [t.logoDarkFile, t.logoLightFile]);
  const urls = await client.imageUrls(
    [...new Set(files.filter((f): f is string => f !== null))],
    LOGO_WIDTH_PX,
  );
  const resolve = (file: string | null) =>
    file ? (urls.get(file) ?? urls.get(file.replace(/_/g, " ")) ?? null) : null;

  const out: Record<string, TeamInfo> = {};
  for (const [name, t] of templates) {
    out[name] = {
      short: t.short ?? teamShortName(name),
      logoDark: resolve(t.logoDarkFile),
      logoLight: resolve(t.logoLightFile),
    };
  }
  return out;
}
