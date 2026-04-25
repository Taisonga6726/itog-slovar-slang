import fs from "node:fs";
import path from "node:path";

const LEVELDB_DIRS = [
  "C:/Users/Таня/AppData/Local/Google/Chrome/User Data/Default/Local Storage/leveldb",
  "C:/Users/Таня/AppData/Local/Yandex/YandexBrowser/User Data/Default/Local Storage/leveldb",
];

const UTF16_JSON_HEAD = Buffer.from([0x5b, 0x00, 0x7b, 0x00, 0x22, 0x00, 0x77, 0x00, 0x6f, 0x00, 0x72, 0x00, 0x64, 0x00, 0x22, 0x00]); // [{"word"
const UTF16_JSON_TAIL = Buffer.from([0x7d, 0x00, 0x5d, 0x00]); // }]

function collectFiles(dir) {
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

function tryParseUtf16Arrays(buf, file) {
  const candidates = [];
  let start = 0;
  while (start < buf.length) {
    const idx = buf.indexOf(UTF16_JSON_HEAD, start);
    if (idx === -1) break;
    const end = buf.indexOf(UTF16_JSON_TAIL, idx + UTF16_JSON_HEAD.length);
    if (end === -1) break;

    const raw = buf.subarray(idx, end + UTF16_JSON_TAIL.length);
    const text = raw.toString("utf16le");
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasWordLike = parsed.some((x) => x && typeof x === "object" && typeof x.word === "string");
        if (hasWordLike) {
          candidates.push({ parsed, file, encoding: "utf16le" });
        }
      }
    } catch {
      // ignore
    }
    start = idx + 2;
  }
  return candidates;
}

function tryParseAsciiArrays(buf, file) {
  const candidates = [];
  const text = buf.toString("latin1");
  const re = /\[\{[\s\S]*?\}\]/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const block = m[0];
    if (!block.includes('"word"') || !block.includes('"reactions"')) continue;
    try {
      const parsed = JSON.parse(block);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasWordLike = parsed.some((x) => x && typeof x === "object" && typeof x.word === "string");
        if (hasWordLike) {
          candidates.push({ parsed, file, encoding: "latin1" });
        }
      }
    } catch {
      // ignore
    }
  }
  return candidates;
}

const allCandidates = [];
for (const dir of LEVELDB_DIRS) {
  for (const file of collectFiles(dir)) {
    let buf;
    try {
      buf = fs.readFileSync(file);
    } catch {
      continue;
    }
    allCandidates.push(...tryParseUtf16Arrays(buf, file));
    allCandidates.push(...tryParseAsciiArrays(buf, file));
  }
}

if (allCandidates.length === 0) {
  console.log("NO_CANDIDATES");
  process.exit(0);
}

allCandidates.sort((a, b) => b.parsed.length - a.parsed.length);
const best = allCandidates[0];
const outPath = "C:/Users/Таня/Desktop/МАМА УДАЛЕНКА/КУРСОР ПРОЕКТЫ/ИТОГ СЛОВАРЬ СЛЭНГА/magic-book-app/public/recovered-entries.json";
fs.writeFileSync(outPath, JSON.stringify(best.parsed, null, 2), "utf8");
console.log(`RECOVERED_COUNT=${best.parsed.length}`);
console.log(`RECOVERED_FILE=${best.file}`);
console.log(`RECOVERED_ENCODING=${best.encoding}`);
console.log(`RECOVERED_OUT=${outPath}`);
