// The hero's walker with no signal: he has sat down on a stone by the path and holds his phone up, looking
// for a connection, its signal arcs faint. Same figure, strokes and colours as Walker.tsx and LostWalker.tsx,
// so the three read as one character. Shown where something really needs the network (a project's film)
export function OfflineWalker({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 84" fill="none" strokeLinecap="round" strokeLinejoin="round" className={`offline-walker ${className}`}>
      <defs>
        <linearGradient id="offline-fade">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.2" stopColor="#fff" />
          <stop offset="0.8" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="offline-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="84">
          <rect width="200" height="84" fill="url(#offline-fade)" />
        </mask>
      </defs>

      {/* The path, and the stone he sits on beside it */}
      <g mask="url(#offline-mask)" className="offline-ground" strokeWidth="1">
        <path d="M0 74.5 H200" />
        <path d="M0 79 H200" strokeDasharray="5 14.9" />
      </g>
      <path className="offline-ground" strokeWidth="1.2" d="M84 74.5 Q84.5 64.5 95 63.8 Q106 63.4 107 74.5" />

      <g className="offline-figure" strokeWidth="2">
        <circle cx="95" cy="28" r="5.5" />
        <path d="M95 33.5 L96 54" />
        {/* Seated: thighs forward along the stone's top, shins down to the path */}
        <path d="M96 54 L108.5 55 L110.5 74" opacity="0.45" />
        <path d="M96 54 L110 52.5 L113.5 73.5" />
        {/* Far arm rests on his knee; the near arm holds the phone up */}
        <path d="M95.5 38 L102 46.5 L108 51" opacity="0.45" />
        <g className="offline-reach">
          <path d="M95.5 38 L104.5 34 L108 25" />
          <rect x="105.6" y="16.5" width="5" height="8.5" rx="1.2" strokeWidth="1.4" />
        </g>
      </g>

      {/* Signal arcs over the phone, faint: nothing coming through */}
      <g className="offline-signal" strokeWidth="1.2">
        <path d="M105.2 12.6 Q108.1 10.4 111 12.6" />
        <path d="M102.6 9.6 Q108.1 5.4 113.6 9.6" strokeDasharray="1.5 2.5" />
        <path d="M100 6.6 Q108.1 0.4 116.2 6.6" strokeDasharray="1.5 3.5" />
      </g>
    </svg>
  );
}
