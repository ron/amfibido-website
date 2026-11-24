// Builds a shareable page from a card list in this folder.
//
//   node card-designs/build.mjs                        -> amfibido-new-cards.html (from README.md)
//   node card-designs/build.mjs --pdf                  -> also amfibido-new-cards.pdf (needs Google Chrome)
//   node card-designs/build.mjs level-1-equipment.md   -> amfibido-level-1-equipment.html
//
// The markdown file stays the source of truth. Edit a card there and run this again.

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const SOURCE = path.basename(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'README.md');
const OUT_NAME =
  SOURCE === 'README.md' ? 'amfibido-new-cards' : `amfibido-${path.basename(SOURCE, '.md')}`;
const OUT_HTML = path.join(here, `${OUT_NAME}.html`);
const OUT_PDF = path.join(here, `${OUT_NAME}.pdf`);
const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const SECTIONS = ['Fighters', 'Equipment', 'Actions', 'Sensei'];

// ---------- parse the markdown ----------

function parse(md) {
  const title = (md.match(/^# (?:Amfibido: )?(.+)$/m) ?? [])[1];
  if (!title) throw new Error(`${SOURCE} needs a "# Title" line`);
  const sections = [];
  const watchlist = [];
  const overview = [];
  let section = null;
  let card = null;
  let inCode = false;
  let inWatchlist = false;

  for (const line of md.split('\n')) {
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      const field = line.match(/^([A-Z_]+):\s*(.*)$/);
      if (card && field) card.fields[field[1]] = field[2];
      continue;
    }

    let m;
    if ((m = line.match(/^## (.+)$/))) {
      card = null;
      inWatchlist = /watchlist/i.test(m[1]);
      section = SECTIONS.includes(m[1]) ? { title: m[1], note: [], cards: [] } : null;
      if (section) sections.push(section);
    } else if (section && (m = line.match(/^### (\d+)\. (.+)$/))) {
      card = { num: Number(m[1]), name: m[2], fields: {}, why: '', rulings: [] };
      section.cards.push(card);
    } else if ((m = line.match(/^\| (\d+) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \| (.+?) \|$/))) {
      overview.push({ num: m[1], name: m[2], level: m[3], type: m[4], power: m[5], short: m[6] });
    } else if (inWatchlist && (m = line.match(/^- \*\*(.+?):\*\* (.+)$/))) {
      watchlist.push({ name: m[1], text: m[2] });
    } else if (card && (m = line.match(/^\*\*Why:\*\* (.+)$/))) {
      card.why = m[1];
    } else if (card && (m = line.match(/^- (.+)$/))) {
      card.rulings.push(m[1]);
    } else if (section && !card && line.trim() && line.trim() !== '---') {
      section.note.push(line.trim());
    }
  }

  for (const s of sections) {
    for (const c of s.cards) {
      for (const key of ['CARD', 'LEVEL', 'CARD_TYPE', 'ABILITY']) {
        if (!c.fields[key]) throw new Error(`Card ${c.num} (${c.name}) is missing ${key}`);
      }
      if (!c.why) throw new Error(`Card ${c.num} (${c.name}) is missing its "Why" line`);
    }
  }
  if (!sections.length) throw new Error(`No card sections found in ${SOURCE}`);
  return { title, sections, watchlist, overview };
}

// ---------- formatting helpers ----------

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Notes and rulings: escape, then allow `code` and **bold**.
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

const minus = (s) => s.replace(/^-/, '\u2212');

// Card text, styled like the printed cards: red pills for power, bold keywords,
// and an underlined cost on action abilities.
function abilityHtml(text, isActionAbility) {
  const style = (s) =>
    esc(s)
      .replace(
        /(^|[\s(])([+-]\d+|\+\*)(?=[\s.,)]|$)/g,
        (_, pre, n) => `${pre}<span class="nc-pill">${minus(n)}</span>`
      )
      .replace(
        /\b(transform(?:s|ed)?|knockout|knocked out|boomerang|switcheroo|neutralized?)\b/gi,
        '<b>$1</b>'
      );
  const colon = text.indexOf(':');
  if (isActionAbility && colon > 0) {
    // The cost is the sentence that ends at the colon, not everything before it.
    const start = text.lastIndexOf('. ', colon) + 1 || 0;
    const lead = text.slice(0, start);
    const cost = text.slice(start, colon).trimStart();
    return `${style(lead)}${lead ? ' ' : ''}<u>${style(cost)}</u>${style(text.slice(colon))}`;
  }
  return style(text);
}

function describe(card) {
  const f = card.fields;
  const type = f.CARD_TYPE;
  const kind = type.split(' - ')[0].toLowerCase(); // fighter | equipment | action | sensei
  const tribe = kind === 'fighter' ? type.split(' - ')[1].toLowerCase() : kind;
  const level = f.LEVEL === 'Sensei' ? null : f.LEVEL;
  let power = null;
  if (f.BASE_POWER) power = { cls: 'base', text: f.BASE_POWER, label: `Base power ${f.BASE_POWER}` };
  else if (f.POWER) power = { cls: 'bonus', text: minus(f.POWER), label: `Power ${minus(f.POWER)}` };
  return { type, kind, tribe, level, power };
}

// ---------- rendering ----------

function cardHtml(card, icons) {
  const d = describe(card);
  const tab = d.level
    ? `<div class="nc-tab"><img src="${icons[d.kind]}" alt=""><img src="${icons[d.level]}" alt="Level ${d.level}"></div>`
    : '';
  const power = d.power
    ? `<div class="nc-power nc-power-${d.power.cls}">${esc(d.power.text)}</div>`
    : '';
  const classes = [
    'nc-card',
    `nc-tribe-${d.tribe}`,
    d.level ? `nc-lvl-${d.level}` : 'nc-lvl-sensei',
    d.power ? `nc-has-${d.power.cls}` : '',
    // A power like "2+*" needs a wider corner, so the text box sits above it.
    d.power && d.power.text.length > 2 ? 'nc-stack' : '',
  ].join(' ');
  return `
      <div class="${classes}">
        <div class="nc-art">
          <div class="nc-belt"><span class="nc-name">${esc(card.name)}</span></div>
          ${tab}
          <div class="nc-ability">${abilityHtml(card.fields.ABILITY, card.fields.ACTION_ABILITY === 'TRUE')}</div>
          ${power}
        </div>
        <div class="nc-foot"><span>${esc(d.type)}</span><small>Prototype</small></div>
      </div>`;
}

function entryHtml(card, icons) {
  const d = describe(card);
  const meta = [d.level ? `Level ${d.level}` : 'Sensei', d.level ? d.type : null, d.power?.label]
    .filter(Boolean)
    .map(esc)
    .join(' &middot; ');
  const rulings = card.rulings.length
    ? `<h4>Rulings</h4>
        <ul>${card.rulings.map((r) => `<li>${inline(r)}</li>`).join('')}</ul>`
    : '';
  return `
    <article class="nc-entry">${cardHtml(card, icons)}
      <div class="nc-notes">
        <p class="nc-num">Card ${card.num}</p>
        <h3>${esc(card.name)}</h3>
        <p class="nc-meta">${meta}</p>
        <p>${inline(card.why)}</p>
        ${rulings}
      </div>
    </article>`;
}

function pageHtml({ title, sections, watchlist, overview }, icons, logo) {
  const total = sections.reduce((n, s) => n + s.cards.length, 0);
  const cards = (n) => `${n} ${n === 1 ? 'card' : 'cards'}`;
  const counts = sections.map((s) => `${s.cards.length} ${s.title.toLowerCase()}`);
  const countText =
    counts.length > 1 ? `${counts.slice(0, -1).join(', ')} and ${counts.at(-1)}` : `${counts[0]} cards`;
  const intro =
    total === 1
      ? 'This is a text-only mock-up of one card and it has not been playtested. It comes with the idea behind it and a few rulings.'
      : `${countText[0].toUpperCase()}${countText.slice(1)}. These are text-only mock-ups and none of them have been playtested. Each card comes with the idea behind it and a few rulings.`;
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const body = sections
    .map(
      (s) => `
  <section>
    <div class="nc-keep">
    <h2>${esc(s.title)} <small>${cards(s.cards.length)}</small></h2>
    ${s.note.map((n) => `<p class="nc-section-note">${inline(n)}</p>`).join('')}
    ${entryHtml(s.cards[0], icons)}
    </div>
    ${s.cards.slice(1).map((c) => entryHtml(c, icons)).join('')}
  </section>`
    )
    .join('');

  const glance = overview.length
    ? `
  <section class="nc-glance${overview.length > 10 ? ' nc-glance-long' : ''}">
    <h2>At a glance <small>${overview.length} cards</small></h2>
    <table>
      <thead><tr><th>#</th><th>Card</th><th>Level</th><th>Type</th><th>Power</th><th>In short</th></tr></thead>
      <tbody>${overview
        .map(
          (r) =>
            `<tr><td>${esc(r.num)}</td><td><strong>${esc(r.name)}</strong></td><td>${esc(r.level)}</td><td>${esc(r.type)}</td><td>${esc(minus(r.power))}</td><td>${inline(r.short)}</td></tr>`
        )
        .join('')}</tbody>
    </table>
  </section>`
    : '';

  const watch = watchlist.length
    ? `
  <section class="nc-watch">
    <h2>Needs testing</h2>
    <p class="nc-section-note">These are the ${total === 1 ? 'parts' : 'cards'} most likely to change after playtesting.</p>
    <ul>${watchlist.map((w) => `<li><strong>${esc(w.name)}.</strong> ${inline(w.text)}</li>`).join('')}</ul>
  </section>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Amfibido: ${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="nc-hero">
  <img src="${logo}" alt="Amfibido: A Dojo Duel" width="220" height="154">
  <p class="nc-tag">Prototype cards</p>
  <h1>${esc(title)}</h1>
  <p>${intro}</p>
</header>
<main>${glance}${body}${watch}
</main>
<footer class="nc-footer">Amfibido prototype cards &middot; ${esc(month)}</footer>
</body>
</html>
`;
}

const CSS = `
:root {
  --linen: #faf3e0; --ink: #26302b; --muted: #5f6b64; --line: #e2d7b8;
  --obsidian: #0e1f1a; --forest: #1b3a32; --lime: #a3ff3f; --orange: #ff6b1f;
  --sans: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --head: 'Space Grotesk', var(--sans);
  --serif: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; background: var(--linen); color: var(--ink);
  font: 16px/1.6 var(--sans);
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.nc-hero {
  background: var(--obsidian); color: #e8ecea; text-align: center;
  padding: 32px 20px 38px;
  border-bottom: 5px solid; border-image: linear-gradient(to right, var(--lime), var(--orange)) 1;
}
.nc-hero img { width: 220px; max-width: 60%; height: auto; }
.nc-tag {
  margin: 14px 0 0; color: var(--lime); font-size: 12px; font-weight: 700;
  letter-spacing: .14em; text-transform: uppercase;
}
.nc-hero h1 { font: 700 38px/1.15 var(--head); margin: 4px 0 12px; }
.nc-hero p:last-child { max-width: 600px; margin: 0 auto; color: #c3cdc7; }
main { max-width: 860px; margin: 0 auto; padding: 4px 20px 40px; }
h2 {
  font: 700 26px/1.2 var(--head); margin: 44px 0 0; padding-bottom: 8px;
  border-bottom: 3px solid var(--forest);
  display: flex; justify-content: space-between; align-items: baseline;
  break-after: avoid;
}
h2 small { font: 600 14px var(--sans); color: var(--muted); }
.nc-section-note { color: var(--muted); margin: 12px 0 0; }

.nc-entry {
  display: grid; grid-template-columns: 270px 1fr; gap: 30px; align-items: start;
  padding: 28px 0; border-bottom: 1px solid var(--line); break-inside: avoid;
}
.nc-num {
  margin: 0; color: var(--muted); font-size: 12px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
}
.nc-notes h3 { font: 700 24px/1.2 var(--head); margin: 2px 0 0; }
.nc-meta { color: var(--muted); font-size: 14px; font-weight: 600; margin: 4px 0 12px; }
.nc-notes p { margin: 0 0 12px; }
.nc-notes h4 {
  margin: 18px 0 6px; color: var(--muted); font-size: 12px; font-weight: 700;
  letter-spacing: .12em; text-transform: uppercase;
}
.nc-notes ul, .nc-watch ul { margin: 0; padding-left: 20px; }
.nc-notes li { font-size: 15px; margin-bottom: 5px; }
code { font-size: .9em; background: #efe6cb; padding: 1px 5px; border-radius: 4px; }

.nc-glance { overflow-x: auto; }
.nc-glance table { width: 100%; margin-top: 12px; border-collapse: collapse; font-size: 14px; }
.nc-glance th {
  text-align: left; color: var(--muted); font-size: 11px; font-weight: 700;
  letter-spacing: .1em; text-transform: uppercase; padding: 4px 8px;
}
.nc-glance td { padding: 5px 8px; border-top: 1px solid var(--line); vertical-align: top; }
.nc-glance td:nth-child(-n+5) { white-space: nowrap; }
.nc-glance td:first-child, .nc-glance td:nth-child(5) { color: var(--muted); }

.nc-watch ul {
  margin-top: 16px; padding: 18px 22px 12px 40px; background: #fff8e6;
  border: 1px solid var(--line); border-left: 5px solid var(--orange); border-radius: 8px;
}
.nc-watch li { margin-bottom: 9px; break-inside: avoid; }
.nc-footer { text-align: center; color: var(--muted); font-size: 13px; padding: 0 20px 36px; }

/* ----- the card ----- */
.nc-card {
  width: 270px; aspect-ratio: 5 / 7; padding: 8px 8px 0; border-radius: 14px;
  background: #000; color: #fff; font-family: var(--serif);
  display: flex; flex-direction: column;
  box-shadow: 0 10px 22px rgba(14, 31, 26, .3);
}
.nc-art {
  position: relative; flex: 1; overflow: hidden; border-radius: 9px;
  background:
    repeating-linear-gradient(118deg, rgba(255,255,255,.06) 0 2px, transparent 2px 15px),
    radial-gradient(120% 85% at 50% 22%, var(--a1), var(--a2));
}
.nc-belt {
  position: absolute; z-index: 2; left: 7px; right: 7px; top: 12px; height: 40px;
  padding-left: 40px; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(#ffffff, #e4e4e4); border-radius: 5px;
  border-top: 3px solid var(--trim); border-bottom: 3px solid var(--trim);
  box-shadow: 0 3px 7px rgba(0, 0, 0, .4);
}
.nc-name { color: #111; font-size: 22px; font-weight: 700; line-height: 1; white-space: nowrap; }
.nc-tab {
  position: absolute; z-index: 1; left: 15px; top: 42px; width: 40px; padding: 15px 5px 5px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: var(--tab); border: 2px solid var(--trim); border-radius: 0 0 7px 7px;
  transform: rotate(7deg); transform-origin: top center;
  box-shadow: 0 3px 6px rgba(0, 0, 0, .4);
}
.nc-tab img { display: block; width: 26px; height: auto; }
.nc-tab img:last-child { border-radius: 3px; }
.nc-ability {
  position: absolute; left: 12px; right: 12px; bottom: 12px; padding: 10px 11px;
  background: rgba(232, 241, 220, .95); color: #141414; border-radius: 3px;
  font-size: 17px; font-weight: 600; line-height: 1.18; text-align: center;
  box-shadow: 0 2px 7px rgba(0, 0, 0, .35);
}
.nc-ability b { font-weight: 700; }
.nc-has-base .nc-ability { left: 86px; }
.nc-has-bonus .nc-ability { right: 86px; }
.nc-pill {
  display: inline-block; padding: 2px 6px; border-radius: 999px; vertical-align: 1px;
  background: #c62323; color: #fff; font: 800 12px/1.1 var(--sans);
}
.nc-power {
  position: absolute; bottom: 0; width: 80px; height: 80px;
  display: flex; align-items: flex-end; font: 800 46px/1 var(--sans); color: #fff;
}
.nc-power-base { left: 0; padding: 0 0 7px 11px; background: #000; border-top-right-radius: 100%; }
.nc-power-bonus {
  right: 0; justify-content: flex-end; padding: 0 7px 9px 0; font-size: 33px;
  background: #d91e1e; border-top-left-radius: 100%; box-shadow: 0 0 0 4px #000;
}
.nc-stack .nc-power { width: 104px; font-size: 36px; padding-bottom: 10px; }
.nc-stack .nc-ability { left: 12px; right: 12px; bottom: 90px; }
.nc-foot {
  height: 30px; padding: 0 5px; display: flex; align-items: center; justify-content: space-between;
  font-size: 16.5px; font-weight: 700;
}
.nc-foot small {
  font: 600 8.5px var(--sans); color: #9b9b9b; letter-spacing: .1em; text-transform: uppercase;
}

/* belt colours per level */
.nc-lvl-I   { --trim: #c9c9c9; --tab: #f6f6f6; }
.nc-lvl-II  { --trim: #e0ae00; --tab: #f3e01f; }
.nc-lvl-III { --trim: #a8201a; --tab: #d42a2a; }
.nc-lvl-IV  { --trim: #111111; --tab: #1c1c1c; }
.nc-lvl-V   { --trim: #de6a9b; --tab: #f6a3c6; }
.nc-lvl-IV .nc-tab img:first-child { filter: invert(1); }
.nc-lvl-sensei .nc-belt {
  padding-left: 0; background: linear-gradient(#3b3531, #1d1a18); --trim: #6f4c2a;
}
.nc-lvl-sensei .nc-name { color: #f6c624; }

/* background per card type */
.nc-tribe-frog       { --a1: #58a83f; --a2: #173d1c; }
.nc-tribe-toad       { --a1: #a07c45; --a2: #3d2b17; }
.nc-tribe-salamander { --a1: #ee8236; --a2: #6b260f; }
.nc-tribe-crocodile  { --a1: #3d8562; --a2: #0f2c20; }
.nc-tribe-turtle     { --a1: #2f9c96; --a2: #0c3c3b; }
.nc-tribe-snake      { --a1: #8059b8; --a2: #281945; }
.nc-tribe-lizard     { --a1: #a9bd35; --a2: #414f0e; }
.nc-tribe-spawn      { --a1: #d4628f; --a2: #511a37; }
.nc-tribe-equipment  { --a1: #8496a6; --a2: #27323d; }
.nc-tribe-action     { --a1: #c9483a; --a2: #45120e; }
.nc-tribe-sensei     { --a1: #d99a2b; --a2: #432506; }

@media (max-width: 640px) {
  .nc-hero h1 { font-size: 30px; }
  .nc-entry { grid-template-columns: 1fr; gap: 20px; }
  .nc-card { margin: 0 auto; }
  .nc-glance :is(th, td):nth-child(n+3):nth-child(-n+5) { display: none; }
}
@media print {
  @page { size: A4; margin: 12mm 0; }
  @page :first { margin-top: 0; }
  body { font-size: 14px; background: #fff; }
  .nc-hero { padding: 16px 14mm 20px; }
  .nc-hero img { width: 120px; }
  .nc-tag { margin-top: 8px; }
  .nc-hero h1 { font-size: 30px; margin-bottom: 8px; }
  main { max-width: none; padding: 0 14mm; }
  h2 { margin-top: 28px; }
  .nc-entry { grid-template-columns: 206px 1fr; gap: 24px; padding: 16px 0; }
  .nc-card { zoom: .76; box-shadow: none; }
  .nc-watch, .nc-keep { break-inside: avoid; }
  .nc-glance { overflow: visible; }
  .nc-glance-long { break-after: page; }
  .nc-glance table { font-size: 12.5px; }
  .nc-glance td { padding: 4px 6px; }
  .nc-footer { padding-top: 16px; }
}
`;

// ---------- build ----------

const dataUri = (buf) => `data:image/png;base64,${buf.toString('base64')}`;

async function loadImages() {
  const dir = path.join(root, 'images', 'reference_icons');
  const icons = {};
  for (const name of ['fighter', 'equipment', 'action', 'sensei', 'I', 'II', 'III', 'IV', 'V']) {
    icons[name] = dataUri(await readFile(path.join(dir, `${name}.png`)));
  }
  const logo = dataUri(
    await sharp(path.join(root, 'images', 'logo.png')).resize({ width: 440 }).png().toBuffer()
  );
  return { icons, logo };
}

const data = parse(await readFile(path.join(here, SOURCE), 'utf8'));
const { icons, logo } = await loadImages();
await writeFile(OUT_HTML, pageHtml(data, icons, logo));
const cardCount = data.sections.reduce((n, s) => n + s.cards.length, 0);
console.log(`Wrote ${path.relative(root, OUT_HTML)} (${cardCount} cards)`);

if (process.argv.includes('--pdf')) {
  if (!existsSync(CHROME)) {
    throw new Error(`Chrome not found at ${CHROME}. Set CHROME=/path/to/chrome and try again.`);
  }
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-pdf-header-footer',
      '--virtual-time-budget=15000', // gives the web fonts time to load
      `--print-to-pdf=${OUT_PDF}`,
      pathToFileURL(OUT_HTML).href,
    ],
    { stdio: 'ignore' }
  );
  console.log(`Wrote ${path.relative(root, OUT_PDF)}`);
}
