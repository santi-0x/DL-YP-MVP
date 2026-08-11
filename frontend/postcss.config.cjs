const { resolve } = require("path");
const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");

module.exports = {
  plugins: [
    tailwindcss({ config: resolve(__dirname, "tailwind.config.cjs") }),
    autoprefixer(),
  ],
};
