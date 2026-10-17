import type { DraftFormat, DraftStep } from "@/domain/draft";

const ACTOR: Record<DraftStep["actor"], string> = {
  first: "First team",
  second: "Second team",
  both: "Both teams",
};

function summary(format: DraftFormat): string {
  const who = format.banBlocks === "opponent" ? "the other team only" : "both teams";
  if (format.confirmed) {
    return `A ban keeps the hero from ${who}; ${format.sharedBans ? "both teams may ban the same hero" : "each hero can be banned once"}.`;
  }
  return `In the one recorded match, bans kept the hero from ${who} and ${format.sharedBans ? "both teams banned the same hero" : "no hero was banned twice"}.`;
}

export function FormatCard({ format }: { format: DraftFormat }) {
  return (
    <section aria-label={format.name} className="rounded-lg border p-4 text-sm">
      <h3 className="font-medium">{format.name}</h3>
      <p className="mt-1 text-muted-foreground">{summary(format)}</p>
      <ol className="mt-3 grid gap-1">
        {format.steps.map((step, i) => (
          <li key={`step-${i + 1}`} className="flex gap-2">
            <span className="w-5 text-right font-mono text-xs leading-5 text-muted-foreground">
              {i + 1}
            </span>
            <span>
              {ACTOR[step.actor]} {step.kind === "ban" ? "bans" : "protects"}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">{format.basis}</p>
    </section>
  );
}
