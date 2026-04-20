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

export async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(url(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
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
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
