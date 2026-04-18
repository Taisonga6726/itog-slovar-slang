import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import FloatingWords from "@/components/FloatingWords";
import MagicBook from "@/components/MagicBook";
import FinalBook from "@/components/FinalBook";
import FinalScreen from "@/components/FinalScreen";
import ControlBar from "@/components/ControlBar";
import HeroWave from "@/components/ui/dynamic-wave-canvas-background";
import MagicRingsGlobal from "@/components/MagicRingsGlobal";
import VibeAiBrand from "@/components/VibeAiBrand";
import IntroSlovarEmbed from "@/components/IntroSlovarEmbed";
import { toast } from "@/hooks/use-toast";

interface Entry {
  word: string;
  description: string;
  reactions: { fire: number; love: number; rocket: number; laugh: number; like: number };
  images?: string[];
}

interface PageNav {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"intro" | "form" | "preview" | "reading" | "final">("intro");
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem("magic-book-entries");
    return saved ? JSON.parse(saved) : [];
  });


  const [pageNav, setPageNav] = useState<PageNav | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [activating, setActivating] = useState(false);
  const [introEffect, setIntroEffect] = useState(false);
  
  const flipAudio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    flipAudio.current = new Audio("/page-flip.mp3");
    flipAudio.current.volume = 0.5;
  }, []);

  const playFlipSound = useCallback(() => {
    if (flipAudio.current) {
      flipAudio.current.currentTime = 0;
      flipAudio.current.play().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (entries.length === 0) {
      const existing = localStorage.getItem("magic-book-entries");
      if (existing && existing !== "[]") return;
    }
    localStorage.setItem("magic-book-entries", JSON.stringify(entries));
  }, [entries]);

  /** Вход из SLOVAR_02: детерминированно открываем форму внесения слов (без промежуточного preview). */
  useEffect(() => {
    const entry = searchParams.get("entry");
    const screen = searchParams.get("screen");
    if (entry === "slovar" && screen === "form") {
      setMode("form");
      setVideoFinished(false);
      setIntroEffect(false);
      setFlipping(false);
      setActivating(false);
    }
  }, [searchParams]);

  const handleOpenFormFromIntro = useCallback(() => {
    setMode("form");
    setVideoFinished(false);
    setIntroEffect(false);
    setFlipping(false);
    setActivating(false);
  }, []);

  const handleAddWord = () => {
    setMode("form");
  };

  const handleShare = () => {
    toast({ title: "Функция скоро появится!", description: "Поделиться книгой можно будет в следующем обновлении." });
  };

  const handlePageNav = useCallback((nav: PageNav) => {
    setPageNav(nav);
  }, []);

  const handleOpenBook = useCallback(() => {
    setActivating(true);
    setTimeout(() => {
      playFlipSound();
      setFlipping(true);
      setTimeout(() => {
        setMode("reading");
        setFlipping(false);
        setActivating(false);
      }, 300);
    }, 150);
  }, [playFlipSound]);

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      {mode === "intro" && <IntroSlovarEmbed onOpenForm={handleOpenFormFromIntro} />}

      {/* Preload video and cover image to eliminate black screen / delays */}
      <video src="/videos/book-intro.mp4" preload="auto" className="hidden" />
      <img src="/images/cover-book.png" className="hidden" alt="" />
      <img src="/images/final-screen.png" className="hidden" alt="" />

      {mode !== "intro" && (
        <>
          <img
            src="/images/open-book.png"
            alt=""
            className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-40 select-none pointer-events-none"
            draggable={false}
          />
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-none z-10" />
          <MagicRingsGlobal />
          <HeroWave />
          <FloatingWords />
        </>
      )}

      <div className="relative z-20 w-full h-full">
      {mode === "form" && (
        <MagicBook
          entries={entries}
          setEntries={setEntries}
          onOpenCatalog={() => { setVideoFinished(false); setIntroEffect(false); setMode("preview"); }}
          onFinish={() => setMode("final")}
          onPageNav={handlePageNav}
        />
      )}

      {mode === "preview" && !videoFinished && (
        <div className="fixed inset-0 w-screen h-screen scene-fade-in" style={{ zIndex: 50 }}>
          <video
            key="book-intro-video"
            src="/videos/book-intro.mp4"
            autoPlay
            playsInline
            preload="auto"
            onEnded={() => {
              setVideoFinished(true);
              setTimeout(() => setIntroEffect(true), 50);
            }}
            className="w-full h-full object-contain select-none"
          />
        </div>
      )}

      {mode === "preview" && videoFinished && (
        <div
          className={`fixed inset-0 w-screen h-screen scene-fade-in ${flipping ? "page-flip-anim" : ""}`}
          onClick={() => handleOpenBook()}
          style={{ perspective: "1200px", zIndex: 50, cursor: "pointer" }}
        >
          {introEffect && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              {/* soft central glow */}
              <div className="absolute w-24 h-24 rounded-full bg-yellow-300/30 blur-2xl" />
              {/* spinning particle ring */}
              <div className="absolute w-48 h-48 animate-[spinSlow_3s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_6px_rgba(255,200,50,0.8)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-yellow-200 rounded-full shadow-[0_0_6px_rgba(255,200,50,0.6)]" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-yellow-100 rounded-full shadow-[0_0_6px_rgba(255,200,50,0.6)]" />
                <div className="absolute top-[15%] right-[15%] w-1 h-1 bg-yellow-300/80 rounded-full" />
                <div className="absolute bottom-[15%] left-[15%] w-1 h-1 bg-white/70 rounded-full" />
              </div>
            </div>
          )}
          <img src="/images/cover-book.png" alt="Обложка книги" draggable={false}
               className={`w-full h-full object-contain select-none transition-all duration-500 ${videoFinished ? "opacity-100 scale-100" : "opacity-0 scale-90"} ${activating ? "scale-105" : ""}`}
               style={{ filter: introEffect ? "drop-shadow(0 0 20px rgba(255,200,100,0.6))" : "none" }} />
          {activating && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div className="absolute w-24 h-24 rounded-full bg-white/80 blur-2xl animate-pulse" />
              <div className="absolute w-56 h-56 rounded-full border-2 border-yellow-300/80 animate-ping" />
              <div className="absolute w-72 h-72 rounded-full bg-yellow-200/20 blur-3xl animate-ping" />
            </div>
          )}
        </div>
      )}
      {mode === "reading" && (
        <FinalBook entries={entries} setEntries={setEntries} onBack={() => setMode("form")} onPageNav={handlePageNav} />
      )}

      {mode === "final" && (
        <FinalScreen entries={entries} onBack={() => setMode("form")} />
      )}
      </div>

      {(mode === "reading" || mode === "final") && <VibeAiBrand />}

      {mode !== "intro" && (
        <ControlBar
          mode={mode}
          setMode={setMode}
          onAddWord={handleAddWord}
          onShare={handleShare}
          pageNav={pageNav}
        />
      )}
    </div>
  );
};

export default Index;
