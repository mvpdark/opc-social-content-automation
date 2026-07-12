import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        mist: "rgb(var(--mist) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        moss: "rgb(var(--moss) / <alpha-value>)",
        coral: "rgb(var(--coral) / <alpha-value>)",
        blush: "rgb(var(--blush) / <alpha-value>)",
        steel: "rgb(var(--steel) / <alpha-value>)",
        amber: "rgb(var(--amber) / <alpha-value>)",
        sand: "rgb(var(--sand) / <alpha-value>)",
        sage: "rgb(var(--sage) / <alpha-value>)",
        cream: "rgb(var(--cream) / <alpha-value>)",
        shell: "rgb(var(--shell) / <alpha-value>)"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(18, 49, 45, 0.08)",
        panel: "0 1px 0 rgba(18, 49, 45, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
