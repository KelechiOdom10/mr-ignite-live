import { type TeamInfo } from "@/domain/model";
import { teamShortName } from "@/domain/teams";

import { LiquipediaBudgetSpentError, type LiquipediaRun } from "./client";
import { parseTeamShortExpansion, TEAM_TEMPLATE_SEPARATOR } from "./parse";

const NAMES_PER_EXPANSION = 40;
const LOGO_WIDTH_PX = 96;

// A team stored without logos beats expanding the same templates again every run when the logo
// lookup keeps missing the run's deadline.
async function logoUrls(client: LiquipediaRun, files: string[]): Promise<Map<string, string>> {
  try {
    return await client.imageUrls(files, LOGO_WIDTH_PX);
  } catch (error) {
    if (error instanceof LiquipediaBudgetSpentError) return new Map();
    throw error;
  }
}

export async function fetchTeamInfo(
  client: LiquipediaRun,
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
  const urls = await logoUrls(client, [...new Set(files.filter((f): f is string => f !== null))]);
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
