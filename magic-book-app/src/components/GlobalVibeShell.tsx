import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import VibeAiBrand from "@/components/VibeAiBrand";

/**
 * Логотип AI (опционально) + кольца курсора (portal → body).
 * Логотип: intro / финал / открытая панель гимна — скрыт (свой бренд в макете). Кольца: всегда.
 */
export default function GlobalVibeShell({
  banner,
  showLogo = true,
  compactBrand = false,
}: {
  banner: boolean;
  /** Intro (iframe), финал (постер), панель гимна — без дубля логотипа. */
  showLogo?: boolean;
  /** /luck-test SPLASH: баннер логотипа на 2 шага компактнее. */
  compactBrand?: boolean;
}) {
  const [target, setTarget] = useState<Element | null>(null);

  useEffect(() => {
    setTarget(document.body);
  }, []);

  if (!target) return null;

  return createPortal(
    <>
      <MagicRingsGlobal />
      {showLogo && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-[300] flex justify-center pt-[max(0.35rem,env(safe-area-inset-top))]"
          aria-hidden
        >
          <VibeAiBrand
            banner={banner}
            className={cn(
              "!relative !inset-x-auto !left-auto !right-auto !top-0 !mx-auto !w-full !max-w-none !justify-center",
              compactBrand && "tz-vibe-ai-brand--luck-splash",
            )}
          />
        </div>
      )}
    </>,
    target,
  );
}
