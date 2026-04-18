import React from "react";
import NeonGlassButton from "./NeonGlassButton";

interface PageNav {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

interface ControlBarProps {
  mode: "intro" | "form" | "preview" | "reading" | "final";
  setMode: (mode: "intro" | "form" | "preview" | "reading" | "final") => void;
  onAddWord: () => void;
  onShare: () => void;
  pageNav?: PageNav | null;
}

const ControlBar: React.FC<ControlBarProps> = ({ mode, setMode, onAddWord, onShare, pageNav }) => {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        left: "42%",
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
          <NeonGlassButton accent onClick={onAddWord}>✏️ внести слово</NeonGlassButton>
          {pageNav?.hasPrev && (
            <NeonGlassButton onClick={pageNav.onPrev}>← назад</NeonGlassButton>
          )}
          {pageNav?.hasNext && (
            <NeonGlassButton onClick={pageNav.onNext}>далее →</NeonGlassButton>
          )}
          <NeonGlassButton onClick={() => setMode("preview")}>📖 читать книгу</NeonGlassButton>
          <NeonGlassButton onClick={() => setMode("final")}>✦ завершить</NeonGlassButton>
        </>
      )}

      {mode === "preview" && (
        <>
          <NeonGlassButton accent onClick={() => setMode("form")}>✏️ внести слово</NeonGlassButton>
        </>
      )}

      {mode === "reading" && (
        <>
          <NeonGlassButton accent onClick={() => setMode("form")}>✏️ внести слово</NeonGlassButton>
          {pageNav?.hasPrev && (
            <NeonGlassButton onClick={pageNav.onPrev}>← назад</NeonGlassButton>
          )}
          {pageNav?.hasNext && (
            <NeonGlassButton onClick={pageNav.onNext}>далее →</NeonGlassButton>
          )}
          <NeonGlassButton onClick={() => setMode("final")}>✦ завершить</NeonGlassButton>
        </>
      )}

      {mode === "final" && (
        <>
          <NeonGlassButton onClick={() => setMode("form")}>📖 к книге</NeonGlassButton>
        </>
      )}
    </div>
  );
};

export default ControlBar;
