import React, { useRef, useState } from "react";

interface NeonGlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  accent?: boolean;
}

const NeonGlassButton: React.FC<NeonGlassButtonProps> = ({ children, onClick, disabled, accent, className = "" }) => {
  const [flashKey, setFlashKey] = useState(0);
  const flashCounterRef = useRef(0);

  const handleClick = () => {
    if (disabled) return;
    flashCounterRef.current += 1;
    setFlashKey(flashCounterRef.current);
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`neon-btn-glow transition-all duration-200 cursor-pointer select-none relative overflow-hidden ${disabled ? "opacity-40 cursor-not-allowed" : "hover:scale-105"} ${accent && !disabled ? "animate-neon-pulse" : ""} ${className}`}
      style={{
        background: accent ? "linear-gradient(135deg, #a855f7, #ec4899)" : "rgba(80, 40, 160, 0.35)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "2px solid rgba(100, 160, 255, 0.5)",
        boxShadow: disabled
          ? "none"
          : "0 0 15px rgba(100,160,255,0.4), 0 0 30px rgba(138,92,246,0.2), inset 0 0 20px rgba(100,160,255,0.1)",
        color: "white",
        fontWeight: 600,
        padding: "8px 20px",
        borderRadius: "999px",
        fontSize: "15px",
        letterSpacing: "0.02em",
      }}
    >
      <style>{`
        @keyframes neon-btn-flash {
          0% { opacity: 0; transform: scale(0.4); }
          40% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0; transform: scale(1.3); }
        }
      `}</style>
      {flashKey > 0 && (
        <span
          key={flashKey}
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "999px",
            pointerEvents: "none",
            background:
              "radial-gradient(circle at center, rgba(255,230,180,0.9) 0%, rgba(255,150,80,0.6) 30%, rgba(255,100,200,0.3) 60%, transparent 80%)",
            mixBlendMode: "screen",
            animation: "neon-btn-flash 450ms ease-out forwards",
            zIndex: 0,
          }}
        />
      )}
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </button>
  );
};

export default NeonGlassButton;
