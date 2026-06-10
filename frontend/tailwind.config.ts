import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#12312d",
        paper: "#eef8f4",
        mist: "#e3f1ec",
        line: "#c9dfd7",
        muted: "#5f726d",
        moss: "#34805c",
        coral: "#d76547",
        steel: "#2f73a7",
        amber: "#c98f2e"
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
