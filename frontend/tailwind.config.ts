import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#ffffff",
        panel: "#f8f9fb",
        border: "#eef0f4",
        muted: "#6b7280",
        fg: "#111827",
        accent: "#5b3df5",
        ok: "#16a34a",
        warn: "#d97706",
        err: "#dc2626",
        info: "#2563eb",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo"],
      },
    },
  },
};
export default config;
