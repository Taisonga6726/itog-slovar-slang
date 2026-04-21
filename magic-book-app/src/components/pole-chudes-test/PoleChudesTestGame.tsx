import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { AppWindow, Code2, GraduationCap, RotateCcw, Sparkles, Volume2, VolumeX, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import NeonGlassButton from "@/components/NeonGlassButton";
import VibeAiBrand from "@/components/VibeAiBrand";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";
import { cn } from "@/lib/utils";
import { CATEGORIES, PHRASES } from "./constants";
import { Wheel } from "./Wheel";

type GameStage = "SPLASH" | "PLAYING" | "RESULT" | "FINAL";

interface SpinResult {
  category: string;
  phrase: string;
}

type BackgroundVariant = "A" | "B" | "C" | "D";

const BACKGROUND_FLOW: BackgroundVariant[] = ["A", "D", "C", "C"];
const MAX_SPINS = 4;

const AUDIO = {
  START_WOW: "вау_труба.MP3",
  SPIN: "прокрутка колеса 02.MP3",
  SPIN_STOP: "ROCK_ ART BARABAN WOW.mp3",
  REACTIONS: ["смех девочка1.MP3", "смех мальчик 1 .MP3", "смех мужчина 1.MP3", "довольный мальчик.MP3"],
  FINAL: ["фанфары аплодисменты .MP3", "фейерверк фанфары аплодисменты.MP3"],
} as const;

const SPLASH_VIDEO_SRC = "/videos/заставка перед игрой/заставка перед игрой.mp4";
const SPLASH_AUDIO_SRC = "/videos/заставка перед игрой/заставка перед игрой.MP3";
const FINAL_BANNER_SRC = `/images/${encodeURIComponent("финал аплодисменты игра.png")}`;
const COVER_BOOK_SRC = "/images/cover-book.png";
/** После видеозаставки — только статичный фон-книга (без циклического видео). */
const OPEN_BOOK_BG_SRC = "/images/open-book.png";

const toAudioSrc = (fileName: string) => `/audio/${encodeURIComponent(fileName)}`;

export interface PoleChudesTestGameProps {
  /** Если игра открыта панелью поверх книги — закрыть панель при переходе в другой раздел. */
  onClosePanel?: () => void;
  /** `panel` — встроено в оверлей (высота от родителя); `page` — отдельная страница /luck. */
  layout?: "page" | "panel";
}

export default function PoleChudesTestGame({ onClosePanel, layout = "page" }: PoleChudesTestGameProps = {}) {
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
  const [muted, setMuted] = useState(false);
  const [backgroundVariant, setBackgroundVariant] = useState<BackgroundVariant>("A");
  const [playReady, setPlayReady] = useState(false);
  const [resultReady, setResultReady] = useState(false);
  const [finalReady, setFinalReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attemptFlashKey, setAttemptFlashKey] = useState(0);
  const spinResolveRef = useRef<(() => void) | null>(null);
  const splashVideoRef = useRef<HTMLVideoElement | null>(null);
  const splashAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<Array<{ audio: HTMLAudioElement; baseVolume: number }>>([]);

  useEffect(() => {
    if (!splashAudioRef.current) {
      const splashAudio = new Audio(SPLASH_AUDIO_SRC);
      splashAudio.preload = "auto";
      splashAudioRef.current = splashAudio;
    }
    const splashAudio = splashAudioRef.current;
    if (splashAudio) splashAudio.volume = muted ? 0 : 0.88;

    activeAudioRef.current.forEach(({ audio, baseVolume }) => {
      audio.volume = muted ? 0 : baseVolume;
    });
  }, [muted]);

  useEffect(() => {
    if (stage !== "SPLASH") {
      splashAudioRef.current?.pause();
    }
  }, [stage]);

  const stopActiveAudio = useCallback(() => {
    activeAudioRef.current.forEach(({ audio }) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeAudioRef.current = [];
  }, []);

  /** Страховка: при уходе со страницы / повторной игре гасим любые <audio>/<video> внутри этого экрана. */
  const silenceEmbeddedMedia = useCallback(() => {
    if (typeof document === "undefined") return;
    const root = document.getElementById("pole-chudes-test-root");
    if (!root) return;
    root.querySelectorAll("audio, video").forEach((el) => {
      try {
        (el as HTMLMediaElement).pause();
        (el as HTMLMediaElement).currentTime = 0;
      } catch {
        /* ignore */
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      stopActiveAudio();
      try {
        splashAudioRef.current?.pause();
      } catch {
        /* ignore */
      }
      silenceEmbeddedMedia();
    };
  }, [silenceEmbeddedMedia, stopActiveAudio]);

  const playAudioToEnd = useCallback(
    async (fileName: string, volume = 1): Promise<number> => {
      const audio = new Audio(toAudioSrc(fileName));
      audio.preload = "auto";
      audio.volume = muted ? 0 : volume;
      activeAudioRef.current.push({ audio, baseVolume: volume });
      const durationPromise = new Promise<number>((resolve) => {
        const settle = () => resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 2.4);
        if (audio.readyState >= 1) settle();
        else {
          audio.addEventListener("loadedmetadata", settle, { once: true });
          window.setTimeout(settle, 700);
        }
      });
      const donePromise = new Promise<void>((resolve) => {
        const done = () => {
          activeAudioRef.current = activeAudioRef.current.filter((item) => item.audio !== audio);
          resolve();
        };
        audio.addEventListener("ended", done, { once: true });
        audio.addEventListener("error", done, { once: true });
        window.setTimeout(done, 120000);
      });
      void audio.play().catch(() => {});
      const duration = await durationPromise;
      await donePromise;
      return duration;
    },
    [muted],
  );

  const startAudioAndGetMeta = useCallback(
    (fileName: string, volume = 1): { durationPromise: Promise<number>; donePromise: Promise<void> } => {
      const audio = new Audio(toAudioSrc(fileName));
      audio.preload = "auto";
      audio.volume = muted ? 0 : volume;
      activeAudioRef.current.push({ audio, baseVolume: volume });
      const durationPromise = new Promise<number>((resolve) => {
        const settle = () => resolve(Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 2.4);
        if (audio.readyState >= 1) settle();
        else {
          audio.addEventListener("loadedmetadata", settle, { once: true });
          window.setTimeout(settle, 700);
        }
      });
      const donePromise = new Promise<void>((resolve) => {
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(safetyTimer);
          activeAudioRef.current = activeAudioRef.current.filter((item) => item.audio !== audio);
          resolve();
        };
        audio.addEventListener("ended", done, { once: true });
        audio.addEventListener("error", done, { once: true });
        const safetyTimer = window.setTimeout(() => {
          try {
            audio.pause();
          } catch {
            /* ignore */
          }
          done();
        }, 30000);
      });
      void audio.play().catch(() => {});
      return { durationPromise, donePromise };
    },
    [muted],
  );

  const pickSpinResult = useCallback(
    (snapshot: Record<string, Set<string>>) => {
      const sector = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const categoryPhrases = PHRASES[sector.id];
      const categoryUsed = snapshot[sector.id] || new Set();
      const availablePhrases = categoryPhrases.filter((p) => !categoryUsed.has(p));
      const phrase =
        availablePhrases.length > 0
          ? availablePhrases[Math.floor(Math.random() * availablePhrases.length)]
          : categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)];
      return { categoryId: sector.id, phrase };
    },
    [],
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

  const handleStartFromSplash = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setPlayReady(false);
    try {
      splashVideoRef.current?.pause();
      splashAudioRef.current?.pause();
      if (splashAudioRef.current) splashAudioRef.current.currentTime = 0;
    } catch {
      /* ignore */
    }
    stopActiveAudio();
    void playAudioToEnd(AUDIO.START_WOW, 0.95);
    setBackgroundVariant("A");
    setStage("PLAYING");
    setPlayReady(true);
    setBusy(false);
  }, [busy, playAudioToEnd, stopActiveAudio]);

  const handleSpinAnimationComplete = useCallback(() => {
    spinResolveRef.current?.();
    spinResolveRef.current = null;
  }, []);

  const handleSpin = useCallback(async () => {
    if (busy || !playReady || isSpinning || stage !== "PLAYING") return;
    setBusy(true);
    setPlayReady(false);
    setResultReady(false);

    const usedSnapshot = usedPhrases;
    const spinResult = pickSpinResult(usedSnapshot);
    setAttemptFlashKey((k) => k + 1);
    const nextRotation = calcTargetRotation(rotation, spinResult.categoryId);
    const animationDone = new Promise<void>((resolve) => {
      spinResolveRef.current = resolve;
    });

    stopActiveAudio();
    const spinAudio = startAudioAndGetMeta(AUDIO.SPIN, 1);
    const spinAudioDuration = await spinAudio.durationPromise;
    const totalSpinDuration = Math.max(3.2, spinAudioDuration + 0.45);
    const preRotation = rotation + 180;
    const fastRotation = rotation + 1080;
    setSpinDuration(totalSpinDuration);
    setSpinTimes([0, 0.2, 0.75, 1]);
    setSpinEases(["easeIn", "linear", "easeOut"]);
    setRotationFrames([rotation, preRotation, fastRotation, nextRotation]);
    setIsSpinning(true);
    setRotation(nextRotation);

    await Promise.all([animationDone, spinAudio.donePromise]);
    setIsSpinning(false);
    setRotationFrames(nextRotation);
    setSpinTimes(undefined);
    setSpinEases(undefined);

    const newResult = { category: spinResult.categoryId, phrase: spinResult.phrase };
    const categoryUsed = usedSnapshot[spinResult.categoryId] || new Set();
    setUsedPhrases((prev) => ({
      ...prev,
      [spinResult.categoryId]: new Set([...categoryUsed, spinResult.phrase]),
    }));
    setCurrentResult(newResult);
    setResults((prev) => [...prev, newResult]);
    setStage("RESULT");
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: [CATEGORIES.find((c) => c.id === spinResult.categoryId)?.color || "#ffffff"],
    });

    setBackgroundVariant(BACKGROUND_FLOW[Math.min(results.length + 1, BACKGROUND_FLOW.length - 1)]);
    const reactionBank = AUDIO.REACTIONS;
    const reactionAudio = reactionBank[results.length % reactionBank.length];
    await playAudioToEnd(AUDIO.SPIN_STOP, 1);
    await playAudioToEnd(reactionAudio, 0.95);
    setResultReady(true);
    setBusy(false);
  }, [busy, playReady, isSpinning, stage, usedPhrases, pickSpinResult, calcTargetRotation, rotation, playAudioToEnd, startAudioAndGetMeta, results.length, stopActiveAudio]);

  const nextAction = useCallback(async () => {
    if (!resultReady || busy) return;
    if (results.length >= MAX_SPINS) {
      setBusy(true);
      setFinalReady(false);
      setStage("FINAL");
      confetti({ particleCount: 220, spread: 130, origin: { y: 0.55 }, scalar: 1.2 });
      await playAudioToEnd(AUDIO.FINAL[0], 1);
      confetti({ particleCount: 300, spread: 160, origin: { y: 0.48 }, scalar: 1.35, ticks: 420 });
      await playAudioToEnd(AUDIO.FINAL[1], 1);
      setFinalReady(true);
      setBusy(false);
      return;
    }
    setBusy(true);
    setCurrentResult(null);
    setStage("PLAYING");
    setPlayReady(true);
    setBusy(false);
  }, [resultReady, busy, results.length, playAudioToEnd]);

  const resetGame = useCallback(() => {
    if (busy) return;
    stopActiveAudio();
    try {
      splashAudioRef.current?.pause();
      if (splashAudioRef.current) splashAudioRef.current.currentTime = 0;
    } catch {
      /* ignore */
    }
    setStage("SPLASH");
    setResults([]);
    setCurrentResult(null);
    setUsedPhrases({});
    setBackgroundVariant("A");
    setPlayReady(false);
    setResultReady(false);
    setFinalReady(false);
    setBusy(false);
    setIsSpinning(false);
    setRotation(0);
    setRotationFrames(0);
    setSpinTimes(undefined);
    setSpinEases(undefined);
  }, [busy, stopActiveAudio]);

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

  const isFinalStage = stage === "FINAL";

  const showLuckBrandLogo = stage === "SPLASH" || stage === "PLAYING" || stage === "RESULT";

  const isPanelLayout = layout === "panel";

  return (
    <div
      id="pole-chudes-test-root"
      className={cn(
        "relative flex min-h-0 w-full flex-col overflow-hidden bg-black font-book text-white selection:bg-purple-500/30",
        isPanelLayout ? "h-full max-h-full flex-1" : "h-[100dvh] max-h-[100dvh]",
      )}
    >
      {isFinalStage && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
          <img src={FINAL_BANNER_SRC} alt="" className="h-full w-full object-cover object-top" draggable={false} />
        </div>
      )}

      {!isFinalStage && stage !== "SPLASH" && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
          <img
            src={OPEN_BOOK_BG_SRC}
            alt=""
            className={cn(
              "h-full w-full select-none object-cover",
              backgroundVariant === "A" && "scale-[0.9] opacity-50",
              backgroundVariant === "B" && "scale-110 opacity-[0.34] blur-sm",
              backgroundVariant === "C" && "scale-105 opacity-[0.22] blur-md",
              backgroundVariant === "D" && "scale-[0.9] opacity-50",
            )}
            draggable={false}
          />
        </div>
      )}

      {!isFinalStage && (
        <div className={`pointer-events-none fixed inset-0 z-0 ${backgroundVariant === "B" ? "bg-black/42" : "bg-black/48"}`} />
      )}
      {!isFinalStage && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute left-[10%] top-[5%] h-[760px] w-[760px] animate-pulse rounded-full bg-fuchsia-900/35 blur-[160px]" />
          <div className="absolute right-[5%] top-[20%] h-[560px] w-[560px] animate-pulse rounded-full bg-sky-900/25 blur-[140px] [animation-delay:3s]" />
        </div>
      )}
      {!isFinalStage && (
        <div className="fixed inset-0 z-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:100px_100px] animate-[pulse_5s_infinite]" />
      )}
      {!isFinalStage && <MagicRingsGlobal className="magic-rings-fx--luck-page" containerId="mbPoleChudesTestRings" canvasId="mbPoleChudesTestRingsCanvas" />}

      {showLuckBrandLogo && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[50] flex justify-center pt-[max(0.25rem,env(safe-area-inset-top))]">
          <VibeAiBrand
            banner
            className={cn(
              "!relative !max-w-[min(92vw,380px)]",
              isPanelLayout ? "scale-[0.72] sm:scale-[0.8]" : "scale-[0.85] sm:scale-90 md:scale-95",
            )}
          />
        </div>
      )}

      <div className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        <div className="mx-auto mt-1 flex w-full max-w-[min(1240px,96vw)] shrink-0 justify-end px-2 sm:mt-2 sm:px-4">
          <button
            type="button"
            onClick={() => setMuted((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-black/45 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {muted ? "Звук выкл" : "Звук вкл"}
          </button>
        </div>
        <AnimatePresence mode="wait">
          {stage === "SPLASH" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-0"
            >
              <div className="pointer-events-none fixed inset-0 z-[2] opacity-[0.32]">
                <HeroWave />
              </div>
              <div className="absolute inset-0 z-[3] bg-black/25" />
              <div className="relative z-10 flex w-full max-w-[min(1520px,98vw)] min-h-0 flex-1 items-center justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[clamp(3.25rem,11dvh,5rem)] sm:pt-[clamp(3.5rem,12dvh,5.5rem)]">
                <div className="relative w-full max-h-full min-h-0 overflow-hidden">
                  <video
                    ref={splashVideoRef}
                    src={SPLASH_VIDEO_SRC}
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                    onEnded={() => {
                      try {
                        splashAudioRef.current?.pause();
                      } catch {
                        /* ignore */
                      }
                    }}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      video.currentTime = 0;
                      const splashAudio = splashAudioRef.current;
                      if (!splashAudio) return;
                      splashAudio.currentTime = 0;
                      splashAudio.volume = muted ? 0 : 0.9;
                      void splashAudio.play().catch(() => {});
                    }}
                    className="aspect-video max-h-[min(48svh,460px)] w-full object-contain sm:max-h-[min(54svh,540px)]"
                  />
                  <div className="tz-splash-scanlines pointer-events-none absolute inset-0" />
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={`code-col-${idx}`}
                      className="tz-splash-code-column pointer-events-none absolute top-0 h-full text-[10px] font-mono text-white/22 sm:text-xs"
                      style={{ left: `${idx * 8.6 + 1.5}%`, animationDelay: `${idx * 0.23}s` }}
                    >
                      01001101 110101 010101 100101 001011
                    </div>
                  ))}
                  <div className="absolute bottom-[5.2%] left-1/2 z-20 -translate-x-1/2">
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
              </div>
            </motion.div>
          )}

          {stage === "PLAYING" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid min-h-0 w-full flex-1 grid-rows-[auto_minmax(0,1fr)_auto] items-stretch overflow-hidden px-1.5 pb-1 pt-[clamp(3rem,10dvh,4.5rem)] sm:px-2 sm:pb-2 sm:pt-[clamp(3.25rem,11dvh,5rem)]"
            >
              <div className="relative z-10 flex min-h-0 min-w-0 w-full max-w-[min(100vw,920px)] flex-col items-center justify-self-center [grid-row:2]">
                <AnimatePresence mode="wait">
                  {attemptFlashKey > 0 && (
                    <motion.div
                      key={`attempt-${attemptFlashKey}`}
                      initial={{ opacity: 0, scale: 0.88, y: -12 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 1.14, y: -16 }}
                      transition={{ duration: 0.52, ease: "easeOut" }}
                      className="mb-2 rounded-xl border border-fuchsia-200/70 bg-[radial-gradient(circle,_rgba(255,255,255,0.96)_0%,_rgba(236,72,153,0.83)_35%,_rgba(126,34,206,0.8)_68%,_rgba(0,0,0,0.25)_100%)] px-6 py-2 text-center shadow-[0_0_44px_rgba(236,72,153,0.9),0_0_86px_rgba(168,85,247,0.78)]"
                    >
                      <div className="text-sm font-black uppercase tracking-[0.22em] text-white sm:text-base">
                        Попытка {results.length + 1} / {MAX_SPINS}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {(backgroundVariant === "A" || backgroundVariant === "D") && (
                  <div className="pointer-events-none absolute left-1/2 top-[60%] z-0 h-[64vmin] w-[64vmin] max-h-[640px] max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/72 blur-[1px]" />
                )}
                {(backgroundVariant === "B" || backgroundVariant === "D") && (
                  <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[80vmin] w-[80vmin] max-h-[760px] max-w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(252,246,186,0.18)_0%,rgba(217,70,239,0.16)_35%,rgba(56,189,248,0.12)_55%,rgba(0,0,0,0)_72%)] blur-2xl" />
                )}
                {backgroundVariant === "D" && (
                  <div className="pointer-events-none absolute left-1/2 top-[48%] z-0 h-[84vmin] w-[84vmin] max-h-[800px] max-w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#fcf6ba]/25 shadow-[0_0_60px_rgba(252,246,186,0.35),0_0_120px_rgba(236,72,153,0.25)]" />
                )}
                <div className="relative mt-0 flex min-h-0 w-full max-w-full min-w-0 flex-1 items-center justify-center sm:mt-0.5">
                  <img
                    src={COVER_BOOK_SRC}
                    alt=""
                    className="pointer-events-none absolute left-1/2 top-1/2 z-0 max-h-[min(38svh,280px)] w-[min(88%,min(90vw,380px))] max-w-[100%] -translate-x-1/2 -translate-y-1/2 rounded-lg object-contain opacity-[0.92] shadow-[0_12px_48px_rgba(0,0,0,0.65)] sm:max-h-[min(44svh,340px)]"
                    draggable={false}
                  />
                  <div className="relative z-10 mx-auto flex max-h-full min-h-0 w-full min-w-0 justify-center overflow-hidden">
                    <Wheel
                      rotation={rotationFrames}
                      spinDuration={spinDuration}
                      isSpinning={isSpinning}
                      spinTimes={spinTimes}
                      spinEases={spinEases}
                      canSpin={playReady && !busy}
                      onSectorClick={() => void handleSpin()}
                      onSpinAnimationComplete={handleSpinAnimationComplete}
                    />
                  </div>
                </div>
                <div className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-1 self-center [grid-row:3] sm:mt-1.5 sm:gap-1.5">
                  <NeonGlassButton className="!px-3 !py-1.5 !text-[10px] sm:!px-4 sm:!py-2 sm:!text-xs" onClick={() => closeAndNavigate("/")}>
                    Назад к книге
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-3 !py-1.5 !text-[10px] sm:!px-4 sm:!py-2 sm:!text-xs" onClick={() => closeAndNavigate("/?entry=slovar&screen=form")}>
                    Внести слово
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-3 !py-1.5 !text-[10px] sm:!px-4 sm:!py-2 sm:!text-xs" onClick={() => closeAndNavigate("/?entry=slovar&screen=reading")}>
                    Читать книгу
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-3 !py-1.5 !text-[10px] sm:!px-4 sm:!py-2 sm:!text-xs" onClick={() => closeAndNavigate("/?entry=slovar&screen=final")}>
                    Выбрать гимн
                  </NeonGlassButton>
                </div>
              </div>
            </motion.div>
          )}

          {stage === "RESULT" && currentResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-3 pt-12 text-center sm:p-5 sm:pt-14"
            >
              <div
                className="relative w-full max-w-[min(100%,28rem)] space-y-4 overflow-hidden rounded-3xl border-[3px] bg-[#11041c] p-6 shadow-2xl sm:space-y-5 sm:rounded-[32px] sm:p-8"
                style={{ borderColor: CATEGORIES.find((c) => c.id === currentResult.category)?.color }}
              >
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
                <h3 className="relative z-10 text-lg font-medium uppercase tracking-[0.28em] text-white/50 sm:text-xl">
                  {CATEGORIES.find((c) => c.id === currentResult.category)?.label}
                </h3>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative z-10 text-2xl font-black uppercase leading-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl"
                >
                  {currentResult.phrase}
                </motion.h2>
                <div className="relative z-10 pt-4 sm:pt-6">
                  <NeonGlassButton accent className="!w-full !py-3 !text-base sm:!py-3.5 sm:!text-lg" disabled={!resultReady || busy} onClick={() => void nextAction()}>
                    {results.length >= MAX_SPINS ? "Узнать итог" : "Продолжить"}
                  </NeonGlassButton>
                </div>
              </div>
            </motion.div>
          )}

          {stage === "FINAL" && (
            <motion.div
              key="final"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-10 sm:px-4 sm:pb-3 sm:pt-12"
            >
              <div className="sr-only">Итоги Вайбкодера</div>
              {/* Ниже зоны «VIBE CODER» / «Итоги» на PNG — чтобы плашки не заезжали на подпись */}
              <div
                className="pointer-events-none shrink-0 select-none"
                aria-hidden
                style={{ height: "clamp(12.5rem, 36vh, 22rem)" }}
              />
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-1 sm:py-2">
                <div className="grid w-full max-w-[min(960px,96vw)] grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:gap-3.5">
                  {results.map((res, idx) => (
                    <motion.div
                      key={`${res.category}-${idx}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.12 }}
                      className="group flex min-h-0 items-center gap-3 rounded-xl border border-[#fcf6ba]/35 bg-[#14061f]/88 p-3 shadow-[0_6px_24px_rgba(0,0,0,0.5)] backdrop-blur-md sm:gap-4 sm:rounded-2xl sm:p-4"
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-transform group-hover:scale-105 sm:h-11 sm:w-11 sm:rounded-xl md:h-12 md:w-12"
                        style={{
                          backgroundColor: `${CATEGORIES.find((c) => c.id === res.category)?.color}18`,
                          color: CATEGORIES.find((c) => c.id === res.category)?.color,
                          borderColor: `${CATEGORIES.find((c) => c.id === res.category)?.color}44`,
                        }}
                      >
                        {React.cloneElement(getCategoryIcon(res.category) as React.ReactElement, { className: "h-5 w-5 sm:h-6 sm:w-6" })}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h4 className="mb-0.5 text-[8px] font-black uppercase tracking-[0.38em] text-white/55 sm:text-[9px] sm:tracking-[0.42em]">
                          {CATEGORIES.find((c) => c.id === res.category)?.label}
                        </h4>
                        <p className="text-sm font-black leading-snug text-[#fff7dc] drop-shadow-[0_0_8px_rgba(252,246,186,0.3)] sm:text-base md:text-lg md:leading-tight">
                          {res.phrase}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 pt-2 sm:gap-3 sm:pt-3">
                <NeonGlassButton className="!px-4 !py-2 !text-[11px] sm:!px-5 sm:!text-xs" onClick={() => closeAndNavigate("/")}>
                  Назад к книге
                </NeonGlassButton>
                <NeonGlassButton className="!px-4 !py-2 !text-[11px] sm:!px-5 sm:!text-xs" onClick={() => closeAndNavigate("/?entry=slovar&screen=form")}>
                  Внести слово
                </NeonGlassButton>
                <NeonGlassButton accent className="!px-5 !py-2 !text-[11px] sm:!px-8 sm:!py-3 sm:!text-sm" disabled={!finalReady || busy} onClick={resetGame}>
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    Еще раз крутить
                  </span>
                </NeonGlassButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {isFinalStage && (
        <MagicRingsGlobal
          className="magic-rings-fx--luck-final"
          containerId="mbPoleChudesFinalRings"
          canvasId="mbPoleChudesFinalRingsCanvas"
        />
      )}
    </div>
  );
}
