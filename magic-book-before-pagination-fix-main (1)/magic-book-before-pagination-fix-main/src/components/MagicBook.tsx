import { useState, useCallback, useRef, useEffect, Dispatch, SetStateAction } from "react";
import bookImg from "@/assets/book.png";
import SpineEffect from "./SpineEffect";
import InkWriteEffect from "./InkWriteEffect";

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

interface MagicBookProps {
  entries: Entry[];
  setEntries: Dispatch<SetStateAction<Entry[]>>;
  onOpenCatalog: () => void;
  onFinish: () => void;
  onPageNav?: (nav: PageNav) => void;
}

const MagicBook = ({ entries, setEntries, onOpenCatalog, onFinish, onPageNav }: MagicBookProps) => {
  const [word, setWord] = useState("");
  const [description, setDescription] = useState("");
  const [pastedImages, setPastedImages] = useState<string[]>([]);

  const entriesRef = useRef(entries);
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  const [burst, setBurst] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);
  const [showDuplicateOverlay, setShowDuplicateOverlay] = useState(false);
  const [showFinishOverlay, setShowFinishOverlay] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [pageBreaks, setPageBreaks] = useState<number[]>([0]);

  const penAudio = useRef<HTMLAudioElement | null>(null);
  const flipAudio = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<number | null>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const wordInputRef = useRef<HTMLInputElement>(null);
  const rightContentRef = useRef<HTMLDivElement>(null);
  const prevPageBreaksLen = useRef(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      wordInputRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(t);
  }, []);

  const playPenSound = useCallback(() => {
    if (!penAudio.current) {
      penAudio.current = new Audio("/pen-scratch.mp3");
      penAudio.current.volume = 0.3;
    }
    if (penAudio.current.paused) {
      penAudio.current.currentTime = 0;
      penAudio.current.play().catch(() => {});
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = window.setTimeout(() => {
      penAudio.current?.pause();
    }, 1000);
  }, []);

  const playFlipSound = useCallback(() => {
    if (!flipAudio.current) {
      flipAudio.current = new Audio("/page-flip.mp3");
      flipAudio.current.volume = 0.5;
    }
    flipAudio.current.currentTime = 0;
    flipAudio.current.play().catch(() => {});
  }, []);

  // Compute current page entries from pageBreaks
  const currentPageStart = pageBreaks[currentPage] ?? 0;
  const currentPageEnd = pageBreaks[currentPage + 1] ?? entries.length;
  const pageEntries = entries.slice(currentPageStart, currentPageEnd);
  const totalPages = pageBreaks.length;
  const hasNextPage = currentPage < totalPages - 1;
  const isLastPage = currentPage === totalPages - 1;
  const hasPrevPage = currentPage > 0;

  const handleFlipNext = useCallback(() => {
    if (flipping || !hasNextPage) return;
    playFlipSound();
    setFlipping(true);
    setTimeout(() => {
      setCurrentPage((p) => p + 1);
      setFlipping(false);
    }, 1000);
  }, [flipping, hasNextPage, playFlipSound]);

  const handleFlipPrev = useCallback(() => {
    if (flipping || currentPage === 0) return;
    playFlipSound();
    setFlipping(true);
    setTimeout(() => {
      setCurrentPage((p) => p - 1);
      setFlipping(false);
    }, 1000);
  }, [flipping, currentPage, playFlipSound]);

  useEffect(() => {
    onPageNav?.({
      hasPrev: hasPrevPage,
      hasNext: hasNextPage,
      onPrev: handleFlipPrev,
      onNext: handleFlipNext,
    });
  }, [hasPrevPage, hasNextPage, onPageNav, handleFlipPrev, handleFlipNext]);
  useEffect(() => {
    if (entries.length === 0) {
      setPageBreaks([0]);
      prevPageBreaksLen.current = 1;
      return;
    }

    const container = rightContentRef.current;
    if (!container) return;
    let cancelled = false;

    (async () => {
      const availableHeight = container.clientHeight;

      const measure = document.createElement("div");
      measure.style.cssText = `position:absolute;visibility:hidden;width:${container.offsetWidth}px;font-family:inherit;padding:0;`;
      container.appendChild(measure);

      const breaks: number[] = [0];
      let currentHeight = 0;

      for (let i = 0; i < entries.length; i++) {
        const wrap = document.createElement("div");
        wrap.style.cssText = "margin-bottom:0.6em";

        const title = document.createElement("div");
        title.style.cssText = "font-size:1.25rem;font-weight:700;line-height:1.15;text-align:justify;font-style:italic";
        title.textContent = `${i + 1}. ${entries[i].word}`;
        wrap.appendChild(title);

        if (entries[i].description) {
          const desc = document.createElement("div");
          desc.style.cssText = "font-size:1rem;line-height:1.15;text-align:justify";
          desc.textContent = `— ${entries[i].description.replace(/^[—–-]\s*/, "")}`;
          wrap.appendChild(desc);
        }

        (entries[i].images ?? []).forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.style.cssText = "display:block;max-width:100%;height:auto;margin:8px 0";
          wrap.appendChild(img);
        });

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

        if (currentHeight + h > availableHeight && i > breaks[breaks.length - 1]) {
          breaks.push(i);
          currentHeight = h;
        } else {
          currentHeight += h;
        }
      }

      if (cancelled) return;
      container.removeChild(measure);

      const oldLen = prevPageBreaksLen.current;
      prevPageBreaksLen.current = breaks.length;
      setPageBreaks(breaks);

      if (breaks.length > oldLen && oldLen > 0) {
        playFlipSound();
        setFlipping(true);
        setTimeout(() => {
          setCurrentPage(breaks.length - 1);
          setFlipping(false);
        }, 1000);
      } else {
        setCurrentPage(breaks.length - 1);
      }
    })();

    return () => { cancelled = true; };
  }, [entries, playFlipSound]);

  const handleSave = useCallback(() => {
    if (!word.trim()) return;

    // Duplicate check (only for new entries)
    if (editIdx === null) {
      const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-zа-яё0-9]/gi, "");
      const isDuplicate = entriesRef.current.some(
        (e) => normalize(e.word) === normalize(word)
      );
      if (isDuplicate) {
        setShowDuplicateOverlay(true);
        setTimeout(() => setShowDuplicateOverlay(false), 1500);
        return;
      }
    }

    if (editIdx !== null) {
      setEntries((prev) => {
        const copy = [...prev];
        copy[editIdx] = { ...copy[editIdx], word: word.trim(), description: description.trim().replace(/^[—–-]\s*/, ""), images: pastedImages };
        return copy;
      });
      setEditIdx(null);
    } else {
      setEntries((prev) => [
        ...prev,
        { word: word.trim(), description: description.trim().replace(/^[—–-]\s*/, ""), reactions: { fire: 0, love: 0, rocket: 0, laugh: 0, like: 0 }, images: pastedImages },
      ]);
    }

    setBurst(false);
    requestAnimationFrame(() => setBurst(true));
    setTimeout(() => setBurst(false), 1200);

    setWord("");
    setDescription("");
    setPastedImages([]);

    setShowSavedOverlay(true);
    setTimeout(() => setShowSavedOverlay(false), 1500);
  }, [word, description, editIdx, pastedImages, setEntries]);

  const handleEdit = useCallback(() => {
    if (entries.length === 0) return;
    const lastIdx = entries.length - 1;
    const entry = entries[lastIdx];
    setWord(entry.word);
    setDescription(entry.description);
    setPastedImages(entry.images ?? []);
    setEditIdx(lastIdx);
    setTimeout(() => descRef.current?.focus(), 50);
  }, [entries]);

  const handleDescPaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageItems: DataTransferItem[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) imageItems.push(items[i]);
    }
    if (imageItems.length === 0) return;
    e.preventDefault();
    imageItems.forEach((it) => {
      const file = it.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          setPastedImages((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, []);


  const handleFinish = useCallback(() => {
    if (fadingOut || flipping) return;
    setShowFinishOverlay(true);
    setTimeout(() => {
      setFlipping(true);
      playFlipSound();
      setBurst(false);
      requestAnimationFrame(() => setBurst(true));
      setTimeout(() => setFadingOut(true), 600);
      setTimeout(() => onFinish(), 1500);
    }, 400);
  }, [fadingOut, flipping, playFlipSound, onFinish]);

  const liveText = word ? (description ? `${word} — ${description}` : word) : "";

  return (
    <div className={`fixed inset-0 w-screen h-screen overflow-hidden z-40 ${fadingOut ? "scene-fade-out" : ""}`}>
      <div className="relative w-full h-full flex items-center justify-center">
      <div className="relative w-full h-full" style={{ transform: "translateY(-3%)" }}>
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{ boxShadow: "inset 0 0 150px 80px rgba(0,0,0,0.9)", borderRadius: "8px" }}
      />
      <img
        src={bookImg}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />

      <SpineEffect burst={burst} />

      {/* Left page — input (поверх правой страницы: иначе правая перекрывает поля ввода) */}
      <div
        className="absolute z-[25] font-handwriting no-scroll"
        style={{
          left: "18%",
          top: "20%",
          width: "30%",
          height: "58%",
          padding: "10px 14px 40px 24px",
          overflow: "hidden",
        }}
      >
        <input
          id="magicBookWord"
          ref={wordInputRef}
          type="text"
          value={word}
          onChange={(e) => { setWord(e.target.value); playPenSound(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); descRef.current?.focus(); } }}
          placeholder="Слово"
          aria-label="Слово"
          className="magic-input w-full text-2xl font-semibold font-handwriting mb-4 text-ink"
        />

        <div className="writing-zone rounded-sm mt-2" style={{ minHeight: "55%" }}>
          <textarea
            id="magicBookDesc"
            ref={descRef}
            value={description}
            onChange={(e) => { setDescription(e.target.value); playPenSound(); }}
            onPaste={handleDescPaste}
            placeholder="Описание…"
            aria-label="Описание"
            className="magic-textarea w-full h-full font-handwriting text-lg notebook-lines"
            style={{ minHeight: "160px", lineHeight: "22px" }}
          />
        </div>

        {pastedImages.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pastedImages.map((src, k) => (
              <div key={k} style={{ position: "relative" }}>
                <img src={src} alt="" style={{ display: "block", maxHeight: 64, width: "auto", borderRadius: 4 }} />
                <button
                  type="button"
                  onClick={() => setPastedImages((prev) => prev.filter((_, idx) => idx !== k))}
                  aria-label="Удалить изображение"
                  style={{
                    position: "absolute", top: -6, right: -6, width: 18, height: 18,
                    borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff",
                    border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1, padding: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >×</button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-1 flex justify-center items-center gap-2">
          <span className="action-text cursor-pointer font-handwriting text-base font-medium" onClick={handleSave}>сохранить</span>
          <span className="font-handwriting text-base font-medium" style={{ color: "hsl(var(--ink) / 0.3)" }}>|</span>
          <span className="action-text cursor-pointer font-handwriting text-base font-medium" onClick={handleEdit}>редактировать</span>
        </div>

        {showSavedOverlay && (
          <div className="mt-2 flex justify-center pointer-events-none">
            <div className="word-saved-overlay">
              <span className="word-saved-text" style={{
                color: "#22c55e",
                fontWeight: 800,
                textShadow: "0 0 8px rgba(34,197,94,0.6), 0 0 20px rgba(34,197,94,0.3)",
              }}>СЛОВО ВНЕСЕНО!</span>
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="word-saved-spark"
                  style={{
                    left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
                    top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
                    animationDelay: `${i * 0.05}s`,
                    background: "#22c55e",
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {showDuplicateOverlay && (
          <div className="mt-2 flex justify-center pointer-events-none">
            <div className="word-saved-overlay">
              <span className="word-saved-text" style={{
                color: "#ef4444",
                fontWeight: 800,
                fontSize: "0.85rem",
                textShadow: "0 0 8px rgba(239,68,68,0.6), 0 0 20px rgba(239,68,68,0.3)",
              }}>СЛОВО ЕСТЬ УЖЕ В СЛОВАРЕ!</span>
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className="word-saved-spark"
                  style={{
                    left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
                    top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
                    animationDelay: `${i * 0.05}s`,
                    background: "#ef4444",
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right page — results */}
      <div
        className="absolute z-[15] font-handwriting no-scroll"
        style={{
          left: "54%",
          top: "18%",
          width: "26%",
          height: "60%",
          padding: "12px 2px 40px 4px",
          overflow: "hidden", overflowWrap: "break-word", wordBreak: "break-word",
          perspective: "1200px",
        }}
      >
        <div ref={rightContentRef} style={{ height: "100%", overflow: "hidden" }}>
          <div className={flipping ? "page-flip-anim" : ""} style={{ transformOrigin: "left center" }}>
            {pageEntries.length === 0 && !liveText ? (
              <p className="font-handwriting text-xl mt-8 text-center" style={{ color: "hsl(var(--ink) / 0.25)" }}>
                Здесь появятся ваши записи…
              </p>
            ) : (
              <div>
                {pageEntries.map((entry, i) => {
                  const globalIdx = currentPageStart + i;
                  if (editIdx === globalIdx && liveText) return null;

                  return (
                    <div key={globalIdx} className="text-ink" style={{ marginBottom: "0.6em" }}>
                      <div className="text-xl leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#1a1440", textShadow: "0 0 2px rgba(20,10,50,0.15)", textAlign: "justify", lineHeight: "1.15" }}>
                        <span className="font-bold">{globalIdx + 1}.</span> {entry.word}
                      </div>
                      {entry.description && (
                        <div className="font-handwriting text-base" style={{ color: "#2a1f5a", textAlign: "justify", lineHeight: "1.15" }}>
                          — {entry.description.replace(/^[—–-]\s*/, "")}
                        </div>
                      )}
                      {entry.images?.map((src, k) => (
                        <img key={k} src={src} alt="" style={{ display: "block", maxWidth: "100%", height: "auto", margin: "8px 0" }} />
                      ))}
                    </div>
                  );
                })}

                {isLastPage && liveText && (
                  <div className="text-ink" style={{ marginBottom: "0.6em" }}>
                    <div className="text-xl leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#1a1440", textShadow: "0 0 2px rgba(20,10,50,0.15)", textAlign: "justify", lineHeight: "1.15" }}>
                      <span className="font-bold">{editIdx !== null ? editIdx + 1 : entries.length + 1}.</span>{" "}
                      <InkWriteEffect text={word} className="ink-fresh" />
                    </div>
                    {description && (
                      <div className="font-handwriting text-base ink-fresh" style={{ color: "#2a1f5a", textAlign: "justify", lineHeight: "1.15" }}>
                        — <InkWriteEffect text={description} className="" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation buttons hidden — managed by ControlBar */}

      {/* "КНИГА СОЗДАНА ✦" overlay */}
      {showFinishOverlay && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <span className="book-created-text">КНИГА СОЗДАНА ✦</span>
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className="word-saved-spark"
              style={{
                left: `${50 + 12 * Math.cos((i * Math.PI * 2) / 8)}%`,
                top: `${45 + 12 * Math.sin((i * Math.PI * 2) / 8)}%`,
                animationDelay: `${i * 0.06}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
    </div>
    </div>
  );
};

export default MagicBook;
