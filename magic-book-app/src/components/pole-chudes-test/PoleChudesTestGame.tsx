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
import DigitalCodeBackdrop from "@/components/DigitalCodeBackdrop";
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

function publicFile(path: string): string {
  const b = import.meta.env.BASE_URL || "/";
  const p = b.endsWith("/") ? b : `${b}/`;
  return `${p}${path.replace(/^\//, "")}`;
}

function toAudioSrc(fileName: string) {
  return publicFile(`audio/${encodeURIComponent(fileName)}`);
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => c + c).join("") : normalized;
  const int = Number.parseInt(full, 16);
  if (Number.isNaN(int)) return `rgba(168,85,247,${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
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
  const USE_BOOK_RESULT_TEST = true;
  const RESULT_BOOK_BOX_STYLE = {
    left: "50%",
    top: "57%",
    width: "min(56vw, 37rem)",
    minHeight: "min(45dvh, 18rem)",
    transform: "translate(-50%, -50%)",
  } as const;

  const navigate = useNavigate();
  const closeAndNavigate = useCallback(
    (to: string) => {
      onClosePanel?.();
      navigate(to);
    },
    [navigate, onClosePanel],
  );
  const [stage, setStage] = useState<GameStage>("GAME");
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
  const splashVideoRef = useRef<HTMLVideoElement | null>(null);
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

  useEffect(() => {
    if (stage !== "SUMMARY") return;

    const summaryIntroFx = new Audio(toAudioSrc("фейерверк фанфары аплодисменты.MP3"));
    const summaryLoopFx = new Audio(toAudioSrc("фанфары аплодисменты .MP3"));
    summaryIntroFx.preload = "auto";
    summaryLoopFx.preload = "auto";
    summaryIntroFx.volume = 0.95;
    summaryLoopFx.volume = 0.9;
    summaryLoopFx.loop = true;

    let disposed = false;
    const startLoop = () => {
      if (disposed) return;
      void summaryLoopFx.play().catch(() => {});
    };

    // После wowStart на кнопке "Показать результаты" сразу запускаем фейерверк, затем фоновые фанфары.
    void summaryIntroFx.play().then(startLoop).catch(startLoop);

    return () => {
      disposed = true;
      summaryIntroFx.pause();
      summaryIntroFx.currentTime = 0;
      summaryLoopFx.pause();
      summaryLoopFx.currentTime = 0;
    };
  }, [stage]);

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

  const handleStartFromSplash = useCallback(() => {
    if (busy) return;
    /* Клик-саунд запускаем мгновенно, без ожидания — экран барабана открывается сразу по нажатию. */
    void sound()?.play("wowStart", { stopBefore: true });
    splashVideoRef.current?.pause();
    onPauseBookHymn?.();
    flushSync(() => {
      setStage("GAME");
      setBusy(false);
    });
  }, [busy, onPauseBookHymn, sound]);

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
  const usedAttempts = Math.min(results.length + (stage === "GAME" && isSpinning ? 1 : 0), MAX_SPINS);
  const attemptsLeft = Math.max(MAX_SPINS - usedAttempts, 0);
  const attemptDisplay = Math.min(results.length + (stage === "GAME" ? 1 : 0), MAX_SPINS);
  const attemptChipThemes: Record<number, { border: string; bg: string; glow: string }> = {
    1: {
      border: "rgba(100,160,255,0.5)",
      bg: "rgba(80, 40, 160, 0.35)",
      glow: "0 0 15px rgba(100,160,255,0.4),0 0 30px rgba(138,92,246,0.2),inset 0 0 20px rgba(100,160,255,0.1)",
    },
    2: {
      border: "rgba(56,189,248,0.55)",
      bg: "rgba(24, 86, 170, 0.34)",
      glow: "0 0 15px rgba(56,189,248,0.42),0 0 30px rgba(80,160,255,0.2),inset 0 0 20px rgba(56,189,248,0.1)",
    },
    3: {
      border: "rgba(34,197,94,0.56)",
      bg: "rgba(26, 118, 74, 0.34)",
      glow: "0 0 15px rgba(34,197,94,0.38),0 0 30px rgba(52,211,153,0.2),inset 0 0 20px rgba(34,197,94,0.1)",
    },
    4: {
      border: "rgba(236,72,153,0.56)",
      bg: "rgba(139, 36, 105, 0.34)",
      glow: "0 0 15px rgba(236,72,153,0.38),0 0 30px rgba(244,114,182,0.2),inset 0 0 20px rgba(236,72,153,0.1)",
    },
  };
  const attemptTheme = attemptChipThemes[attemptDisplay] ?? attemptChipThemes[1];
  const resultAccent = CATEGORIES.find((c) => c.id === currentResult?.category)?.color ?? "#8b5cf6";
  return (
    <div
      id="pole-chudes-test-root"
      data-splash={stage === "SPLASH" ? "true" : undefined}
      className={cn(
        "pole-chudes-scene relative flex min-h-0 w-full flex-col font-book text-[#faf6f0] selection:bg-purple-500/30",
        /** SPLASH: CTA в потоке, не фикс к viewport; не клипать нижний край */
        stage === "SPLASH" ? "overflow-x-hidden overflow-y-auto" : "overflow-hidden",
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

      {(stage === "GAME" || stage === "RESULT" || stage === "SUMMARY") && (
        <DigitalCodeBackdrop opacity={0.55} variant="sides" sidesInsetPercent={0} zIndex={2} />
      )}
      {stage !== "SPLASH" && <GlobalFXLayer />}
      <GlobalVibeShell
        banner={false}
        showLogo={stage === "SPLASH"}
        showRings={!isPanelLayout}
        compactBrand={stage === "SPLASH"}
        magicRingsClassName="magic-rings-fx--luck-final"
      />

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        {stage === "GAME" && (
          <div className="pointer-events-none absolute left-1/2 top-[clamp(8.6rem,21dvh,11.8rem)] z-20 -translate-x-1/2">
            <motion.div
              key={`attempt-pop-${stage}-${attemptsLeft}`}
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="neon-btn-glow animate-neon-pulse rounded-full border-2 px-5 py-2 text-center sm:px-6 sm:py-2.5"
              style={{
                borderColor: attemptTheme.border,
                background: attemptTheme.bg,
                boxShadow: attemptTheme.glow,
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            >
              <span className="text-[14px] font-bold tracking-[0.03em] text-white sm:text-[16px]">
                {attemptDisplay}/{MAX_SPINS} попытки
              </span>
            </motion.div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {stage === "SPLASH" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex w-full min-h-[100dvh] flex-1 flex-col items-stretch justify-start px-2 pt-[34px] sm:px-3 sm:pt-[28px]"
            >
              <div className="pole-chudes-splash-bg-sides pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
                <div className="pole-chudes-splash-digital" />
                <pre className="pole-chudes-splash-code-side pole-chudes-splash-code-side--l" aria-hidden>
                  {`0x1F\n$env\n!OK\n#bit\n%cpu\n$run\n#go\n!OK\n%net\n#io`}
                </pre>
                <pre className="pole-chudes-splash-code-side pole-chudes-splash-code-side--r" aria-hidden>
                  {`1010\n0xff\n#cf\n$OK\n!run\n#now\n%mem\n#ai\n!OK\n#io`}
                </pre>
                <pre className="pole-chudes-splash-code-stream" aria-hidden>
                  {`01001\n11010\n0x0f\n#ai\n$run\n&flow\n%code\n!vibe\n=>OK\n0..1\n|||\n/\\\\/`}
                </pre>
                <pre className="pole-chudes-splash-code-stream pole-chudes-splash-code-stream--2" aria-hidden>
                  {`1010\n$PATH\n+bit\n#cf\n..+\n$env\n!run\n#now\n%cpu\n$OK\n#go\n!OK`}
                </pre>
              </div>
              {/** Как в Index: книга → затемнение → волна поверх */}
              <img
                src="/images/open-book.png"
                alt=""
                className="pointer-events-none absolute inset-0 z-[1] h-full w-full select-none object-cover blur-2xl opacity-40 scale-110"
                draggable={false}
              />
              <div className="pointer-events-none absolute inset-0 z-[2] bg-black/40 backdrop-blur-sm" />
              <div className="absolute inset-0 z-[3]">
                <HeroWave />
              </div>
              <div className="pointer-events-none fixed inset-0" style={{ zIndex: 100 }}>
                <div className="pole-chudes-splash-video-clip absolute left-1/2 top-1/2 h-[86%] w-[86%] max-h-full max-w-full -translate-x-1/2 -translate-y-1/2">
                  <video
                    ref={splashVideoRef}
                    src={SPLASH_VIDEO_SRC}
                    autoPlay
                    loop
                    playsInline
                    className="absolute inset-0 h-full w-full object-contain object-center select-none"
                  />
                  <div className="pointer-events-none absolute inset-0" aria-hidden>
                    <div className="pole-chudes-splash-corner pole-chudes-splash-corner--tl" />
                    <div className="pole-chudes-splash-corner pole-chudes-splash-corner--tr" />
                    <div className="pole-chudes-splash-corner pole-chudes-splash-corner--bl" />
                    <div className="pole-chudes-splash-corner pole-chudes-splash-corner--br" />
                  </div>
                </div>
              </div>
              <div
                className="pole-chudes-splash-words-clip pointer-events-none fixed inset-0 overflow-hidden"
                style={{ zIndex: 160 }}
                aria-hidden
              >
                <FloatingWords />
              </div>
              <div
                className="pointer-events-none relative z-0 min-h-0 w-full min-h-[1px] max-w-full flex-1"
                aria-hidden
              />
              <NeonGlassButton
                accent
                className="splash-button pointer-events-auto relative z-[500] mx-auto mt-auto !mb-8 !shrink-0 !px-8 !py-2.5 !text-sm sm:!px-10 sm:!py-3 sm:!text-base"
                disabled={busy}
                onClick={handleStartFromSplash}
              >
                Запустить игру?
              </NeonGlassButton>
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

              <div className="-mt-16 flex max-w-full flex-wrap items-center justify-center gap-1 justify-self-center sm:-mt-14 sm:gap-1.5">
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
                "relative flex min-h-0 flex-1 flex-col items-center overflow-hidden p-2 text-center sm:p-4",
                USE_BOOK_RESULT_TEST
                  ? "justify-start"
                  : isPanelLayout
                    ? "justify-start pt-[clamp(4.2rem,10dvh,6rem)]"
                    : "justify-start pt-[clamp(4rem,9.5dvh,5.8rem)]",
              )}
            >
              <div
                className={cn(
                  "pole-chudes-result-panel flex flex-col justify-center space-y-5 overflow-hidden rounded-[34px] border-[3px] p-8",
                  USE_BOOK_RESULT_TEST ? "absolute" : "relative mx-auto w-full max-w-[31rem]",
                )}
                style={
                  {
                    ...(USE_BOOK_RESULT_TEST ? RESULT_BOOK_BOX_STYLE : { marginTop: "clamp(5rem, 12.2dvh, 7rem)" }),
                    borderColor: "rgba(204,160,74,0.78)",
                    background:
                      "linear-gradient(155deg, rgba(32,112,224,0.42) 0%, rgba(126,72,210,0.34) 38%, rgba(58,178,242,0.38) 62%, rgba(196,76,118,0.22) 82%, rgba(30,106,214,0.4) 100%)",
                    boxShadow:
                      "0 0 0 1px rgba(120,220,255,0.24), 0 0 20px rgba(84,170,255,0.28), 0 0 32px rgba(168,85,247,0.2), inset 0 0 52px rgba(20,18,56,0.16)",
                  }
                }
              >
                <div
                  className="absolute inset-0 opacity-100"
                  style={{ background: "linear-gradient(180deg, rgba(154,230,255,0.14) 0%, rgba(34,74,188,0.1) 56%, rgba(178,86,224,0.08) 100%)" }}
                />
                <div
                  className="relative z-10 mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-2xl border-2"
                  style={{
                    background: "linear-gradient(145deg, rgba(28,102,210,0.42) 0%, rgba(84,56,176,0.34) 100%)",
                    color: "#fff4cc",
                    borderColor: "rgba(214,168,78,0.86)",
                  }}
                >
                  {React.cloneElement(getCategoryIcon(currentResult.category) as React.ReactElement, { className: "h-8 w-8" })}
                </div>
                <h3
                  className="pole-chudes-result-panel__category relative z-10 text-lg font-semibold uppercase"
                  style={{ color: "#f5e2a5", textShadow: "0 0 12px rgba(191,149,63,0.34)" }}
                >
                  {CATEGORIES.find((c) => c.id === currentResult.category)?.label}
                </h3>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pole-chudes-result-panel__phrase relative z-10 text-3xl font-bold uppercase leading-tight md:text-4xl"
                  style={{ color: "#fff9e6", textShadow: "0 0 16px rgba(191,149,63,0.28), 0 0 8px rgba(38,112,210,0.18)" }}
                >
                  {currentResult.phrase}
                </motion.h2>
                <div className="relative z-10 pt-2">
                  <NeonGlassButton
                    className="pole-chudes-result-cta !w-full !rounded-3xl !py-4 !text-xl !font-black !text-white"
                    disabled={!resultReady}
                    onClick={() => void nextAction()}
                  >
                    {results.length >= MAX_SPINS ? "Показать результаты" : "Продолжить"}
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
              className="relative flex min-h-0 flex-1 flex-col items-center overflow-hidden px-3 pb-2 pt-[clamp(3.6rem,9dvh,5.4rem)] text-center sm:px-5 sm:pb-3 sm:pt-[clamp(4rem,10dvh,6rem)]"
            >
              <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center">
                <img
                  src="/images/финал аплодисменты игра.png"
                  alt=""
                  className="h-[86%] w-[86%] select-none object-contain object-center"
                  draggable={false}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 z-[2] bg-black/22" />
              <div className="relative z-10 flex h-full w-full max-w-[min(100%,58rem)] flex-1 flex-col">
                <div className="absolute left-1/2 top-[clamp(0.35rem,1.8dvh,1rem)] z-20 w-full max-w-[34rem] -translate-x-1/2">
                  <NeonGlassButton
                    accent
                    className="pointer-events-auto !block w-full !px-3 !py-1.5 !text-sm sm:!px-4 sm:!py-2 sm:!text-base"
                  >
                    Хотите также? свяжитесь с ТАНЕЙ !
                  </NeonGlassButton>
                </div>
                <div className="mx-auto mt-28 grid w-full max-w-[54rem] flex-1 content-center grid-cols-1 gap-3 text-left md:mt-34 md:grid-cols-2">
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
                <div className="mx-auto -mt-16 grid w-full max-w-[34rem] grid-cols-1 gap-2 pb-1 md:-mt-20 sm:grid-cols-2">
                  <NeonGlassButton
                    accent
                    className="!px-3 !py-1.5 !text-sm sm:!px-4 sm:!py-2 sm:!text-base"
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
                  <NeonGlassButton className="!px-3 !py-1.5 !text-sm sm:!px-4 sm:!py-2 sm:!text-base" onClick={() => closeAndNavigate("/?entry=slovar&screen=hymn")}>
                    Выбрать гимн
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-3 !py-1.5 !text-sm sm:!px-4 sm:!py-2 sm:!text-base" onClick={() => closeAndNavigate("/?entry=slovar&screen=form")}>
                    Внести слово
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-3 !py-1.5 !text-sm sm:!px-4 sm:!py-2 sm:!text-base" onClick={() => closeAndNavigate("/?entry=slovar&screen=reading")}>
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
