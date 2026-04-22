import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** SLOVAR_02/assets → public/slovar/assets при каждом старте Vite (без ручных команд). */
function syncSlovarAssetsFromRepo() {
  const magicRoot = __dirname;
  const repoRoot = path.join(magicRoot, "..", "..");
  const src = path.join(repoRoot, "SLOVAR_02", "assets");
  const dest = path.join(magicRoot, "public", "slovar", "assets");
  try {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true });
  } catch {
    /* не блокируем dev/build */
  }
}

function slovarAssetSyncPlugin() {
  return {
    name: "sync-slovar-assets",
    buildStart() {
      syncSlovarAssetsFromRepo();
    },
  };
}

/** GitHub Pages: отдаёт 404.html при прямом заходе на /repo/luck — SPA читает путь из URL. */
function githubPagesSpaFallback404(): Plugin {
  return {
    name: "github-pages-spa-404",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      const indexHtml = path.join(outDir, "index.html");
      const notFound = path.join(outDir, "404.html");
      try {
        if (fs.existsSync(indexHtml)) {
          fs.copyFileSync(indexHtml, notFound);
        }
      } catch {
        /* не ломаем сборку */
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Vercel ожидает корень "/", GitHub Pages - имя репозитория.
  base: process.env.VERCEL ? "/" : mode === "production" ? "/itog-slovar-slang/" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [slovarAssetSyncPlugin(), react(), githubPagesSpaFallback404(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
