import React, { useEffect, useState } from "react";
import NeonGlassButton from "@/components/NeonGlassButton";
import VibeAudioTestPanel from "@/components/VibeAudioTestPanel";

interface Entry {
  word: string;
  description: string;
  reactions: { fire: number; love: number; rocket: number; laugh: number; like: number };
}

export interface FinalScreenProps {
  entries: Entry[];
  onBack: () => void;
  onLuck?: () => void;
  onGimn?: () => void;
  /** Пауза фонового гимна (книга) при открытии панели выбора версий */
  onPauseBackgroundHymn?: () => void;
  /** Снова запустить гимн после закрытия панели, если он играл */
  onResumeBackgroundHymn?: () => void;
  /** Открыта панель аудиоверсий — чтобы скрыть глобальный логотип (не накладывать на UI) */
  onHymnPanelOpenChange?: (open: boolean) => void;
  /** Панель гимна: «Крутим игру?» (как ритмика с «Крутим удачу?» на финале) */
  onHymnPlayGame?: () => void;
  /** Панель гимна: «внести слово» — обычно переход к форме */
  onHymnEnterWord?: () => void;
  /** Открыть панель гимна сразу после входа на экран */
  openHymnOnMount?: boolean;
}

/**
 * Постер на весь слой; глобальный логотип AI на финале не показываем (нет наложения). Панель гимна — по-прежнему без оболочки поверх.
 * Верх — «Выбрать свой гимн?»; низ — «Всего слов», ряд реакций, «Крутим удачу?».
 */
const FinalScreen: React.FC<FinalScreenProps> = ({
  entries,
  onBack,
  onLuck,
  onGimn,
  onPauseBackgroundHymn,
  onResumeBackgroundHymn,
  onHymnPanelOpenChange,
  onHymnPlayGame,
  onHymnEnterWord,
  openHymnOnMount = false,
}) => {
  const [audioTestOpen, setAudioTestOpen] = useState(false);

  useEffect(() => {
    onHymnPanelOpenChange?.(audioTestOpen);
  }, [audioTestOpen, onHymnPanelOpenChange]);

  useEffect(() => {
    return () => {
      onHymnPanelOpenChange?.(false);
    };
  }, [onHymnPanelOpenChange]);

  useEffect(() => {
    if (!openHymnOnMount) return;
    onPauseBackgroundHymn?.();
    setAudioTestOpen(true);
  }, [openHymnOnMount, onPauseBackgroundHymn]);

  const totalFire = entries.reduce((sum, w) => sum + (w.reactions?.fire || 0), 0);
  const totalLove = entries.reduce((sum, w) => sum + (w.reactions?.love || 0), 0);
  const totalRocket = entries.reduce((sum, w) => sum + (w.reactions?.rocket || 0), 0);
  const totalLaugh = entries.reduce((sum, w) => sum + (w.reactions?.laugh || 0), 0);
  const totalLike = entries.reduce((sum, w) => sum + (w.reactions?.like || 0), 0);

  const totalWords = entries.length;
  const splashAudioSrc = `/videos/${encodeURIComponent("заставка перед игрой")}/${encodeURIComponent("заставка перед игрой.MP3")}`;

  return (
    <div className="scene-fade-in fixed inset-0 z-[45] flex h-screen w-full flex-col overflow-hidden bg-black">
      <div className="relative min-h-0 w-full flex-1">
        <img
          src="/images/final-screen.png"
          alt="Финальный экран"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
          draggable={false}
        />

        {/* Гимн: на финале глобальный логотип не показываем — без наложения на постер */}
        <div
          className="pointer-events-none fixed left-1/2 z-[135] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col items-center"
          style={{ top: "clamp(4rem, 11vh, 6.5rem)" }}
        >
          <NeonGlassButton
            accent
            className="pointer-events-auto !block w-full max-w-[min(90vw,22rem)] text-center !px-4 !py-2 !text-sm sm:!py-2.5 sm:!text-base"
            onClick={() => {
              onPauseBackgroundHymn?.();
              onGimn?.();
              setAudioTestOpen(true);
            }}
          >
            Выбрать свой гимн?
          </NeonGlassButton>
        </div>

        {/* Без коричневой капсулы: бейдж + эмодзи; ниже — удача */}
        <div
          className="pointer-events-none absolute left-1/2 z-10 flex w-[min(96%,28rem)] -translate-x-1/2 flex-col items-stretch gap-2.5 px-2"
          style={{
            bottom: "max(5.25rem, calc(env(safe-area-inset-bottom, 0px) + 4.75rem))",
            top: "auto",
          }}
        >
          <div className="pointer-events-auto flex w-full flex-col items-center gap-3 sm:gap-4">
            <div
              className="final-total-words-badge rounded-full px-5 py-2.5 text-center text-base font-bold text-white shadow-[0_0_22px_rgba(168,85,247,0.35)] sm:px-7 sm:py-3.5 sm:text-xl"
              style={{
                background: "linear-gradient(135deg, #c026d3, #7c3aed 45%, #a855f7)",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
            >
              Всего слов: {totalWords}
            </div>
            <div
              className="flex flex-wrap items-center justify-center gap-2 text-lg sm:gap-3 sm:text-2xl"
              style={{
                textShadow: "0 2px 10px rgba(0,0,0,0.85), 0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              <span className="text-white/95">🔥 {totalFire}</span>
              <span className="text-white/95">❤️ {totalLove}</span>
              <span className="text-white/95">🚀 {totalRocket}</span>
              <span className="text-white/95">😂 {totalLaugh}</span>
              <span className="text-white/95">👍 {totalLike}</span>
            </div>
          </div>
          <NeonGlassButton
            accent
            className="pointer-events-auto !block w-full text-center !px-6 !py-3 !text-base sm:!text-lg"
            onClick={() => {
              // Мгновенный старт интро-звука уже на кнопке перед открытием заставки.
              const fx = new Audio(splashAudioSrc);
              fx.volume = 1;
              fx.muted = false;
              void fx.play().catch(() => {});
              onLuck?.();
            }}
          >
            Крутим удачу?
          </NeonGlassButton>
        </div>
      </div>

      <VibeAudioTestPanel
        open={audioTestOpen}
        onClose={() => {
          setAudioTestOpen(false);
          onResumeBackgroundHymn?.();
        }}
        onBackToBook={() => {
          setAudioTestOpen(false);
          onResumeBackgroundHymn?.();
          onBack();
        }}
        onPlayGame={() => {
          setAudioTestOpen(false);
          /** Не вызываем onResumeBackgroundHymn: иначе гимн успевает запуститься до паузы в openLuckyWheel и смешивается с игрой. */
          onHymnPlayGame?.();
        }}
        onEnterWord={() => {
          setAudioTestOpen(false);
          onHymnEnterWord?.();
        }}
      />
    </div>
  );
};

export default FinalScreen;
