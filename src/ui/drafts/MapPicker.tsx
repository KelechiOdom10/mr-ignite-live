import { Check, ChevronDown, LayoutGrid } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";

import type { SimMapTile } from "@/domain/simMap";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { cn } from "@/lib/utils";

import { proxiedImage } from "../images";

interface Option {
  /** Null is the unfiltered board. */
  name: string | null;
  label: string;
  mode: string | null;
  imageUrl: string | null;
}

const ALL_MAPS: Option = { name: null, label: "All maps", mode: null, imageUrl: null };

const TILE =
  "group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-lg border text-left outline-none transition-[border-color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.98] motion-reduce:transition-none";

function Tile({ option, selected }: { option: Option; selected: boolean }) {
  const art = proxiedImage(option.imageUrl);

  return (
    <>
      <span className="relative block aspect-[16/9] w-full overflow-hidden bg-card">
        {art ? (
          <img
            src={art}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-[filter] duration-150 group-hover:brightness-110 group-focus-visible:brightness-110"
          />
        ) : (
          <span className="grid size-full place-items-center bg-secondary text-muted-foreground">
            <LayoutGrid className="size-5" aria-hidden />
          </span>
        )}
        {option.mode && (
          <span className="absolute left-1.5 top-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-white/90 backdrop-blur-sm">
            {option.mode}
          </span>
        )}
        {selected && (
          <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </span>
        )}
      </span>
      <span
        className={cn(
          "flex min-h-9 items-center px-2 py-1 text-[0.7rem] font-medium leading-tight sm:text-xs",
          selected ? "bg-primary text-primary-foreground" : "bg-popover text-popover-foreground",
        )}
      >
        <span className="line-clamp-2">{option.label}</span>
      </span>
    </>
  );
}

export function MapPicker({
  tiles,
  value,
  onChange,
  disabled,
}: {
  tiles: SimMapTile[];
  value: string | null;
  onChange: (next: string | null) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openingFocus = useRef(0);
  const listId = useId();

  const options: Option[] = [
    ALL_MAPS,
    ...tiles.map((tile) => ({
      name: tile.name,
      label: tile.label,
      mode: tile.mode,
      imageUrl: tile.imageUrl,
    })),
  ];

  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.name === value),
  );

  const current = options[selectedIndex] ?? ALL_MAPS;
  const currentArt = proxiedImage(current.imageUrl);

  const close = useCallback(() => {
    setOpen(false);

    if (panelRef.current?.contains(document.activeElement)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useDismiss(open, close, rootRef, { behavior: "consume" });

  // Focus only as the panel opens: while it is open the arrow keys own focus, and re-running this
  // when `active` changes would pull it back to where the panel started.
  useEffect(() => {
    if (!open) return;

    const focused =
      panelRef.current?.querySelectorAll<HTMLButtonElement>("[data-map-option]")[
        openingFocus.current
      ];

    focused?.focus({ preventScroll: true });
    focused?.scrollIntoView({ block: "nearest" });
  }, [open]);

  function toggle() {
    if (open) {
      close();

      return;
    }

    openingFocus.current = selectedIndex;
    setActive(selectedIndex);
    setOpen(true);
  }

  function choose(name: string | null) {
    onChange(name);
    close();
  }

  // Arrow keys follow the grid as it is laid out, which is a different column count at each width.
  function moveFocus(event: KeyboardEvent<HTMLDivElement>, next: number) {
    event.preventDefault();
    setActive(next);

    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-map-option]");
    const focused = buttons[next];

    focused?.focus({ preventScroll: true });
    focused?.scrollIntoView({ block: "nearest" });
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const last = options.length - 1;
    const grid = event.currentTarget.querySelector("[data-map-grid]");

    const columns =
      grid instanceof HTMLElement
        ? getComputedStyle(grid).gridTemplateColumns.split(" ").length
        : 1;

    if (event.key === "ArrowRight") moveFocus(event, active === last ? 0 : active + 1);
    else if (event.key === "ArrowLeft") moveFocus(event, active === 0 ? last : active - 1);
    else if (event.key === "ArrowDown") moveFocus(event, Math.min(active + columns, last));
    else if (event.key === "ArrowUp") moveFocus(event, Math.max(active - columns, 0));
    else if (event.key === "Home") moveFocus(event, 0);
    else if (event.key === "End") moveFocus(event, last);
    else if (event.key === "Tab") setOpen(false);
  }

  return (
    // display: contents keeps the panel out of the header's flex layout while still spanning the
    // board card it belongs to, and lets a click anywhere else in the card dismiss it.
    <div ref={rootRef} className="contents">
      <div className="w-full min-w-0 sm:w-56">
        <span aria-hidden="true" className="mb-1 block text-xs text-muted-foreground">
          Map
        </span>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          onClick={toggle}
          className={cn(
            "relative z-10 flex w-full cursor-pointer items-center gap-2 rounded-xl border bg-background py-1.5 pl-1.5 pr-3 text-sm text-foreground outline-none transition-colors duration-150",
            "hover:border-border-strong focus-visible:ring-2 focus-visible:ring-foreground/20",
            "disabled:pointer-events-none disabled:opacity-50",
            open ? "border-primary" : "border-border",
          )}
        >
          {currentArt ? (
            <img src={currentArt} alt="" className="h-6 w-11 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
              <LayoutGrid className="size-3.5" aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-left">
            <span className="sr-only">Map: </span>
            {current.label}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {open && (
        <div
          ref={panelRef}
          id={listId}
          role="listbox"
          aria-label="Map"
          onKeyDown={onPanelKeyDown}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-background p-2 shadow-lg"
        >
          <div data-map-grid className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {options.map((option, index) => (
              <button
                key={option.name ?? "all"}
                type="button"
                role="option"
                aria-selected={index === selectedIndex}
                data-map-option=""
                tabIndex={index === active ? 0 : -1}
                onClick={() => choose(option.name)}
                className={cn(
                  TILE,
                  index === selectedIndex
                    ? "border-primary ring-2 ring-primary"
                    : "border-border hover:border-border-strong",
                )}
              >
                <Tile option={option} selected={index === selectedIndex} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
