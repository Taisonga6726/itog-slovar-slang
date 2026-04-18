/**
 * FinalBookMagicFX
 * Единственный слой: мягкое золотое свечение из-под книги.
 * Никаких частиц, дуг, halo по курсору и наложений на страницы.
 */
const FinalBookMagicFX = () => {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 1 }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "-10%",
          width: "120%",
          height: "40%",
          transform: "translateX(-50%)",
          background:
            "radial-gradient(ellipse 70% 40% at 50% 100%, rgba(255,200,90,0.55) 0%, rgba(255,170,60,0.35) 30%, rgba(180,100,40,0.15) 60%, transparent 80%)",
          filter: "blur(40px)",
          mixBlendMode: "screen",
          animation: "fbfx-under-breath 6s ease-in-out infinite",
          willChange: "opacity, transform",
        }}
      />

      <style>{`
        @keyframes fbfx-under-breath {
          0%, 100% { opacity: 0.85; transform: translateX(-50%) scale(1); }
          50%      { opacity: 1;    transform: translateX(-50%) scale(1.04); }
        }
      `}</style>
    </div>
  );
};

export default FinalBookMagicFX;
