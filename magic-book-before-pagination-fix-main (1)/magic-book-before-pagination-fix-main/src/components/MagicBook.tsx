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
  /** Скрины в правой колонке (каталог) — меньше, чтобы не заходить на орнамент справа */
  const CATALOG_IMAGE_MAX_HEIGHT = 112;
  const ENTRY_GRID_COLS = "minmax(4.25rem, 4.25rem) minmax(0, 1fr)";
  const requestMusicDuck = useCallback((holdMs = 1000) => {
    window.dispatchEvent(new CustomEvent("magicbook:duck-audio", { detail: { holdMs } }));
  }, []);

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
      penAudio.current.volume = 0.72;
    }
    if (penAudio.current.paused) {
      requestMusicDuck(900);
      penAudio.current.currentTime = 0;
      penAudio.current.play().catch(() => {});
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = window.setTimeout(() => {
      penAudio.current?.pause();
    }, 1000);
  }, [requestMusicDuck]);

  const playFlipSound = useCallback(() => {
    requestMusicDuck(1100);
    if (!flipAudio.current) {
      flipAudio.current = new Audio("/page-flip.mp3");
      flipAudio.current.volume = 0.92;
    }
    flipAudio.current.currentTime = 0;
    flipAudio.current.play().catch(() => {});
  }, [requestMusicDuck]);

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
      measure.style.cssText = `position:absolute;visibility:hidden;width:${container.clientWidth}px;font-family:inherit;padding:0;`;
      container.appendChild(measure);

      const breaks: number[] = [0];
      let currentHeight = 0;

      for (let i = 0; i < entries.length; i++) {
        const wrap = document.createElement("div");
        wrap.style.cssText = `margin-bottom:0.6em;width:100%;box-sizing:border-box;display:grid;grid-template-columns:${ENTRY_GRID_COLS};column-gap:0.4rem;align-items:start;justify-items:stretch`;

        const numCell = document.createElement("div");
        numCell.style.cssText =
          "font-size:1.25rem;font-weight:700;line-height:1.18;font-style:italic;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;font-family:'Cormorant Garamond',serif;color:#120c34";
        numCell.textContent = `${i + 1}.`;
        wrap.appendChild(numCell);

        const body = document.createElement("div");
        body.style.cssText = "min-width:0;direction:ltr;unicode-bidi:plaintext";

        const title = document.createElement("div");
        title.style.cssText =
          "font-size:1.25rem;font-weight:700;line-height:1.18;text-align:left;font-style:italic;overflow-wrap:anywhere;word-break:break-word;font-family:'Cormorant Garamond',serif;color:#120c34";
        title.textContent = entries[i].word;
        body.appendChild(title);

        if (entries[i].description) {
          const desc = document.createElement("div");
          desc.style.cssText = "font-size:1rem;line-height:1.18;text-align:left;overflow-wrap:anywhere;word-break:break-word";
          desc.textContent = `— ${entries[i].description.replace(/^[—-]\s*/, "").replace(/\s+/g, " ").trim()}`;
          body.appendChild(desc);
        }

        (entries[i].images ?? []).forEach((src) => {
          const img = document.createElement("img");
          img.src = src;
          img.style.cssText = `display:block;max-width:100%;max-height:${CATALOG_IMAGE_MAX_HEIGHT}px;height:auto;object-fit:contain;margin:6px 0`;
          body.appendChild(img);
        });

        wrap.appendChild(body);


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
      const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-zР°-СЏС‘0-9]/gi, "");
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
        copy[editIdx] = { ...copy[editIdx], word: word.trim(), description: description.trim().replace(/^[—-]\s*/, ""), images: pastedImages };
        return copy;
      });
      setEditIdx(null);
    } else {
      setEntries((prev) => [
        ...prev,
        { word: word.trim(), description: description.trim().replace(/^[—-]\s*/, ""), reactions: { fire: 0, love: 0, rocket: 0, laugh: 0, like: 0 }, images: pastedImages },
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

      {/* Left page — форма: старт текста после левого орнамента; кнопки внизу — ближе к переплёту */}
      <div
        className="absolute z-[25] font-handwriting no-scroll"
        style={{
          left: "21.05%",
          top: "20.35%",
          width: "22.8%",
          height: "54.9%",
          padding: "10px 10px 22px 24px",
          boxSizing: "border-box",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column" }}>
          {/* Та же сетка, что у строк каталога: курсор «Слово» = начало колонки слова после номера */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: ENTRY_GRID_COLS,
              columnGap: "0.4rem",
              alignItems: "center",
              marginBottom: "0.45rem",
            }}
          >
            <div aria-hidden="true" style={{ minHeight: "1.35rem" }} />
            <input
              id="magicBookWord"
              ref={wordInputRef}
              type="text"
              value={word}
              onChange={(e) => { setWord(e.target.value); playPenSound(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); descRef.current?.focus(); } }}
              placeholder="Слово"
              aria-label="Слово"
              className="magic-input w-full min-w-0 text-2xl font-semibold font-handwriting text-ink"
              style={{ paddingLeft: 0, paddingRight: 0 }}
            />
          </div>

          <div
            className="writing-zone rounded-sm flex-1 min-h-0 mt-0"
            style={{ display: "grid", gridTemplateColumns: ENTRY_GRID_COLS, columnGap: "0.4rem", alignItems: "stretch" }}
          >
            <div aria-hidden="true" />
            <div className="min-w-0 min-h-0 h-full">
              <textarea
                id="magicBookDesc"
                ref={descRef}
                value={description}
                onChange={(e) => { setDescription(e.target.value); playPenSound(); }}
                onPaste={handleDescPaste}
                placeholder="Описание..."
                aria-label="Описание"
                className="magic-textarea w-full h-full font-handwriting text-lg notebook-lines"
                style={{ minHeight: "150px", lineHeight: "22px", paddingLeft: 0, paddingRight: 0 }}
              />
            </div>
          </div>
        </div>

        {pastedImages.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 70, overflow: "hidden" }}>
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

        <div style={{ marginTop: "auto", width: "100%" }} className="pt-1 pb-1 flex justify-end items-center gap-2 pr-2">
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
              }}>СЛОВО УЖЕ ЕСТЬ В СЛОВАРЕ!</span>
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

      {/* Right page — каталог: сдвиг к переплёту, запас от правого орнамента, скрины компактнее */}
      <div
        className="absolute z-[15] font-handwriting no-scroll"
        style={{
          left: "52.15%",
          top: "20.35%",
          width: "22.35%",
          height: "54.9%",
          padding: "10px 14px 22px 4px",
          boxSizing: "border-box",
          overflow: "hidden", overflowWrap: "break-word", wordBreak: "break-word",
        }}
      >
        <div ref={rightContentRef} style={{ height: "100%", overflow: "hidden", perspective: "1200px" }}>
          <div className={flipping ? "page-flip-anim" : ""} style={{ transformOrigin: "left center" }}>
            {pageEntries.length === 0 && !liveText ? (
              <p className="font-handwriting text-xl mt-1 text-left" style={{ color: "hsl(var(--ink) / 0.25)" }}>
                Здесь появятся ваши записи...
              </p>
            ) : (
              <div>
                {pageEntries.map((entry, i) => {
                  const globalIdx = currentPageStart + i;
                  if (editIdx === globalIdx && liveText) return null;

                  return (
                    <div
                      key={globalIdx}
                      className="text-ink box-border w-full"
                      style={{
                        marginBottom: "0.6em",
                        display: "grid",
                        gridTemplateColumns: ENTRY_GRID_COLS,
                        columnGap: "0.4rem",
                        alignItems: "start",
                        justifyItems: "stretch",
                      }}
                    >
                      <div
                        className="text-xl tabular-nums leading-tight whitespace-nowrap"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#120c34", textAlign: "right", lineHeight: "1.22", fontWeight: 800 }}
                      >
                        {globalIdx + 1}.
                      </div>
                      <div style={{ minWidth: 0, direction: "ltr", unicodeBidi: "plaintext" }}>
                        <div
                          className="text-xl leading-tight"
                          style={{
                            fontFamily: "'Cormorant Garamond', serif",
                            fontStyle: "italic",
                            color: "#120c34",
                            textAlign: "left",
                            lineHeight: "1.22",
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
                            className="font-handwriting text-base"
                            style={{
                              color: "#1a103a",
                              textAlign: "left",
                              lineHeight: "1.24",
                              fontWeight: 600,
                              overflowWrap: "anywhere",
                              wordBreak: "break-word",
                              whiteSpace: "normal",
                              wordSpacing: "normal",
                            }}
                          >
                            — {entry.description.replace(/^[—-]\s*/, "").replace(/\s+/g, " ").trim()}
                          </div>
                        )}
                        {entry.images?.map((src, k) => (
                          <img key={k} src={src} alt="" style={{ display: "block", maxWidth: "100%", maxHeight: CATALOG_IMAGE_MAX_HEIGHT, height: "auto", objectFit: "contain", margin: "6px 0 0 0" }} />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {isLastPage && liveText && (
                  <div
                    className="text-ink box-border w-full"
                    style={{
                      marginBottom: "0.6em",
                      display: "grid",
                      gridTemplateColumns: ENTRY_GRID_COLS,
                      columnGap: "0.4rem",
                      alignItems: "start",
                      justifyItems: "stretch",
                    }}
                  >
                    <div
                      className="text-xl tabular-nums leading-tight whitespace-nowrap ink-fresh"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", color: "#120c34", textAlign: "right", lineHeight: "1.22", fontWeight: 800 }}
                    >
                      {editIdx !== null ? editIdx + 1 : entries.length + 1}.
                    </div>
                    <div style={{ minWidth: 0, direction: "ltr", unicodeBidi: "plaintext" }}>
                      <div
                        className="text-xl leading-tight"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontStyle: "italic",
                          color: "#120c34",
                          textAlign: "left",
                          lineHeight: "1.22",
                          fontWeight: 800,
                          overflowWrap: "anywhere",
                          wordBreak: "break-word",
                          whiteSpace: "normal",
                          wordSpacing: "normal",
                        }}
                      >
                        <InkWriteEffect text={word} className="ink-fresh" />
                      </div>
                      {description && (
                        <div
                          className="font-handwriting text-base ink-fresh"
                          style={{
                            color: "#1a103a",
                            textAlign: "left",
                            lineHeight: "1.24",
                            fontWeight: 600,
                            overflowWrap: "anywhere",
                            wordBreak: "break-word",
                            whiteSpace: "normal",
                            wordSpacing: "normal",
                          }}
                        >
                          — <InkWriteEffect text={description.replace(/\s+/g, " ").trim()} className="" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation buttons hidden вЂ” managed by ControlBar */}

      {/* "РљРќРР“Рђ РЎРћР—Р”РђРќРђ вњ¦" overlay */}
      {showFinishOverlay && (
        <div className="absolute inset-0 z-50 pointer-events-none">
          <span className="book-created-text">РљРќРР“Рђ РЎРћР—Р”РђРќРђ вњ¦</span>
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

