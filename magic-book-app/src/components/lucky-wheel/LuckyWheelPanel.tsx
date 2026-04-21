import { createPortal } from "react-dom";
import { X } from "lucide-react";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import LuckyWheelGame from "@/components/lucky-wheel/LuckyWheelGame";
import { VIBE_PANEL_BG_SRC } from "@/components/VibeAudioTestPanel";

type LuckyWheelPanelProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Вариант A: полноэкранная панель (как панель гимна), z поверх финала.
 */
export default function LuckyWheelPanel({ open, onClose }: LuckyWheelPanelProps) {
  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[255] flex flex-col overflow-y-auto overflow-x-hidden text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Поле чудес — игра"
    >
      <div className="pointer-events-none fixed inset-0 z-0 flex items-end justify-center bg-black">
        <img
          src={VIBE_PANEL_BG_SRC}
          alt=""
          className="h-auto max-h-[100dvh] w-full max-w-[min(1600px,100vw)] select-none object-contain object-bottom"
          draggable={false}
        />
      </div>

      <MagicRingsGlobal
        className="magic-rings-fx--hymn-panel"
        containerId="mbLuckyPanelMagicRings"
        canvasId="mbLuckyPanelMagicRingsCanvas"
      />

      <button
        type="button"
        onClick={onClose}
        className="fixed right-3 top-3 z-[315] flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-400/50 bg-black/55 text-white shadow-[0_0_18px_rgba(56,189,248,0.25)] backdrop-blur-md transition hover:border-fuchsia-300/60 hover:bg-black/75 sm:right-4 sm:top-4"
        style={{ marginTop: "max(0px, env(safe-area-inset-top, 0px))" }}
        aria-label="Закрыть игру"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-[256] mx-auto flex min-h-[100dvh] w-full max-w-[min(1240px,96vw)] flex-col items-center px-3 pb-8 pt-[max(3rem,env(safe-area-inset-top))] sm:px-5">
        <LuckyWheelGame variant="panel" onClose={onClose} skipIntro />
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
