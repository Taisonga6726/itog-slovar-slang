import { cn } from "@/lib/utils";
import VibeAiLogoMark, { VIBE_AI_LOGO_SRC } from "@/components/VibeAiLogoMark";

/**
 * Логотип AI сверху по центру — тот же PNG, что в SLOVAR_02.
 * Без `banner`: как на обложке — через VibeAiLogoMark (не дублировать разметку).
 * С `banner`: вариант как у нижнего #tzVibeAiBrand — `--overlay`.
 */
export default function VibeAiBrand({ className, banner }: { className?: string; banner?: boolean }) {
  return (
    <div
      id="mbVibeAiBrand"
      className={cn("tz-vibe-ai-brand tz-vibe-ai-brand--visible", banner && "tz-vibe-ai-brand--banner", className)}
      aria-hidden
    >
      <div className="tz-vibe-ai-brand__stack">
        {banner ? (
          <div className="tz-vibe-ai-logo-wrap tz-vibe-ai-logo-wrap--overlay">
            <span className="tz-vibe-ai-logo__halo" aria-hidden />
            <img
              className="tz-vibe-ai-logo-img"
              src={VIBE_AI_LOGO_SRC}
              alt=""
              width={360}
              height={160}
              decoding="async"
              loading="eager"
            />
          </div>
        ) : (
          <VibeAiLogoMark />
        )}
      </div>
    </div>
  );
}
