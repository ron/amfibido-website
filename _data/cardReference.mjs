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

function parseCardsMdComments(cardsMdPath) {
  const commentsByName = { en: new Map(), nl: new Map() };
  if (!fs.existsSync(cardsMdPath)) return commentsByName;

  const content = fs.readFileSync(cardsMdPath, "utf8");
  const blocks = content.split(/^----\s*$/m);

  for (const block of blocks) {
    const nameMatch = block.match(/^CARD:\s*(.+)$/m);
    if (!nameMatch) continue;

    const name = nameMatch[1].trim();
    const key = normalizeCardName(name);
    const commentsMatch = block.match(/^COMMENTS:\s*\n((?:  - .+\n?)+)/m);
    if (!commentsMatch) continue;

    const enComments = [...commentsMatch[1].matchAll(/^  - (.+)$/gm)].map((m) =>
      m[1].trim()
    );
    if (!enComments.length) continue;

    commentsByName.en.set(key, enComments);

    const commentsNlMatch = block.match(/^COMMENTS_NL:\s*\n((?:  - .+\n?)+)/m);
    const nlComments = commentsNlMatch
      ? [...commentsNlMatch[1].matchAll(/^  - (.+)$/gm)].map((m) => m[1].trim())
      : enComments;

    if (nlComments.length) {
      commentsByName.nl.set(key, nlComments);
    }
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

function buildNlCommentsByFilename(imagesRoot, enRaw, commentsByName) {
  const nlCommentsByFilename = new Map();
  const nlDir = path.join(imagesRoot, "NL");

  if (!fs.existsSync(nlDir)) return nlCommentsByFilename;

  const enGroups = new Map();
  for (const parsed of enRaw) {
    const group = pairingGroupKey(parsed.filename);
    if (!enGroups.has(group)) enGroups.set(group, []);
    enGroups.get(group).push(parsed);
  }

  const nlFiles = fs
    .readdirSync(nlDir)
    .filter((entry) => entry.toLowerCase().endsWith(".png") && CARD_RE.test(entry));

  const nlGroups = new Map();
  for (const filename of nlFiles) {
    const group = pairingGroupKey(filename);
    if (!nlGroups.has(group)) nlGroups.set(group, []);
    nlGroups.get(group).push(filename);
  }

  for (const [group, enCards] of enGroups) {
    const nlFilenames = nlGroups.get(group);
    if (!nlFilenames || nlFilenames.length !== enCards.length) continue;

    const enSorted = enCards
      .map((parsed) => ({
        parsed,
        size: fs.statSync(path.join(imagesRoot, "EN", parsed.filename)).size,
        comments:
          commentsByName.nl.get(normalizeCardName(parsed.name)) ||
          commentsByName.en.get(normalizeCardName(parsed.name)) ||
          null,
      }))
      .sort(
        (a, b) =>
          a.size - b.size || a.parsed.filename.localeCompare(b.parsed.filename)
      );

    const nlSorted = nlFilenames
      .map((filename) => ({
        filename,
        size: fs.statSync(path.join(nlDir, filename)).size,
      }))
      .sort((a, b) => a.size - b.size || a.filename.localeCompare(b.filename));

    for (let i = 0; i < enSorted.length; i += 1) {
      const comments = enSorted[i].comments;
      if (comments) {
        nlCommentsByFilename.set(nlSorted[i].filename, comments);
      }
    }
  }

  return nlCommentsByFilename;
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
    let nlCommentsByFilename = new Map();

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

    if (cardLanguages.includes("en") && cardLanguages.includes("nl")) {
      nlCommentsByFilename = buildNlCommentsByFilename(
        imagesRoot,
        enRaw,
        commentsByName
      );
    }

    if (cardLanguages.includes("nl")) {
      const nlRaw = loadLanguageRaw("NL", imagesRoot);

      const nlCards = nlRaw.map((parsed) => {
        const comments = nlCommentsByFilename.get(parsed.filename) || null;
        return toPublicCard(parsed, "NL", comments);
      });

      byLang.nl = {
        code: "NL",
        slug: "nl",
        cards: sortCards(nlCards),
      };
    }
  }

  const uiLanguages = ["en", "nl"];
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
