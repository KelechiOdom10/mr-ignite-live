import type { Result } from "@/domain/player";

export const RESULT: Record<Result, { label: string; bar: string; text: string }> = {
  win: { label: "Win", bar: "bg-win", text: "text-win" },
  loss: { label: "Loss", bar: "bg-live", text: "text-live" },
  draw: { label: "Draw", bar: "bg-muted-foreground", text: "text-muted-foreground" },
  abandoned: { label: "Abandoned", bar: "bg-muted-foreground", text: "text-muted-foreground" },
};
