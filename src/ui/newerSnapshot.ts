import type { Snapshot } from "@/domain/model";

export function newerSnapshot(current: Snapshot, incoming: Snapshot): Snapshot {
  return Date.parse(incoming.servedAt) >= Date.parse(current.servedAt) ? incoming : current;
}
