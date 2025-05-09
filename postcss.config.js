module.exports = ctx => ({
  plugins: {
    tailwindcss: { config: './tailwind.config.js' },
    autoprefixer: {},
    ...(ctx.env === 'production' ? { cssnano: { preset: 'default' } } : {})
  }
})
