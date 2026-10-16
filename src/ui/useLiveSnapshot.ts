import { useCallback, useEffect, useState } from "react";
import { connectLiveStream } from "void/live/client";

import { SnapshotSchema, type Snapshot } from "@/domain/model";

import { newerSnapshot } from "./newerSnapshot";
import { useNow } from "./useNow";

export type Connection = "connecting" | "live" | "polling";

const POLL_MS = 45_000;

export type LiveScope = { event?: string; match?: string };

export function useLiveSnapshot(initial: Snapshot, scope: LiveScope = {}) {
  const { event: eventId, match: matchId } = scope;
  const [snapshot, setSnapshot] = useState(initial);
  const [previousInitial, setPreviousInitial] = useState(initial);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const now = useNow(Date.parse(initial.servedAt));

  if (initial !== previousInitial) {
    setPreviousInitial(initial);
    setSnapshot(initial);
  }

  const refetch = useCallback(async () => {
    const params = new URLSearchParams();
    if (eventId) params.set("event", eventId);
    if (matchId) params.set("match", matchId);
    const query = params.size > 0 ? `?${params}` : "";
    try {
      const res = await fetch(`/api/snapshot${query}`);
      if (!res.ok) throw new Error(`Snapshot request failed with HTTP ${res.status}`);
      const parsed = SnapshotSchema.safeParse(await res.json());
      if (!parsed.success) throw new Error("Snapshot response did not match the expected shape");
      setSnapshot((current) => newerSnapshot(current, parsed.data));
      setRefreshError(null);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Snapshot refresh failed");
    }
  }, [eventId, matchId]);

  useEffect(() => {
    const poll = setInterval(() => void refetch(), POLL_MS);
    return () => clearInterval(poll);
  }, [refetch]);

  useEffect(() => {
    let disposed = false;
    const stream = connectLiveStream("/live", {
      retryDelay: 2_000,
      onError() {
        if (!disposed) setConnection("polling");
      },
    });
    stream
      .subscribe({
        id: "scores",
        topic: "scores",
        onEvent: () => {
          if (!disposed) setConnection("live");
          void refetch();
        },
      })
      .then(() => {
        if (!disposed) setConnection("live");
      })
      .catch(() => {
        if (!disposed) setConnection("polling");
      });
    return () => {
      disposed = true;
      stream.close();
    };
  }, [refetch]);

  return { snapshot, connection, now, refreshError, refetch };
}
