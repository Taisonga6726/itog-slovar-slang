import DigitalCodeBackdrop from "@/components/DigitalCodeBackdrop";

export default function ContactPage() {
  return (
    <div className="relative flex items-center justify-center min-h-[100dvh]">
      <div className="pointer-events-none absolute inset-0 z-0">
        <DigitalCodeBackdrop opacity={0.55} variant="full" />
      </div>

      <div className="relative z-10 w-[320px] sm:w-[420px] md:w-[480px] lg:w-[520px]">
        <video
          src="/videos/visitka.mp4"
          autoPlay
          muted
          playsInline
          className="w-full h-auto rounded-xl shadow-xl object-cover"
        />
      </div>
    </div>
  );
}
