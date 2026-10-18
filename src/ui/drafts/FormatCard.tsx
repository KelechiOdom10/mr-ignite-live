import {
  Collapsible,
  CollapsibleContent,
  CollapsibleIndicator,
  CollapsibleTrigger,
} from "@/components/motion/collapsible";
import type { DraftFormat, DraftStep } from "@/domain/draft";
import { cn } from "@/lib/utils";

export const ACTOR: Record<DraftStep["actor"], string> = {
  first: "First team",
  second: "Second team",
  both: "Both teams",
};

const ACTOR_SHORT: Record<DraftStep["actor"], string> = {
  first: "1st",
  second: "2nd",
  both: "Both",
};

function summary(format: DraftFormat): string {
  const who = format.banBlocks === "opponent" ? "the other team only" : "both teams";
  if (format.confirmed) {
    return `A ban keeps the hero from ${who}; ${format.sharedBans ? "both teams may ban the same hero" : "each hero can be banned once"}.`;
  }
  return `In the one recorded match, bans kept the hero from ${who} and ${format.sharedBans ? "both teams banned the same hero" : "no hero was banned twice"}.`;
}

/** The draft order as compact numbered steps, so it fits beside the table. */
export function DraftSteps({ steps }: { steps: readonly DraftStep[] }) {
  return (
    <ol className="grid grid-cols-2 gap-1.5 text-xs">
      {steps.map((step, i) => (
        <li
          key={`step-${i + 1}`}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-2 py-1",
            step.kind === "protect" && "border-win/30 bg-win/5",
          )}
        >
          <span className="w-4 text-right font-mono text-muted-foreground">{i + 1}</span>
          <span>
            {ACTOR_SHORT[step.actor]} {step.kind === "ban" ? "ban" : "protect"}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function FormatCard({ format, folded = false }: { format: DraftFormat; folded?: boolean }) {
  const body = (
    <>
      <p className="text-muted-foreground">{summary(format)}</p>
      <div className="mt-3">
        <DraftSteps steps={format.steps} />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{format.basis}</p>
    </>
  );
  if (folded) {
    return (
      <Collapsible className="rounded-lg border p-2 text-sm">
        <CollapsibleTrigger className="px-2 font-medium">
          {format.name}
          <CollapsibleIndicator />
        </CollapsibleTrigger>
        <CollapsibleContent contentClassName="px-2 pb-2 pt-1">{body}</CollapsibleContent>
      </Collapsible>
    );
  }
  return (
    <section aria-label={format.name} className="rounded-lg border p-4 text-sm">
      <h3 className="mb-1 font-medium">{format.name}</h3>
      {body}
    </section>
  );
}
