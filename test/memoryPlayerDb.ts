import type { CachedResponse, PlayerCache, RequestLedger } from "@/store/playerData";

export function memoryPlayerCache(): PlayerCache & { entries: Map<string, CachedResponse> } {
  const entries = new Map<string, CachedResponse>();

  return {
    entries,
    async get(key) {
      return entries.get(key) ?? null;
    },
    async put(key, _endpoint, entry) {
      entries.set(key, structuredClone(entry));
    },
  };
}

interface Row {
  at: number;
  expected: number;
  cost: number | null;
}

/** Mirrors the D1 ledger's single-statement reserve: the check and the insert happen without an await between them. */
export function memoryRequestLedger(): RequestLedger & { rows: Row[] } {
  const rows: Row[] = [];

  const committed = (since: number) =>
    rows.reduce((sum, r) => (r.at >= since ? sum + (r.cost ?? r.expected) : sum), 0);

  return {
    rows,
    async reserve(r) {
      if (committed(r.since) + r.expected > r.budget) return null;
      rows.push({ at: r.at, expected: r.expected, cost: null });

      return rows.length - 1;
    },
    async settle(id, s) {
      const row = rows[id];

      if (!row) throw new Error(`No reservation ${id}`);
      row.cost = s.cost;
    },
    async summary(since) {
      const window = rows.filter((r) => r.at >= since);

      return {
        spent: window.reduce((sum, r) => sum + (r.cost ?? 0), 0),
        pending: window.filter((r) => r.cost === null).reduce((sum, r) => sum + r.expected, 0),
      };
    },
  };
}
