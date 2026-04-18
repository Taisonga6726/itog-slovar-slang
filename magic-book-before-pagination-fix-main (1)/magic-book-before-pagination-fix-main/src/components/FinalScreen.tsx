import React from "react";

interface Entry {
  word: string;
  description: string;
  reactions: { fire: number; love: number; rocket: number; laugh: number; like: number };
}

interface FinalScreenProps {
  entries: Entry[];
  onBack: () => void;
}

const FinalScreen: React.FC<FinalScreenProps> = ({ entries, onBack }) => {
  const totalFire = entries.reduce((sum, w) => sum + (w.reactions?.fire || 0), 0);
  const totalLove = entries.reduce((sum, w) => sum + (w.reactions?.love || 0), 0);
  const totalRocket = entries.reduce((sum, w) => sum + (w.reactions?.rocket || 0), 0);
  const totalLaugh = entries.reduce((sum, w) => sum + (w.reactions?.laugh || 0), 0);
  const totalLike = entries.reduce((sum, w) => sum + (w.reactions?.like || 0), 0);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden z-40 scene-fade-in">
      <img
        src="/images/final-screen.png"
        alt="Финальный экран"
        className="absolute w-full h-full object-contain select-none"
        draggable={false}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-48 flex items-center gap-6 text-white pointer-events-none">
        <div className="px-6 py-3 rounded-xl text-lg font-semibold"
             style={{
               background: "linear-gradient(135deg, #22c55e, #4ade80)",
               color: "#022c22",
               boxShadow: "0 0 20px rgba(34,197,94,0.4)"
             }}>
          Всего слов: {entries.length}
        </div>
        <div className="flex items-center gap-5 px-5 py-3 rounded-xl bg-black/30 backdrop-blur-md text-2xl">
          <div>🔥 {totalFire}</div>
          <div>❤️ {totalLove}</div>
          <div>🚀 {totalRocket}</div>
          <div>😂 {totalLaugh}</div>
          <div>👍 {totalLike}</div>
        </div>
      </div>
    </div>
  );
};

export default FinalScreen;