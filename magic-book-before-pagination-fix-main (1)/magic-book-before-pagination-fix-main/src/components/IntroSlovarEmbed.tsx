import { useEffect } from "react";

interface IntroSlovarEmbedProps {
  onOpenForm: () => void;
  onUserGesture?: () => void;
}

export default function IntroSlovarEmbed({ onOpenForm, onUserGesture }: IntroSlovarEmbedProps) {
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event?.data || typeof event.data !== "object") return;
      const type = (event.data as { type?: string }).type;
      if (type === "SLOVAR_OPEN_FORM") {
        onOpenForm();
      }
      if (type === "SLOVAR_USER_GESTURE") {
        onUserGesture?.();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onOpenForm, onUserGesture]);

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
