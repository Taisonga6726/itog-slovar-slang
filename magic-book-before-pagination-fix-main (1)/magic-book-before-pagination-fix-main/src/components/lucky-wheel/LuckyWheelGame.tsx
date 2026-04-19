import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import NeonGlassButton from "@/components/NeonGlassButton";
import { LUCKY_SPINS_PER_GAME } from "@/config/luckyWheel";
import { LUCKY_CATEGORIES, type LuckyCategoryId } from "@/data/luckyWheelPhrases";
import { cn } from "@/lib/utils";

const SECTOR = 360 / LUCKY_CATEGORIES.length;
const WHEEL_ALIGN = 0;

const WHEEL_COLORS = [
  "rgba(124, 58, 237, 0.95)",
  "rgba(168, 85, 247, 0.95)",
  "rgba(99, 102, 241, 0.95)",
  "rgba(236, 72, 153, 0.92)",
  "rgba(139, 92, 246, 0.95)",
  "rgba(192, 38, 211, 0.92)",
];

function conicBackground(): string {
  const parts = LUCKY_CATEGORIES.map(
    (_, i) => `${WHEEL_COLORS[i % WHEEL_COLORS.length]} ${i * SECTOR}deg ${(i + 1) * SECTOR}deg`,
  );
  return `conic-gradient(from ${-90 + WHEEL_ALIGN}deg at 50% 50%, ${parts.join(", ")})`;
}

export type LuckyWheelGameProps = {
  variant: "panel" | "page";
  onClose?: () => void;
  /** Из приложения по «Крутим удачу?» — сразу к колесу, без второго интро */
  skipIntro?: boolean;
};

type SpinRecord = { categoryId: LuckyCategoryId; title: string; phrase: string };

function pickWinning(usedPhrases: Set<string>): {
  sectorIndex: number;
  phrase: string;
  categoryId: LuckyCategoryId;
  title: string;
} {
  const viable = LUCKY_CATEGORIES.map((c, i) => ({
    i,
    id: c.id,
    title: c.title,
    choices: c.phrases.filter((p) => !usedPhrases.has(p)),
  })).filter((x) => x.choices.length > 0);
  if (viable.length === 0) {
    throw new Error("Нет свободных фраз");
  }
  const bucket = viable[Math.floor(Math.random() * viable.length)];
  const phrase = bucket.choices[Math.floor(Math.random() * bucket.choices.length)];
  return {
    sectorIndex: bucket.i,
    phrase,
    categoryId: bucket.id,
    title: bucket.title,
  };
}

export default function LuckyWheelGame({ variant, onClose, skipIntro }: LuckyWheelGameProps) {
  const [phase, setPhase] = useState<"intro" | "play" | "card" | "finale">(() =>
    skipIntro ? "play" : "intro",
  );
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [completedSpins, setCompletedSpins] = useState(0);
  const [usedPhrases, setUsedPhrases] = useState<Set<string>>(() => new Set());
  const [history, setHistory] = useState<SpinRecord[]>([]);
  const [lastCard, setLastCard] = useState<SpinRecord | null>(null);
  const spinTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
      if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    };
  }, []);

  const [muted, setMuted] = useState(() => {
    try {
      return localStorage.getItem("lucky-wheel-muted") === "1";
    } catch {
      return false;
    }
  });

  const gradient = useMemo(() => conicBackground(), []);

  const persistMute = useCallback((m: boolean) => {
    setMuted(m);
    try {
      localStorage.setItem("lucky-wheel-muted", m ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const playTick = useCallback(() => {
    if (muted) return;
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 440 + Math.random() * 120;
      g.gain.value = 0.04;
      o.start();
      o.stop(ctx.currentTime + 0.05);
    } catch {
      /* ignore */
    }
  }, [muted]);

  const handleSpin = useCallback(() => {
    if (spinning || phase !== "play") return;
    if (completedSpins >= LUCKY_SPINS_PER_GAME) return;

    const win = pickWinning(usedPhrases);
    const usedNext = new Set(usedPhrases);
    usedNext.add(win.phrase);

    setRotation((prev) => {
      const wheelPos = ((prev % 360) + 360) % 360;
      const targetSectorAngle = win.sectorIndex * SECTOR + SECTOR / 2;
      let delta = (360 - ((wheelPos + targetSectorAngle) % 360)) % 360;
      if (delta < 0.5) delta = 360;
      const full = 360 * (5 + Math.floor(Math.random() * 2));
      return prev + full + delta;
    });

    setSpinning(true);

    if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    tickTimerRef.current = window.setInterval(() => {
      playTick();
    }, 95);

    if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    spinTimerRef.current = window.setTimeout(() => {
      if (tickTimerRef.current) {
        window.clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      setSpinning(false);

      const rec: SpinRecord = {
        categoryId: win.categoryId,
        title: win.title,
        phrase: win.phrase,
      };
      setUsedPhrases(usedNext);
      setHistory((h) => [...h, rec]);
      setLastCard(rec);
      setCompletedSpins((n) => n + 1);
      setPhase("card");
    }, 4600);
  }, [spinning, phase, completedSpins, usedPhrases, playTick]);

  const resetGame = useCallback(() => {
    if (spinTimerRef.current) window.clearTimeout(spinTimerRef.current);
    if (tickTimerRef.current) window.clearInterval(tickTimerRef.current);
    setPhase(skipIntro ? "play" : "intro");
    setRotation(0);
    setSpinning(false);
    setCompletedSpins(0);
    setUsedPhrases(new Set());
    setHistory([]);
    setLastCard(null);
  }, [skipIntro]);

  const cardBase =
    "rounded-xl border border-white/[0.14] bg-black/55 px-4 py-3 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)] backdrop-blur-sm";

  return (
    <div className="relative flex min-h-0 w-full max-w-[min(520px,92vw)] flex-col items-center gap-4 text-white">
      <div className="flex w-full items-center justify-between gap-2 px-1">
        {variant === "page" ? (
          <Link
            to="/"
            className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm hover:border-fuchsia-400/50"
          >
            ← На главную
          </Link>
        ) : (
          <span className="text-[10px] text-white/45 sm:text-xs">Вариант A · панель</span>
        )}
        <button
          type="button"
          onClick={() => persistMute(!muted)}
          className="rounded-full border border-sky-400/40 bg-black/45 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md"
        >
          {muted ? "🔇 Звук выкл" : "🔊 Звук вкл"}
        </button>
      </div>

      {phase === "intro" && (
        <div className="flex flex-col items-center gap-4 px-2 text-center">
          <h1 className="font-serif text-xl font-bold leading-tight text-white sm:text-2xl">
            Поле чудес — код, учеба и судьба
          </h1>
          <p className="text-sm text-white/85 sm:text-base">Финальная игра курса</p>
          <p className="max-w-md text-sm text-white/75">
            Отдохни и узнай свой вайб разработчика на сегодня.
          </p>
          <NeonGlassButton accent className="!px-8 !py-3 !text-base" onClick={() => setPhase("play")}>
            Крутим удачу?
          </NeonGlassButton>
        </div>
      )}

      {phase === "play" && (
        <>
          <p className="text-center font-serif text-sm font-semibold text-fuchsia-100/95 sm:text-base">
            Крутим судьбу вайбкодера
          </p>
          <div className="relative mx-auto mt-1 w-[min(78vmin,300px)]">
            <div
              className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1 text-fuchsia-200 drop-shadow-[0_0_8px_rgba(236,72,153,0.9)]"
              style={{ fontSize: "1.75rem", lineHeight: 1 }}
              aria-hidden
            >
              ▼
            </div>
            <div
              className={cn(
                "relative mx-auto aspect-square w-full overflow-hidden rounded-full shadow-[0_0_48px_rgba(168,85,247,0.45)] ring-2 ring-cyan-400/35",
                spinning ? "transition-[transform] duration-[4500ms] ease-[cubic-bezier(0.12,0.75,0.1,1)]" : "",
              )}
              style={{
                background: gradient,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <div className="pointer-events-none absolute inset-0">
                {LUCKY_CATEGORIES.map((c, i) => {
                  const ang = i * SECTOR + SECTOR / 2;
                  return (
                    <div
                      key={c.id}
                      className="absolute left-1/2 top-1/2 origin-center text-[9px] font-bold uppercase leading-none tracking-tight text-white/95 shadow-black/50 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] sm:text-[10px]"
                      style={{
                        transform: `translate(-50%, -50%) rotate(${ang}deg) translateY(-118px) rotate(${-ang}deg)`,
                        width: "5.5rem",
                        textAlign: "center",
                      }}
                    >
                      {c.wheelLabel}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <p className="text-xs text-white/70">
            Вращение {completedSpins + 1} / {LUCKY_SPINS_PER_GAME}
          </p>

          <NeonGlassButton
            accent
            disabled={spinning || completedSpins >= LUCKY_SPINS_PER_GAME}
            className="!px-8 !py-3 !text-base"
            onClick={handleSpin}
          >
            Крутить барабан
          </NeonGlassButton>
        </>
      )}

      {phase === "card" && lastCard && (
        <div className="flex w-full flex-col items-center gap-4 px-2">
          <div className={cn(cardBase, "w-full max-w-md text-center")}>
            <p className="text-xs font-bold uppercase tracking-wide text-fuchsia-200/95">{lastCard.title}</p>
            <p className="mt-2 font-serif text-lg font-semibold text-white sm:text-xl">{lastCard.phrase}</p>
          </div>
          <NeonGlassButton
            accent
            className="!px-6 !py-2.5"
            onClick={() => {
              if (completedSpins >= LUCKY_SPINS_PER_GAME) setPhase("finale");
              else setPhase("play");
            }}
          >
            {completedSpins >= LUCKY_SPINS_PER_GAME ? "К итогу" : "Дальше"}
          </NeonGlassButton>
        </div>
      )}

      {phase === "finale" && (
        <div className="lucky-wheel-finale relative flex w-full flex-col items-center gap-4 px-2 pb-6">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-2xl opacity-90">
            <div className="lucky-wheel-fireworks absolute inset-0" aria-hidden />
          </div>
          <h2 className="text-center font-serif text-lg font-bold text-white sm:text-xl">
            ВАЙБ КОДИНГ АКТИВИРОВАН
          </h2>
          <p className="text-center text-sm font-semibold text-fuchsia-100/95">Сегодня твой день:</p>
          <ul className={cn(cardBase, "w-full max-w-md space-y-2 text-left text-sm")}>
            {history.map((h) => (
              <li key={`${h.categoryId}-${h.phrase}`}>
                <span className="font-bold text-fuchsia-200/90">{h.title}:</span>{" "}
                <span className="text-white/95">{h.phrase}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <NeonGlassButton accent className="!px-6 !py-2.5" onClick={resetGame}>
              Сыграть снова
            </NeonGlassButton>
            {variant === "panel" && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/25 bg-black/50 px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-sm hover:border-fuchsia-400/45"
              >
                Закрыть
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
