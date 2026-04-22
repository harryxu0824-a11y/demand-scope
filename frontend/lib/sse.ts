import { getToken } from "./api";
import type { StreamEvent } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

/**
 * POST to an SSE endpoint, invoke `onEvent` for each event parsed from the
 * text/event-stream response. Resolves when the server closes the stream.
 *
 * Uses fetch + ReadableStream so we can include a Bearer token header
 * (EventSource doesn't support custom headers).
 */
export async function streamPost(
  path: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const parsed = JSON.parse(await res.text());
      detail = typeof parsed?.detail === "string" ? parsed.detail : "";
    } catch {
      // fall through
    }
    if (res.status === 429) {
      throw new Error(
        detail ||
          "Daily usage limit reached. Come back tomorrow, or self-host from the GitHub repo.",
      );
    }
    throw new Error(detail ? `${res.status} ${detail}` : `${res.status}`);
  }
  if (!res.body) throw new Error("response has no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    for (const frame of frames) {
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const json = line.slice(5).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json) as StreamEvent);
      } catch {
        // skip malformed frame
      }
    }
  }
}
