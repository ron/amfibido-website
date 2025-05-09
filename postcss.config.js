module.exports = (ctx) => {
  const isProd = ctx.env === 'production';
  console.log(`PostCSS: Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

  return {
    map: !isProd,
    plugins: [
      require('tailwindcss')({
        config: './tailwind.config.js',
      }),
      require('autoprefixer'),
      ...(isProd ? [require('cssnano')({ preset: 'default' })] : [])
    ]
  };
}
