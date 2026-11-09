import type { SimFormatId } from "@/domain/draftFormat";
import type { Camp, SimMove } from "@/domain/draftSim";
import type { Hero } from "@/domain/stats";

export const ROLES = ["All", "Vanguard", "Duelist", "Strategist"] as const;

export type RoleFilter = (typeof ROLES)[number];

export function isRoleFilter(value: string): value is RoleFilter {
  return ROLES.some((role) => role === value);
}

export function filterHeroes(heroes: readonly Hero[], role: RoleFilter, query: string): Hero[] {
  const needle = query.trim().toLowerCase();

  return heroes.filter(
    (h) => (role === "All" || h.role === role) && h.name.toLowerCase().includes(needle),
  );
}

export interface SimSession {
  formatId: SimFormatId;
  moves: SimMove[];
  camp: Camp;
}

/**
 * The session after choosing a format, or null when it is already selected. A switch starts over:
 * moves recorded against one format's steps mean nothing in the other's.
 */
export function switchFormat(session: SimSession, formatId: SimFormatId): SimSession | null {
  if (formatId === session.formatId) return null;

  return { formatId, moves: [], camp: 0 };
}
