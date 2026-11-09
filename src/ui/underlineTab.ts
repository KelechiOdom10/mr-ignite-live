/**
 * beUI's underline trigger has no focus style of its own, and the browser's outline is clipped by
 * the scrolling row it sits in, so draw it inside the trigger.
 */
export const UNDERLINE_TAB =
  "rounded-md whitespace-nowrap focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring";
