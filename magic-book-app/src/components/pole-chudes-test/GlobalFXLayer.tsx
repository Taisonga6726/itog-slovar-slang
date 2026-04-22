const FLOAT_WORDS = ["МАГИЯ", "СМЫСЛ", "CODE", "ФОКУС", "ПОТОК", "VIBE"];

export default function GlobalFXLayer() {
  return (
    <div className="global-fx-layer pointer-events-none absolute inset-0 z-[5]" aria-hidden>
      <div className="global-fx-layer__logo-wrap">
        <div className="global-fx-layer__logo">AI</div>
      </div>

      <div className="global-fx-layer__circles">
        <div className="global-fx-layer__circle global-fx-layer__circle--a" />
        <div className="global-fx-layer__circle global-fx-layer__circle--b" />
        <div className="global-fx-layer__circle global-fx-layer__circle--c" />
      </div>

      {FLOAT_WORDS.map((word, idx) => (
        <span key={`${word}-${idx}`} className={`global-fx-layer__word global-fx-layer__word--${(idx % 6) + 1}`}>
          {word}
        </span>
      ))}
    </div>
  );
}
