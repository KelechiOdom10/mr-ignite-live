import { CircleAlert, Lock } from "lucide-react";

import { PROBLEM_MESSAGES, type PlayerProblem } from "@/domain/player";

export function ProblemNotice({ problem }: { problem: PlayerProblem }) {
  const { title, detail } = PROBLEM_MESSAGES[problem];
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
