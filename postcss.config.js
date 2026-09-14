module.exports = {
  plugins: {
    // Doit précéder Tailwind : les fichiers importés doivent être inlinés
    // AVANT que Tailwind ne traite les directives @layer et @apply.
    "postcss-import": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};
