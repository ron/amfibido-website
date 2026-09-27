import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TYPE_MAP = {
  F: "fighter",
  A: "action",
  E: "equipment",
};

const FIGHTER_CREATURE = {
  F: "frog",
  L: "lizard",
  C: "crocodile",
  S: "salamander",
  N: "snake",
  P: "spawn",
};

const CARD_RE = /^([1-5S])_([FAE_])_([A-Za-z_])_(.+)\.png$/i;

function resolveSub(type, subtypeKey, name) {
  if (type === "action") {
    return subtypeKey === "C" ? "combo" : "normal";
  }
  if (type === "fighter") {
    if (subtypeKey === "T") {
      return /schildpad/i.test(name) ? "turtle" : "toad";
    }
    return FIGHTER_CREATURE[subtypeKey] || null;
  }
  return null;
}

function parseCardFilename(filename) {
  const match = filename.match(CARD_RE);
  if (!match) return null;

  const [, levelRaw, typeRaw, subtypeRaw, nameRaw] = match;
  const isSensei = levelRaw.toUpperCase() === "S";
  const typeKey = typeRaw.toUpperCase();
  const subtypeKey = subtypeRaw === "_" ? null : subtypeRaw.toUpperCase();
  const name = nameRaw.replace(/_/g, " ");
  const type = isSensei ? "sensei" : TYPE_MAP[typeKey] || null;

  return {
    level: isSensei ? null : Number(levelRaw),
    type,
    subtype: isSensei ? null : subtypeKey,
    sub: isSensei || !type ? null : resolveSub(type, subtypeKey, name),
    name,
    filename,
    slotGroup: `${levelRaw}_${typeRaw}_${subtypeRaw}`,
  };
}

function normalizeCardName(name) {
  let s = name.replace(/_/g, " ").trim();
  s = s.replace(/\s2$/i, "");
  s = s.replace(/Champion s Belt/i, "Champion's Belt");
  s = s.replace(/Twin Katana s/i, "Twin Katanas");
  s = s.replace(/Red Spotted Frog/i, "Red-Spotted Frog");
  s = s.replace(/Double Headed Viper/i, "Double-Headed Viper");
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function commentLines(block, label) {
  const match = block.match(new RegExp("^" + label + ":\\s*\\n((?:  - .+\\n?)+)", "m"));
  if (!match) return null;
  const lines = [...match[1].matchAll(/^  - (.+)$/gm)].map((m) => m[1].trim());
  return lines.length ? lines : null;
}

function parseCardsMdComments(cardsMdPath) {
  const commentsByName = { en: new Map(), nl: new Map(), de: new Map() };
  if (!fs.existsSync(cardsMdPath)) return commentsByName;

  const content = fs.readFileSync(cardsMdPath, "utf8");
  const blocks = content.split(/^----\s*$/m);

  for (const block of blocks) {
    const nameMatch = block.match(/^CARD:\s*(.+)$/m);
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    const key = normalizeCardName(name);
    const enComments = commentLines(block, "COMMENTS");
    if (!enComments) continue;

    commentsByName.en.set(key, enComments);
    commentsByName.nl.set(key, commentLines(block, "COMMENTS_NL") || enComments);
    commentsByName.de.set(key, commentLines(block, "COMMENTS_DE") || enComments);
  }

  return commentsByName;
}

function pairingGroupKey(filename) {
  const match = filename.match(CARD_RE);
  if (!match) return filename;

  const [, levelRaw, typeRaw, subtypeRaw] = match;
  if (typeRaw === "F" && (subtypeRaw === "T" || subtypeRaw === "U")) {
    return `${levelRaw}_F_TU`;
  }
  return `${levelRaw}_${typeRaw}_${subtypeRaw}`;
}

function buildLocalizedCommentsByFilename(imagesRoot, enRaw, commentsByName, folderCode) {
  const commentsByFilename = new Map();
  const langDir = path.join(imagesRoot, folderCode);
  const langKey = folderCode.toLowerCase();
  const langComments = commentsByName[langKey];

  if (!fs.existsSync(langDir)) return commentsByFilename;

  const enGroups = new Map();
  for (const parsed of enRaw) {
    const group = pairingGroupKey(parsed.filename);
    if (!enGroups.has(group)) enGroups.set(group, []);
    enGroups.get(group).push(parsed);
  }

  const langFiles = fs
    .readdirSync(langDir)
    .filter((entry) => entry.toLowerCase().endsWith(".png") && CARD_RE.test(entry));

  const langGroups = new Map();
  for (const filename of langFiles) {
    const group = pairingGroupKey(filename);
    if (!langGroups.has(group)) langGroups.set(group, []);
    langGroups.get(group).push(filename);
  }

  for (const [group, enCards] of enGroups) {
    const langFilenames = langGroups.get(group);
    if (!langFilenames || langFilenames.length !== enCards.length) continue;

    const enSorted = enCards
      .map((parsed) => ({
        parsed,
        size: fs.statSync(path.join(imagesRoot, "EN", parsed.filename)).size,
        comments:
          (langComments && langComments.get(normalizeCardName(parsed.name))) ||
          commentsByName.en.get(normalizeCardName(parsed.name)) ||
          null,
      }))
      .sort(
        (a, b) =>
          a.size - b.size || a.parsed.filename.localeCompare(b.parsed.filename)
      );

    const langSorted = langFilenames
      .map((filename) => ({
        filename,
        size: fs.statSync(path.join(langDir, filename)).size,
      }))
      .sort((a, b) => a.size - b.size || a.filename.localeCompare(b.filename));

    for (let i = 0; i < enSorted.length; i += 1) {
      const comments = enSorted[i].comments;
      if (comments) {
        commentsByFilename.set(langSorted[i].filename, comments);
      }
    }
  }

  return commentsByFilename;
}

function sortCards(cards) {
  return cards.sort((a, b) => {
    const levelA = a.level == null ? 99 : a.level;
    const levelB = b.level == null ? 99 : b.level;
    if (levelA !== levelB) return levelA - levelB;
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function toPublicCard(parsed, code, comments) {
  return {
    level: parsed.level,
    type: parsed.type,
    subtype: parsed.subtype,
    sub: parsed.sub,
    name: parsed.name,
    file: `/images/${code}/${parsed.filename}`,
    thumb: `/images/${code}/thumbs/${parsed.filename}`,
    alt: parsed.name,
    comments: comments && comments.length ? comments : null,
  };
}

function isLanguageCardFolder(dirName, dirPath) {
  if (!/^[A-Z]{2}$/.test(dirName)) return false;
  if (!fs.statSync(dirPath).isDirectory()) return false;

  const entries = fs.readdirSync(dirPath);
  return entries.some((entry) => {
    if (entry === "thumbs" || !entry.toLowerCase().endsWith(".png")) return false;
    return Boolean(parseCardFilename(entry));
  });
}

function loadLanguageRaw(code, imagesRoot) {
  const dirPath = path.join(imagesRoot, code);
  const files = fs
    .readdirSync(dirPath)
    .filter((entry) => entry.toLowerCase().endsWith(".png") && entry !== "thumbs");

  return files
    .map((filename) => parseCardFilename(filename))
    .filter((parsed) => parsed && parsed.type);
}

function buildCardReference() {
  const imagesRoot = path.join(__dirname, "..", "images");
  const cardsMdPath = path.join(__dirname, "..", "context", "cards.md");
  const commentsByName = parseCardsMdComments(cardsMdPath);
  const byLang = {};
  const cardLanguages = [];

  if (fs.existsSync(imagesRoot)) {
    for (const entry of fs.readdirSync(imagesRoot)) {
      const dirPath = path.join(imagesRoot, entry);
      if (!isLanguageCardFolder(entry, dirPath)) continue;
      cardLanguages.push(entry.toLowerCase());
    }
    cardLanguages.sort();

    let enRaw = [];

    if (cardLanguages.includes("en")) {
      enRaw = loadLanguageRaw("EN", imagesRoot);

      const enCards = enRaw.map((parsed) => {
        const comments =
          commentsByName.en.get(normalizeCardName(parsed.name)) || null;
        return toPublicCard(parsed, "EN", comments);
      });

      byLang.en = {
        code: "EN",
        slug: "en",
        cards: sortCards(enCards),
      };
    }

    for (const slug of ["nl", "de"]) {
      if (!cardLanguages.includes(slug)) continue;

      const code = slug.toUpperCase();
      const commentsByFilename = cardLanguages.includes("en")
        ? buildLocalizedCommentsByFilename(imagesRoot, enRaw, commentsByName, code)
        : new Map();
      const raw = loadLanguageRaw(code, imagesRoot);
      const cards = raw.map((parsed) => {
        const comments = commentsByFilename.get(parsed.filename) || null;
        return toPublicCard(parsed, code, comments);
      });

      byLang[slug] = {
        code,
        slug,
        cards: sortCards(cards),
      };
    }
  }

  const uiLanguages = ["en", "nl", "de"];
  const fallbackSlug = cardLanguages.includes("en")
    ? "en"
    : cardLanguages.includes("nl")
      ? "nl"
      : cardLanguages[0] || null;

  return {
    languages: uiLanguages,
    cardLanguages,
    fallbackSlug,
    byLang,
  };
}

export default buildCardReference();
