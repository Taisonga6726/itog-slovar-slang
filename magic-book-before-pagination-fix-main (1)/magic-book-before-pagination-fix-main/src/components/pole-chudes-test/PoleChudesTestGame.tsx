import React, { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import confetti from "canvas-confetti";
import { AppWindow, Code2, GraduationCap, RotateCcw, Sparkles, Trophy, Volume2, VolumeX, Zap } from "lucide-react";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import NeonGlassButton from "@/components/NeonGlassButton";
import { CATEGORIES, PHRASES } from "./constants";
import { Wheel } from "./Wheel";

type GameStage = "START" | "PLAYING" | "RESULT" | "FINAL";

interface SpinResult {
  category: string;
  phrase: string;
}

export default function PoleChudesTestGame() {
  const [stage, setStage] = useState<GameStage>("START");
  const [results, setResults] = useState<SpinResult[]>([]);
  const [currentResult, setCurrentResult] = useState<SpinResult | null>(null);
  const [usedPhrases, setUsedPhrases] = useState<Record<string, Set<string>>>({});
  const [isSpinning, setIsSpinning] = useState(false);
  const [muted, setMuted] = useState(false);
  const victoryFanfareRef = useRef<HTMLAudioElement | null>(null);
  const applauseRef = useRef<HTMLAudioElement | null>(null);

  const maxSpins = 4;

  useEffect(() => {
    victoryFanfareRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3");
    victoryFanfareRef.current.volume = 0.75;
    applauseRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3");
    applauseRef.current.volume = 0.7;
    applauseRef.current.loop = true;

    return () => {
      if (victoryFanfareRef.current) {
        victoryFanfareRef.current.pause();
        victoryFanfareRef.current.currentTime = 0;
      }
      if (applauseRef.current) {
        applauseRef.current.pause();
        applauseRef.current.currentTime = 0;
      }
    };
  }, []);

  const playVictoryStack = useCallback(() => {
    if (muted) return;
    const fanfare = victoryFanfareRef.current;
    const applause = applauseRef.current;
    if (!fanfare || !applause) return;

    fanfare.currentTime = 0;
    applause.currentTime = 0;
    void fanfare.play().catch(() => {});
    void applause.play().catch(() => {});
  }, [muted]);

  const stopFinalSounds = useCallback(() => {
    if (victoryFanfareRef.current) {
      victoryFanfareRef.current.pause();
      victoryFanfareRef.current.currentTime = 0;
    }
    if (applauseRef.current) {
      applauseRef.current.pause();
      applauseRef.current.currentTime = 0;
    }
  }, []);

  const handleSpinEnd = useCallback(
    (categoryId: string) => {
      const categoryPhrases = PHRASES[categoryId];
      const categoryUsed = usedPhrases[categoryId] || new Set();
      const availablePhrases = categoryPhrases.filter((p) => !categoryUsed.has(p));
      const phrase =
        availablePhrases.length > 0
          ? availablePhrases[Math.floor(Math.random() * availablePhrases.length)]
          : categoryPhrases[Math.floor(Math.random() * categoryPhrases.length)];

      const newResult = { category: categoryId, phrase };
      setUsedPhrases((prev) => ({ ...prev, [categoryId]: new Set([...categoryUsed, phrase]) }));
      setCurrentResult(newResult);
      setResults((prev) => [...prev, newResult]);
      setStage("RESULT");

      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: [CATEGORIES.find((c) => c.id === categoryId)?.color || "#ffffff"],
      });
    },
    [usedPhrases],
  );

  const nextAction = () => {
    if (results.length >= maxSpins) {
      setStage("FINAL");
      playVictoryStack();
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 }, scalar: 1.2 });
      return;
    }
    setStage("PLAYING");
    setCurrentResult(null);
  };

  const resetGame = () => {
    stopFinalSounds();
    setStage("START");
    setResults([]);
    setCurrentResult(null);
    setUsedPhrases({});
  };

  useEffect(() => {
    if (!muted) return;
    stopFinalSounds();
  }, [muted, stopFinalSounds]);

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-black font-book text-white selection:bg-purple-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 flex items-end justify-center bg-black">
        <img
          src="/images/fon-dlya-gimn.png"
          alt=""
          className="h-auto max-h-[100dvh] w-full max-w-[min(1600px,100vw)] select-none object-contain object-bottom"
          draggable={false}
        />
      </div>
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[10%] top-[5%] h-[760px] w-[760px] animate-pulse rounded-full bg-fuchsia-900/30 blur-[160px]" />
        <div className="absolute right-[5%] top-[20%] h-[560px] w-[560px] animate-pulse rounded-full bg-sky-900/20 blur-[140px] [animation-delay:3s]" />
      </div>
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[length:100px_100px] animate-[pulse_5s_infinite]" />
      <MagicRingsGlobal className="magic-rings-fx--luck-page" containerId="mbPoleChudesTestRings" canvasId="mbPoleChudesTestRingsCanvas" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="mx-auto mt-3 flex w-full max-w-[min(1240px,96vw)] items-center justify-end px-3 sm:px-6">
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
          {stage === "START" && (
            <motion.div
              key="start"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-1 flex-col items-center justify-center space-y-12 p-6 text-center"
            >
              <div className="relative space-y-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-gradient-to-b from-cyan-300 via-white to-purple-400 bg-clip-text text-8xl font-black leading-none tracking-tighter text-transparent drop-shadow-[0_0_60px_rgba(168,85,247,0.6)] md:text-[180px]"
                >
                  AI
                </motion.div>
                <h1 className="text-4xl font-black uppercase tracking-tighter text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] md:text-7xl">
                  Поле чудес
                </h1>
              </div>

              <div className="max-w-xl rounded-2xl border border-white/20 bg-black/55 p-8 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)] backdrop-blur-md">
                <p className="mb-8 text-2xl font-semibold leading-tight text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] md:text-3xl">
                  Твой финальный вайбкодерский расклад решит одно вращение.
                </p>
                <NeonGlassButton accent className="!px-10 !py-3 !text-base sm:!text-lg" onClick={() => setStage("PLAYING")}>
                  Крутим удачу?
                </NeonGlassButton>
              </div>
            </motion.div>
          )}

          {stage === "PLAYING" && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center space-y-8 p-6"
            >
              <div className="relative rounded-[40px] bg-gradient-to-br from-[#8F6B29] via-[#fcf6ba] to-[#aa771c] p-1 shadow-[0_0_100px_rgba(191,149,63,0.3)] md:p-3">
                <div className="relative overflow-hidden rounded-[32px] border-2 border-black/40 bg-[#120422] p-4 md:p-10">
                  <div className="absolute inset-0 flex flex-col items-center justify-between py-12 opacity-5 pointer-events-none select-none">
                    <span className="font-serif text-2xl">Школа SSM</span>
                    <span className="px-4 text-center font-serif text-4xl">СЛОВАРЬ СЛЭНГА ВАЙБ КОДЕРА</span>
                    <span className="text-center font-serif text-xl italic">Первого потока курса "ВайбКОДИНГ-2026!"</span>
                  </div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="mb-6 text-center">
                      <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.5em] text-white/40">
                        Попытка {results.length + 1} / {maxSpins}
                      </h2>
                      <h3 className="font-serif text-xl italic text-[#fcf6ba] drop-shadow-[0_0_10px_rgba(252,246,186,0.3)]">
                        СЛОВАРЬ СЛЭНГА ВАЙБ КОДЕРА
                      </h3>
                    </div>
                    <Wheel onSpinEnd={handleSpinEnd} isSpinning={isSpinning} setIsSpinning={setIsSpinning} />
                  </div>
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
                  <NeonGlassButton accent className="!w-full !py-4 !text-lg sm:!text-2xl" onClick={nextAction}>
                    {results.length >= maxSpins ? "Узнать итог" : "Продолжить"}
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
              className="flex flex-1 flex-col items-center justify-center space-y-12 p-6 md:p-12"
            >
              <div className="space-y-4 text-center">
                <div className="mb-4 inline-flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#bf953f]/50 bg-yellow-500/20 text-[#fcf6ba] shadow-[0_0_60px_rgba(191,149,63,0.4)]">
                  <Trophy className="h-12 w-12" />
                </div>
                <h1 className="bg-gradient-to-r from-[#bf953f] via-[#fcf6ba] to-[#aa771c] bg-clip-text text-5xl font-black uppercase tracking-tighter text-transparent drop-shadow-[0_0_30px_rgba(191,149,63,0.3)] md:text-8xl">
                  ИТОГИ ВАЙБКОДЕРА
                </h1>
              </div>
              <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
                {results.map((res, idx) => (
                  <motion.div
                    key={`${res.category}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.15 }}
                    className="group flex items-center space-x-8 rounded-[32px] border border-white/5 bg-black/40 p-8 backdrop-blur-md transition-all hover:bg-white/5"
                  >
                    <div
                      className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl border transition-all group-hover:scale-110"
                      style={{
                        backgroundColor: `${CATEGORIES.find((c) => c.id === res.category)?.color}11`,
                        color: CATEGORIES.find((c) => c.id === res.category)?.color,
                        borderColor: `${CATEGORIES.find((c) => c.id === res.category)?.color}33`,
                      }}
                    >
                      {React.cloneElement(getCategoryIcon(res.category) as React.ReactElement, { className: "h-8 w-8" })}
                    </div>
                    <div>
                      <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.5em] text-white/50">
                        {CATEGORIES.find((c) => c.id === res.category)?.label}
                      </h4>
                      <p className="text-2xl font-black leading-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)] md:text-3xl">
                        {res.phrase}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <NeonGlassButton accent className="!px-8 !py-3 !text-sm sm:!text-base" onClick={resetGame}>
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" />
                    Сыграть снова
                  </span>
                </NeonGlassButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
