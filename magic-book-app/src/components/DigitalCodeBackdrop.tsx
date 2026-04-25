const CODE_COLORS = [
  "rgba(122,255,178,0.98)",
  "rgba(108,248,255,0.95)",
  "rgba(196,136,255,0.92)",
];

const SIDE_LEFT = Array.from({ length: 22 }, (_, i) => 0.8 + i * 0.86);
const SIDE_RIGHT = Array.from({ length: 22 }, (_, i) => 80.4 + i * 0.86);
const CODE_COLUMNS = [...SIDE_LEFT, ...SIDE_RIGHT].map((left, i) => ({
  left: `${left.toFixed(2)}%`,
  duration: 6.2 + (i % 5) * 0.34,
  delay: -(i % 7) * 0.85,
  color: CODE_COLORS[i % CODE_COLORS.length],
}));

const CODE_TEXT = [
  "0",
  "1",
  "7",
  "3",
  "9",
  "5",
  "2",
  "8",
  "6",
  "4",
  "A",
  "F",
  "C",
  "E",
  "B",
  "D",
];

interface DigitalCodeBackdropProps {
  opacity?: number;
  variant?: "sides" | "full";
}

export default function DigitalCodeBackdrop({ opacity = 0.9, variant = "sides" }: DigitalCodeBackdropProps) {
  const fullColumnsPrimary = Array.from({ length: 62 }, (_, i) => ({
    left: `${(0.6 + i * 1.6).toFixed(2)}%`,
    duration: 10.8 + (i % 6) * 0.6,
    delay: -(i % 8) * 0.9,
    color: CODE_COLORS[i % CODE_COLORS.length],
  }));
  const fullColumnsSecondary = Array.from({ length: 60 }, (_, i) => ({
    left: `${(1.4 + i * 1.6).toFixed(2)}%`,
    duration: 11.4 + (i % 5) * 0.55,
    delay: -(i % 7) * 0.95,
    color: CODE_COLORS[(i + 1) % CODE_COLORS.length],
  }));

  const layers = variant === "full" ? [fullColumnsPrimary, fullColumnsSecondary] : [CODE_COLUMNS];

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 18, opacity, mixBlendMode: "screen" }}
      aria-hidden
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            variant === "full"
              ? "linear-gradient(180deg, rgba(16,8,42,0.22) 0%, rgba(8,4,24,0.08) 50%, rgba(16,8,42,0.2) 100%)"
              : "linear-gradient(90deg, rgba(15,6,38,0.76) 0%, rgba(16,8,42,0.52) 18%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 72%, rgba(16,8,42,0.52) 82%, rgba(15,6,38,0.76) 100%)",
        }}
      />
      {layers.map((columns, layerIdx) =>
        columns.map((col, idx) => (
          <div
            key={`${layerIdx}-${idx}`}
            style={{
              position: "absolute",
              left: col.left,
              top: variant === "full" ? "-26%" : "-22%",
              width: variant === "full" ? "0.92%" : "0.92%",
              height: variant === "full" ? "174%" : "165%",
              color: col.color,
              filter: variant === "full" ? "drop-shadow(0 0 14px rgba(108,248,255,0.66))" : "drop-shadow(0 0 18px rgba(108,248,255,0.9))",
              animation: `digital-code-fall ${col.duration}s linear ${col.delay}s infinite, digital-code-flicker ${variant === "full" ? 1.2 + idx * 0.02 : 0.95 + idx * 0.07}s ease-in-out ${-idx * 0.2}s infinite`,
              fontFamily: "'Courier New', monospace",
              fontSize: variant === "full" ? "clamp(12px, 0.95vw, 14px)" : "clamp(14px, 1.2vw, 17px)",
              lineHeight: variant === "full" ? 1.02 : 0.96,
              letterSpacing: "0.02em",
              textAlign: "center",
              userSelect: "none",
              whiteSpace: "pre-line",
              opacity: variant === "full" && layerIdx === 1 ? 0.72 : 1,
            }}
          >
            {Array.from({ length: variant === "full" ? 62 : 72 })
              .map((_, i) => CODE_TEXT[(i + idx + layerIdx) % CODE_TEXT.length])
              .join("\n")}
          </div>
        )),
      )}
    </div>
  );
}
