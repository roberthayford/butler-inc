/**
 * Resolve the canonical site origin for building absolute URLs (e.g. Supabase
 * `emailRedirectTo`). Priority:
 *   1. The incoming request's origin — always matches the host the user is on,
 *      so works for prod, staging, Vercel previews, and local dev with zero config.
 *   2. `NEXT_PUBLIC_SITE_URL` — explicit per-env override (set in Vercel project
 *      env vars per environment).
 *   3. `http://localhost:3000` — final fallback for tests and bare local runs.
 *
 * In the browser, callers should use `window.location.origin` directly — this
 * helper is for server contexts where there is no `window`.
 */
type RequestLike = { url: string };

export function getSiteUrl(request?: RequestLike): string {
  if (request) {
    return new URL(request.url).origin;
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  return "http://localhost:3000";
}
