/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#6C63FF",
        secondary: "#1a1a2e",
        accent: "#e94560",
        background: "#0f0f23",
        surface: "#16213e",
        aura: {
          gold: "#FFD700",
          green: "#00C853",
          red: "#FF1744",
        },
      },
    },
  },
  plugins: [],
};
