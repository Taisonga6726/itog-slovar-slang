import { useEffect, useRef } from "react";

interface IntroSlovarEmbedProps {
  onOpenForm: () => void;
  /** Старт гимна только по явному сигналу из iframe (клик по развороту книги). */
  onBookHymnStart?: () => void;
  /** Остановка гимна при загрузке / верном коде — без ложных срабатываний. */
  onResetHymn?: () => void;
}

export default function IntroSlovarEmbed({ onOpenForm, onBookHymnStart, onResetHymn }: IntroSlovarEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event?.data || typeof event.data !== "object") return;
      const originOk =
        event.origin === window.location.origin ||
        (window.location.protocol === "file:" && (event.origin === "null" || event.origin === ""));
      if (!originOk) return;
      const type = (event.data as { type?: string }).type;
      const iframeWin = iframeRef.current?.contentWindow;
      /* Старт гимна: только origin — иначе иногда теряется из‑за несовпадения event.source с ref окна iframe. */
      if (type === "SLOVAR_BOOK_HYMN_START") {
        onBookHymnStart?.();
        return;
      }
      if (type === "SLOVAR_RESET_HYMN") {
        onResetHymn?.();
        return;
      }
      if (iframeWin && event.source !== iframeWin) return;
      if (type === "SLOVAR_OPEN_FORM") {
        onOpenForm();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onOpenForm, onBookHymnStart, onResetHymn]);

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        ref={iframeRef}
        title="SLOVAR Intro"
        src="/slovar/index.html"
        className="w-full h-full border-0"
        allow="autoplay"
      />
    </div>
  );
}
