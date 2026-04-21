import { createPortal } from "react-dom";
import { X } from "lucide-react";
import PoleChudesTestGame from "@/components/pole-chudes-test/PoleChudesTestGame";

type LuckyWheelPanelProps = {
  open: boolean;
  onClose: () => void;
};

/**
 * Полноэкранная панель с полной игрой «Поле чудес» поверх книги — один URL сайта, без отдельного /luck.
 */
export default function LuckyWheelPanel({ open, onClose }: LuckyWheelPanelProps) {
  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[255] flex flex-col overflow-hidden bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Поле чудес — игра"
    >
      <button
        type="button"
        onClick={onClose}
        className="fixed right-3 top-3 z-[315] flex h-10 w-10 items-center justify-center rounded-full border-2 border-sky-400/50 bg-black/55 text-white shadow-[0_0_18px_rgba(56,189,248,0.25)] backdrop-blur-md transition hover:border-fuchsia-300/60 hover:bg-black/75 sm:right-4 sm:top-4"
        style={{ marginTop: "max(0px, env(safe-area-inset-top, 0px))" }}
        aria-label="Закрыть игру"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-[256] flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <PoleChudesTestGame layout="panel" onClosePanel={onClose} />
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
