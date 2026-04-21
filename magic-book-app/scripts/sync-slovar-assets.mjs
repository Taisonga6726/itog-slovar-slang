/**
 * Копирует SLOVAR_02/assets → public/slovar/assets (MP3 и прочие медиа для iframe / dev-сервера).
 * Без этой папки по http(s) запросы к /slovar/assets/sounds/… дают 404 — звук есть только при file://.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const magicRoot = path.join(__dirname, "..");
const repoRoot = path.join(magicRoot, "..", "..");
const src = path.join(repoRoot, "SLOVAR_02", "assets");
const dest = path.join(magicRoot, "public", "slovar", "assets");

if (!fs.existsSync(src)) {
  console.warn("[sync-slovar-assets] Нет " + src + " — пропуск (звук на /slovar/ не заработает без этой папки).");
  process.exit(0);
}

try {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  console.log("[sync-slovar-assets] OK → " + dest);
} catch (err) {
  console.warn("[sync-slovar-assets] Не удалось скопировать:", err && err.message ? err.message : err);
  console.warn("[sync-slovar-assets] Вручную: скопируйте папку SLOVAR_02/assets в public/slovar/assets");
  process.exit(0);
}
