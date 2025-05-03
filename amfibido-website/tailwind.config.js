const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.{html,njk,md}", // Scan all html, nunjucks, and markdown files
    "./_includes/**/*.njk"  // Be specific about includes folder too
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
