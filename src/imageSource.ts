const ALLOWED = [
  { origin: "https://liquipedia.net", pathPrefix: "/commons/images/" },
  { origin: "https://www.mrvl.net", pathPrefix: "/images/" },
];

export function imageSource(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const allowed = ALLOWED.some(
    (a) => url.origin === a.origin && url.pathname.startsWith(a.pathPrefix),
  );
  if (!allowed) return null;
  url.hash = "";
  return url;
}
