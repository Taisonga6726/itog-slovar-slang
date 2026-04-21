import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { AppWindow, Code2, GraduationCap, RotateCcw, Sparkles, Volume2, VolumeX, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import NeonGlassButton from "@/components/NeonGlassButton";
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
const OPTIONAL_HYMN_FILE = "versiya 5_hard-rok Tanya.mp3";
const OPTIONAL_HYMN_SRC = `/slovar/assets/sounds/${encodeURIComponent(OPTIONAL_HYMN_FILE)}`;
const FINAL_BANNER_SRC = `/images/${encodeURIComponent("финал аплодисменты игра.png")}`;
const SPLASH_STOP_AT_SECONDS = 4.45;

const toAudioSrc = (fileName: string) => `/audio/${encodeURIComponent(fileName)}`;

export default function PoleChudesTestGame() {
  const navigate = useNavigate();
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
  const optionalHymnRef = useRef<HTMLAudioElement | null>(null);
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

  /** Страховка: при уходе со страницы / повторной игре гасим любые <audio>/<video> внутри этого экрана (в т.ч. controls). */
  const silenceEmbeddedMedia = useCallback(() => {
    try {
      optionalHymnRef.current?.pause();
    } catch {
      /* ignore */
    }
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
        window.setTimeout(done, 9000);
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
    const spinAudio = startAudioAndGetMeta(AUDIO.SPIN, 0.92);
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
    await Promise.all([playAudioToEnd(AUDIO.SPIN_STOP, 0.95), playAudioToEnd(reactionAudio, 0.92)]);
    setResultReady(true);
    setBusy(false);
  }, [busy, playReady, isSpinning, stage, usedPhrases, pickSpinResult, calcTargetRotation, rotation, playAudioToEnd, startAudioAndGetMeta, results.length, stopActiveAudio]);

  const nextAction = useCallback(async () => {
    if (!resultReady || busy) return;
    if (results.length >= MAX_SPINS) {
      setBusy(true);
      setFinalReady(false);
      setStage("FINAL");
      confetti({ particleCount: 260, spread: 150, origin: { y: 0.52 }, scalar: 1.25 });
      await playAudioToEnd("фейерверк фанфары аплодисменты.MP3", 1);
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
      optionalHymnRef.current?.pause();
      if (optionalHymnRef.current) optionalHymnRef.current.currentTime = 0;
    } catch {
      /* ignore */
    }
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

  return (
    <div id="pole-chudes-test-root" className="relative min-h-screen overflow-hidden bg-black font-book text-white selection:bg-purple-500/30">
      {isFinalStage && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
          <img src={FINAL_BANNER_SRC} alt="" className="h-full w-full object-cover object-top" draggable={false} />
        </div>
      )}

      {!isFinalStage && stage !== "SPLASH" && (backgroundVariant === "A" || backgroundVariant === "C" || backgroundVariant === "D") && (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <video
            src="/videos/grok-read-book-03.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className={`h-full w-full object-cover ${backgroundVariant === "C" ? "scale-110 blur-[3px] opacity-35" : "opacity-50"} ${backgroundVariant === "A" || backgroundVariant === "D" ? "scale-[0.9]" : ""}`}
          />
        </div>
      )}

      {!isFinalStage && stage !== "SPLASH" && (backgroundVariant === "B" || backgroundVariant === "C") && (
        <div className="pointer-events-none fixed inset-0 z-0 bg-black">
          <img
            src="/images/open-book.png"
            alt=""
            className={`h-full w-full select-none object-cover ${backgroundVariant === "B" ? "scale-110 opacity-34 blur-sm" : "scale-105 opacity-22 blur-md"}`}
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

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="mx-auto mt-3 flex w-full max-w-[min(1240px,96vw)] flex-wrap items-center justify-between gap-2 px-3 sm:px-6">
          {stage !== "SPLASH" && (
            <div className="rounded-xl border border-sky-400/35 bg-black/45 px-2 py-1.5 backdrop-blur-md">
              <audio
                ref={optionalHymnRef}
                controls
                preload="none"
                src={OPTIONAL_HYMN_SRC}
                className="h-8 max-w-[46vw] sm:max-w-[320px]"
              >
                Ваш браузер не поддерживает аудио.
              </audio>
            </div>
          )}
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
              className="relative flex flex-1 items-center justify-center p-0"
            >
              <div className="absolute inset-0 z-0 bg-black/35" />
              <div className="relative z-10 flex w-full max-w-[min(1520px,98vw)] items-center justify-center px-2">
                <div className="relative w-full overflow-hidden">
                  <video
                    ref={splashVideoRef}
                    src={SPLASH_VIDEO_SRC}
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                    onTimeUpdate={(e) => {
                      const video = e.currentTarget;
                      if (video.currentTime >= SPLASH_STOP_AT_SECONDS) {
                        video.pause();
                        splashAudioRef.current?.pause();
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
                    className="aspect-video w-full object-contain"
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
              className="flex flex-1 flex-col items-center justify-center p-2 sm:p-4"
            >
              <div className="relative z-10 flex flex-col items-center">
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
                <div className="mt-1 sm:mt-3">
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
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <NeonGlassButton className="!px-4 !py-2 !text-xs sm:!text-sm" onClick={() => navigate("/")}>
                    Назад к игре
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-4 !py-2 !text-xs sm:!text-sm" onClick={() => navigate("/?entry=slovar&screen=form")}>
                    Внести слово
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-4 !py-2 !text-xs sm:!text-sm" onClick={() => navigate("/?entry=slovar&screen=reading")}>
                    Читать книгу
                  </NeonGlassButton>
                  <NeonGlassButton className="!px-4 !py-2 !text-xs sm:!text-sm" onClick={() => navigate("/?entry=slovar&screen=final")}>
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
              className="flex flex-1 flex-col items-center justify-center p-6 text-center"
            >
              <div
                className="relative w-full max-w-xl space-y-8 overflow-hidden rounded-[40px] border-4 bg-[#11041c] p-12 shadow-2xl"
                style={{ borderColor: CATEGORIES.find((c) => c.id === currentResult.category)?.color }}
              >
                <div
                  className="absolute inset-0 animate-pulse opacity-20 blur-[100px]"
                  style={{ backgroundColor: CATEGORIES.find((c) => c.id === currentResult.category)?.color }}
                />
                <div
                  className="relative z-10 mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl border-2"
                  style={{
                    backgroundColor: `${CATEGORIES.find((c) => c.id === currentResult.category)?.color}11`,
                    color: CATEGORIES.find((c) => c.id === currentResult.category)?.color,
                    borderColor: CATEGORIES.find((c) => c.id === currentResult.category)?.color,
                  }}
                >
                  {React.cloneElement(getCategoryIcon(currentResult.category) as React.ReactElement, { className: "h-10 w-10" })}
                </div>
                <h3 className="relative z-10 text-2xl font-medium uppercase tracking-[0.3em] text-white/50">
                  {CATEGORIES.find((c) => c.id === currentResult.category)?.label}
                </h3>
                <motion.h2
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="relative z-10 text-4xl font-black uppercase leading-tight text-white drop-shadow-lg md:text-6xl"
                >
                  {currentResult.phrase}
                </motion.h2>
                <div className="relative z-10 pt-10">
                  <NeonGlassButton accent className="!w-full !py-4 !text-lg sm:!text-2xl" disabled={!resultReady || busy} onClick={() => void nextAction()}>
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
              className="flex min-h-0 flex-1 flex-col px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-1 sm:px-5 sm:pb-4"
            >
              <div className="sr-only">Итоги Вайбкодера</div>
              {/* Под зону «VIBE CODER» + «Итоги» на самом баннере — плашки в средней/нижней части кадра */}
              <div
                className="pointer-events-none shrink-0 select-none"
                aria-hidden
                style={{ height: "clamp(9.25rem, 26vh, 14.5rem)" }}
              />
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-2 sm:py-4">
                <div className="grid w-full max-w-[min(1100px,96vw)] grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 md:gap-5">
                  {results.map((res, idx) => (
                    <motion.div
                      key={`${res.category}-${idx}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.12 }}
                      className="group flex min-h-0 items-center gap-4 rounded-2xl border border-[#fcf6ba]/35 bg-[#14061f]/82 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md sm:gap-5 sm:rounded-[28px] sm:p-6 md:gap-6 md:p-7"
                    >
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-transform group-hover:scale-105 sm:h-14 sm:w-14 sm:rounded-2xl md:h-16 md:w-16"
                        style={{
                          backgroundColor: `${CATEGORIES.find((c) => c.id === res.category)?.color}18`,
                          color: CATEGORIES.find((c) => c.id === res.category)?.color,
                          borderColor: `${CATEGORIES.find((c) => c.id === res.category)?.color}44`,
                        }}
                      >
                        {React.cloneElement(getCategoryIcon(res.category) as React.ReactElement, { className: "h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8" })}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <h4 className="mb-1 text-[9px] font-black uppercase tracking-[0.42em] text-white/55 sm:text-[10px] sm:tracking-[0.5em]">
                          {CATEGORIES.find((c) => c.id === res.category)?.label}
                        </h4>
                        <p className="text-lg font-black leading-snug text-[#fff7dc] drop-shadow-[0_0_10px_rgba(252,246,186,0.35)] sm:text-xl md:text-2xl md:leading-tight">
                          {res.phrase}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 pt-3 sm:pt-4">
                <NeonGlassButton accent className="!px-8 !py-3 !text-sm sm:!text-base" disabled={!finalReady || busy} onClick={resetGame}>
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
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
