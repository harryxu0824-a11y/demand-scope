"use client";

import { useEffect, useState } from "react";
import { apiGet, getToken, setToken } from "@/lib/api";
import { Button } from "./ui/Button";
import { Card, CardDescription, CardTitle } from "./ui/Card";

export function TokenGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [input, setInput] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = getToken();
    if (!t) return setAuthed(false);
    apiGet("/api/me")
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null)
    return <div className="p-8 text-muted">Checking access…</div>;

  if (authed) return <>{children}</>;

  return (
    <div className="mx-auto mt-24 max-w-md">
      <Card>
        <CardTitle>Access token required</CardTitle>
        <CardDescription>
          Paste the token you were given. It is stored locally in this browser only.
        </CardDescription>
        <form
          className="mt-4 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setErr(null);
            setToken(input.trim());
            try {
              await apiGet("/api/me");
              setAuthed(true);
            } catch (e) {
              setErr(String(e));
            }
          }}
        >
          <input
            autoFocus
            className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="token_…"
          />
          {err && <p className="text-xs text-err">{err}</p>}
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </Card>
    </div>
  );
}
