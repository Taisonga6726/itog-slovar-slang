import { cn } from "@/lib/utils";

/** Путь к PNG — единый с VibeAiBrand / SLOVAR_02. Не менять без явного ТЗ автора. */
export const VIBE_AI_LOGO_SRC = "/images/LOGO.png.png";

function LogoCore() {
  return (
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
  );
}

/**
 * Логотип AI: те же классы и размеры, что у обложки (`mb-ai-logo-hotspot` + `tz-vibe-ai-logo-img` в index.css).
 * `withCoverEffects` — те же дополнительные слои, что на первом экране в slovar (луч по маске PNG + мягкий «столб» света),
 * не путать с одним голым PNG без этих слоёв.
 */
export default function VibeAiLogoMark({
  className,
  withCoverEffects = false,
}: {
  className?: string;
  withCoverEffects?: boolean;
}) {
  if (!withCoverEffects) {
    return (
      <div className={cn("pointer-events-none flex justify-center", className)}>
        <LogoCore />
      </div>
    );
  }

  return (
    <div className={cn("vibe-ai-logo-stack--cover pointer-events-none flex justify-center", className)}>
      <div className="cover-ai-rise-rays vibe-cover-rise-rays" aria-hidden>
        <div className="cover-ai-rise-rays__pillar" />
      </div>
      <LogoCore />
      <div className="cover-ai-logo-rays cover-ai-logo-rays--cover-stack" aria-hidden>
        <div className="cover-ai-logo-rays__mask">
          <div className="cover-ai-logo-rays__sweep" />
        </div>
      </div>
    </div>
  );
}
