import { cn } from "@/lib/utils";

/** Путь к PNG — единый с VibeAiBrand / SLOVAR_02. Не менять без явного ТЗ автора. */
export const VIBE_AI_LOGO_SRC = "/images/LOGO.png.png";

/**
 * Логотип AI: те же классы и размеры, что у обложки (`mb-ai-logo-hotspot` + `tz-vibe-ai-logo-img` в index.css).
 * Использовать везде, где нужна марка, без дублирования размеров.
 */
export default function VibeAiLogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none flex justify-center", className)}>
      <div className="mb-ai-logo-hotspot">
        <div className="tz-vibe-ai-logo-wrap">
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
      </div>
    </div>
  );
}
