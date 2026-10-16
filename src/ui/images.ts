const MRVL_ORIGIN = "https://www.mrvl.net";

export function proxiedImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const absolute = url.startsWith("/") ? MRVL_ORIGIN + url : url;
  return `/api/image?u=${encodeURIComponent(absolute)}`;
}
