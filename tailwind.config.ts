import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        mist: "#f6f7fb",
        accent: "#0f766e",
        accentWarm: "#f97316",
        line: "#d7dbe7",
      },
      boxShadow: {
        panel: "0 22px 50px rgba(15, 23, 42, 0.12)",
      },
      fontFamily: {
        sans: ['"Avenir Next"', '"Trebuchet MS"', '"Segoe UI"', "sans-serif"],
        display: ['"Arial Black"', '"Avenir Next Condensed"', '"Trebuchet MS"', "sans-serif"],
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top, rgba(15,118,110,0.14), transparent 34%), radial-gradient(circle at bottom right, rgba(249,115,22,0.16), transparent 28%)",
      },
    },
  },
  plugins: [],
};

export default config;
