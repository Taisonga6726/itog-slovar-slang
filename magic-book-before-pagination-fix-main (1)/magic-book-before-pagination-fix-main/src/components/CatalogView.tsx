import { useState } from "react";
import bookImg from "@/assets/book.png";

interface Entry {
  word: string;
  description: string;
}

interface CatalogViewProps {
  entries: Entry[];
  onBack: () => void;
}

const ITEMS_PER_PAGE = 8;

const CatalogView = ({ entries, onBack }: CatalogViewProps) => {
  const [page, setPage] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE) || 1;

  const pageEntries = entries.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  const flipTo = (newPage: number) => {
    if (flipping || newPage < 0 || newPage >= totalPages) return;
    setFlipping(true);
    setTimeout(() => {
      setPage(newPage);
      setFlipping(false);
    }, 600);
  };

  return (
    <div className="relative w-full max-w-[960px] mx-auto" style={{ aspectRatio: "1.5 / 1" }}>
      <img
        src={bookImg}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />

      {/* Page flip overlay */}
      {flipping && (
        <div
          className="absolute z-30"
          style={{
            right: "7%",
            top: "8%",
            width: "43%",
            height: "80%",
            background: "linear-gradient(to left, hsl(35 40% 82% / 0.9), hsl(35 30% 75% / 0.7))",
            transformOrigin: "left center",
            animation: "page-flip 0.6s ease-in-out forwards",
            borderRadius: "0 4px 4px 0",
            boxShadow: "-4px 0 12px hsl(0 0% 0% / 0.3)",
          }}
        />
      )}

      {/* Left page — catalog list */}
      <div
        className="absolute font-handwriting"
        style={{
          left: "7%",
          top: "12%",
          width: "38%",
          height: "72%",
          padding: "8px 16px",
        }}
      >
        <h2 className="text-xl font-semibold text-ink mb-4 tracking-wide">Каталог</h2>
        {entries.length === 0 ? (
          <p className="font-handwriting italic text-sm" style={{ color: "hsl(var(--ink) / 0.3)" }}>
            Пока пусто…
          </p>
        ) : (
          <ol className="list-none space-y-2">
            {pageEntries.map((entry, i) => (
              <li key={i} className="text-ink text-sm leading-relaxed">
                <span style={{ color: "hsl(var(--ink) / 0.5)" }}>
                  {page * ITEMS_PER_PAGE + i + 1}.{" "}
                </span>
                <span className="font-semibold">{entry.word}</span>
                {entry.description && (
                  <span className="font-handwriting"> — {entry.description}</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Right page — continuation or info */}
      <div
        className="absolute font-handwriting"
        style={{
          right: "7%",
          top: "12%",
          width: "38%",
          height: "72%",
          padding: "8px 16px",
        }}
      >
        <p
          className="font-handwriting text-base italic mt-8 text-center"
          style={{ color: "hsl(var(--ink) / 0.2)" }}
        >
          Страница {page + 1} из {totalPages}
        </p>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-[6%] left-[10%] font-handwriting text-xs action-text cursor-pointer tracking-wider" onClick={onBack}>
        ← назад
      </div>
      {totalPages > 1 && (
        <div className="absolute bottom-[6%] right-[10%] flex gap-4 font-handwriting text-xs">
          {page > 0 && (
            <span className="action-text cursor-pointer" onClick={() => flipTo(page - 1)}>
              ← пред.
            </span>
          )}
          {page < totalPages - 1 && (
            <span className="action-text cursor-pointer" onClick={() => flipTo(page + 1)}>
              след. →
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default CatalogView;
