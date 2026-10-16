import { useCallback, useEffect, useRef, useState } from "react";
import { connectLiveStream } from "void/live/client";

import type { Snapshot } from "@/data/model";

export type Connection = "connecting" | "live" | "polling";

const POLL_MS = 45_000;
const CLOCK_MS = 15_000;

export function useLiveSnapshot(initial: Snapshot, eventId?: string) {
  const [snapshot, setSnapshot] = useState(initial);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [now, setNow] = useState(() => Date.parse(initial.servedAt));
  const seenInitial = useRef(initial);

  if (seenInitial.current !== initial) {
    seenInitial.current = initial;
    setSnapshot(initial);
  }

  const refetch = useCallback(async () => {
    const query = eventId ? `?event=${encodeURIComponent(eventId)}` : "";
    const res = await fetch(`/api/snapshot${query}`);
    if (res.ok) setSnapshot((await res.json()) as Snapshot);
  }, [eventId]);

  useEffect(() => {
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), CLOCK_MS);
    const poll = setInterval(() => void refetch(), POLL_MS);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
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
      .subscribe({ id: "scores", topic: "scores", onEvent: () => void refetch() })
      .then(() => !disposed && setConnection("live"))
      .catch(() => !disposed && setConnection("polling"));
    return () => {
      disposed = true;
      stream.close();
    };
  }, [refetch]);

  return { snapshot, connection, now, refetch };
}
