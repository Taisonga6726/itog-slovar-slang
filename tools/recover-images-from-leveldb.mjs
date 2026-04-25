import fs from "node:fs";
import path from "node:path";

const LEVELDB_DIRS = [
  "C:/Users/Таня/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb",
  "C:/Users/Таня/AppData/Local/Yandex/YandexBrowser/User Data/Default/Local Storage/leveldb",
];

const OUTPUT_PATH =
  "C:/Users/Таня/Desktop/МАМА УДАЛЕНКА/КУРСОР ПРОЕКТЫ/ИТОГ СЛОВАРЬ СЛЭНГА/magic-book-app/public/recovered-entries-with-images.json";

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((full) => {
      try {
        return fs.statSync(full).isFile();
      } catch {
        return false;
      }
    });
}

function extractJsonArray(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function candidatesFromText(text, file, encoding) {
  const out = [];
  const marker = /"\s*word"\s*:/g;
  let m;
  while ((m = marker.exec(text)) !== null) {
    const back = Math.max(0, m.index - 2000);
    const arrayStart = text.lastIndexOf("[", m.index);
    if (arrayStart < back) continue;
    const json = extractJsonArray(text, arrayStart);
    if (!json) continue;
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      const hasWord = parsed.some((e) => e && typeof e.word === "string");
      if (!hasWord) continue;
      const withImages = parsed.filter(
        (e) => e && Array.isArray(e.images) && e.images.some((v) => typeof v === "string" && v.startsWith("data:image"))
      ).length;
      out.push({ parsed, withImages, file, encoding });
    } catch {
      // ignore bad fragment
    }
  }
  return out;
}

const all = [];
for (const dir of LEVELDB_DIRS) {
  for (const file of listFiles(dir)) {
    let buf;
    try {
      buf = fs.readFileSync(file);
    } catch {
      continue;
    }
    const latin = buf.toString("latin1");
    all.push(...candidatesFromText(latin, file, "latin1"));

    const utf16 = buf.toString("utf16le");
    all.push(...candidatesFromText(utf16, file, "utf16le"));
  }
}

if (all.length === 0) {
  console.log("NO_CANDIDATES");
  process.exit(0);
}

all.sort((a, b) => {
  if (b.withImages !== a.withImages) return b.withImages - a.withImages;
  return b.parsed.length - a.parsed.length;
});

const best = all[0];
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(best.parsed, null, 2), "utf8");
console.log(`BEST_TOTAL=${best.parsed.length}`);
console.log(`BEST_WITH_IMAGES=${best.withImages}`);
console.log(`BEST_FILE=${best.file}`);
console.log(`BEST_ENCODING=${best.encoding}`);
console.log(`OUT=${OUTPUT_PATH}`);
