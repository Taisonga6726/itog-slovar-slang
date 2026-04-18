/**
 * Логотип AI сверху по центру — те же классы и PNG, что в SLOVAR_02 (#tzVibeAiBrand).
 */
export default function VibeAiBrand() {
  return (
    <div id="mbVibeAiBrand" className="tz-vibe-ai-brand tz-vibe-ai-brand--visible" aria-hidden>
      <div className="tz-vibe-ai-brand__stack">
        <div className="tz-vibe-ai-logo-wrap tz-vibe-ai-logo-wrap--overlay">
          <span className="tz-vibe-ai-logo__halo" aria-hidden />
          <img
            className="tz-vibe-ai-logo-img"
            src="/images/LOGO.png.png"
            alt=""
            width={320}
            height={140}
            decoding="async"
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
}
