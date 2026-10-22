const fs = require("fs");
const path = require("path");

const LANGUAGES = [
  { code: "id", label: "Bahasa Indonesia", short: "ID", flag: "🇮🇩" },
  { code: "en", label: "English", short: "EN", flag: "🇬🇧" },
  { code: "zh", label: "简体中文", short: "ZH", flag: "🇨🇳" },
  { code: "ru", label: "Русский", short: "RU", flag: "🇷🇺" },
  { code: "de", label: "Deutsch", short: "DE", flag: "🇩🇪" },
  { code: "es", label: "Español", short: "ES", flag: "🇪🇸" },
  { code: "ar", label: "العربية", short: "AR", flag: "🇸🇦" },
  { code: "hi", label: "हिन्दी", short: "HI", flag: "🇮🇳" },
  { code: "ja", label: "日本語", short: "JA", flag: "🇯🇵" },
  { code: "ko", label: "한국어", short: "KO", flag: "🇰🇷" },
  { code: "it", label: "Italiano", short: "IT", flag: "🇮🇹" },
];

const cache = {};

function dictionary(code) {
  const lang = LANGUAGES.some((item) => item.code === code) ? code : "id";
  if (!cache[lang]) {
    const file = path.join(__dirname, "locales", `${lang}.json`);
    cache[lang] = JSON.parse(fs.readFileSync(file, "utf8"));
  }
  return cache[lang];
}

function translate(lang, key) {
  const primary = dictionary(lang);
  if (primary[key]) return primary[key];
  const fallback = dictionary("id");
  return fallback[key] || key;
}

function resolveLang(value) {
  const code = String(value || "").toLowerCase();
  return LANGUAGES.some((item) => item.code === code) ? code : "id";
}

module.exports = {
  LANGUAGES,
  translate,
  resolveLang,
};
