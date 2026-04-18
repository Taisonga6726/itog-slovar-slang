import { useCallback, useRef, useEffect, useState } from "react";
import bookFinalImg from "@/assets/book.png";
import SpineEffect from "./SpineEffect";
import FinalBookMagicFX from "./FinalBookMagicFX";

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

interface FinalBookProps {
  entries: Entry[];
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  onBack: () => void;
  onPageNav?: (nav: PageNav) => void;
}

const FinalBook = ({ entries, setEntries, onBack, onPageNav }: FinalBookProps) => {
  const flipAudio = useRef<HTMLAudioElement | null>(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [pages, setPages] = useState<Entry[][]>([]);
  const leftContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    flipAudio.current = new Audio("/page-flip.mp3");
    flipAudio.current.volume = 0.5;
  }, []);

  // Dynamic pagination — measure entry heights like MagicBook
  useEffect(() => {
    if (entries.length === 0) {
      setPages([]);
      return;
    }

    const container = leftContentRef.current;
    if (!container) return;
    let cancelled = false;

    (async () => {
      const availableHeight = container.clientHeight - 20;
      const measureWidth = container.offsetWidth;
      const measure = document.createElement("div");
      measure.style.cssText = `position:absolute;visibility:hidden;width:${measureWidth}px;font-family:'Cormorant Garamond',serif;padding:0;`;
      container.appendChild(measure);

      const result: Entry[][] = [[]];
      let currentHeight = 0;

      for (let i = 0; i < entries.length; i++) {
        const wrap = document.createElement("div");
        wrap.style.cssText = "margin-bottom:0.6em;width:100%";

        const title = document.createElement("div");
        title.style.cssText = "font-size:1.25rem;font-weight:700;line-height:1.15;font-style:italic;text-align:left";
        title.textContent = `${i + 1}. ${entries[i].word}`;
        wrap.appendChild(title);

        if (entries[i].description) {
          const desc = document.createElement("div");
          desc.style.cssText = "font-size:1rem;line-height:1.15;text-align:left";
          desc.textContent = `— ${entries[i].description.replace(/^[—–-]\s*/, "")}`;
          wrap.appendChild(desc);
        }

        (entries[i].images ?? []).forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.style.cssText = "display:block;max-width:100%;height:auto;margin:8px 0";
          wrap.appendChild(img);
        });

        const reactions = document.createElement("div");
        reactions.style.cssText = "font-size:13px;text-align:right";
        reactions.textContent = "🔥 0 ❤️ 0 🚀 0 😂 0 👍 0";
        wrap.appendChild(reactions);

        measure.innerHTML = "";
        measure.appendChild(wrap);

        const imgs = Array.from(measure.querySelectorAll("img"));
        await Promise.all(imgs.map((img) =>
          (img as HTMLImageElement).decode
            ? (img as HTMLImageElement).decode().catch(() => {})
            : new Promise<void>((r) => {
                if ((img as HTMLImageElement).complete) r();
                else { img.onload = () => r(); img.onerror = () => r(); }
              })
        ));

        if (cancelled) return;
        const h = measure.offsetHeight;

        if (currentHeight + h > availableHeight && result[result.length - 1].length > 0) {
          result.push([entries[i]]);
          currentHeight = h;
        } else {
          result[result.length - 1].push(entries[i]);
          currentHeight += h;
        }
      }

      if (cancelled) return;
      container.removeChild(measure);
      setPages(result);
    })();

    return () => { cancelled = true; };
  }, [entries]);

  // Always open the book from the first spread (first entered word)
  useEffect(() => {
    setCurrentSpread(0);
  }, []);

  const playFlipSound = useCallback(() => {
    if (flipAudio.current) {
      flipAudio.current.currentTime = 0;
      flipAudio.current.play().catch(() => {});
    }
  }, []);

  const totalSpreads = Math.max(1, Math.ceil(pages.length / 2));

  // Wire page nav to ControlBar
  useEffect(() => {
    onPageNav?.({
      hasPrev: currentSpread > 0,
      hasNext: currentSpread < totalSpreads - 1,
      onPrev: () => { playFlipSound(); setCurrentSpread(s => s - 1); },
      onNext: () => { playFlipSound(); setCurrentSpread(s => s + 1); },
    });
  }, [currentSpread, totalSpreads, onPageNav, playFlipSound]);

  const handleBack = useCallback(() => {
    playFlipSound();
    setTimeout(() => onBack(), 400);
  }, [playFlipSound, onBack]);

  const renderInkWord = (text: string) => (
    <span>
      {text.split("").map((ch, i) => (
        <span key={i} style={{ opacity: 0.85 + Math.random() * 0.15 }}>{ch}</span>
      ))}
    </span>
  );

  const updateReaction = useCallback((globalIdx: number, type: "fire" | "love" | "rocket" | "laugh" | "like") => {
    setEntries((prev) =>
      prev.map((w, i) =>
        i === globalIdx ? { ...w, reactions: { ...w.reactions, [type]: (w.reactions?.[type] || 0) + 1 } } : w
      )
    );
  }, [setEntries]);

  // Get global index for an entry
  const getGlobalIndex = (entry: Entry) => entries.indexOf(entry);

  const leftPageIdx = currentSpread * 2;
  const rightPageIdx = currentSpread * 2 + 1;
  const leftPageEntries = pages[leftPageIdx] || [];
  const rightPageEntries = pages[rightPageIdx] || [];
  const leftPageNum = leftPageIdx + 1;
  const rightPageNum = rightPageIdx + 1;

  const renderEntry = (entry: Entry, globalIdx: number) => (
    <div key={globalIdx} className="w-full" style={{ marginBottom: "0.6em" }}>
      <div
        className="text-xl font-bold w-full"
        style={{
          color: "#1a1440",
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          lineHeight: "1.15",
          textAlign: "left",
        }}
      >
        <span style={{ fontWeight: 700 }}>{globalIdx + 1}.</span> {renderInkWord(entry.word)}
      </div>
      {entry.description && (
        <div
          className="text-base font-handwriting w-full"
          style={{ color: "#1a1030", textAlign: "left", lineHeight: "1.15" }}
        >
          — {entry.description.replace(/^[—–-]\s*/, "")}
        </div>
      )}
      {entry.images?.map((src, k) => (
        <img key={k} src={src} alt="" style={{ display: "block", maxWidth: "100%", height: "auto", margin: "8px 0" }} />
      ))}
      <div className="flex gap-2 text-[13px] w-full justify-end" style={{ color: "#1a1440" }}>
        <button type="button" onClick={() => updateReaction(globalIdx, "fire")} className="cursor-pointer hover:scale-110 transition-transform">🔥 {entry.reactions?.fire || 0}</button>
        <button type="button" onClick={() => updateReaction(globalIdx, "love")} className="cursor-pointer hover:scale-110 transition-transform">❤️ {entry.reactions?.love || 0}</button>
        <button type="button" onClick={() => updateReaction(globalIdx, "rocket")} className="cursor-pointer hover:scale-110 transition-transform">🚀 {entry.reactions?.rocket || 0}</button>
        <button type="button" onClick={() => updateReaction(globalIdx, "laugh")} className="cursor-pointer hover:scale-110 transition-transform">😂 {entry.reactions?.laugh || 0}</button>
        <button type="button" onClick={() => updateReaction(globalIdx, "like")} className="cursor-pointer hover:scale-110 transition-transform">👍 {entry.reactions?.like || 0}</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden z-40">
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="relative w-full h-full scene-fade-in" style={{ transform: "translateY(-3%)" }}>
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ boxShadow: "inset 0 0 150px 80px rgba(0,0,0,0.9)", borderRadius: "8px" }}
          />
          <img
            src={bookFinalImg}
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          <FinalBookMagicFX />

          <SpineEffect burst={false} />

          {/* Left page */}
          <div
            ref={leftContentRef}
            className="absolute z-20 overflow-hidden pointer-events-auto flex flex-col gap-0"
            style={{
               left: "20%", top: "19%", width: "26%", height: "60%",
               padding: "8px 2px 20px 2px",
            }}
          >
            {leftPageEntries.map((entry) => renderEntry(entry, getGlobalIndex(entry)))}
            <div className="absolute bottom-[4px] left-0 right-0 flex justify-center select-none"
                 style={{ color: "#0f0a2a", fontFamily: "'Cormorant Garamond', serif", fontWeight: "bold", fontStyle: "italic", fontSize: "16px", opacity: 0.9, letterSpacing: "1px" }}>
              — {leftPageNum} —
            </div>
          </div>

          {/* Right page */}
          <div
            className="absolute z-20 overflow-hidden pointer-events-auto flex flex-col gap-0"
            style={{
              left: "54%", top: "19%", width: "26%", height: "60%",
              padding: "8px 4px 20px 4px",
            }}
          >
            {rightPageEntries.map((entry) => renderEntry(entry, getGlobalIndex(entry)))}
            {rightPageEntries.length > 0 && (
              <div className="absolute bottom-[4px] left-0 right-0 flex justify-center select-none"
                   style={{ color: "#0f0a2a", fontFamily: "'Cormorant Garamond', serif", fontWeight: "bold", fontStyle: "italic", fontSize: "16px", opacity: 0.9, letterSpacing: "1px" }}>
                — {rightPageNum} —
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalBook;
