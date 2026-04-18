/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: {
          950: "#090b10",
          900: "#10141c",
          850: "#151a24",
          800: "#1b2230",
          700: "#283246",
        },
        signal: {
          cyan: "#7dd3fc",
          blue: "#60a5fa",
          green: "#86efac",
          amber: "#fcd34d",
          red: "#f87171",
          violet: "#c4b5fd",
        },
      },
      boxShadow: {
        glow: "0 0 38px rgba(125, 211, 252, 0.18)",
      },
    },
  },
  plugins: [],
};
