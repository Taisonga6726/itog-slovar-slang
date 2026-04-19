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

/** Сдвиг влево для N-й строки на странице (0…) — выпрямляет «лесенку» на текстуре финальной книги */
const FINAL_ROW_NUDGE_PX = [2, 7, 12, 17, 22] as const;
function finalRowNudgePx(localIndex: number): number {
  return FINAL_ROW_NUDGE_PX[Math.min(Math.max(0, localIndex), FINAL_ROW_NUDGE_PX.length - 1)];
}

interface FinalBookProps {
  entries: Entry[];
  setEntries: React.Dispatch<React.SetStateAction<Entry[]>>;
  onBack: () => void;
  onPageNav?: (nav: PageNav) => void;
}

const FinalBook = ({ entries, setEntries, onBack, onPageNav }: FinalBookProps) => {
  const ENTRY_IMAGE_MAX_HEIGHT = 112;
  /** Жёсткая колонка номера (minmax фиксирует ширину трека) + tabular-nums — одна вертикаль для начала слов */
  const ENTRY_GRID_COLS = "minmax(4.75rem, 4.75rem) minmax(0, 1fr)";
  const requestMusicDuck = useCallback((holdMs = 1000) => {
    window.dispatchEvent(new CustomEvent("magicbook:duck-audio", { detail: { holdMs } }));
  }, []);

  const flipAudio = useRef<HTMLAudioElement | null>(null);
  const [currentSpread, setCurrentSpread] = useState(0);
  const [pages, setPages] = useState<Entry[][]>([]);
  const leftContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    flipAudio.current = new Audio("/page-flip.mp3");
    flipAudio.current.volume = 0.92;
  }, []);

  // Dynamic pagination вЂ” measure entry heights like MagicBook
  useEffect(() => {
    if (entries.length === 0) {
      setPages([]);
      return;
    }

    const container = leftContentRef.current;
    if (!container) return;
    let cancelled = false;

    (async () => {
      // Безопасный нижний резерв: не допускаем обрезку последней строки/реакций у корешка книги.
      const availableHeight = container.clientHeight - 78;
      const measureWidth = container.clientWidth;
      const measure = document.createElement("div");
      measure.style.cssText = `position:absolute;visibility:hidden;width:${measureWidth}px;font-family:'Cormorant Garamond',serif;padding:0;`;
      container.appendChild(measure);

      const result: Entry[][] = [[]];
      let currentHeight = 0;

      const decodeImagesInMeasure = async () => {
        const imgs = Array.from(measure.querySelectorAll("img"));
        await Promise.all(imgs.map((img) =>
          (img as HTMLImageElement).decode
            ? (img as HTMLImageElement).decode().catch(() => {})
            : new Promise<void>((r) => {
                if ((img as HTMLImageElement).complete) r();
                else {
                  const el = img as HTMLImageElement;
                  el.onload = () => r();
                  el.onerror = () => r();
                }
              })
        ));
      };

      const appendEntryDom = (entryIndex: number, localIndex: number) => {
        const wrap = document.createElement("div");
        const nudge = finalRowNudgePx(localIndex);
        wrap.style.cssText = `margin-bottom:0.28em;width:100%;box-sizing:border-box;display:grid;grid-template-columns:${ENTRY_GRID_COLS};column-gap:0.4rem;align-items:start;justify-items:stretch;contain:layout;transform:translateX(-${nudge}px)`;

        const numCell = document.createElement("div");
        numCell.style.cssText =
          "font-size:1.25rem;font-weight:700;line-height:1.14;font-style:italic;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;font-family:'Cormorant Garamond',serif;color:#120c34";
        numCell.textContent = `${entryIndex + 1}.`;
        wrap.appendChild(numCell);

        const body = document.createElement("div");
        body.style.cssText = "min-width:0;direction:ltr;unicode-bidi:plaintext";

        const title = document.createElement("div");
        title.style.cssText =
          "font-size:1.25rem;font-weight:700;line-height:1.14;font-style:italic;text-align:left;overflow-wrap:anywhere;word-break:break-word;font-family:'Cormorant Garamond',serif;color:#120c34";
        title.textContent = entries[entryIndex].word;
        body.appendChild(title);

        if (entries[entryIndex].description) {
          const desc = document.createElement("div");
          desc.style.cssText = "font-size:1rem;line-height:1.14;text-align:left;overflow-wrap:anywhere;word-break:break-word";
          desc.textContent = `— ${entries[entryIndex].description.replace(/^[—-]\s*/, "").replace(/\s+/g, " ").trim()}`;
          body.appendChild(desc);
        }

        (entries[entryIndex].images ?? []).forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.style.cssText = `display:block;max-width:100%;max-height:${ENTRY_IMAGE_MAX_HEIGHT}px;height:auto;object-fit:contain;margin:3px 0`;
          body.appendChild(img);
        });

        const reactions = document.createElement("div");
        reactions.style.cssText = "display:flex;justify-content:flex-end;gap:4px;flex-wrap:wrap;font-size:13px;line-height:1.05;color:#1a1440";
        reactions.textContent = `🔥 ${entries[entryIndex].reactions?.fire || 0}  ❤️ ${entries[entryIndex].reactions?.love || 0}  🚀 ${entries[entryIndex].reactions?.rocket || 0}  😂 ${entries[entryIndex].reactions?.laugh || 0}  👍 ${entries[entryIndex].reactions?.like || 0}`;
        body.appendChild(reactions);

        wrap.appendChild(body);
        return wrap;
      };

      const mountAndMeasure = async (entryIndex: number, localIndex: number) => {
        measure.innerHTML = "";
        measure.appendChild(appendEntryDom(entryIndex, localIndex));
        await decodeImagesInMeasure();
        if (cancelled) return 0;
        return measure.offsetHeight;
      };

      for (let i = 0; i < entries.length; i++) {
        const tail = result[result.length - 1];
        const localIdx = tail.length;

        let h = await mountAndMeasure(i, localIdx);
        if (cancelled) return;

        if (currentHeight + h > availableHeight && tail.length > 0) {
          h = await mountAndMeasure(i, 0);
          if (cancelled) return;
          result.push([entries[i]]);
          currentHeight = h;
        } else {
          tail.push(entries[i]);
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
    requestMusicDuck(1100);
    if (flipAudio.current) {
      flipAudio.current.currentTime = 0;
      flipAudio.current.play().catch(() => {});
    }
  }, [requestMusicDuck]);

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

  // Get global index for an entry
  const getGlobalIndex = (entry: Entry) => entries.indexOf(entry);

  const updateReaction = useCallback((globalIdx: number, type: "fire" | "love" | "rocket" | "laugh" | "like") => {
    setEntries((prev) =>
      prev.map((w, i) =>
        i === globalIdx ? { ...w, reactions: { ...w.reactions, [type]: (w.reactions?.[type] || 0) + 1 } } : w
      )
    );
  }, [setEntries]);

  const leftPageIdx = currentSpread * 2;
  const rightPageIdx = currentSpread * 2 + 1;
  const leftPageEntries = pages[leftPageIdx] || [];
  const rightPageEntries = pages[rightPageIdx] || [];

  const descText = (raw: string) => raw.replace(/^[—-]\s*/, "").replace(/\s+/g, " ").trim();

  const renderEntry = (entry: Entry, globalIdx: number, localIdx: number) => (
    <div
      key={globalIdx}
      className="w-full box-border"
      style={{
        marginBottom: "0.28em",
        display: "grid",
        gridTemplateColumns: ENTRY_GRID_COLS,
        columnGap: "0.4rem",
        alignItems: "start",
        justifyItems: "stretch",
        contain: "layout",
        transform: `translateX(-${finalRowNudgePx(localIdx)}px)`,
      }}
    >
      <div
        className="text-xl tabular-nums whitespace-nowrap box-border min-w-0 w-full"
        style={{
          color: "#120c34",
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: "italic",
          lineHeight: "1.12",
          fontWeight: 800,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          justifySelf: "stretch",
        }}
      >
        {globalIdx + 1}.
      </div>
      <div style={{ minWidth: 0, direction: "ltr", unicodeBidi: "plaintext" }}>
        <div
          className="text-xl w-full"
          style={{
            color: "#120c34",
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            lineHeight: "1.12",
            textAlign: "left",
            fontWeight: 800,
            overflowWrap: "anywhere",
            wordBreak: "break-word",
            whiteSpace: "normal",
            wordSpacing: "normal",
          }}
        >
          {entry.word}
        </div>
        {entry.description && (
          <div
            className="text-base font-handwriting w-full"
            style={{
              color: "#1a103a",
              textAlign: "left",
              lineHeight: "1.14",
              fontWeight: 600,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              whiteSpace: "normal",
              wordSpacing: "normal",
            }}
          >
            — {descText(entry.description)}
          </div>
        )}
        {entry.images?.map((src, k) => (
          <img key={k} src={src} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: ENTRY_IMAGE_MAX_HEIGHT, height: "auto", objectFit: "contain", margin: "3px 0 0 0" }} />
        ))}
        <div className="flex gap-1 text-[13px] w-full justify-end flex-wrap mt-0" style={{ color: "#1a1440", lineHeight: 1.05 }}>
          <button type="button" onClick={() => updateReaction(globalIdx, "fire")} className="cursor-pointer hover:scale-110 transition-transform">🔥 {entry.reactions?.fire || 0}</button>
          <button type="button" onClick={() => updateReaction(globalIdx, "love")} className="cursor-pointer hover:scale-110 transition-transform">❤️ {entry.reactions?.love || 0}</button>
          <button type="button" onClick={() => updateReaction(globalIdx, "rocket")} className="cursor-pointer hover:scale-110 transition-transform">🚀 {entry.reactions?.rocket || 0}</button>
          <button type="button" onClick={() => updateReaction(globalIdx, "laugh")} className="cursor-pointer hover:scale-110 transition-transform">😂 {entry.reactions?.laugh || 0}</button>
          <button type="button" onClick={() => updateReaction(globalIdx, "like")} className="cursor-pointer hover:scale-110 transition-transform">👍 {entry.reactions?.like || 0}</button>
        </div>
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
               left: "21.52%", top: "20.35%", width: "22.8%", height: "54.9%",
               padding: "10px 7px 22px 50px",
               boxSizing: "border-box",
               overflowWrap: "break-word", wordBreak: "break-word",
            }}
          >
            {leftPageEntries.map((entry, i) => renderEntry(entry, getGlobalIndex(entry), i))}
          </div>

          {/* Right page */}
          <div
            className="absolute z-20 overflow-hidden pointer-events-auto flex flex-col gap-0"
            style={{
              left: "50.72%", top: "20.35%", width: "22.35%", height: "54.9%",
              padding: "10px 26px 22px 0px",
              boxSizing: "border-box",
              overflowWrap: "break-word", wordBreak: "break-word",
            }}
          >
            {rightPageEntries.map((entry, i) => renderEntry(entry, getGlobalIndex(entry), i))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalBook;

