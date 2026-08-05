import type { Config } from "tailwindcss";

// Design tokens: black/white/gray base, blue accent (Netdrix default), applied
// with restraint — the accent is reserved for primary actions and live-data states,
// not decoration.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0C0E",
        paper: "#FAFAFA",
        line: "#E4E4E7",
        muted: "#71717A",
        accent: {
          DEFAULT: "#2563EB",
          soft: "#EFF4FF",
          dark: "#1D4ED8",
        },
        success: "#16A34A",
        warn: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
    },
  },
  plugins: [],
};

export default config;
