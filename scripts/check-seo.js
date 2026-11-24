const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { structuredData } = require('../lib/seo');
const origin = 'https://amfibido.com';
const output = path.join(__dirname, '..', '_site');
const read = url => fs.readFileSync(path.join(output, url === '/' ? 'index.html' : `${url}index.html`), 'utf8');
const sitemap = fs.readFileSync(path.join(output, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
const required = ['/', '/shop/', '/gameplay/', ...['en', 'nl', 'de'].flatMap(lang => [`/rules/${lang}/`, `/rules/${lang}/reference/`])];
for (const url of required) assert(urls.includes(origin + url), `Missing from sitemap: ${url}`);
for (const absolute of urls) {
  assert(absolute.startsWith(origin) && absolute.endsWith('/'), `Non-canonical sitemap URL: ${absolute}`);
  const url = absolute.slice(origin.length), html = read(url);
  assert(html.includes(`<link rel="canonical" href="${absolute}">`), `Canonical mismatch: ${url}`);
  assert(!html.includes('noindex'), `Noindex page in sitemap: ${url}`);
  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
}
for (const url of ['/landing/', '/thankyou/', '/order-confirmation/', '/video/', '/rules/']) {
  assert(read(url).includes('noindex, follow'), `Utility page indexable: ${url}`);
  assert(!urls.includes(origin + url), `Utility page in sitemap: ${url}`);
}
for (const lang of ['en', 'nl', 'de']) {
  for (const suffix of ['', 'reference/']) {
    const html = read(`/rules/${lang}/${suffix}`);
    assert(html.includes(`<html lang="${lang}"`));
    for (const alternate of ['en', 'nl', 'de']) {
      assert(html.includes(`hreflang="${alternate}" href="${origin}/rules/${alternate}/${suffix}"`));
      assert(html.includes(`href="/rules/${alternate}/${suffix}"`), 'Missing real language link');
    }
  }
}
const hub = read('/rules/');
assert(hub.includes('<noscript>'), 'Rules language links must work without JavaScript');
for (const lang of ['en', 'nl', 'de']) assert(hub.includes(`href="/rules/${lang}/"`));
const shop = read('/shop/');
assert(shop.includes('<div id="shop-products">'), 'Catalog must be visible without JS');
assert.equal((shop.match(/<button type="button" disabled aria-disabled="true"[^>]*data-product=/g) || []).length, 3, 'All buy buttons must wait for shipping detection');
for (const inline of shop.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(inline[1]);
const graph = JSON.parse([...shop.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)][0][1])['@graph'];
const products = require('../_data/products.json');
const list = graph.find(item => item['@type'] === 'ItemList');
assert.equal(list.itemListElement.length, 3);
for (const { item } of list.itemListElement) {
  const key = item['@id'].split('#')[1];
  assert.equal(item.offers.price, products[key].price);
  assert.equal(item.offers.priceCurrency, 'EUR');
  assert(shop.includes(`€${item.offers.price.replace('.', ',')}`));
  assert(shop.includes(`id="${key}"`));
}
assert(!shop.includes('Currently in development') && !shop.includes('schema.org/PreOrder'));
const escaped = structuredData('/', '</script><script>alert(1)</script>', 'A "quote" & text');
assert(!escaped.includes('</script>'));
assert.equal(JSON.parse(escaped)['@graph'][2].name, '</script><script>alert(1)</script>');
const home = read('/');
for (const match of home.matchAll(/srcset="(\/images\/optimized\/[^" ]+)"/g)) {
  assert(fs.existsSync(path.join(output, match[1])), `Missing optimized image: ${match[1]}`);
}
for (const p of ['context/rules.md', 'context/cards.md', 'context/product.md', 'context/reminders.md']) assert(fs.existsSync(path.join(output, p)), `Chatbot source missing: ${p}`);
for (const p of ['README/index.html', 'workers/chat/AGENTS/index.html', 'context/rules/index.html', 'docs/seo/index.html']) assert(!fs.existsSync(path.join(output, p)), `Internal documentation published: ${p}`);
// A stored preference must never override the explicit rules/reference URL.
for (const suffix of ['', 'reference/']) {
  let stored = 'en';
  const window = { location: { pathname: `/rules/nl/${suffix}` }, localStorage: { getItem: () => stored, setItem: (_, value) => { stored = value; } } };
  const document = { documentElement: { getAttribute: () => 'nl' }, querySelectorAll: () => [], getElementById: () => null, querySelector: () => null };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js/i18n.js'), 'utf8'), { window, document, localStorage: window.localStorage, fetch: () => Promise.reject(new Error('offline')) });
  assert.equal(window.AmfibidoI18n.getLang(), 'nl');
  assert.equal(stored, 'nl');
}
console.log(`SEO checks passed: ${urls.length} canonical pages, all language variants, JSON-LD, prices, crawler fallbacks, and chatbot sources.`);
