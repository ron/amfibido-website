const { DateTime } = require("luxon");
// const eleventyPluginPostcss = require("eleventy-plugin-postcss"); // Removed

module.exports = function(eleventyConfig) {
  // Add PostCSS plugin
  // eleventyConfig.addPlugin(eleventyPluginPostcss, {}); // Removed

  // Add a buildTime global data to help with cache busting
  eleventyConfig.addGlobalData("buildTime", () => Date.now());

  // Copy static files
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("fonts");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("documents");
  // Do NOT copy CSS files - they are processed by PostCSS
  eleventyConfig.addPassthroughCopy("_headers");
  eleventyConfig.addPassthroughCopy(".nojekyll");
  // Copy SEO files
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap.xml");

  // Make sure the processed CSS directory exists
  eleventyConfig.on('eleventy.before', async () => {
    const fs = require('fs');
    const path = require('path');

    if (!fs.existsSync(path.join('_site', 'css'))) {
      fs.mkdirSync(path.join('_site', 'css'), { recursive: true });
    }
  });

  // Date filter using Luxon
  eleventyConfig.addFilter("date", (dateObj, format = "yyyy") => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat(format);
  });

  // Add build timestamp
  let now = new Date();
  eleventyConfig.addGlobalData("build", {
      timestamp: now
  });

  // Check if this is a production build (GitHub Actions sets this to "production")
  const isProd = process.env.ELEVENTY_ENV === "production";

  // Specify input and output directories
  // eleventyConfig.addPassthroughCopy("css"); // We no longer need this, PostCSS handles CSS

  return {
    dir: {
      input: ".",        // Use root directory for input files
      includes: "_includes", // Directory for layouts, partials, etc.
      output: "_site"      // Directory where the built site will go
    },
    templateFormats: ["njk", "md", "html"], // Process Nunjucks, Markdown, and HTML files
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    pathPrefix: isProd ? "" : "/", // Use empty string for custom domain in production
  };
};
