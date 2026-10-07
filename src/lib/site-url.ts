import "server-only";
import { headers } from "next/headers";

const trimSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * The public base URL of the app, without a trailing slash (e.g. "https://mentor-mentee-nu.vercel.app").
 * Used for links that leave the app: email confirmation, admin invites.
 *
 * Order:
 *   1. SITE_URL (or NEXT_PUBLIC_SITE_URL) if set: the explicit choice always wins.
 *   2. The host of the current request (correct on production, previews and localhost).
 *   3. VERCEL_URL (set by Vercel on every deployment).
 *   4. http://localhost:3000
 *
 * Supabase only honours redirect URLs that are on its allow-list
 * (Authentication -> URL Configuration), so a spoofed Host header cannot send people elsewhere.
 */
export async function getSiteUrl(): Promise<string> {
  const fromEnv = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv?.trim()) return trimSlash(fromEnv.trim());

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const isLocal =
        host.startsWith("localhost") || host.startsWith("127.0.0.1");
      const proto =
        h.get("x-forwarded-proto")?.split(",")[0] ??
        (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // called outside a request (build time, scripts): fall through
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/** Where Supabase sends people after they click the email link. */
export async function getAuthCallbackUrl(): Promise<string> {
  return `${await getSiteUrl()}/auth/callback`;
}
