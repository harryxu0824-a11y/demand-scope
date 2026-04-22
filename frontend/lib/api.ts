const TOKEN_KEY = "demand-scope:access_token";

// Direct-to-backend base URL. Avoids Next.js dev proxy, which can break
// long-running (>60s) requests like /api/run-reddit. Backend CORS must allow
// the frontend origin — configured via APP_ALLOWED_ORIGINS on the server.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function url(path: string): string {
  return `${API_BASE}${path}`;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

async function throwFriendlyError(res: Response): Promise<never> {
  let detail = "";
  try {
    const body = await res.json();
    detail = typeof body?.detail === "string" ? body.detail : "";
  } catch {
    detail = await res.text().catch(() => "");
  }
  if (res.status === 429) {
    throw new Error(
      detail ||
        "Daily usage limit reached. Come back tomorrow, or self-host from the GitHub repo.",
    );
  }
  throw new Error(detail ? `${res.status} ${detail}` : `${res.status}`);
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(url(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) await throwFriendlyError(res);
  return res.json();
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(url(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwFriendlyError(res);
  return res.json();
}
