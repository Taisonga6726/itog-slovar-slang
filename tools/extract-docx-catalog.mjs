import fs from "node:fs";
import path from "node:path";

const ROOT = "C:/Users/Таня/Desktop/МАМА УДАЛЕНКА/КУРСОР ПРОЕКТЫ/ИТОГ СЛОВАРЬ СЛЭНГА/tmp_recover/unzipped/word";
const DOC_XML = path.join(ROOT, "document.xml");
const RELS_XML = path.join(ROOT, "_rels", "document.xml.rels");
const MEDIA_DIR = path.join(ROOT, "media");
const OUT_JSON = "C:/Users/Таня/Desktop/МАМА УДАЛЕНКА/КУРСОР ПРОЕКТЫ/ИТОГ СЛОВАРЬ СЛЭНГА/magic-book-app/public/docx-catalog-recovered.json";

const xml = fs.readFileSync(DOC_XML, "utf8");
const rels = fs.readFileSync(RELS_XML, "utf8");

const ridToFile = new Map();
for (const m of rels.matchAll(/Id="(rId\d+)"[^>]*Target="media\/([^"]+)"/g)) {
  ridToFile.set(m[1], m[2]);
}

const tokens = [];
for (const m of xml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)) {
  const raw = m[1]
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  const text = raw.replace(/\s+/g, " ").trim();
  if (text) tokens.push({ type: "text", i: m.index ?? 0, text });
}
for (const m of xml.matchAll(/<a:blip[^>]*r:embed="(rId\d+)"/g)) {
  tokens.push({ type: "img", i: m.index ?? 0, rid: m[1] });
}
tokens.sort((a, b) => a.i - b.i);

const entries = [];
let recentText = [];

for (const t of tokens) {
  if (t.type === "text") {
    recentText.push(t.text);
    if (recentText.length > 8) recentText = recentText.slice(-8);
    continue;
  }

  const file = ridToFile.get(t.rid);
  if (!file) continue;
  const imgPath = path.join(MEDIA_DIR, file);
  if (!fs.existsSync(imgPath)) continue;
  const b64 = fs.readFileSync(imgPath).toString("base64");
  const mime = file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const imageData = `data:${mime};base64,${b64}`;

  const joined = recentText.join(" ");
  const wordCandidate =
    recentText
      .slice()
      .reverse()
      .find((x) => /^\d+\./.test(x) || x.length >= 4) ?? `Запись ${entries.length + 1}`;

  const word = wordCandidate.replace(/^\d+\.\s*/, "").slice(0, 80).trim() || `Запись ${entries.length + 1}`;
  const description = joined.replace(wordCandidate, "").trim().slice(0, 220);

  entries.push({
    word,
    description,
    reactions: { fire: 0, love: 0, rocket: 0, laugh: 0, like: 0 },
    images: [imageData],
  });
}

fs.writeFileSync(OUT_JSON, JSON.stringify(entries, null, 2), "utf8");
console.log("DOCX_ENTRIES", entries.length);
console.log("OUT", OUT_JSON);
