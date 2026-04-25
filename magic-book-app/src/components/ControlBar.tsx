import React from "react";
import NeonGlassButton from "./NeonGlassButton";

interface PageNav {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

interface ControlBarProps {
  mode: "intro" | "form" | "awakening" | "hands" | "reading" | "final";
  setMode: (mode: "intro" | "form" | "awakening" | "hands" | "reading" | "final") => void;
  onAddWord: () => void;
  onReadBook: () => void;
  onShare: () => void;
  pageNav?: PageNav | null;
  entriesCount: number;
}

const ControlBar: React.FC<ControlBarProps> = ({ mode, setMode, onAddWord, onReadBook, onShare, pageNav, entriesCount }) => {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        background: "rgba(30, 15, 60, 0.5)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderRadius: "16px",
        padding: "10px 18px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}
    >
      {mode === "form" && (
        <>
          <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "0.92rem", fontWeight: 700, whiteSpace: "nowrap" }}>
            Всего слов: {entriesCount}
          </span>
          <NeonGlassButton accent onClick={onAddWord}>✏️ внести слово</NeonGlassButton>
          {pageNav?.hasPrev && (
            <NeonGlassButton accent onClick={pageNav.onPrev}>← назад</NeonGlassButton>
          )}
          {pageNav?.hasNext && (
            <NeonGlassButton accent onClick={pageNav.onNext}>далее →</NeonGlassButton>
          )}
          <NeonGlassButton accent onClick={onReadBook}>📖 читать книгу</NeonGlassButton>
        </>
      )}

      {mode === "reading" && (
        <>
          <span style={{ color: "rgba(255,255,255,0.92)", fontSize: "0.92rem", fontWeight: 700, whiteSpace: "nowrap" }}>
            Всего слов: {entriesCount}
          </span>
          <NeonGlassButton accent onClick={() => setMode("form")}>✏️ внести слово</NeonGlassButton>
          {pageNav?.hasPrev && (
            <NeonGlassButton accent onClick={pageNav.onPrev}>← назад</NeonGlassButton>
          )}
          {pageNav?.hasNext && (
            <NeonGlassButton accent onClick={pageNav.onNext}>далее →</NeonGlassButton>
          )}
          <NeonGlassButton accent onClick={() => setMode("final")}>✦ завершить</NeonGlassButton>
        </>
      )}

      {mode === "final" && (
        <>
          <NeonGlassButton accent onClick={() => setMode("form")}>📖 к книге</NeonGlassButton>
        </>
      )}
    </div>
  );
};

export default ControlBar;
