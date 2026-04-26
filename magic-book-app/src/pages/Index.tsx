import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import FloatingWords from "@/components/FloatingWords";
import DigitalCodeBackdrop from "@/components/DigitalCodeBackdrop";
import MagicBook from "@/components/MagicBook";
import FinalBook from "@/components/FinalBook";
import FinalScreen from "@/components/FinalScreen";
import ControlBar from "@/components/ControlBar";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";
import GlobalVibeShell from "@/components/GlobalVibeShell";
import IntroSlovarEmbed from "@/components/IntroSlovarEmbed";
import LuckyWheelPanel from "@/components/lucky-wheel/LuckyWheelPanel";
import { LUCKY_WHEEL_ENTRY } from "@/config/luckyWheel";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

const stripDocxArtifacts = (value: string): string =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&lt;[^&]*&gt;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isDocxTechnicalGarbage = (value: string): boolean =>
  /(w:tab|w:pict|w14:|anchorid|_x0000|<\/?w:|<\/?v:|xmlns|style=|rsidrpr)/i.test(value);

const sanitizeEntryText = (entry: Entry): Entry => ({
  ...entry,
  word: stripDocxArtifacts(String(entry.word || "")),
  description: stripDocxArtifacts(String(entry.description || "")),
});

interface PageNav {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const Index = () => {
  /** Панель гимна / оживление / «руки»: глобальный логотип AI скрываем (нет дубля со сценой); кольца — в GlobalVibeShell. */
  const [hymnPanelOpen, setHymnPanelOpen] = useState(false);
  /** Вариант A: игра «Поле чудес» в панели (см. LUCKY_WHEEL_ENTRY). */
  const [luckyWheelOpen, setLuckyWheelOpen] = useState(false);
  const navigate = useNavigate();
  const FINAL_DICTIONARY_URL = "/final-dictionary-61.json";
  /** v2: экспорт всегда подмешивается к сохранённому списку (слова из файла перекрывают старые), плюс срез дублей с одинаковыми картинками. */
  const SEED_STORAGE_KEY = "magic-book-seed-v2-applied";
  const HYMN_MUTED_STORAGE_KEY = "magic-book-hymn-muted";
  const ENTRIES_STORAGE_KEY = "magic-book-entries";
  const ENTRIES_LITE_BACKUP_KEY = "magic-book-entries-lite-backup";
  const ENTRIES_MAX_COUNT_KEY = "magic-book-entries-max-count";
  const DOCX_IMPORT_APPLIED_KEY = "magic-book-docx-import-applied";

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
    const mergeEntry = (a: Entry, b: Entry): Entry => {
      const aImages = Array.isArray(a.images) ? a.images : [];
      const bImages = Array.isArray(b.images) ? b.images : [];
      return {
        word: a.word || b.word,
        description: a.description || b.description,
        // На восстановлении базы сохраняем более полный набор скринов.
        images: bImages.length > aImages.length ? bImages : aImages,
        // Реакции только накапливаем: берём максимум по каждому счётчику.
        reactions: {
          fire: Math.max(Number(a.reactions?.fire || 0), Number(b.reactions?.fire || 0)),
          love: Math.max(Number(a.reactions?.love || 0), Number(b.reactions?.love || 0)),
          rocket: Math.max(Number(a.reactions?.rocket || 0), Number(b.reactions?.rocket || 0)),
          laugh: Math.max(Number(a.reactions?.laugh || 0), Number(b.reactions?.laugh || 0)),
          like: Math.max(Number(a.reactions?.like || 0), Number(b.reactions?.like || 0)),
        },
      };
    };
    for (const e of primary) {
      const k = wordKey(e.word);
      if (!k) continue;
      if (!map.has(k)) {
        map.set(k, e);
      } else {
        map.set(k, mergeEntry(map.get(k) as Entry, e));
      }
    }
    for (const e of extra) {
      const k = wordKey(e.word);
      if (!k) continue;
      if (!map.has(k)) {
        map.set(k, e);
      } else {
        map.set(k, mergeEntry(map.get(k) as Entry, e));
      }
    }
    return Array.from(map.values());
  };

  const parseSeedBackupEntries = (raw: unknown): Entry[] => {
    if (!Array.isArray(raw)) return [];
    return raw
      .map((item: SeedBackupEntry) => {
        const rawWord = String(item?.word || "").trim();
        const rawDescription = String(item?.description || "").trim();
        if (isDocxTechnicalGarbage(rawWord) || isDocxTechnicalGarbage(rawDescription)) return null;

        const word = stripDocxArtifacts(rawWord);
        const description = stripDocxArtifacts(rawDescription);
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

  const parseSavedEntries = (raw: string | null): Entry[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed)
        ? (parsed as Entry[])
            .filter((entry) => !isDocxTechnicalGarbage(String(entry?.word || "")) && !isDocxTechnicalGarbage(String(entry?.description || "")))
            .map(sanitizeEntryText)
        : [];
    } catch {
      return [];
    }
  };

  const exactWordKey = (w: string): string => String(w ?? "");

  const restoreImagesByWord = (current: Entry[], sources: Entry[]): Entry[] => {
    const sourceImagesByWord = new Map<string, string[]>();
    for (const src of sources) {
      const k = exactWordKey(src.word);
      if (!k) continue;
      const imgs = Array.isArray(src.images) ? src.images.filter((img): img is string => typeof img === "string" && img.trim().length > 0) : [];
      if (!imgs.length) continue;
      const prev = sourceImagesByWord.get(k) ?? [];
      if (imgs.length > prev.length) sourceImagesByWord.set(k, imgs);
    }

    let changed = false;
    const next = current.map((entry) => {
      const currentImages = Array.isArray(entry.images) ? entry.images : [];
      const sourceImages = sourceImagesByWord.get(exactWordKey(entry.word)) ?? [];
      if (!sourceImages.length) return entry;
      const sameImages = currentImages.length === sourceImages.length && currentImages.every((img, idx) => img === sourceImages[idx]);
      if (sameImages) return entry;
      changed = true;
      return { ...entry, images: sourceImages };
    });

    return changed ? next : current;
  };

  const appendMissingByExactWord = (current: Entry[], candidates: Entry[]): Entry[] => {
    const known = new Set(current.map((e) => exactWordKey(e.word)).filter(Boolean));
    const additions = candidates.filter((e) => {
      const k = exactWordKey(e.word);
      if (!k || known.has(k)) return false;
      known.add(k);
      return true;
    });
    if (!additions.length) return current;
    return [...current, ...additions];
  };

  const tailEntriesAfterBaseline = (baseline: Entry[], candidates: Entry[]): Entry[] => {
    const baselineWords = new Set(baseline.map((e) => wordKey(e.word)).filter(Boolean));
    return candidates.filter((e) => {
      const k = wordKey(e.word);
      return Boolean(k) && !baselineWords.has(k);
    });
  };

  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"intro" | "form" | "awakening" | "hands" | "reading" | "final">("intro");
  const [entries, setEntries] = useState<Entry[]>(() => {
    const savedMain = removeTestEntries(parseSavedEntries(localStorage.getItem(ENTRIES_STORAGE_KEY)));
    return savedMain.length > 0 ? savedMain : [];
  });
  const [entriesLoaded, setEntriesLoaded] = useState(false);

  useEffect(() => {
    const savedMain = removeTestEntries(parseSavedEntries(localStorage.getItem(ENTRIES_STORAGE_KEY)));
    if (savedMain.length > 0) {
      setEntries(savedMain);
      setEntriesLoaded(true);
      return;
    }

    let cancelled = false;
    void fetch(FINAL_DICTIONARY_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data) => {
        if (cancelled) return;
        const finalEntries = removeTestEntries(parseSeedBackupEntries(data));
        setEntries(finalEntries);
        setEntriesLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setEntriesLoaded(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cleaned = entries
      .filter((entry) => !isDocxTechnicalGarbage(String(entry?.word || "")) && !isDocxTechnicalGarbage(String(entry?.description || "")))
      .map(sanitizeEntryText);
    const oldSerialized = JSON.stringify(entries);
    const cleanedSerialized = JSON.stringify(cleaned);
    if (oldSerialized !== cleanedSerialized) {
      setEntries(cleaned);
    }
  }, [entries]);

  const entriesSerializedRef = useRef<string>(JSON.stringify(entries));


  const [pageNav, setPageNav] = useState<PageNav | null>(null);
  const [bookSoundMuted, setBookSoundMuted] = useState(() => {
    try {
      return typeof localStorage !== "undefined" && localStorage.getItem(HYMN_MUTED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const flipAudio = useRef<HTMLAudioElement | null>(null);
  const hymnAudio = useRef<HTMLAudioElement | null>(null);
  const hymnStartedRef = useRef(false);
  const awakenTimerRef = useRef<number | null>(null);
  const duckTimerRef = useRef<number | null>(null);
  const duckRafRef = useRef<number | null>(null);
  const seedHydrationDoneRef = useRef(false);

  const HYMN_BASE_VOLUME = 0.24;
  /** По ТЗ: без провалов громкости на оживлении/эффектах — фон всегда одной громкости. */
  const HYMN_DUCK_VOLUME = HYMN_BASE_VOLUME;

  const toggleBookSound = useCallback(() => {
    setBookSoundMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(HYMN_MUTED_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!hymnAudio.current) return;
    try {
      hymnAudio.current.volume = bookSoundMuted ? 0 : HYMN_BASE_VOLUME;
    } catch {
      /* ignore */
    }
  }, [bookSoundMuted]);

  useEffect(() => {
    flipAudio.current = new Audio("/page-flip.mp3");
    /** Эффект переворота чуть громче фона. */
    flipAudio.current.volume = 1;
    return () => {
      const awakenT = awakenTimerRef.current;
      /* При unmount снимаем актуальные id таймеров из ref (числа, не DOM). */
      // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренное чтение ref в cleanup
      const duckT = duckTimerRef.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренное чтение ref в cleanup
      const duckR = duckRafRef.current;
      if (awakenT) window.clearTimeout(awakenT);
      if (duckT) window.clearTimeout(duckT);
      if (duckR) window.cancelAnimationFrame(duckR);
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

  /** На экране выбора аудио фон гимна останавливаем полностью. */
  const pauseBackgroundHymnSoft = useCallback(() => {
    try {
      hymnAudio.current?.pause();
    } catch {
      /* ignore */
    }
  }, []);

  /** Игра «Поле чудес»: пауза + сброс позиции гимна, чтобы отложенный play() не накладывался на SFX при первом предсказании. */
  const pauseBookHymnForGame = useCallback(() => {
    pauseBackgroundHymnSoft();
    try {
      if (hymnAudio.current) hymnAudio.current.currentTime = 0;
    } catch {
      /* ignore */
    }
  }, [pauseBackgroundHymnSoft]);

  /** После выхода из панели выбора аудио возвращаем фон, если он уже запускался. */
  const resumeBackgroundHymnAfterPanel = useCallback(() => {
    if (!hymnStartedRef.current || !hymnAudio.current) return;
    void hymnAudio.current.play().catch(() => {});
  }, []);

  /** Р“РёРјРЅ СЂРѕРґРёС‚РµР»СЏ: РїРѕ СЃРёРіРЅР°Р»Сѓ РёР· iframe; ref В«Р·Р°РїСѓС‰РµРЅВ» С‚РѕР»СЊРєРѕ РїРѕСЃР»Рµ СѓСЃРїРµС€РЅРѕРіРѕ play (РёРЅР°С‡Рµ РїРѕРІС‚РѕСЂРЅС‹Р№ РєР»РёРє РјРѕР»С‡РёС‚). */
  const startBookHymnFromIntro = useCallback(() => {
    if (!hymnAudio.current) {
      hymnAudio.current = new Audio("/slovar/assets/sounds/versiya%205_hard-rok%20Tanya.mp3");
      hymnAudio.current.loop = true;
      hymnAudio.current.volume = bookSoundMuted ? 0 : HYMN_BASE_VOLUME;
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
  }, [bookSoundMuted]);

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

    try {
      if (entries.length > 0) {
        // Основная база слов: только добавляем/обновляем текущее состояние.
        localStorage.setItem(ENTRIES_STORAGE_KEY, nextSerialized);

        // Компактный backup без base64-картинок (защита от переполнения localStorage).
        const liteBackup = entries.map((entry) => ({
          ...entry,
          images: [],
        }));
        localStorage.setItem(ENTRIES_LITE_BACKUP_KEY, JSON.stringify(liteBackup));

        const prevMax = Number(localStorage.getItem(ENTRIES_MAX_COUNT_KEY) || "0");
        if (entries.length > prevMax) {
          localStorage.setItem(ENTRIES_MAX_COUNT_KEY, String(entries.length));
        }
        return;
      }
    } catch (error) {
      // Не даём эффекту уронить UI при переполнении localStorage (большие скрины/base64).
      console.error("Не удалось сохранить magic-book-entries в localStorage", error);
    }
  }, [entries, ENTRIES_LITE_BACKUP_KEY, ENTRIES_MAX_COUNT_KEY, ENTRIES_STORAGE_KEY]);


  /** Р’С…РѕРґ РёР· SLOVAR_02: РґРµС‚РµСЂРјРёРЅРёСЂРѕРІР°РЅРЅРѕ РѕС‚РєСЂС‹РІР°РµРј С„РѕСЂРјСѓ РІРЅРµСЃРµРЅРёСЏ СЃР»РѕРІ (Р±РµР· РїСЂРѕРјРµР¶СѓС‚РѕС‡РЅРѕРіРѕ preview). */
  useEffect(() => {
    const entry = searchParams.get("entry");
    const screen = searchParams.get("screen");

    // Локально фиксируем единый origin для словаря (5501), чтобы не терять накопление
    // из-за разных localStorage на 8080 и 5501.
    if (entry === "slovar" && typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocal = host === "localhost" || host === "127.0.0.1";
      if (isLocal && window.location.port !== "5501") {
        const target = new URL(window.location.href);
        target.port = "5501";
        window.location.replace(target.toString());
        return;
      }
    }

    if (entry === "slovar" && screen === "form") {
      setMode("form");
      return;
    }
    if (entry === "slovar" && screen === "reading") {
      setMode("reading");
      return;
    }
    if (entry === "slovar" && screen === "hymn") {
      setMode("final");
      return;
    }
    if (entry === "slovar" && screen === "final") {
      setMode("final");
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
    if (!entriesLoaded) return;
    if (mode === "reading" && entries.length === 0) {
      setMode("form");
      toast({
        title: "РЎР»РѕРІ РїРѕРєР° РЅРµС‚",
        description: "РЎРЅР°С‡Р°Р»Р° РІРЅРµСЃРёС‚Рµ Рё СЃРѕС…СЂР°РЅРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРЅРѕ СЃР»РѕРІРѕ.",
      });
    }
  }, [mode, entries.length, entriesLoaded]);

  /** По ТЗ: автоприглушение фона полностью отключено, громкость единая на всех экранах. */

  const playFlipSound = useCallback(() => {
    if (!flipAudio.current) return;
    flipAudio.current.currentTime = 0;
    flipAudio.current.play().catch(() => {});
  }, []);

  const handleStartReadFlow = useCallback(() => {
    if (awakenTimerRef.current) window.clearTimeout(awakenTimerRef.current);
    // Гарантия: фоновый гимн стартует с открытия книги, если ещё не был запущен.
    startBookHymnFromIntro();
    playFlipSound();
    setMode("awakening");
    awakenTimerRef.current = window.setTimeout(() => {
      setMode("hands");
    }, 12000);
  }, [playFlipSound, startBookHymnFromIntro]);

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

  const openLuckyWheel = useCallback(() => {
    if (LUCKY_WHEEL_ENTRY === "route") {
      navigate("/luck");
    } else {
      setLuckyWheelOpen(true);
    }
  }, [navigate]);

  useEffect(() => {
    if (mode !== "form") return;
    // Экран «Ввести слово»: без скролла; фоновый гимн (один источник) не останавливаем.
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mode]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden bg-black">
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
          {(mode === "awakening" || mode === "hands") && <HeroWave />}
          {(mode === "awakening" || mode === "hands") && <FloatingWords />}
        </>
      )}

      {mode !== "intro" && <div className="relative z-20 w-full h-full">
      {mode === "form" && (
        <div className="fixed inset-0 overflow-hidden">
          <MagicBook
            entries={entries}
            setEntries={setEntries}
            onOpenCatalog={handleStartReadFlow}
            onFinish={() => setMode("final")}
            onPageNav={handlePageNav}
          />
        </div>
      )}
      {mode === "awakening" && (
        <div className="fixed inset-0 w-full h-full scene-fade-in" style={{ zIndex: 50 }}>
          <video
            src="/videos/grok-read-book-03.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={handleAwakeningEnded}
            className="w-full h-full object-contain select-none"
          />
          {/* Усиленный «громкий» визуальный пульс во время оживления */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[38vmin] w-[38vmin] rounded-full border-2 border-fuchsia-200/75 animate-ping" />
            <div className="absolute h-[24vmin] w-[24vmin] rounded-full bg-fuchsia-400/35 blur-2xl" />
          </div>
        </div>
      )}
      {mode === "hands" && (
        <div className="fixed inset-0 w-full h-full scene-fade-in" style={{ zIndex: 50 }}>
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
              boxShadow: "none",
              cursor: "pointer",
            }}
          />
        </div>
      )}
      {mode === "reading" && (
        <FinalBook entries={entries} setEntries={setEntries} onBack={() => setMode("form")} onPageNav={handlePageNav} />
      )}

      {(mode === "form" || mode === "reading") && (
        <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 90 }}>
          <DigitalCodeBackdrop opacity={0.72} />
          <FloatingWords />
        </div>
      )}

      {mode === "final" && (
        <FinalScreen
          entries={entries}
          onBack={() => setMode("form")}
          onLuck={openLuckyWheel}
          onPauseBackgroundHymn={pauseBackgroundHymnSoft}
          onResumeBackgroundHymn={resumeBackgroundHymnAfterPanel}
          onHymnPanelOpenChange={setHymnPanelOpen}
          onHymnPlayGame={handleStartReadFlow}
          onHymnEnterWord={handleAddWord}
          openHymnOnMount={searchParams.get("entry") === "slovar" && searchParams.get("screen") === "hymn"}
        />
      )}
      </div>}

      {/* Переключатель звука вверху на каждом экране, кроме intro и панели аудио */}
      {mode !== "intro" && !hymnPanelOpen && !luckyWheelOpen && (
        <button
          type="button"
          onClick={toggleBookSound}
          aria-pressed={!bookSoundMuted}
          title={bookSoundMuted ? "Включить звук гимна" : "Выключить звук гимна"}
          className={cn(
            "fixed right-2 top-2 z-[220] inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-lg backdrop-blur-md sm:right-3 sm:top-3 sm:text-sm",
            bookSoundMuted
              ? "border-white/25 bg-black/55 text-white/80"
              : "border-sky-400/40 bg-black/45 text-white",
          )}
        >
          {bookSoundMuted ? <VolumeX className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
          <span className="hidden sm:inline">звук в книге: {bookSoundMuted ? "выкл" : "вкл"}</span>
          <span className="sm:hidden">{bookSoundMuted ? "выкл" : "вкл"}</span>
        </button>
      )}

      {/* Кольца курсора — на всех экранах; логотип AI: форма и чтение, не intro/final/оживление/руки/панель гимна */}
      <GlobalVibeShell
        banner={false}
        showRings={mode !== "form"}
        showLogo={
          mode !== "intro" &&
          mode !== "final" &&
          mode !== "awakening" &&
          mode !== "hands" &&
          !hymnPanelOpen &&
          !luckyWheelOpen
        }
      />

      <LuckyWheelPanel
        open={luckyWheelOpen}
        onClose={() => {
          setLuckyWheelOpen(false);
          resumeBackgroundHymnAfterPanel();
        }}
      />

      {mode !== "intro" && mode !== "awakening" && mode !== "hands" && !luckyWheelOpen && (
        <ControlBar
          mode={mode}
          setMode={setMode}
          onAddWord={handleAddWord}
          onReadBook={handleStartReadFlow}
          onShare={handleShare}
          pageNav={pageNav}
          entriesCount={entries.length}
        />
      )}
    </div>
  );
};

export default Index;

