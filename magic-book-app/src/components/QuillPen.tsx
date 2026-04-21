const QuillPen = ({ visible }: { visible: boolean }) => {
  if (!visible) return null;

  return (
    <span className="quill-pen inline-block align-middle ml-1" style={{ width: 24, height: 44 }}>
      <svg viewBox="0 0 24 44" width="24" height="44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: "rotate(-25deg)", transformOrigin: "bottom center" }}>
        <defs>
          {/* Gold nib gradient */}
          <linearGradient id="nibGold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#d4a829" />
            <stop offset="50%" stopColor="#c9a227" />
            <stop offset="100%" stopColor="#8b6914" />
          </linearGradient>
          {/* Body gradient */}
          <linearGradient id="penBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="40%" stopColor="#333" />
            <stop offset="60%" stopColor="#2a2a2a" />
            <stop offset="100%" stopColor="#111" />
          </linearGradient>
          {/* Nib shine */}
          <linearGradient id="nibShine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0d060" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Pen body — dark cylinder */}
        <rect x="8" y="2" width="8" height="22" rx="3" fill="url(#penBody)" />
        {/* Body highlight */}
        <rect x="10" y="3" width="2" height="20" rx="1" fill="#444" opacity="0.4" />

        {/* Gold ring / band */}
        <rect x="7.5" y="23" width="9" height="3" rx="1" fill="url(#nibGold)" />
        <rect x="8" y="23.5" width="8" height="0.5" fill="#f0d060" opacity="0.5" />

        {/* Nib section — tapered gold shape */}
        <path
          d="M9 26 L15 26 L13.5 36 L12 38 L10.5 36 Z"
          fill="url(#nibGold)"
        />
        {/* Nib center line / slit */}
        <line x1="12" y1="28" x2="12" y2="37" stroke="#6b4a0a" strokeWidth="0.4" />
        {/* Nib shine highlight */}
        <path
          d="M10 26.5 L12 26.5 L11 33 Z"
          fill="url(#nibShine)"
        />
        {/* Nib tip split */}
        <line x1="11.7" y1="36.5" x2="12.3" y2="36.5" stroke="#6b4a0a" strokeWidth="0.3" />

        {/* Ink hole (breather) */}
        <ellipse cx="12" cy="29" rx="1" ry="0.8" fill="#4a3408" opacity="0.6" />

        {/* Cap clip */}
        <rect x="16" y="3" width="1.2" height="14" rx="0.6" fill="#c9a227" opacity="0.7" />
        <circle cx="16.6" cy="17" r="0.8" fill="#c9a227" opacity="0.7" />

        {/* Ink drops */}
        <circle className="ink-drop-1" cx="12" cy="39" r="1" fill="hsl(250, 60%, 20%)" opacity="0" />
        <circle className="ink-drop-2" cx="14" cy="38" r="0.7" fill="hsl(250, 60%, 20%)" opacity="0" />
      </svg>
    </span>
  );
};

export default QuillPen;
