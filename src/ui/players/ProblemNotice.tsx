import { CircleAlert, Lock } from "lucide-react";

import type { PlayerProblem } from "@/domain/player";

const MESSAGES: Record<PlayerProblem, { title: string; detail: string }> = {
  history_private: {
    title: "Match history is private",
    detail: "This player hides their matches. Rank and career stats still show.",
  },
  career_private: {
    title: "Career is private",
    detail: "This player hides their career stats.",
  },
  not_found: { title: "Not found", detail: "RivalsIsland has no record of this." },
  budget_reached: {
    title: "Credit budget reached",
    detail: "Rivals Hub has used its RivalsIsland credit budget. Cached data still shows.",
  },
  out_of_credits: {
    title: "Out of RivalsIsland credits",
    detail: "The API key has no credits left.",
  },
  not_configured: {
    title: "RivalsIsland isn't set up",
    detail: "Add RIVALSISLAND_API_KEY and RIVALSISLAND_MODE=live to .env.",
  },
  unavailable: {
    title: "RivalsIsland is unavailable",
    detail: "It didn't answer as expected. Try again in a few minutes.",
  },
};

export function ProblemNotice({ problem }: { problem: PlayerProblem }) {
  const { title, detail } = MESSAGES[problem];
  const Icon = problem === "history_private" || problem === "career_private" ? Lock : CircleAlert;
  return (
    <div role="status" className="flex items-start gap-3 rounded-lg border bg-card p-4 text-sm">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
