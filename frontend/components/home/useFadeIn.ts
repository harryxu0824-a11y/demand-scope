"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll-triggered fade-in. Element starts translateY(20px) opacity-0, flips to
 * translateY(0) opacity-100 on first intersection. Fires once.
 */
export function useFadeIn<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const className = visible
    ? "translate-y-0 opacity-100"
    : "translate-y-5 opacity-0";

  return { ref, className };
}
