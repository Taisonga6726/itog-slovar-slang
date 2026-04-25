export default function GlobalFXLayer() {
  return (
    <div className="global-fx-layer pointer-events-none absolute inset-0 z-[4]" aria-hidden>
      <div className="global-fx-layer__circles">
        <div className="global-fx-layer__circle global-fx-layer__circle--a" />
        <div className="global-fx-layer__circle global-fx-layer__circle--b" />
        <div className="global-fx-layer__circle global-fx-layer__circle--c" />
      </div>
    </div>
  );
}
