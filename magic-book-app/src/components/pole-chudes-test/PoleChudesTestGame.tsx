import React, { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { AppWindow, Code2, GraduationCap, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NeonGlassButton from "@/components/NeonGlassButton";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "./constants";
import GlobalFXLayer from "./GlobalFXLayer";
import FloatingWords from "@/components/FloatingWords";
import GlobalVibeShell from "@/components/GlobalVibeShell";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";
import { SoundManager } from "./SoundManager";
import { Wheel } from "./Wheel";
import { WORD_BASE_FROM_TXT } from "./wordBaseFromTxt";

type GameStage = "SPLASH" | "GAME" | "RESULT" | "SUMMARY";

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
  truba: { src: toAudioSrc("вау_труба.MP3"), volume: 0.95 },
  happyBoy: { src: toAudioSrc("довольный мальчик.MP3"), volume: 0.95 },
  laughGirl: { src: toAudioSrc("смех девочка1.MP3"), volume: 0.95 },
  laughMan: { src: toAudioSrc("смех мужчина 1.MP3"), volume: 0.95 },
  laughBoy: { src: toAudioSrc("смех мальчик 1 .MP3"), volume: 0.95 },
} as const;

function publicFile(path: string): string {
  const b = import.meta.env.BASE_URL || "/";
  const p = b.endsWith("/") ? b : `${b}/`;
  return `${p}${path.replace(/^\//, "")}`;
}

const SPLASH_VIDEO_PATH = "videos/заставка перед игрой/заставка перед игрой.mp4";
const SPLASH_VIDEO_SRC = publicFile(SPLASH_VIDEO_PATH);
/** По ТЗ: GAME = магический круг, RESULT = книга с предсказанием. */
const DRUM_BG_GAME_SRC = `/images/${encodeURIComponent("2 fon_baraban png.png")}`;
const DRUM_BG_RESULT_SRC = `/images/${encodeURIComponent("1 fon_baraban png.png")}`;

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
  const [gameWordBase] = useState<GameWordBase>(() => WORD_BASE_FROM_TXT);
  const spinResolveRef = useRef<(() => void) | null>(null);
  const soundManagerRef = useRef<SoundManager | null>(null);

  useEffect(() => {
    // На смене этапа и при смене колбэка: глушим гимн книги (без второго дубля на mount).
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

  const getCategoryByRotation = useCallback((rotationValue: number): string => {
    const sectorSize = 360 / CATEGORIES.length;
    const wheelPos = ((rotationValue % 360) + 360) % 360;
    let bestId: string = CATEGORIES[0].id;
    let bestDistance = Number.POSITIVE_INFINITY;
    CATEGORIES.forEach((cat, idx) => {
      const sectorCenter = (360 - (idx + 0.5) * sectorSize + 360) % 360;
      const delta = Math.abs(((wheelPos - sectorCenter + 540) % 360) - 180);
      if (delta < bestDistance) {
        bestDistance = delta;
        bestId = cat.id;
      }
    });
    return bestId;
  }, []);

  const getResultForCategory = useCallback(
    (categoryId: string, snapshot: Record<string, Set<string>>, attempt: number): SpinResult | null => {
      const categoryWords = gameWordBase[categoryId] ?? [];
      if (!categoryWords.length) return null;
      const categoryUsed = snapshot[categoryId] || new Set();
      const available = categoryWords.filter((word) => !categoryUsed.has(word));
      const source = available.length > 0 ? available : categoryWords;
      const index = Math.floor(Math.random() * source.length);
      return { category: categoryId, phrase: source[index] ?? source[(attempt - 1) % source.length] };
    },
    [gameWordBase],
  );

  const handleSpinAnimationComplete = useCallback(() => {
    spinResolveRef.current?.();
    spinResolveRef.current = null;
  }, []);

  const onSpinComplete = useCallback(
    async (spinResult: SpinResult, attempt: number, usedSnapshot: Record<string, Set<string>>) => {
      setCurrentResult(spinResult);

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
      const laughSound = laughByAttempt[attempt];
      if (laughSound) {
        await sound()?.play(laughSound, { waitForEnd: true });
      } else {
        await (sound()?.play(openSound, { waitForEnd: true, stopBefore: false }) ?? Promise.resolve());
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
    const fullSpins = 360 * (4 + Math.floor(Math.random() * 2));
    const randomStop = Math.random() * 360;
    const nextRotation = rotation + fullSpins + randomStop;
    const animationDone = new Promise<void>((resolve) => {
      spinResolveRef.current = resolve;
    });

    onPauseBookHymn?.();
    const spinAudioDone = sound()?.play("spin", { waitForEnd: true }) ?? Promise.resolve();
    const totalSpinDuration = sound()?.getDuration("spin") ?? 2.8;
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

    const landedCategory = getCategoryByRotation(nextRotation);
    const newResult = getResultForCategory(landedCategory, usedSnapshot, attempt);
    if (!newResult) {
      console.error("SPIN ERROR: missing category words in TXT base", { category: landedCategory });
      setIsSpinning(false);
      setBusy(false);
      return;
    }
    await onSpinComplete(newResult, attempt, usedSnapshot);
    /**
     * По финальному сценарию: на карточке предсказания не запускаем автодорожки,
     * иначе на статичном экране слышны повторяющиеся эффекты.
     */
  }, [busy, stage, usedPhrases, results.length, rotation, onPauseBookHymn, onSpinComplete, sound, getCategoryByRotation, getResultForCategory]);

  const startSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);

    requestAnimationFrame(() => {
      void handleSpin();
    });
  }, [isSpinning, handleSpin]);

  const startSpinRef = useRef(startSpin);
  startSpinRef.current = startSpin;

  const handleStartFromSplash = useCallback(() => {
    if (busy) return;
    const v = document.getElementById("pole-chudes-splash-video");
    if (v instanceof HTMLVideoElement) v.pause();
    onPauseBookHymn?.();
    flushSync(() => {
      setStage("GAME");
      setBusy(false);
    });
    startSpinRef.current();
  }, [busy, onPauseBookHymn]);

  const nextAction = useCallback(async () => {
    if (!resultReady) return;
    sound()?.stopAll();
    void sound()?.play("wowStart", { stopBefore: false });
    onPauseBookHymn?.();
    if (results.length >= MAX_SPINS) {
      setStage("SUMMARY");
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
  if (stage === "SUMMARY") backgroundVariant = BG_RESULT;
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
      {(stage === "GAME" || stage === "RESULT") && (
        <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
          <img
            src={backgroundVariant === BG_RESULT ? DRUM_BG_RESULT_SRC : DRUM_BG_GAME_SRC}
            alt=""
            className="h-full w-full select-none object-contain object-center"
            draggable={false}
          />
        </div>
      )}

      {stage !== "SPLASH" && <GlobalFXLayer />}
      {stage === "SPLASH" && <GlobalVibeShell banner={false} showLogo />}

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        {(stage === "GAME" || stage === "RESULT") && (
          <div className="pointer-events-none absolute left-1/2 top-[clamp(1rem,4dvh,2.2rem)] z-20 -translate-x-1/2">
            <div className="rounded-full border border-cyan-300/35 bg-[#06020c]/65 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[#e9f4ff] sm:text-xs">
              {`ПОПЫТКА ${Math.min(stage === "GAME" ? results.length + 1 : Math.max(results.length, 1), MAX_SPINS)} / ${MAX_SPINS}`}
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {stage === "SPLASH" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex min-h-0 flex-1 flex-col items-center justify-start px-2 pt-[34px] sm:px-3 sm:pt-[28px]"
            >
              <div className="absolute inset-0 z-[1]">
                <HeroWave />
              </div>
              <img
                src="/images/open-book.png"
                alt=""
                className="pointer-events-none absolute inset-0 z-[2] h-full w-full select-none object-cover blur-2xl opacity-40 scale-110"
                draggable={false}
              />
              <div className="absolute inset-0 z-[3] bg-black/55 backdrop-blur-sm" />
              {/** z ниже, чем блок с видео, иначе плавающий текст перекрывает <video> — кажется, что картинка замирала. */}
              <div className="pointer-events-none absolute inset-0 z-[5]" aria-hidden>
                <FloatingWords />
              </div>
              <div className="fixed inset-0 w-full h-full" style={{ zIndex: 50 }}>
                <video
                  id="pole-chudes-splash-video"
                  src={SPLASH_VIDEO_SRC}
                  autoPlay
                  loop
                  playsInline
                  className="absolute left-1/2 top-1/2 h-[92%] w-[92%] max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 object-contain select-none"
                />
                <NeonGlassButton
                  accent
                  className="splash-button absolute bottom-[10%] left-1/2 z-[20] -translate-x-1/2 !px-8 !py-2.5 !text-sm sm:!px-10 sm:!py-3 sm:!text-base"
                  disabled={busy}
                  onClick={handleStartFromSplash}
                >
                  Крутим удачу?
                </NeonGlassButton>
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
              <div className="relative z-10 flex w-full max-w-[min(100vw,980px)] shrink-0 flex-col items-center justify-self-center gap-1 px-0.5" />

              <div className="relative z-10 flex min-h-0 min-w-0 w-full max-w-[min(100vw,980px)] flex-col items-center justify-self-center overflow-hidden">
                <div className="relative flex min-h-0 w-full max-w-full min-w-0 flex-1 items-center justify-center">
                  <div className="pole-chudes-wheel-frame relative z-10 mx-auto flex max-h-full min-h-0 w-full min-w-0 justify-center overflow-hidden">
                    <div className="rounded-full border border-cyan-200/45 bg-black/35 p-2.5 shadow-[0_0_40px_rgba(34,211,238,0.35)] sm:p-3.5">
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
                    disabled={!resultReady}
                    onClick={() => void nextAction()}
                  >
                    {results.length >= MAX_SPINS ? "Посмотреть итоги" : "Продолжить"}
                  </NeonGlassButton>
                </div>
              </div>
            </motion.div>
          )}

          {stage === "SUMMARY" && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className={cn(
                "relative flex min-h-0 flex-1 flex-col items-center overflow-hidden p-3 text-center sm:p-5",
                isPanelLayout ? "pt-[clamp(6.2rem,16dvh,8rem)]" : "pt-[clamp(6rem,15dvh,8rem)]",
              )}
            >
              <img
                src="/images/финал аплодисменты игра.png"
                alt=""
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full select-none object-cover object-center"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 z-[2] bg-black/35" />
              <div className="relative z-10 flex w-full max-w-[min(100%,58rem)] flex-1 flex-col">
                <h3 className="text-center text-3xl font-bold uppercase tracking-[0.2em] text-[#f7edff] drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] sm:text-4xl">
                  ИТОГИ
                </h3>
                <div className="mx-auto mt-[clamp(1.5rem,4.5dvh,3rem)] grid w-full max-w-[54rem] grid-cols-1 gap-3 overflow-auto pr-1 text-left md:grid-cols-2">
                  {results.map((item, idx) => {
                    const cat = CATEGORIES.find((c) => c.id === item.category);
                    return (
                      <div
                        key={`${item.phrase}-${idx}`}
                        className="rounded-2xl border border-fuchsia-300/30 bg-[#170d2fcc]/95 px-4 py-3 shadow-[0_6px_24px_rgba(20,0,35,0.45)]"
                      >
                        <div className="text-[10px] uppercase tracking-[0.16em] text-fuchsia-100/85">{cat?.label ?? item.category}</div>
                        <div className="mt-1 text-sm font-semibold leading-snug text-white sm:text-base">{item.phrase}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-auto grid grid-cols-1 gap-2 pb-1 pt-4 sm:mt-6 sm:grid-cols-2">
                  <NeonGlassButton
                    accent
                    className="!px-4 !py-2 !text-sm sm:!text-base"
                    onClick={() => {
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
                    }}
                  >
                    Играть снова
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-4 !py-2 !text-sm sm:!text-base" onClick={() => closeAndNavigate("/?entry=slovar&screen=hymn")}>
                    Выбрать гимн
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-4 !py-2 !text-sm sm:!text-base" onClick={() => closeAndNavigate("/?entry=slovar&screen=form")}>
                    Внести слово
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-4 !py-2 !text-sm sm:!text-base" onClick={() => closeAndNavigate("/?entry=slovar&screen=reading")}>
                    Читать книгу
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
