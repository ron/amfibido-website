const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./_site/**/*.{html,js}",
    "./**/*.njk",
    "./**/*.html",
    "./**/*.md",
    "!./node_modules/**/*",  // Explicitly exclude node_modules
    "!./_site/node_modules/**/*",  // Also exclude node_modules in _site if it exists
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        headings: ['Poppins', 'sans-serif'] // Custom font family for headings
      },
      colors: { // Extend the default palette with our custom colors
        'primary': '#228B22',   // Forest Green
        'secondary': '#8D6E63', // Brown
        'accent': '#FFA500',     // Orange/Gold
        'brand-background': '#FAF3E0', // Linen
        'brand-text': '#333333',  // Dark Gray
      }
    },
  },
  plugins: [],
}
