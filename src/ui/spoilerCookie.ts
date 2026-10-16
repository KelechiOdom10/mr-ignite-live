export const SPOILER_COOKIE = "ignite-live-hide-spoilers";
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export function spoilersHiddenIn(cookieHeader: string | undefined): boolean {
  return (cookieHeader ?? "").split(";").some((pair) => pair.trim() === `${SPOILER_COOKIE}=1`);
}

export function spoilerCookie(hidden: boolean): string {
  return `${SPOILER_COOKIE}=${hidden ? "1" : "0"}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
