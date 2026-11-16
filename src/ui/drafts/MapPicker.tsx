import { Check, ChevronDown, LayoutGrid, X } from "lucide-react";
import { type KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from "react";

import type { SimMapTile } from "@/domain/simMap";
import { useDismiss } from "@/lib/hooks/use-dismiss";
import { cn } from "@/lib/utils";

import { proxiedImage } from "../images";

const TILE =
  "group relative flex w-full cursor-pointer scroll-m-2 flex-col overflow-hidden rounded-lg border text-left outline-none transition-[border-color,transform] duration-150 focus-visible:outline-3 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-foreground active:scale-[0.98] motion-reduce:transition-none";

function Tile({ option, selected }: { option: SimMapTile; selected: boolean }) {
  const [failed, setFailed] = useState(false);
  const art = failed ? undefined : proxiedImage(option.imageUrl);

  return (
    <>
      <span className="relative block aspect-[16/9] w-full overflow-hidden bg-card">
        {art ? (
          <img
            src={art}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
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
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDialogElement | null>(null);
  const resetRef = useRef<HTMLButtonElement | null>(null);
  const openingFocus = useRef(0);
  const listId = useId();
  const titleId = useId();

  const selectedIndex = tiles.findIndex((tile) => tile.name === value);
  const current = tiles[selectedIndex];
  const currentArt = proxiedImage(current?.imageUrl);

  const close = useCallback(() => {
    const returnFocus = panelRef.current?.contains(document.activeElement);
    panelRef.current?.close();
    setOpen(false);

    if (returnFocus) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, []);

  useDismiss(open, close, rootRef, { behavior: "consume" });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");

    const update = () => {
      setMobile(query.matches);
      setOpen(false);
    };

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!open || !mobile) return;
    const dialog = panelRef.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
      dialog?.close();
    };
  }, [open, mobile]);

  // Focus only as the panel opens: while it is open the arrow keys own focus, and re-running this
  // when `active` changes would pull it back to where the panel started.
  useEffect(() => {
    if (!open) return;

    const focused =
      openingFocus.current < 0
        ? resetRef.current
        : panelRef.current?.querySelectorAll<HTMLButtonElement>("[data-map-option]")[
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
    setActive(Math.max(0, selectedIndex));
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
    const last = tiles.length - 1;
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
  }

  function onPanelTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (!mobile || event.key !== "Tab") return;

    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>(
      'button:not([tabindex="-1"])',
    );

    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  const panel = open && (
    <dialog
      ref={panelRef}
      id={listId}
      open={mobile ? undefined : true}
      aria-modal={mobile || undefined}
      aria-labelledby={titleId}
      onKeyDown={onPanelTab}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onBlur={(event) => {
        if (!mobile && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      className={cn(
        "z-30 m-0 flex min-h-0 w-auto max-w-none flex-col overflow-hidden rounded-xl border border-border bg-background p-0 text-foreground shadow-lg",
        mobile
          ? "fixed inset-x-3 top-16 h-[calc(100dvh-8rem-env(safe-area-inset-bottom))] max-h-none backdrop:top-14 backdrop:bottom-[calc(3.5rem+env(safe-area-inset-bottom))] backdrop:bg-background/95"
          : "absolute inset-x-0 top-full mt-2 max-h-[min(70vh,34rem)]",
      )}
    >
      <div className="shrink-0 border-b bg-card px-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-sm font-semibold">
            Choose a map
          </h2>
          <button
            type="button"
            aria-label="Close map picker"
            onClick={close}
            className="-mr-2 grid size-11 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:outline-3 focus-visible:outline-foreground active:bg-accent"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <button
          ref={resetRef}
          type="button"
          aria-pressed={value === null}
          onClick={() => choose(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && tiles.length > 0) {
              event.preventDefault();
              setActive(0);
              panelRef.current?.querySelector<HTMLButtonElement>("[data-map-option]")?.focus();
            }
          }}
          className={cn(
            "inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-foreground active:brightness-90",
            value === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-strong bg-background hover:bg-accent",
          )}
        >
          <LayoutGrid className="size-4" aria-hidden />
          All maps
          {value === null && <Check className="size-4" strokeWidth={3} aria-hidden />}
        </button>
      </div>
      <div
        role="listbox"
        aria-label="Maps"
        onKeyDown={onPanelKeyDown}
        className="min-h-0 overflow-y-auto overscroll-contain p-3"
      >
        <div data-map-grid className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((option, index) => (
            <button
              key={option.name}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              data-map-option=""
              tabIndex={index === active ? 0 : -1}
              onFocus={() => setActive(index)}
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
    </dialog>
  );

  return (
    <div ref={rootRef} className="contents">
      <div className="w-full min-w-0 sm:w-56">
        <span aria-hidden="true" className="mb-1 block text-xs text-muted-foreground">
          Map
        </span>
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
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
            {current?.label ?? "All maps"}
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

      {panel}
    </div>
  );
}
