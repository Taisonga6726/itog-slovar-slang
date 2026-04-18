import { useEffect, useRef } from "react";
import { initGlobalMagicRings } from "@/lib/magicRingsGlobal";

/**
 * Полноэкранные неоновые кольца у курсора — тот же эффект, что `tzGlobalMagicRings` в SLOVAR_02.
 */
export default function MagicRingsGlobal() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    return initGlobalMagicRings(container, canvas, { burstImpulse: 1.45 });
  }, []);

  return (
    <div
      ref={containerRef}
      id="mbGlobalMagicRings"
      className="magic-rings-fx magic-rings-fx--global magic-rings-fx--global--visible"
      aria-hidden
    >
      <canvas ref={canvasRef} id="mbGlobalMagicRingsCanvas" width={300} height={200} />
    </div>
  );
}
