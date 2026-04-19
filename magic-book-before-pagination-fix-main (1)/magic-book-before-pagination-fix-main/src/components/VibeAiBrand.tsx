import { cn } from "@/lib/utils";

/**
 * Логотип AI сверху по центру — тот же PNG, что в SLOVAR_02.
 * Без `banner`: как на обложке (#aiLogoHotspot) — `tz-vibe-ai-logo-wrap` без `--overlay` (иначе другие max-* и «плоский» вид).
 * С `banner`: вариант как у нижнего #tzVibeAiBrand — `--overlay`.
 */
export default function VibeAiBrand({ className, banner }: { className?: string; banner?: boolean }) {
  const img = (
    <img
      className="tz-vibe-ai-logo-img"
      src="/images/LOGO.png.png"
      alt=""
      width={360}
      height={160}
      decoding="async"
      loading="eager"
    />
  );

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
            {img}
          </div>
        ) : (
          <div className="mb-ai-logo-hotspot">
            <div className="tz-vibe-ai-logo-wrap">
              <span className="tz-vibe-ai-logo__halo" aria-hidden />
              {img}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
