import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import LuckyWheelGame from "@/components/lucky-wheel/LuckyWheelGame";

/**
 * Вариант B: отдельный URL `/luck` — для сдачи ДЗ только игрой (деплой: открыть baseURL/luck).
 */
export default function LuckyWheelPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0 z-0 flex items-end justify-center">
        <img
          src="/images/fon-dlya-gimn.png"
          alt=""
          className="h-auto max-h-[100dvh] w-full max-w-[min(1600px,100vw)] select-none object-contain object-bottom"
          draggable={false}
        />
      </div>
      <MagicRingsGlobal
        className="magic-rings-fx--luck-page"
        containerId="mbLuckyPageMagicRings"
        canvasId="mbLuckyPageMagicRingsCanvas"
      />
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[min(1240px,96vw)] flex-col items-center px-3 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))] sm:px-6">
        <LuckyWheelGame variant="page" />
      </div>
    </div>
  );
}
