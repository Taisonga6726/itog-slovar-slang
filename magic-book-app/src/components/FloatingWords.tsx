const WORDS = [
  { text: "VIBE", color: "purple" },
  { text: "CODE", color: "cyan" },
  { text: "AI", color: "gold" },
  { text: "FLOW", color: "blue" },
  { text: "FOCUS", color: "green" },
  { text: "MAGIC", color: "cyan" },
  { text: "IDEA", color: "purple" },
  { text: "SPEED", color: "gold" },
  { text: "ПОТОК", color: "green" },
  { text: "ФОКУС", color: "blue" },
  { text: "МАГИЯ", color: "cyan" },
  { text: "СМЫСЛ", color: "gold" },
  { text: "НЕЙРО", color: "purple" },
  { text: "ВАЙБ", color: "green" },
  { text: "КОД", color: "cyan" },
];

// Positions around the book edges — left, right, top, bottom margins
const POSITIONS = [
  { top: "26%", left: "18%" },
  { top: "32%", right: "18%" },
  { top: "43%", left: "17%" },
  { top: "49%", right: "18%" },
  { top: "60%", left: "18%" },
  { top: "64%", right: "18%" },
  { top: "72%", left: "19%" },
  { top: "74%", right: "22%" },
  { bottom: "10%", left: "18%" },
  { bottom: "9%", right: "36%" },
  { bottom: "6%", left: "31%" },
  { bottom: "6%", right: "38%" },
  { bottom: "16%", left: "32%" },
  { bottom: "16%", right: "31%" },
  { bottom: "20%", left: "18%" },
];

const SIZES = [24, 25, 22, 26, 24, 27, 22, 24, 23, 25, 22, 25, 24, 24, 23];

const FloatingWords = () => {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 135 }}
      aria-hidden
    >
      {WORDS.map((word, i) => {
        const duration = 20 + Math.random() * 20;
        const delay = Math.random() * -20;
        const glowClass = `glow-text-${word.color}`;

        return (
          <span
            key={i}
            className={`absolute font-handwriting font-bold ${glowClass} select-none`}
            style={{
              ...POSITIONS[i],
              fontSize: `${SIZES[i]}px`,
              animation: `float-word ${duration}s ease-in-out ${delay}s infinite, magic-glow ${5 + Math.random() * 3}s ease-in-out ${Math.random() * -5}s infinite`,
              opacity: 0.55,
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};

export default FloatingWords;
