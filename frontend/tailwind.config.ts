import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        paper: "#f4f6f8",
        line: "#d7dee8",
        moss: "#4f7a63",
        coral: "#c65d45",
        steel: "#36678f",
        amber: "#b88734"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(23, 32, 51, 0.08)",
        panel: "0 1px 0 rgba(23, 32, 51, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
