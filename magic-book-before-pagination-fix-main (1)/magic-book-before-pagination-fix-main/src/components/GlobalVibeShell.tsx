import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import VibeAiBrand from "@/components/VibeAiBrand";

/**
 * Один логотип AI + кольца курсора на всём приложении (portal → body, поверх модалок/panel).
 */
export default function GlobalVibeShell({ banner }: { banner: boolean }) {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    setTarget(document.body);
  }, []);

  if (!target) return null;

  return createPortal(
    <>
      <MagicRingsGlobal />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[300] flex justify-center pt-[max(0.35rem,env(safe-area-inset-top))]"
        aria-hidden
      >
        <VibeAiBrand
          banner={banner}
          className="!relative !inset-x-auto !left-auto !right-auto !top-0 !mx-auto !w-full !max-w-none !justify-center"
        />
      </div>
    </>,
    target,
  );
}
