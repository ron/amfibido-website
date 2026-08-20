import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const i18nDir = path.join(__dirname, "..", "i18n");

function load(lang) {
  return JSON.parse(fs.readFileSync(path.join(i18nDir, `${lang}.json`), "utf8"));
}

export default {
  en: load("en"),
  nl: load("nl"),
};
