import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import FloatingWords from "@/components/FloatingWords";
import MagicBook from "@/components/MagicBook";
import FinalBook from "@/components/FinalBook";
import FinalScreen from "@/components/FinalScreen";
import ControlBar from "@/components/ControlBar";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import VibeAiBrand from "@/components/VibeAiBrand";
import IntroSlovarEmbed from "@/components/IntroSlovarEmbed";
import { toast } from "@/hooks/use-toast";

interface Entry {
  word: string;
  description: string;
  reactions: { fire: number; love: number; rocket: number; laugh: number; like: number };
  images?: string[];
}

interface LegacyVibeWord {
  text?: string;
  word?: string;
  description?: string;
  images?: string[];
  screenshots?: string[];
  reactions?: {
    fire?: number;
    like?: number;
    funny?: number;
    wow?: number;
  };
}

interface SeedBackupEntry {
  word?: string;
  description?: string;
  images?: unknown;
  reactions?: {
    fire?: number;
    love?: number;
    rocket?: number;
    laugh?: number;
    like?: number;
  };
}

interface PageNav {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const Index = () => {
  const SEED_ENTRIES_URL = "/tanya-vibecoder-backup-2026-04-18.json";
  /** v2: экспорт всегда подмешивается к сохранённому списку (слова из файла перекрывают старые), плюс срез дублей с одинаковыми картинками. */
  const SEED_STORAGE_KEY = "magic-book-seed-v2-applied";

  const TEST_WORDS_TO_DROP = new Set(["мама"]);

  const normalizeWordKey = (w: string) => w.trim().toLowerCase().replace(/\s+/g, " ");

  const removeTestEntries = (list: Entry[]): Entry[] =>
    list.filter((entry) => !TEST_WORDS_TO_DROP.has(normalizeWordKey(String(entry.word || ""))));

  const parseLegacyVibeWords = (): Entry[] => {
    const legacyRaw = localStorage.getItem("vibe_dictionary_words");
    if (!legacyRaw) return [];
    try {
      const parsed = JSON.parse(legacyRaw);
      const words = Array.isArray(parsed?.words) ? parsed.words : [];
      return words
        .map((item: LegacyVibeWord) => {
          const rawWord = String(item?.word || "").trim();
          const rawDesc = String(item?.description || "").trim();
          const rawText = String(item?.text || "").trim();
          const splitMatch = rawText ? rawText.split(/\s+[вЂ”-]\s+/) : [];
          const word = rawWord || (splitMatch[0] || "").trim();
          const description = rawDesc || splitMatch.slice(1).join(" вЂ” ").trim();
          if (!word) return null;
          const sourceImages = Array.isArray(item?.images) ? item.images : Array.isArray(item?.screenshots) ? item.screenshots : [];
          const images = sourceImages.filter((img): img is string => typeof img === "string" && img.trim().length > 0);
          return {
            word,
            description,
            reactions: {
              fire: Number(item?.reactions?.fire || 0),
              love: Number(item?.reactions?.like || 0),
              rocket: Number(item?.reactions?.wow || 0),
              laugh: Number(item?.reactions?.funny || 0),
              like: Number(item?.reactions?.like || 0),
            },
            images,
          };
        })
        .filter((entry: Entry | null): entry is Entry => Boolean(entry));
    } catch {
      return [];
    }
  };

  const wordKey = (w: string) => normalizeWordKey(w);

  const mergeUniqueByWord = (primary: Entry[], extra: Entry[]): Entry[] => {
    const map = new Map<string, Entry>();
    for (const e of primary) {
      const k = wordKey(e.word);
      if (!k) continue;
      if (!map.has(k)) map.set(k, e);
    }
    for (const e of extra) {
      const k = wordKey(e.word);
      if (!k) continue;
      if (!map.has(k)) map.set(k, e);
    }
    return Array.from(map.values());
  };

  const parseSeedBackupEntries = (raw: unknown): Entry[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item: SeedBackupEntry) => {
        const word = String(item?.word || "").trim();
        const description = String(item?.description || "").trim();
        if (!word) return null;
        const imgs = Array.isArray(item?.images) ? item.images : [];
        const images = imgs.filter((img): img is string => typeof img === "string" && img.trim().length > 0);
        return {
          word,
          description,
          reactions: {
            fire: Number(item?.reactions?.fire || 0),
            love: Number(item?.reactions?.love || 0),
            rocket: Number(item?.reactions?.rocket || 0),
            laugh: Number(item?.reactions?.laugh || 0),
            like: Number(item?.reactions?.like || 0),
          },
          images,
        };
      })
      .filter((entry: Entry | null): entry is Entry => Boolean(entry));
  };

  const imageFingerprint = (e: Entry): string => {
    const imgs = e.images ?? [];
    if (imgs.length === 0) return `__noimg__:${wordKey(e.word)}`;
    return imgs.join("\0");
  };

  /** Убирает повторы одного и того же скрина под разными «словами» (типичный мусор после вставок). */
  const dedupeIdenticalImages = (list: Entry[]): Entry[] => {
    const seen = new Set<string>();
    const out: Entry[] = [];
    for (const e of list) {
      const fp = imageFingerprint(e);
      if (seen.has(fp)) continue;
      seen.add(fp);
      out.push(e);
    }
    return out;
  };

  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"intro" | "form" | "awakening" | "hands" | "reading" | "final">("intro");
  const [entries, setEntries] = useState<Entry[]>(() => {
    const legacy = parseLegacyVibeWords();
    const savedRaw = localStorage.getItem("magic-book-entries");
    if (savedRaw) {
      try {
        const parsed = JSON.parse(savedRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return removeTestEntries(mergeUniqueByWord(parsed as Entry[], legacy));
        }
      } catch {
        // РЅРёР¶Рµ вЂ” РјРёРіСЂР°С†РёСЏ РёР· СЃР»РѕРІР°СЂСЏ
      }
    }
    return removeTestEntries(legacy);
  });

  const entriesSerializedRef = useRef<string>(JSON.stringify(entries));


  const [pageNav, setPageNav] = useState<PageNav | null>(null);
  const flipAudio = useRef<HTMLAudioElement | null>(null);
  const hymnAudio = useRef<HTMLAudioElement | null>(null);
  const hymnStartedRef = useRef(false);
  const awakenTimerRef = useRef<number | null>(null);
  const duckTimerRef = useRef<number | null>(null);
  const duckRafRef = useRef<number | null>(null);
  const seedHydrationDoneRef = useRef(false);

  const HYMN_BASE_VOLUME = 0.24;
  const HYMN_DUCK_VOLUME = 0.14;

  useEffect(() => {
    flipAudio.current = new Audio("/page-flip.mp3");
    flipAudio.current.volume = 0.9;
    return () => {
      if (awakenTimerRef.current) window.clearTimeout(awakenTimerRef.current);
      if (duckTimerRef.current) window.clearTimeout(duckTimerRef.current);
      if (duckRafRef.current) window.cancelAnimationFrame(duckRafRef.current);
    };
  }, []);

  const pauseHymn = useCallback(() => {
    hymnStartedRef.current = false;
    if (hymnAudio.current) {
      try {
        hymnAudio.current.pause();
        hymnAudio.current.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, []);

  /** Р“РёРјРЅ СЂРѕРґРёС‚РµР»СЏ: РїРѕ СЃРёРіРЅР°Р»Сѓ РёР· iframe; ref В«Р·Р°РїСѓС‰РµРЅВ» С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕРіРѕ play (РёРЅР°С‡Рµ РїРѕРІС‚РѕСЂРЅС‹Р№ РєР»РёРє РјРѕР»С‡РёС‚). */
  const startBookHymnFromIntro = useCallback(() => {
    if (!hymnAudio.current) {
      hymnAudio.current = new Audio("/slovar/assets/sounds/versiya%205_hard-rok%20Tanya.mp3");
      hymnAudio.current.loop = true;
      hymnAudio.current.volume = HYMN_BASE_VOLUME;
    }
    if (hymnStartedRef.current) return;
    void hymnAudio.current
      .play()
      .then(() => {
        hymnStartedRef.current = true;
      })
      .catch(() => {
        hymnStartedRef.current = false;
      });
  }, []);

  useEffect(() => {
    pauseHymn();
    return () => {
      if (hymnAudio.current) {
        try {
          hymnAudio.current.pause();
        } catch {
          /* ignore */
        }
        hymnAudio.current = null;
      }
      hymnStartedRef.current = false;
    };
  }, [pauseHymn]);

  useEffect(() => {
    const nextSerialized = JSON.stringify(entries);
    if (entriesSerializedRef.current === nextSerialized) return;
    entriesSerializedRef.current = nextSerialized;

    if (entries.length > 0) {
      localStorage.setItem("magic-book-entries", nextSerialized);
      return;
    }
    if (!seedHydrationDoneRef.current) return;
    localStorage.setItem("magic-book-entries", "[]");
  }, [entries]);

  useEffect(() => {
    if (localStorage.getItem(SEED_STORAGE_KEY) === "1") {
      seedHydrationDoneRef.current = true;
      return;
    }

    let cancelled = false;
    void fetch(SEED_ENTRIES_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (cancelled) return;
        const seed = removeTestEntries(parseSeedBackupEntries(data));
        if (!seed.length) return;

        const seedKeySet = new Set(seed.map((e) => wordKey(e.word)));

        const readSaved = (): Entry[] => {
          const raw = localStorage.getItem("magic-book-entries");
          if (!raw) return [];
          try {
            const parsed = JSON.parse(raw) as unknown;
            return Array.isArray(parsed) ? (parsed as Entry[]) : [];
          } catch {
            return [];
          }
        };

        const saved = removeTestEntries(readSaved());
        const extras = saved.filter((e) => !seedKeySet.has(wordKey(e.word)));
        const extrasDeduped = dedupeIdenticalImages(extras);
        const legacy = parseLegacyVibeWords();
        const merged = removeTestEntries(mergeUniqueByWord(seed, mergeUniqueByWord(extrasDeduped, legacy)));
        setEntries(merged);
        localStorage.setItem(SEED_STORAGE_KEY, "1");
      })
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        if (cancelled) return;
        seedHydrationDoneRef.current = true;
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- однократная миграция/гидратация из экспорта
  }, []);

  /** Р’С…РѕРґ РёР· SLOVAR_02: РґРµС‚РµСЂРјРёРЅРёСЂРѕРІР°РЅРЅРѕ РѕС‚РєСЂС‹РІР°РµРј С„РѕСЂРјСѓ РІРЅРµСЃРµРЅРёСЏ СЃР»РѕРІ (Р±РµР· РїСЂРѕРјРµР¶СѓС‚РѕС‡РЅРѕРіРѕ preview). */
  useEffect(() => {
    const entry = searchParams.get("entry");
    const screen = searchParams.get("screen");
    if (entry === "slovar" && screen === "form") {
      setMode("form");
    }
  }, [searchParams]);

  const handleOpenFormFromIntro = useCallback(() => {
    setMode("form");
  }, []);

  const handleAddWord = () => {
    setMode("form");
  };

  const handleShare = () => {
    toast({ title: "Р¤СѓРЅРєС†РёСЏ СЃРєРѕСЂРѕ РїРѕСЏРІРёС‚СЃСЏ!", description: "РџРѕРґРµР»РёС‚СЊСЃСЏ РєРЅРёРіРѕР№ РјРѕР¶РЅРѕ Р±СѓРґРµС‚ РІ СЃР»РµРґСѓСЋС‰РµРј РѕР±РЅРѕРІР»РµРЅРёРё." });
  };

  const handlePageNav = useCallback((nav: PageNav) => {
    setPageNav(nav);
  }, []);

  useEffect(() => {
    if (mode === "reading" && entries.length === 0) {
      setMode("form");
      toast({
        title: "РЎР»РѕРІ РїРѕРєР° РЅРµС‚",
        description: "РЎРЅР°С‡Р°Р»Р° РІРЅРµСЃРёС‚Рµ Рё СЃРѕС…СЂР°РЅРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРЅРѕ СЃР»РѕРІРѕ.",
      });
    }
  }, [mode, entries.length]);

  const duckHymnForEffects = useCallback((holdMs = 1000) => {
    const audio = hymnAudio.current;
    if (!audio) return;
    try {
      audio.volume = HYMN_DUCK_VOLUME;
    } catch {
      return;
    }
    if (duckTimerRef.current) window.clearTimeout(duckTimerRef.current);
    if (duckRafRef.current) window.cancelAnimationFrame(duckRafRef.current);

    duckTimerRef.current = window.setTimeout(() => {
      const startVol = audio.volume;
      const startTs = performance.now();
      const duration = 650;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTs) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const next = startVol + (HYMN_BASE_VOLUME - startVol) * eased;
        try {
          audio.volume = next;
        } catch {
          return;
        }
        if (t < 1) {
          duckRafRef.current = window.requestAnimationFrame(step);
        } else {
          duckRafRef.current = null;
        }
      };
      duckRafRef.current = window.requestAnimationFrame(step);
    }, holdMs);
  }, []);

  useEffect(() => {
    const onDuck = (ev: Event) => {
      const custom = ev as CustomEvent<{ holdMs?: number }>;
      const holdMs = typeof custom.detail?.holdMs === "number" ? custom.detail.holdMs : 1000;
      duckHymnForEffects(holdMs);
    };
    window.addEventListener("magicbook:duck-audio", onDuck as EventListener);
    return () => window.removeEventListener("magicbook:duck-audio", onDuck as EventListener);
  }, [duckHymnForEffects]);

  const playFlipSound = useCallback(() => {
    if (!flipAudio.current) return;
    duckHymnForEffects(1000);
    flipAudio.current.currentTime = 0;
    flipAudio.current.play().catch(() => {});
  }, [duckHymnForEffects]);

  const handleStartReadFlow = useCallback(() => {
    if (awakenTimerRef.current) window.clearTimeout(awakenTimerRef.current);
    playFlipSound();
    setMode("awakening");
    awakenTimerRef.current = window.setTimeout(() => {
      setMode("hands");
    }, 12000);
  }, [playFlipSound]);

  const handleAwakeningEnded = useCallback(() => {
    if (awakenTimerRef.current) {
      window.clearTimeout(awakenTimerRef.current);
      awakenTimerRef.current = null;
    }
    setMode("hands");
  }, []);

  const handleOpenReadingFromHands = useCallback(() => {
    playFlipSound();
    setMode("reading");
  }, [playFlipSound]);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {mode === "intro" && (
        <IntroSlovarEmbed
          onOpenForm={handleOpenFormFromIntro}
          onBookHymnStart={startBookHymnFromIntro}
          onResetHymn={pauseHymn}
        />
      )}

      {/* Preload video and cover image to eliminate black screen / delays */}
      <video src="/videos/book-intro.mp4" preload="auto" className="hidden" />
      <video src="/videos/grok-read-book-03.mp4" preload="auto" className="hidden" />
      <img src="/images/cover-book.png" className="hidden" alt="" />
      <img src="/images/book-open.png" className="hidden" alt="" />
      <img src="/images/final-screen.png" className="hidden" alt="" />

      {mode !== "intro" && (
        <>
          <img
            src="/images/open-book.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40 select-none pointer-events-none"
            draggable={false}
          />
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-none z-10" />
          {(mode === "awakening" || mode === "hands") && <MagicRingsGlobal />}
          {(mode === "awakening" || mode === "hands") && <HeroWave />}
          {(mode === "awakening" || mode === "hands") && <FloatingWords />}
        </>
      )}

      {mode !== "intro" && <div className="relative z-20 w-full h-full">
      {mode === "form" && (
        <MagicBook
          entries={entries}
          setEntries={setEntries}
          onOpenCatalog={handleStartReadFlow}
          onFinish={() => setMode("final")}
          onPageNav={handlePageNav}
        />
      )}
      {mode === "awakening" && (
        <div className="fixed inset-0 w-screen h-screen scene-fade-in" style={{ zIndex: 50 }}>
          <video
            src="/videos/grok-read-book-03.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleAwakeningEnded}
            className="w-full h-full object-contain select-none"
          />
        </div>
      )}
      {mode === "hands" && (
        <div className="fixed inset-0 w-screen h-screen scene-fade-in" style={{ zIndex: 50 }}>
          <img
            src="/images/cover-book.png"
            alt="РЎС†РµРЅР° СЃ СЂСѓРєР°РјРё Рё РєРЅРёРіРѕР№"
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
          <button
            type="button"
            onClick={handleOpenReadingFromHands}
            aria-label="РћС‚РєСЂС‹С‚СЊ РєРЅРёРіСѓ СЃР»РѕРІР°СЂСЏ"
            className="absolute"
            style={{
              left: "50%",
              top: "62%",
              transform: "translate(-50%, -50%)",
              width: "34%",
              height: "30%",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          />
        </div>
      )}
      {mode === "reading" && (
        <FinalBook entries={entries} setEntries={setEntries} onBack={() => setMode("form")} onPageNav={handlePageNav} />
      )}

      {mode === "final" && (
        <FinalScreen entries={entries} onBack={() => setMode("form")} />
      )}
      </div>}

      {(mode === "reading" || mode === "final") && <VibeAiBrand />}

      {mode !== "intro" && mode !== "awakening" && mode !== "hands" && (
        <ControlBar
          mode={mode}
          setMode={setMode}
          onAddWord={handleAddWord}
          onReadBook={handleStartReadFlow}
          onShare={handleShare}
          pageNav={pageNav}
        />
      )}
    </div>
  );
};

export default Index;

