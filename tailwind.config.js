/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#141414",
          card: "#1e1e1e",
          elevated: "#2a2a2a",
        },
        border: {
          subtle: "#2a2a2a",
          muted: "#222222",
        },
        accent: {
          orange: "#F97316",
          blue: "#38bdf8",
          green: "#22c55e",
          red: "#ef4444",
        },
        text: {
          primary: "#ffffff",
          secondary: "#cccccc",
          muted: "#888888",
          faint: "#555555",
        },
      },
    },
  },
  plugins: [],
};
