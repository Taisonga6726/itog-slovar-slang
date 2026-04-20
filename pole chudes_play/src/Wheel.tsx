import React, { useRef, useState, useEffect } from 'react';
import { motion, useAnimation } from 'motion/react';
import { CATEGORIES } from './constants';

interface WheelProps {
  onSpinEnd: (categoryId: string) => void;
  isSpinning: boolean;
  setIsSpinning: (val: boolean) => void;
}

export const Wheel: React.FC<WheelProps> = ({ onSpinEnd, isSpinning, setIsSpinning }) => {
  const controls = useAnimation();
  const [rotation, setRotation] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sound effect setup
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'); // Click sound
    audioRef.current.volume = 0.5;
  }, []);

  const spin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const spins = 5 + Math.random() * 5; 
    const extraDegrees = Math.random() * 360;
    const totalRotation = rotation + spins * 360 + extraDegrees;
    
    // Sound effect for clicks (simulated during animation)
    const clickSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
    clickSound.volume = 0.2;

    const startTime = Date.now();
    const duration = 4000;
    let lastClickAngle = 0;

    const playClicks = () => {
        if (!isSpinning) return;
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            // This is a rough estimation of current rotation to play clicks
            // Since we can't easily hook into motion's internal value without Framer Motion's useMotionValue
            // we'll play a series of clicks that slow down
            const progress = elapsed / duration;
            const easedProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic
            const currentAngle = rotation + (totalRotation - rotation) * easedProgress;
            
            if (Math.abs(currentAngle - lastClickAngle) >= (360 / CATEGORIES.length)) {
                clickSound.currentTime = 0;
                clickSound.play().catch(() => {});
                lastClickAngle = currentAngle;
            }
            requestAnimationFrame(playClicks);
        }
    };
    playClicks();

    setRotation(totalRotation);

    await controls.start({
      rotate: totalRotation,
      transition: {
        duration: 4,
        ease: [0.15, 0, 0.15, 1],
      },
    });

    const finalRotation = totalRotation % 360;
    const sectorSize = 360 / CATEGORIES.length;
    
    // Calculate which sector is pointed at the top (top is index 0 usually, but depends on SVG layout)
    // The arrow is at the top (0 deg).
    // The wheel rotates clockwise.
    // If rotation is 0, the first sector (index 0) is at the top.
    // As it rotates clockwise, the top point moves "backwards" through the array.
    // targetIndex = Math.floor((360 - (finalRotation % 360)) / sectorSize) % CATEGORIES.length
    
    const targetIndex = Math.floor(((360 - (finalRotation % 360)) % 360) / sectorSize);
    setIsSpinning(false);
    onSpinEnd(CATEGORIES[targetIndex].id);
  };

  const sectorSize = 360 / CATEGORIES.length;

  return (
    <div className="relative flex flex-col items-center">
      {/* Indicator Arrow - Modern & Glowing */}
      <div className="absolute top-[-30px] z-30 flex flex-col items-center">
        <div className="w-1 h-8 bg-white shadow-[0_0_15px_#fff]" />
        <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[20px] border-t-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
      </div>

      <motion.div
        animate={controls}
        initial={{ rotate: 0 }}
        className="w-[320px] h-[320px] md:w-[600px] md:h-[600px] relative z-10"
      >
        <svg viewBox="-10 -10 120 120" className="w-full h-full transform -rotate-90 filter drop-shadow-[0_0_30px_rgba(147,51,234,0.3)]">
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#bf953f" />
              <stop offset="25%" stopColor="#fcf6ba" />
              <stop offset="50%" stopColor="#b38728" />
              <stop offset="75%" stopColor="#fcf6ba" />
              <stop offset="100%" stopColor="#aa771c" />
            </linearGradient>
            <filter id="textShadow3D">
              <feDropShadow dx="0.4" dy="0.4" stdDeviation="0.1" floodOpacity="0.9" />
            </filter>
            {CATEGORIES.map((cat) => (
              <radialGradient id={`grad-${cat.id}`} key={cat.id}>
                <stop offset="30%" stopColor={cat.color} stopOpacity="1" />
                <stop offset="100%" stopColor={cat.color} stopOpacity="0.3" />
              </radialGradient>
            ))}
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
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
            
            const margin = 2; // small gap between books
            const a1 = (startAngle + margin) * Math.PI / 180;
            const a2 = (endAngle - margin) * Math.PI / 180;
            const am = midAngle * Math.PI / 180;

            // Outer corners
            const x1 = cx + r * Math.cos(a1);
            const y1 = cy + r * Math.sin(a1);
            const x2 = cx + r * Math.cos(a2);
            const y2 = cy + r * Math.sin(a2);
            
            // Mid dip (spine top)
            const xm = cx + (r * 0.9) * Math.cos(am);
            const ym = cy + (r * 0.9) * Math.sin(am);

            // Inner corners
            const ix1 = cx + rInner * Math.cos(a1);
            const iy1 = cy + rInner * Math.sin(a1);
            const ix2 = cx + rInner * Math.cos(a2);
            const iy2 = cy + rInner * Math.sin(a2);
            const ixm = cx + rInner * Math.cos(am);
            const iym = cy + rInner * Math.sin(am);

            // Main Book Body Path (Open Book Shape)
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
              <g key={category.id} className="cursor-pointer group">
                {/* Book Shadow/Depth */}
                <path
                  d={bookPath}
                  fill="rgba(0,0,0,0.5)"
                  transform="translate(0.5, 0.5)"
                />
                {/* Book Cover/Base */}
                <path
                  d={bookPath}
                  fill={`url(#grad-${category.id})`}
                  className="stroke-[#fcf6ba]/20 stroke-[0.3] transition-all duration-300 group-hover:brightness-125"
                  filter="url(#glow)"
                />
                {/* Spine Line (Golden) */}
                <path
                  d={`M ${ixm} ${iym} L ${xm} ${ym}`}
                  stroke="url(#goldGradient)"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                  opacity="0.8"
                />
                {/* Page Highlights */}
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
                  fill="url(#goldGradient)"
                  className="font-black text-[6.5px] uppercase tracking-tighter pointer-events-none"
                  textAnchor="middle"
                  filter="url(#textShadow3D)"
                  style={{ 
                    stroke: '#4a3710', 
                    strokeWidth: '0.08px',
                    paintOrder: 'stroke fill'
                  }}
                >
                  {category.label}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* Ornate Center Point */}
        <div className="absolute top-1/2 left-1/2 w-12 h-12 md:w-16 md:h-16 -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="absolute inset-0 bg-white rounded-full shadow-[0_0_30px_#fff] blur-sm opacity-50" />
            <div className="relative w-full h-full bg-gradient-to-br from-gray-200 to-gray-400 rounded-full border-4 border-white/40 flex items-center justify-center overflow-hidden">
                <div className="w-4 h-4 bg-black rounded-full shadow-inner animate-pulse" />
            </div>
        </div>
      </motion.div>

      <button
        onClick={spin}
        disabled={isSpinning}
        className={`mt-12 px-12 py-5 rounded-2xl text-2xl font-black uppercase transition-all transform hover:scale-105 active:scale-95 z-20 ${
          isSpinning
            ? 'bg-gray-800 text-gray-400 cursor-not-allowed border-2 border-gray-700'
            : 'bg-[#ff00ff] text-white shadow-[0_0_30px_rgba(255,0,255,0.4)] hover:shadow-[0_0_50px_rgba(255,0,255,0.6)] border-b-4 border-pink-700 active:border-b-0 active:translate-y-1'
        }`}
      >
        Крутить барабан
      </button>
    </div>
  );
};
