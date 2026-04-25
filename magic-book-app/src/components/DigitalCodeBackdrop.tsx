const CODE_COLORS = [
  "rgba(102,255,168,0.9)",
  "rgba(95,244,255,0.88)",
  "rgba(176,117,255,0.84)",
];

const SIDE_LEFT = Array.from({ length: 14 }, (_, i) => 1.2 + i * 1.25);
const SIDE_RIGHT = Array.from({ length: 14 }, (_, i) => 81.3 + i * 1.25);
const CODE_COLUMNS = [...SIDE_LEFT, ...SIDE_RIGHT].map((left, i) => ({
  left: `${left.toFixed(2)}%`,
  duration: 7.6 + (i % 5) * 0.5,
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
}

export default function DigitalCodeBackdrop({ opacity = 0.9 }: DigitalCodeBackdropProps) {
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
            "linear-gradient(90deg, rgba(15,6,38,0.76) 0%, rgba(16,8,42,0.52) 18%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 72%, rgba(16,8,42,0.52) 82%, rgba(15,6,38,0.76) 100%)",
        }}
      />
      {CODE_COLUMNS.map((col, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            left: col.left,
            top: "-22%",
            width: "1.18%",
            height: "165%",
            color: col.color,
            filter: "drop-shadow(0 0 14px rgba(95,244,255,0.62))",
            animation: `digital-code-fall ${col.duration}s linear ${col.delay}s infinite, digital-code-flicker ${1.2 + idx * 0.1}s ease-in-out ${-idx * 0.2}s infinite`,
            fontFamily: "'Courier New', monospace",
            fontSize: "clamp(13px, 1.1vw, 15px)",
            lineHeight: 1.02,
            letterSpacing: "0.02em",
            textAlign: "center",
            userSelect: "none",
            whiteSpace: "pre-line",
          }}
        >
          {Array.from({ length: 48 })
            .map((_, i) => CODE_TEXT[(i + idx) % CODE_TEXT.length])
            .join("\n")}
        </div>
      ))}
    </div>
  );
}
