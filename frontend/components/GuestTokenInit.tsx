"use client";

import { useEffect } from "react";
import { setToken } from "@/lib/api";

export function GuestTokenInit() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) return;
    setToken(t);
    params.delete("token");
    const q = params.toString();
    const cleanUrl =
      window.location.pathname +
      (q ? `?${q}` : "") +
      window.location.hash;
    window.history.replaceState({}, "", cleanUrl);
  }, []);
  return null;
}
