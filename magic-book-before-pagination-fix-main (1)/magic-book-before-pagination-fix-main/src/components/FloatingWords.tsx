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
  { top: "10%", left: "10%" },
  { top: "16%", right: "12%" },
  { top: "28%", left: "11%" },
  { top: "35%", right: "11%" },
  { top: "50%", left: "10%" },
  { top: "55%", right: "11%" },
  { top: "68%", left: "12%" },
  { top: "72%", right: "18%" },
  { bottom: "16%", left: "11%" },
  { bottom: "12%", right: "38%" },
  { top: "6%", left: "30%" },
  { top: "5%", right: "26%" },
  { bottom: "8%", left: "26%" },
  { bottom: "6%", right: "40%" },
  { bottom: "20%", left: "12%" },
];

const SIZES = [17, 19, 16, 20, 18, 21, 16, 18, 17, 19, 16, 19, 18, 19, 17];

const FloatingWords = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
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
              opacity: 0.3,
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
