# Search and AI discovery

The production build generates `/sitemap.xml` from indexable pages using the shared layout, including all language variants. `lastmod` is deliberately omitted: the build timestamp is not the last significant content change. Run `npm run build:prod` and `npm run check:seo` before deployment; CI checks the same output.

## Content and metadata

- Keep prices in `_data/products.json`. The shop's visible prices, modal prices, homepage starting price, and Product offers use that data. Do not add stock availability unless it is maintained accurately.
- Keep publisher identity and structured data in `lib/seo.js`. Game information has one stable homepage ID; the catalog lists its three products. This catalog markup does not by itself guarantee Google product rich results, which normally need dedicated product pages.
- Add `noindex: true` to shared-layout utility pages. Standalone HTML pages need their own robots meta tag. Noindex pages stay crawlable and are excluded from the sitemap.
- Language pages have self-canonicals and reciprocal hreflang links. Explicit language URLs override stored preferences. Keep both rulebook and reference language links usable without JavaScript.
- Existing campaign content and `/video/` navigation are preserved. The campaign page is excluded from indexing. The `/rules/` entry point preserves its language redirect and supplies no-JavaScript language links; indexing targets the localized rules pages instead.
- Homepage WebP variants are generated during builds; keep original PNGs as fallbacks. `npm run generate:home-images` regenerates them locally.
- The chatbot still fetches public raw Markdown under `/context/`. That source is copied unchanged, but internal Markdown is excluded from conversion to accidental HTML pages.

## Account actions after deployment

These require the site's owner accounts; no verification token or credentials are stored in this repository.

1. In Google Search Console, verify the `amfibido.com` domain using Google's supplied DNS record (or an existing verified property). Submit `https://amfibido.com/sitemap.xml`. Inspect `/`, `/shop/`, `/gameplay/`, and the three rules language URLs. Request indexing after confirming that the live test sees the updated pages.
2. In Bing Webmaster Tools, import the verified Search Console property or verify the domain directly. Submit the same sitemap and inspect indexing errors.
3. Validate homepage and shop JSON-LD using Schema.org's validator and Google's Rich Results Test. Valid semantic markup does not guarantee a rich result or ranking.
4. Use Search Console's Performance and Page Indexing reports to establish a baseline for clicks, impressions, search terms, and indexed URLs. Compare 28-day periods after release. In the existing GA4 property, use Traffic acquisition and landing-page reports for sources such as `chatgpt.com`, `perplexity.ai`, and `copilot.microsoft.com`. Referrers can be missing, so these reports will undercount AI use; Google AI-feature traffic is included in web search reporting.
5. Run PageSpeed Insights on the homepage and shop after publishing. Compare mobile LCP/CLS and field data when available; image byte savings alone are not a measured Core Web Vitals improvement.

## Independent references and future content

- Check for an existing BoardGameGeek entry and update it instead of creating a duplicate. Use the same product name, publisher, player count, age, playing time, and official website URL.
- Ask retailers, reviewers, and convention organizers who already feature the game to include accurate product facts and the official link. These are external communications and need explicit authorization before an agent sends them.
- Content rewrites and the added gameplay quick-start have been reverted. Any future visible copy changes should be proposed for review first; keep existing rulebook content and PDFs intact.
- Create dedicated product pages if product search becomes a priority. Keep individual offers and shipping information accurate before pursuing Merchant Center.
- Leave `robots.txt` open for discovery. Explicit AI-bot allow sections are unnecessary with the wildcard allow rule. Search crawler access and model-training preferences are separate decisions. `llms.txt` is optional and has no assumed ranking benefit.
