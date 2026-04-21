import { useEffect, useRef, useState } from "react";

interface SpineEffectProps {
  burst: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  duration: number;
  angle: number;
}

const COLORS = [
  "hsl(40, 90%, 55%)",
  "hsl(300, 60%, 55%)",
  "hsl(265, 70%, 60%)",
  "hsl(220, 70%, 55%)",
];

const SpineEffect = ({ burst }: SpineEffectProps) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    if (!burst) return;
    const newParticles: Particle[] = [];
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        id: idRef.current++,
        x: (Math.random() - 0.5) * 40,
        y: 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 2 + Math.random() * 4,
        duration: 0.4 + Math.random() * 0.6,
        angle: -90 + (Math.random() - 0.5) * 60,
      });
    }
    setParticles(newParticles);
    const timer = setTimeout(() => setParticles([]), 1200);
    return () => clearTimeout(timer);
  }, [burst]);

  return (
    <div
      className="absolute left-1/2 w-10 -translate-x-1/2 pointer-events-none z-20 overflow-hidden"
      style={{ top: "12%", bottom: "12%" }}
    >
      <style>{`
        @keyframes spine-energy-flow {
          0% { transform: translateY(-30%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(130%); opacity: 0; }
        }
        @keyframes spine-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Base neon ribbon glow */}
      <div
        className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2"
        style={{
          width: "6px",
          background:
            "linear-gradient(to bottom, transparent, rgba(80,120,255,0.6), rgba(160,90,255,0.7), rgba(80,120,255,0.6), transparent)",
          filter: "blur(2px) drop-shadow(0 0 8px rgba(120,140,255,0.8))",
          mixBlendMode: "screen",
          animation: "spine-pulse 3s ease-in-out infinite",
        }}
      />

      {/* Running energy pulse */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          width: "8px",
          height: "40px",
          top: 0,
          background:
            "linear-gradient(to bottom, transparent, rgba(180,200,255,0.95), rgba(255,255,255,0.9), rgba(180,200,255,0.95), transparent)",
          filter: "blur(3px) drop-shadow(0 0 12px rgba(140,170,255,1))",
          mixBlendMode: "screen",
          animation: "spine-energy-flow 2.8s linear infinite",
        }}
      />

      {/* Burst particles */}
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const dist = 60 + Math.random() * 40;
        return (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `calc(50% + ${p.x}px)`,
              top: "50%",
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 6px ${p.color}, 0 0 12px ${p.color}`,
              animation: `spark-burst ${p.duration}s ease-out forwards`,
              transform: `translate(${Math.cos(rad) * dist}px, ${Math.sin(rad) * dist}px)`,
            }}
          />
        );
      })}
    </div>
  );
};

export default SpineEffect;
