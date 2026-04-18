import { useEffect } from "react";

interface IntroSlovarEmbedProps {
  onOpenForm: () => void;
}

export default function IntroSlovarEmbed({ onOpenForm }: IntroSlovarEmbedProps) {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event?.data || typeof event.data !== "object") return;
      if ((event.data as { type?: string }).type === "SLOVAR_OPEN_FORM") {
        onOpenForm();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onOpenForm]);

  return (
    <div className="fixed inset-0 bg-black">
      <iframe
        title="SLOVAR Intro"
        src="/slovar/index.html"
        className="w-full h-full border-0"
        allow="autoplay"
      />
    </div>
  );
}
