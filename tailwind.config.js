module.exports = Object.assign({
      darkMode: "class",
      theme: {
        extend: {
          colors: {
            "surface": "#14151b",
            "surface-container": "#1a1c24",
            "surface-container-high": "#232631",
            "surface-container-lowest": "#0d0e12",
            "primary": "#d4af37",
            "primary-container": "#c5a059",
            "primary-fixed": "#ffdea5",
            "on-surface": "#f5f3ef",
            "on-surface-variant": "#c7c4be",
            "outline": "#8a7a58",
            "outline-variant": "rgba(212, 175, 55, 0.2)"
          },
          fontFamily: {
            sans: ["Rubik", "sans-serif"],
            display: ["Rubik", "sans-serif"]
          }
        }
      }
    }, {
  content: ["./*.html"],
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/container-queries")],
});
