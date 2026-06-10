import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182033",
        paper: "#f7f7f2",
        line: "#dcd9cf",
        moss: "#4f6f52",
        coral: "#c7634c",
        steel: "#456179"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(24, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
