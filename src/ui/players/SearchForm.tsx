import { Form, useForm } from "@void/react";
import { Search } from "lucide-react";

export function SearchForm({
  initialName = "",
  autoFocus = false,
}: {
  initialName?: string;
  autoFocus?: boolean;
}) {
  const form = useForm("/players", { name: initialName });

  return (
    <Form form={form} className="space-y-1.5">
      <label htmlFor="player-name" className="text-sm font-medium">
        Find a player by exact name
      </label>
      <div className="flex gap-2">
        <input
          id="player-name"
          name="name"
          value={form.data.name}
          onChange={(e) => form.setData("name", e.target.value)}
          maxLength={16}
          autoComplete="off"
          autoFocus={autoFocus}
          spellCheck={false}
          placeholder="Sypeh"
          aria-invalid={form.errors.name ? true : undefined}
          aria-describedby={form.errors.name ? "player-name-error" : "player-name-hint"}
          className="h-10 min-w-0 flex-1 rounded-md border bg-card px-3 text-base sm:text-sm"
        />
        <button
          type="submit"
          disabled={form.pending || form.data.name.trim() === ""}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          <Search className="size-4" aria-hidden />
          Search
        </button>
      </div>
      {form.errors.name ? (
        <p id="player-name-error" role="alert" className="text-sm text-live">
          {form.errors.name}
        </p>
      ) : (
        <p id="player-name-hint" className="text-xs text-muted-foreground">
          A new search costs 5 RivalsIsland credits; repeat searches within a day are free.
        </p>
      )}
    </Form>
  );
}
