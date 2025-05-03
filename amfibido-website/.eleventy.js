const { DateTime } = require("luxon");
// const eleventyPluginPostcss = require("eleventy-plugin-postcss"); // Removed

module.exports = function(eleventyConfig) {
  // Add PostCSS plugin
  // eleventyConfig.addPlugin(eleventyPluginPostcss, {}); // Removed

  // Copy image files to output
  eleventyConfig.addPassthroughCopy("images");

  // Date filter using Luxon
  eleventyConfig.addFilter("date", (dateObj, format = "yyyy") => {
    return DateTime.fromJSDate(dateObj, {zone: 'utc'}).toFormat(format);
  });

  // Add build timestamp
  let now = new Date();
  eleventyConfig.addGlobalData("build", {
      timestamp: now
  });

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
  };
};
