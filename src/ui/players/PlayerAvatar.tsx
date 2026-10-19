import { cn } from "@/lib/utils";

import { proxiedImage } from "../images";

export function PlayerAvatar({
  iconUrl,
  name,
  size = 32,
  className,
}: {
  iconUrl: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const src = proxiedImage(iconUrl);
  const box = { width: size, height: size };

  return src ? (
    <img
      src={src}
      alt=""
      style={box}
      loading="lazy"
      className={cn("shrink-0 rounded-md bg-muted object-cover", className)}
    />
  ) : (
    <span
      aria-hidden
      style={box}
      className={cn(
        "grid shrink-0 place-items-center rounded-md bg-muted font-mono text-xs text-muted-foreground",
        className,
      )}
    >
      {[...name][0]?.toUpperCase() ?? "?"}
    </span>
  );
}
