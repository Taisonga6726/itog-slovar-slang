import React from "react";
import { Volume2 } from "lucide-react";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import NeonGlassButton from "@/components/NeonGlassButton";
import VibeAiBrand from "@/components/VibeAiBrand";

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
  onBookSound?: () => void;
}

/**
 * Постер снова на весь слой (object-contain); верх — компактный AI + гимн, без наезда на имя;
 * статы без коричневой подложки; «Всего слов» — крупный анимированный бейдж; низ — над панелью «к книге».
 */
const FinalScreen: React.FC<FinalScreenProps> = ({ entries, onBack: _onBack, onLuck, onGimn, onBookSound }) => {
  const totalFire = entries.reduce((sum, w) => sum + (w.reactions?.fire || 0), 0);
  const totalLove = entries.reduce((sum, w) => sum + (w.reactions?.love || 0), 0);
  const totalRocket = entries.reduce((sum, w) => sum + (w.reactions?.rocket || 0), 0);
  const totalLaugh = entries.reduce((sum, w) => sum + (w.reactions?.laugh || 0), 0);
  const totalLike = entries.reduce((sum, w) => sum + (w.reactions?.like || 0), 0);

  return (
    <div className="scene-fade-in fixed inset-0 z-[45] flex h-screen w-screen flex-col overflow-hidden bg-black">
      <MagicRingsGlobal />

      <div className="relative min-h-0 w-full flex-1">
        <img
          src="/images/final-screen.png"
          alt="Финальный экран"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
          draggable={false}
        />

        <button
          type="button"
          onClick={onBookSound}
          className="absolute right-2 top-2 z-20 inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-black/45 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-md sm:text-sm"
        >
          <Volume2 className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">звук в книге</span>
          <span className="sm:hidden">звук</span>
        </button>

        {/* AI + гимн: лого с banner-крупностью, лёгкий сдвиг вниз в «космическую» полосу над именем */}
        <div
          className="pointer-events-none fixed left-1/2 z-[135] flex w-[min(92vw,26rem)] -translate-x-1/2 flex-col items-center gap-2"
          style={{ top: "max(0.6rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="w-full translate-y-1 sm:translate-y-1.5">
            <VibeAiBrand
              banner
              className="!relative !inset-x-auto !left-auto !right-auto !top-0 !mx-auto !w-full !max-w-none !justify-center"
            />
          </div>
          <NeonGlassButton
            accent
            className="pointer-events-auto !mt-0.5 !block w-full max-w-[min(90vw,22rem)] text-center !px-4 !py-2 !text-sm sm:!py-2.5 sm:!text-base"
            onClick={onGimn}
          >
            Выбрать свой гимн?
          </NeonGlassButton>
        </div>

        {/* Без коричневой капсулы: только бейдж + эмодзи с тенью; блок от низа — ниже золотого текста */}
        <div
          className="pointer-events-none absolute left-1/2 z-10 flex w-[min(96%,28rem)] -translate-x-1/2 flex-col items-stretch gap-2.5 px-2"
          style={{
            bottom: "max(5.25rem, calc(env(safe-area-inset-bottom, 0px) + 4.75rem))",
            top: "auto",
          }}
        >
          <div className="pointer-events-auto flex w-full flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div
              className="final-total-words-badge rounded-full px-5 py-2.5 text-base font-bold text-emerald-950 shadow-lg sm:px-7 sm:py-3.5 sm:text-xl"
              style={{
                background: "linear-gradient(135deg, #22c55e, #4ade80)",
              }}
            >
              Всего слов: {entries.length}
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
            onClick={onLuck}
          >
            Крутим удачу?
          </NeonGlassButton>
        </div>
      </div>
    </div>
  );
};

export default FinalScreen;
