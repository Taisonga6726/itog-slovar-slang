import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { AppWindow, Code2, GraduationCap, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NeonGlassButton from "@/components/NeonGlassButton";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./constants";
import GlobalFXLayer from "./GlobalFXLayer";
import { SoundManager } from "./SoundManager";
import { Wheel } from "./Wheel";

type GameStage = "SPLASH" | "GAME" | "RESULT";

interface SpinResult {
  category: string;
  phrase: string;
}

type BackgroundVariant = "A" | "B" | "C" | "D";
type GameWordBase = Record<string, string[]>;
const BG_GAME: BackgroundVariant = "A";
const BG_RESULT: BackgroundVariant = "B";
const MAX_SPINS = 4;
const EMPTY_WORD_BASE: GameWordBase = CATEGORIES.reduce<GameWordBase>((acc, cat) => {
  acc[cat.id] = [];
  return acc;
}, {});

function toAudioSrc(fileName: string) {
  return `/audio/${encodeURIComponent(fileName)}`;
}

const SOUND_CONFIG = {
  wowStart: { src: toAudioSrc("КЛИК вау начало.MP3"), volume: 0.95 },
  spin: { src: toAudioSrc("прокрутка колеса 02.MP3"), volume: 1 },
  drumHit: { src: toAudioSrc("ROCK_ ART BARABAN WOW.mp3"), volume: 0.95 },
  truba: { src: toAudioSrc("вау_труба.MP3"), volume: 0.95 },
  happyBoy: { src: toAudioSrc("довольный мальчик.MP3"), volume: 0.95 },
  laughGirl: { src: toAudioSrc("смех девочка1.MP3"), volume: 0.95 },
  laughMan: { src: toAudioSrc("смех мужчина 1.MP3"), volume: 0.95 },
  laughBoy: { src: toAudioSrc("смех мальчик 1 .MP3"), volume: 0.95 },
} as const;

const SPLASH_VIDEO_SRC = "/videos/заставка перед игрой/заставка перед игрой.mp4";
/** По ТЗ: GAME = магический круг, RESULT = книга с предсказанием. */
const DRUM_BG_GAME_SRC = `/images/${encodeURIComponent("2 fon_baraban png.png")}`;
const DRUM_BG_RESULT_SRC = `/images/${encodeURIComponent("1 fon_baraban png.png")}`;
const DEFAULT_RESULT: SpinResult = { category: CATEGORIES[0].id, phrase: CATEGORIES[0].label };

export interface PoleChudesTestGameProps {
  /** Если игра открыта панелью поверх книги — закрыть панель при переходе в другой раздел. */
  onClosePanel?: () => void;
  /** `panel` — встроено в оверлей (высота от родителя); `page` — отдельная страница /luck. */
  layout?: "page" | "panel";
  /** Панель над книгой: жёстко глушить фоновый гимн при спине/результате (сброс позиции), чтобы не накладывался на SFX. */
  onPauseBookHymn?: () => void;
}

export default function PoleChudesTestGame({ onClosePanel, layout = "page", onPauseBookHymn }: PoleChudesTestGameProps = {}) {
  const navigate = useNavigate();
  const closeAndNavigate = useCallback(
    (to: string) => {
      onClosePanel?.();
      navigate(to);
    },
    [navigate, onClosePanel],
  );
  const [stage, setStage] = useState<GameStage>("SPLASH");
  const [results, setResults] = useState<SpinResult[]>([]);
  const [currentResult, setCurrentResult] = useState<SpinResult | null>(null);
  const [usedPhrases, setUsedPhrases] = useState<Record<string, Set<string>>>({});
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [rotationFrames, setRotationFrames] = useState<number | number[]>(0);
  const [spinDuration, setSpinDuration] = useState(2.6);
  const [spinTimes, setSpinTimes] = useState<number[] | undefined>(undefined);
  const [spinEases, setSpinEases] = useState<("easeIn" | "easeOut" | "linear")[] | undefined>(undefined);
  const [resultReady, setResultReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gameWordBase, setGameWordBase] = useState<GameWordBase>(() => EMPTY_WORD_BASE);
  const spinResolveRef = useRef<(() => void) | null>(null);
  const splashVideoRef = useRef<HTMLVideoElement | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);

  useEffect(() => {
    // Внутри Game гимн всегда должен быть принудительно выключен.
    onPauseBookHymn?.();
  }, [onPauseBookHymn]);

  useEffect(() => {
    // Дублируем на смене этапа, чтобы гимн не возвращался при переходах.
    onPauseBookHymn?.();
  }, [stage, onPauseBookHymn]);

  useEffect(() => {
    soundManagerRef.current = new SoundManager(SOUND_CONFIG);
    return () => {
      soundManagerRef.current?.stopAll();
      soundManagerRef.current = null;
    };
  }, []);

  const sound = useCallback(() => soundManagerRef.current, []);

  useEffect(() => {
    if (stage !== "SPLASH") return;
    const video = splashVideoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    void video.play().catch(() => {});
  }, [stage]);

  useEffect(() => {
    const categories = CATEGORIES.map((c) => c.id);
    const pickCategory = (text: string) => {
      const sum = Array.from(text).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      return categories[sum % categories.length];
    };

    const hydrateFromBookEntries = () => {
      try {
        const raw = localStorage.getItem("magic-book-entries");
        if (!raw) return;
        const entries = JSON.parse(raw) as unknown;
        if (!Array.isArray(entries)) return;
        const incoming = entries
          .map((e) => {
            const item = e as { word?: unknown; description?: unknown };
            const text = String(item?.description || item?.word || "").trim();
            return text;
          })
          .filter((v) => v.length > 0);
        if (!incoming.length) return;
        const seen = new Set<string>();
        const uniqueIncoming = incoming.filter((phrase) => {
          const key = phrase.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        const next: GameWordBase = {};
        CATEGORIES.forEach((cat) => {
          next[cat.id] = [];
        });
        uniqueIncoming.forEach((phrase) => {
          const catId = pickCategory(phrase);
          next[catId].push(phrase);
        });
        setGameWordBase(next);
      } catch {
        /* ignore invalid storage payload and keep previous state */
      }
    };
    hydrateFromBookEntries();
    const onStorage = (event: StorageEvent) => {
      if (event.key === "magic-book-entries") hydrateFromBookEntries();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", hydrateFromBookEntries);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", hydrateFromBookEntries);
    };
  }, []);

  const pickSpinResult = useCallback(
    (snapshot: Record<string, Set<string>>) => {
      const nonEmptyCategories = CATEGORIES.filter((c) => (gameWordBase[c.id] ?? []).length > 0);
      if (!nonEmptyCategories.length) return null;
      const sectorPool = nonEmptyCategories;
      const sector = sectorPool[Math.floor(Math.random() * sectorPool.length)];
      const safePhrases = gameWordBase[sector.id] ?? [];
      if (!safePhrases.length) return null;
      const categoryUsed = snapshot[sector.id] || new Set();
      const availablePhrases = safePhrases.filter((p) => !categoryUsed.has(p));
      const phrase = availablePhrases.length > 0 ? availablePhrases[Math.floor(Math.random() * availablePhrases.length)] : safePhrases[Math.floor(Math.random() * safePhrases.length)];
      return { categoryId: sector.id, phrase };
    },
    [gameWordBase],
  );

  const getResultForAttempt = useCallback(
    (snapshot: Record<string, Set<string>>): SpinResult => {
      const computed = pickSpinResult(snapshot);
      if (computed) return { category: computed.categoryId, phrase: computed.phrase };
      return DEFAULT_RESULT;
    },
    [pickSpinResult],
  );

  const calcTargetRotation = useCallback((currentRotation: number, categoryId: string) => {
    const sectorSize = 360 / CATEGORIES.length;
    const targetIndex = CATEGORIES.findIndex((c) => c.id === categoryId);
    const finalRotation = (360 - (targetIndex + 0.5) * sectorSize + 360) % 360;
    const wheelPos = ((currentRotation % 360) + 360) % 360;
    let delta = (finalRotation - wheelPos + 360) % 360;
    if (delta < 20) delta += 360;
    const fullSpins = 360 * (4 + Math.floor(Math.random() * 2));
    return currentRotation + fullSpins + delta;
  }, []);

  const handleSpinAnimationComplete = useCallback(() => {
    spinResolveRef.current?.();
    spinResolveRef.current = null;
  }, []);

  const onSpinComplete = useCallback(
    async (spinResult: SpinResult, attempt: number, usedSnapshot: Record<string, Set<string>>) => {
      setCurrentResult(spinResult);

      const drumHitDone = sound()?.play("drumHit", { waitForEnd: true }) ?? Promise.resolve();
      const openSoundByAttempt: Record<number, "truba" | "wowStart" | "happyBoy"> = {
        1: "truba",
        2: "wowStart",
        3: "truba",
        4: "happyBoy",
      };
      const laughByAttempt: Partial<Record<number, "laughGirl" | "laughMan" | "laughBoy">> = {
        1: "laughGirl",
        2: "laughMan",
        3: "laughBoy",
      };

      await drumHitDone;
      const categoryUsed = usedSnapshot[spinResult.category] || new Set();
      setUsedPhrases((prev) => ({
        ...prev,
        [spinResult.category]: new Set([...categoryUsed, spinResult.phrase]),
      }));
      setResults((prev) => [...prev, spinResult]);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          setStage("RESULT");
          setIsSpinning(false);
          resolve();
        });
      });

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: [CATEGORIES.find((c) => c.id === spinResult.category)?.color || "#ffffff"],
      });

      const openSound = openSoundByAttempt[attempt] ?? "happyBoy";
      const openSoundDone = sound()?.play(openSound, { waitForEnd: true, stopBefore: false }) ?? Promise.resolve();
      await openSoundDone;

      const laughSound = laughByAttempt[attempt];
      if (laughSound) {
        await sound()?.play(laughSound, { waitForEnd: true });
      }

      setResultReady(true);
      setBusy(false);
    },
    [sound],
  );

  const handleSpin = useCallback(async () => {
    if (busy || stage !== "GAME") {
      setIsSpinning(false);
      return;
    }
    setBusy(true);
    setResultReady(false);

    const usedSnapshot = usedPhrases;
    const attempt = results.length + 1;
    const spinResult = getResultForAttempt(usedSnapshot);
    const nextRotation = calcTargetRotation(rotation, spinResult.category);
    const animationDone = new Promise<void>((resolve) => {
      spinResolveRef.current = resolve;
    });

    onPauseBookHymn?.();
    const spinAudioDone = sound()?.play("spin", { waitForEnd: true }) ?? Promise.resolve();
    const totalSpinDuration = 2.8;
    const preRotation = rotation + 180;
    const fastRotation = rotation + 1080;
    setSpinDuration(totalSpinDuration);
    setSpinTimes([0, 0.2, 0.75, 1]);
    setSpinEases(["easeIn", "linear", "easeOut"]);
    setRotationFrames([rotation, preRotation, fastRotation, nextRotation]);
    setRotation(nextRotation);

    await Promise.all([animationDone, spinAudioDone]);
    setRotationFrames(nextRotation);
    setSpinTimes(undefined);
    setSpinEases(undefined);

    const newResult = { category: spinResult.category, phrase: spinResult.phrase };
    await onSpinComplete(newResult, attempt, usedSnapshot);
    /**
     * По финальному сценарию: на карточке предсказания не запускаем автодорожки,
     * иначе на статичном экране слышны повторяющиеся эффекты.
     */
  }, [busy, stage, usedPhrases, results.length, getResultForAttempt, calcTargetRotation, rotation, onPauseBookHymn, onSpinComplete]);

  const startSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);

    requestAnimationFrame(() => {
      void handleSpin();
    });
  }, [isSpinning, handleSpin]);

  const handleStartFromSplash = useCallback(() => {
    if (busy) return;
    setBusy(true);
    onPauseBookHymn?.();
    void sound()?.play("wowStart", { stopBefore: false });
    setStage("GAME");
    setBusy(false);
    startSpin();
  }, [busy, onPauseBookHymn, sound, startSpin]);

  const nextAction = useCallback(async () => {
    if (!resultReady) return;
    sound()?.stopAll();
    void sound()?.play("wowStart", { stopBefore: false });
    onPauseBookHymn?.();
    if (results.length >= MAX_SPINS) {
      setBusy(true);
      setStage("SPLASH");
      setResults([]);
      setCurrentResult(null);
      setUsedPhrases({});
      setResultReady(false);
      setBusy(false);
      setIsSpinning(false);
      setRotation(0);
      setRotationFrames(0);
      setSpinTimes(undefined);
      setSpinEases(undefined);
      return;
    }
    setBusy(true);
    setCurrentResult(null);
    setStage("GAME");
    setBusy(false);
  }, [resultReady, results.length, sound, onPauseBookHymn]);

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case "CODE":
        return <Code2 className="h-6 w-6" />;
      case "WHO_AMI":
        return <Zap className="h-6 w-6" />;
      case "STUDY":
        return <GraduationCap className="h-6 w-6" />;
      case "FATE":
        return <Sparkles className="h-6 w-6" />;
      case "SERVICE":
        return <AppWindow className="h-6 w-6" />;
      default:
        return null;
    }
  };

  const isPanelLayout = layout === "panel";
  let backgroundVariant: BackgroundVariant = BG_GAME;
  if (stage === "GAME") backgroundVariant = BG_GAME;
  if (stage === "RESULT") backgroundVariant = BG_RESULT;
  if (stage === "RESULT" && !currentResult) {
    return null;
  }
  return (
    <div
      id="pole-chudes-test-root"
      className={cn(
        "pole-chudes-scene relative flex min-h-0 w-full flex-col overflow-hidden font-book text-[#faf6f0] selection:bg-purple-500/30",
        isPanelLayout ? "h-full max-h-full flex-1" : "h-[100dvh] max-h-[100dvh]",
      )}
    >
      {stage !== "SPLASH" && (
        <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
          <img
            src={backgroundVariant === BG_RESULT ? DRUM_BG_RESULT_SRC : DRUM_BG_GAME_SRC}
            alt=""
            className="h-full w-full select-none object-contain object-center"
            draggable={false}
          />
        </div>
      )}

      <GlobalFXLayer />

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        <AnimatePresence mode="wait">
          {stage === "SPLASH" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-0"
            >
              <div className="absolute inset-0 z-[3] bg-black/25" />
              <div className="relative z-10 flex w-full max-w-[min(1100px,96vw)] min-h-0 flex-1 flex-col items-center justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[clamp(2rem,8dvh,4rem)]">
                <div className="pole-chudes-splash-frame relative flex w-full max-h-full min-h-0 items-center justify-center overflow-hidden">
                  <video
                    ref={splashVideoRef}
                    src={SPLASH_VIDEO_SRC}
                    autoPlay
                    loop
                    muted={false}
                    playsInline
                    preload="metadata"
                    className="h-[min(86svh,760px)] w-auto max-w-full object-contain object-center"
                  />
                </div>
                <div className="mt-8 flex justify-center">
                  <NeonGlassButton
                    accent
                    className="!px-10 !py-3 !text-base sm:!text-lg"
                    disabled={busy}
                    onClick={() => void handleStartFromSplash()}
                  >
                    Крутим удачу?
                  </NeonGlassButton>
                </div>
              </div>
            </motion.div>
          )}

          {stage === "GAME" && (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid min-h-0 w-full flex-1 grid-rows-[auto_minmax(0,1fr)_auto] items-stretch overflow-hidden px-1.5 pb-1 pt-[clamp(2.75rem,9dvh,4.25rem)] sm:px-2 sm:pb-2 sm:pt-[clamp(3rem,10dvh,4.75rem)]"
            >
              <div className="relative z-10 flex w-full max-w-[min(100vw,920px)] shrink-0 flex-col items-center justify-self-center gap-1 px-0.5">
                <div className="rounded-full border border-cyan-300/35 bg-[#06020c]/65 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#e9f4ff] sm:text-xs">
                  {`ПОПЫТКА ${Math.min(results.length + 1, MAX_SPINS)} / ${MAX_SPINS}`}
                </div>
              </div>

              <div className="relative z-10 flex min-h-0 min-w-0 w-full max-w-[min(100vw,920px)] flex-col items-center justify-self-center overflow-hidden">
                <div className="relative flex min-h-0 w-full max-w-full min-w-0 flex-1 items-center justify-center">
                  <div className="pole-chudes-wheel-frame relative z-10 mx-auto flex max-h-full min-h-0 w-full min-w-0 justify-center overflow-hidden">
                    <div className="rounded-full border border-cyan-200/45 bg-black/35 p-2 shadow-[0_0_40px_rgba(34,211,238,0.35)] sm:p-3">
                      <Wheel
                        rotation={rotationFrames}
                        spinDuration={spinDuration}
                        isSpinning={isSpinning}
                        spinTimes={spinTimes}
                        spinEases={spinEases}
                        canSpin={!busy}
                        onSectorClick={() => startSpin()}
                        onSpinAnimationComplete={handleSpinAnimationComplete}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="-mt-2 flex max-w-full flex-wrap items-center justify-center gap-1 justify-self-center sm:-mt-1 sm:gap-1.5">
                <NeonGlassButton className="!px-3 !py-1.5 !text-[10px] sm:!px-4 sm:!py-2 sm:!text-xs" onClick={() => closeAndNavigate("/")}>
                  Назад к книге
                </NeonGlassButton>
                <NeonGlassButton className="!px-3 !py-1.5 !text-[10px] sm:!px-4 sm:!py-2 sm:!text-xs" onClick={() => closeAndNavigate("/?entry=slovar&screen=form")}>
                  Внести слово
                </NeonGlassButton>
                <NeonGlassButton className="!px-3 !py-1.5 !text-[10px] sm:!px-4 sm:!py-2 sm:!text-xs" onClick={() => closeAndNavigate("/?entry=slovar&screen=reading")}>
                  Читать книгу
                </NeonGlassButton>
              </div>
            </motion.div>
          )}

          {stage === "RESULT" && currentResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className={cn(
                "flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-2 text-center sm:p-4",
                isPanelLayout ? "pt-[clamp(3.25rem,10dvh,4.5rem)]" : "pt-12 sm:pt-14",
              )}
            >
              <div className="pole-chudes-result-panel relative w-full max-w-[min(100%,28rem)] space-y-4 overflow-hidden p-6 sm:space-y-5 sm:p-8">
                <div
                  className="absolute inset-0 animate-pulse opacity-20 blur-[100px]"
                  style={{ backgroundColor: CATEGORIES.find((c) => c.id === currentResult.category)?.color }}
                />
                <div
                  className="relative z-10 mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl border-2 sm:mb-4 sm:h-20 sm:w-20 sm:rounded-3xl"
                  style={{
                    backgroundColor: `${CATEGORIES.find((c) => c.id === currentResult.category)?.color}11`,
                    color: CATEGORIES.find((c) => c.id === currentResult.category)?.color,
                    borderColor: CATEGORIES.find((c) => c.id === currentResult.category)?.color,
                  }}
                >
                  {React.cloneElement(getCategoryIcon(currentResult.category) as React.ReactElement, { className: "h-8 w-8 sm:h-9 sm:w-9" })}
                </div>
                <h3 className="pole-chudes-result-panel__category relative z-10 text-lg font-semibold uppercase sm:text-xl">
                  {CATEGORIES.find((c) => c.id === currentResult.category)?.label}
                </h3>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pole-chudes-result-panel__phrase relative z-10 text-2xl font-bold uppercase leading-tight sm:text-3xl md:text-4xl"
                >
                  {currentResult.phrase}
                </motion.h2>
                <div className="relative z-10 pt-4 sm:pt-6">
                  <NeonGlassButton
                    accent
                    className="pole-chudes-result-cta !w-full !py-3 !text-base !font-semibold !text-white sm:!py-3.5 sm:!text-lg"
                    onClick={() => void nextAction()}
                  >
                    {results.length >= MAX_SPINS ? "Еще раз крутить" : "Продолжить"}
                  </NeonGlassButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
