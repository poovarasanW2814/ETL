/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f8fafc",
        glow: "#f59e0b",
        pine: "#15803d",
        ember: "#dc2626",
        haze: "#e2e8f0",
      },
      fontFamily: {
        sans: ['"Manrope"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 18px 60px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};
