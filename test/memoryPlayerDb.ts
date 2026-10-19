import type { CachedResponse, CreditLedger, PlayerCache } from "@/store/playerData";

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
  expected: number;
  cost: number | null;
  balance: number | null;
}

/** Mirrors the D1 ledger's single-statement reserve: the check and the insert happen without an await between them. */
export function memoryCreditLedger(): CreditLedger & { rows: Row[] } {
  const rows: Row[] = [];
  const committed = () => rows.reduce((sum, r) => sum + (r.cost ?? r.expected), 0);

  return {
    rows,
    async reserve(r) {
      if (committed() + r.expected > r.budget) return null;
      rows.push({ expected: r.expected, cost: null, balance: null });

      return rows.length - 1;
    },
    async settle(id, s) {
      const row = rows[id];

      if (!row) throw new Error(`No reservation ${id}`);
      row.cost = s.cost;
      row.balance = s.balance;
    },
    async summary() {
      const settled = rows.filter((r) => r.cost !== null);

      return {
        spent: settled.reduce((sum, r) => sum + (r.cost ?? 0), 0),
        pending: rows.filter((r) => r.cost === null).reduce((sum, r) => sum + r.expected, 0),
        balance: settled.findLast((r) => r.balance !== null)?.balance ?? null,
      };
    },
  };
}
