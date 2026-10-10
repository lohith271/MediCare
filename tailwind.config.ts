import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        dark: {
          bg: "#071410",
          card: "#0b1d17",
          cardHover: "#102921",
          surface: "#0f261e",
          border: "#183b30",
          borderLight: "#265446",
        },
      },
      backgroundImage: {
        "radial-glow": "radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.15), transparent 70%)",
        "radial-glow-top": "radial-gradient(ellipse at 80% 20%, rgba(52, 211, 153, 0.12), transparent 50%)",
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(16, 185, 129, 0.3)",
        "glow-lg": "0 0 50px -10px rgba(16, 185, 129, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
