import { useState, useEffect, useRef } from "react";

interface InkWriteEffectProps {
  text: string;
  onComplete?: () => void;
  className?: string;
}

const InkWriteEffect = ({ text, onComplete, className = "" }: InkWriteEffectProps) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const prevTextRef = useRef("");

  useEffect(() => {
    const prev = prevTextRef.current;
    prevTextRef.current = text;

    if (text.startsWith(prev) && prev.length > 0) {
      // User is appending — keep visibleCount, animate new chars
    } else if (prev.startsWith(text) && text.length < prev.length) {
      setVisibleCount(text.length);
      return;
    } else {
      setVisibleCount(text.length);
      return;
    }
  }, [text]);

  useEffect(() => {
    if (visibleCount >= text.length) {
      onComplete?.();
      return;
    }
    const timer = setInterval(() => {
      setVisibleCount((c) => {
        const next = c + 1;
        if (next >= text.length) clearInterval(timer);
        return next;
      });
    }, 40);
    return () => clearInterval(timer);
  }, [text, visibleCount, onComplete]);

  return (
    <span className={className}>
      {text.split("").map((char, i) => {
        if (i >= visibleCount) return <span key={i} style={{ opacity: 0 }}>{char}</span>;
        if (i === visibleCount - 1) return <span key={i} className="ink-letter">{char}</span>;
        // Already revealed chars get ink-absorb effect
        return <span key={i} className="ink-absorb">{char}</span>;
      })}
    </span>
  );
};

export default InkWriteEffect;
