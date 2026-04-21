import { useEffect, useRef } from "react";
import { initGlobalMagicRings } from "@/lib/magicRingsGlobal";
import { cn } from "@/lib/utils";

type MagicRingsGlobalProps = {
  /** Доп. классы (например слой поверх фона панели гимна). */
  className?: string;
  /** Уникальные id для второго экземпляра (иначе дубль в DOM). */
  containerId?: string;
  canvasId?: string;
};

/**
 * Полноэкранные неоновые кольца у курсора — тот же эффект, что `tzGlobalMagicRings` в SLOVAR_02.
 */
export default function MagicRingsGlobal({
  className,
  containerId = "mbGlobalMagicRings",
  canvasId = "mbGlobalMagicRingsCanvas",
}: MagicRingsGlobalProps) {
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
      id={containerId}
      className={cn("magic-rings-fx magic-rings-fx--global magic-rings-fx--global--visible", className)}
      aria-hidden
    >
      <canvas ref={canvasRef} id={canvasId} width={300} height={200} />
    </div>
  );
}
