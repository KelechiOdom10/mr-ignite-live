import { useState } from "react";

/**
 * Text being edited before it is committed on blur. It follows the saved value until the user
 * types, so an import that changes the saved value isn't overwritten by an untouched draft.
 */
export function useDraft(saved: string) {
  const [state, setState] = useState({ text: saved, dirty: false, saved });
  if (state.saved !== saved && !state.dirty) {
    setState({ text: saved, dirty: false, saved });
  }
  const text = state.saved !== saved && !state.dirty ? saved : state.text;
  return {
    text,
    dirty: state.dirty,
    edit: (next: string) => setState((s) => ({ ...s, text: next, dirty: true })),
    settle: (next: string = saved) => setState({ text: next, dirty: false, saved: next }),
  };
}
