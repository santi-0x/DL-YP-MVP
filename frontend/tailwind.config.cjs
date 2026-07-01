const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, "index.html"),
    path.join(__dirname, "src/**/*.{ts,tsx}"),
  ],
  theme: {
    extend: {
      colors: {
        ink: "#ffffff",
        panel: "#ffffff",
        panel2: "#fff6ec",
        line: "#f0d7c4",
        bone: "#1c140e",
        mute: "#8d7360",
        acid: "#0e7c68",
        ember: "#d12626",
        gold: "#b86a00",
        paper: "#fff1df",
        ink2: "#1c140e",
      },
      fontFamily: {
        serif: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
