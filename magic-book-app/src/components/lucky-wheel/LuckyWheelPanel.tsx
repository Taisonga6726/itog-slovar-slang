import { createPortal } from "react-dom";
import { X } from "lucide-react";
import PoleChudesTestGame from "@/components/pole-chudes-test/PoleChudesTestGame";

type LuckyWheelPanelProps = {
  open: boolean;
  onClose: () => void;
  /** Глушить фоновый гимн книги во время игры (сброс позиции), чтобы не смешивался с эффектами. */
  onPauseBookHymn?: () => void;
};

/**
 * Полноэкранная панель с полной игрой «Поле чудес» поверх книги — один URL сайта, без отдельного /luck.
 */
export default function LuckyWheelPanel({ open, onClose, onPauseBookHymn }: LuckyWheelPanelProps) {
  if (!open) return null;

  const node = (
    <div
      className="pole-chudes-panel-shell fixed inset-0 z-[255] flex flex-col overflow-hidden text-[#faf6f0]"
      role="dialog"
      aria-modal="true"
      aria-label="Поле чудес — игра"
    >
      <button
        type="button"
        onClick={onClose}
        className="pole-chudes-panel-close fixed right-3 top-3 z-[315] flex h-10 w-10 items-center justify-center sm:right-4 sm:top-4"
        style={{ marginTop: "max(0px, env(safe-area-inset-top, 0px))" }}
        aria-label="Закрыть игру"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-[256] flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
        <PoleChudesTestGame layout="panel" onClosePanel={onClose} onPauseBookHymn={onPauseBookHymn} />
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
