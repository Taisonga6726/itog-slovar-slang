import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [slovarAssetSyncPlugin(), react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
