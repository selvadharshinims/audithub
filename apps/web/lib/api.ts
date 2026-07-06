const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export const ACCESS_TOKEN_KEY = "audithub.access";
export const REFRESH_TOKEN_KEY = "audithub.refresh";
export const QUERY_CACHE_KEY = "audithub.rq-cache";

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

/**
 * Wipes all client-side session state: auth tokens AND the persisted TanStack
 * Query cache. Clearing the query cache is important — otherwise the next user
 * on this device would briefly see the previous user's data restored from
 * localStorage before it refetches (cross-tenant leak).
 */
export function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(QUERY_CACHE_KEY);
}

const AUTH_PATH = /^\/(login|signup|forgot|reset)(\/|$)/;

// Access tokens are short-lived (15m). When one expires mid-session we silently
// exchange the refresh token for a fresh pair and retry the request, so the user
// is never kicked out while their 7-day refresh token is still valid.
//
// `refreshInFlight` coalesces concurrent refreshes: if several requests 401 at
// once (common on a page with many queries), only ONE /auth/refresh call is made
// and they all await the same result.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { accessToken: string; refreshToken: string };
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        return data.accessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    // An authenticated request that comes back 401 means the access token is
    // gone or expired. Try once to silently refresh + retry; only if that fails
    // do we tear down the session and bounce to /login (so the app never gets
    // stuck showing error cards forever). Guarded so a failed login's 401 (no
    // token sent) can't hijack the login page, and no redirect loops on auth
    // pages.
    if (
      res.status === 401 &&
      typeof window !== "undefined" &&
      !AUTH_PATH.test(window.location.pathname)
    ) {
      if (retry) {
        const fresh = await refreshAccessToken();
        if (fresh) return request<T>(path, init, false);
      }
      clearSession();
      window.location.href = "/login";
    }
    const message =
      typeof body === "object" && body && "error" in body ? String(body.error) : res.statusText;
    const details =
      typeof body === "object" && body && "details" in body ? (body as { details: unknown }).details : undefined;
    throw new ApiError(res.status, message, details);
  }

  return body as T;
}

/**
 * Like `request` but returns the raw `Response` — for endpoints that don't
 * return JSON (file downloads → blobs) or that send `FormData` (uploads, where
 * the browser must set its own multipart Content-Type). Adds the auth header and
 * applies the same silent-refresh-then-retry / logout-on-failure behaviour as
 * the JSON client, so downloads/uploads survive a mid-session token expiry too.
 */
export async function authFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_KEY) : null;
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (
    res.status === 401 &&
    token &&
    typeof window !== "undefined" &&
    !AUTH_PATH.test(window.location.pathname)
  ) {
    if (retry) {
      const fresh = await refreshAccessToken();
      if (fresh) return authFetch(path, init, false);
    }
    clearSession();
    window.location.href = "/login";
  }
  return res;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};
