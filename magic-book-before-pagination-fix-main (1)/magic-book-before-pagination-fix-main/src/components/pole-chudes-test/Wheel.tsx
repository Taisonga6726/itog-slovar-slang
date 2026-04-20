import React from "react";
import { motion } from "motion/react";
import { CATEGORIES } from "./constants";

interface WheelProps {
  rotation: number;
  spinDuration: number;
  isSpinning: boolean;
  onSpinAnimationComplete: () => void;
}

export const Wheel: React.FC<WheelProps> = ({ rotation, spinDuration, isSpinning, onSpinAnimationComplete }) => {
  const sectorSize = 360 / CATEGORIES.length;

  return (
    <div className="relative flex flex-col items-center">
      <div className="absolute top-[-30px] z-30 flex flex-col items-center">
        <div className="h-8 w-1 bg-white shadow-[0_0_15px_#fff]" />
        <div className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      </div>

      <motion.div
        initial={false}
        animate={{ rotate: rotation }}
        transition={{ duration: spinDuration, ease: [0.16, 0.88, 0.22, 1] }}
        onAnimationComplete={() => {
          if (isSpinning) onSpinAnimationComplete();
        }}
        className="relative z-10 h-[390px] w-[390px] md:h-[700px] md:w-[700px]"
      >
        <svg viewBox="-10 -10 120 120" className="h-full w-full -rotate-90 transform drop-shadow-[0_0_30px_rgba(147,51,234,0.3)]">
          <defs>
            <linearGradient id="goldGradientTest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bf953f" />
              <stop offset="25%" stopColor="#fcf6ba" />
              <stop offset="50%" stopColor="#b38728" />
              <stop offset="75%" stopColor="#fcf6ba" />
              <stop offset="100%" stopColor="#aa771c" />
            </linearGradient>
            <filter id="textShadow3DTest">
              <feDropShadow dx="0.4" dy="0.4" stdDeviation="0.1" floodOpacity="0.9" />
            </filter>
            {CATEGORIES.map((cat) => (
              <radialGradient id={`grad-test-${cat.id}`} key={cat.id}>
                <stop offset="30%" stopColor={cat.color} stopOpacity="1" />
                <stop offset="100%" stopColor={cat.color} stopOpacity="0.3" />
              </radialGradient>
            ))}
            <filter id="glowTest">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {CATEGORIES.map((category, index) => {
            const startAngle = index * sectorSize;
            const endAngle = (index + 1) * sectorSize;
            const midAngle = startAngle + sectorSize / 2;

            const r = 50;
            const cx = 50;
            const cy = 50;
            const rInner = 6;
            const margin = 2;
            const a1 = ((startAngle + margin) * Math.PI) / 180;
            const a2 = ((endAngle - margin) * Math.PI) / 180;
            const am = (midAngle * Math.PI) / 180;

            const x1 = cx + r * Math.cos(a1);
            const y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2);
            const y2 = cy + r * Math.sin(a2);
            const xm = cx + r * 0.9 * Math.cos(am);
            const ym = cy + r * 0.9 * Math.sin(am);
            const ix1 = cx + rInner * Math.cos(a1);
            const iy1 = cy + rInner * Math.sin(a1);
            const ix2 = cx + rInner * Math.cos(a2);
            const iy2 = cy + rInner * Math.sin(a2);
            const ixm = cx + rInner * Math.cos(am);
            const iym = cy + rInner * Math.sin(am);

            const bookPath = `
              M ${ixm} ${iym}
              L ${ix1} ${iy1}
              L ${x1} ${y1}
              Q ${cx + r * 1.05 * Math.cos((a1 + am) / 2)} ${cy + r * 1.05 * Math.sin((a1 + am) / 2)} ${xm} ${ym}
              Q ${cx + r * 1.05 * Math.cos((a2 + am) / 2)} ${cy + r * 1.05 * Math.sin((a2 + am) / 2)} ${x2} ${y2}
              L ${ix2} ${iy2}
              Z
            `;

            return (
              <g key={category.id} className="group cursor-pointer">
                <path d={bookPath} fill="rgba(0,0,0,0.5)" transform="translate(0.5, 0.5)" />
                <path
                  d={bookPath}
                  fill={`url(#grad-test-${category.id})`}
                  className="stroke-[0.3] stroke-[#fcf6ba]/20 transition-all duration-300 group-hover:brightness-125"
                  filter="url(#glowTest)"
                />
                <path d={`M ${ixm} ${iym} L ${xm} ${ym}`} stroke="url(#goldGradientTest)" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
                <path
                  d={`M ${ix1} ${iy1} L ${x1} ${y1} Q ${cx + r * 1.02 * Math.cos((a1 + am) / 2)} ${cy + r * 1.02 * Math.sin((a1 + am) / 2)} ${xm} ${ym}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.2"
                />
                <path
                  d={`M ${ix2} ${iy2} L ${x2} ${y2} Q ${cx + r * 1.02 * Math.cos((a2 + am) / 2)} ${cy + r * 1.02 * Math.sin((a2 + am) / 2)} ${xm} ${ym}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="0.2"
                />
                <text
                  x="82"
                  y="50"
                  transform={`rotate(${midAngle}, 50, 50) rotate(90, 82, 50)`}
                  fill="url(#goldGradientTest)"
                  className="pointer-events-none text-[6.5px] font-black uppercase tracking-tighter"
                  textAnchor="middle"
                  filter="url(#textShadow3DTest)"
                  style={{ stroke: "#4a3710", strokeWidth: "0.08px", paintOrder: "stroke fill" }}
                >
                  {category.label}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="absolute left-1/2 top-1/2 z-20 h-12 w-12 -translate-x-1/2 -translate-y-1/2 md:h-16 md:w-16">
          <div className="absolute inset-0 rounded-full bg-white opacity-50 blur-sm shadow-[0_0_30px_#fff]" />
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-4 border-white/40 bg-gradient-to-br from-gray-200 to-gray-400">
            <div className="h-4 w-4 animate-pulse rounded-full bg-black shadow-inner" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
