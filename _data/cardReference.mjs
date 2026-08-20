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

function loadLanguage(code, imagesRoot) {
  const dirPath = path.join(imagesRoot, code);
  const files = fs
    .readdirSync(dirPath)
    .filter((entry) => entry.toLowerCase().endsWith(".png") && entry !== "thumbs");

  const cards = files
    .map((filename) => {
      const parsed = parseCardFilename(filename);
      if (!parsed || !parsed.type) return null;

      return {
        level: parsed.level,
        type: parsed.type,
        subtype: parsed.subtype,
        sub: parsed.sub,
        name: parsed.name,
        file: `/images/${code}/${filename}`,
        thumb: `/images/${code}/thumbs/${filename}`,
        alt: parsed.name,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const levelA = a.level == null ? 99 : a.level;
      const levelB = b.level == null ? 99 : b.level;
      if (levelA !== levelB) return levelA - levelB;
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

  return {
    code,
    slug: code.toLowerCase(),
    cards,
  };
}

function buildCardReference() {
  const imagesRoot = path.join(__dirname, "..", "images");
  const byLang = {};
  const languages = [];

  if (!fs.existsSync(imagesRoot)) {
    return { languages, byLang };
  }

  for (const entry of fs.readdirSync(imagesRoot)) {
    const dirPath = path.join(imagesRoot, entry);
    if (!isLanguageCardFolder(entry, dirPath)) continue;

    const lang = loadLanguage(entry, imagesRoot);
    languages.push(lang.slug);
    byLang[lang.slug] = lang;
  }

  languages.sort();
  return { languages, byLang };
}

export default buildCardReference();
