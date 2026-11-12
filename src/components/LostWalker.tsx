// The hero's walker on the 404 page: the path runs out under him, so he stops at the edge and scratches
// his head. Same figure, same strokes and colours as Walker.tsx, so the two read as one character
export function LostWalker({ className = '' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 84"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`walker lost-walker ${className}`}
    >
      <defs>
        <linearGradient id="lost-fade">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.16" stopColor="#fff" />
        </linearGradient>
        <mask id="lost-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="84">
          <rect width="200" height="84" fill="url(#lost-fade)" />
        </mask>
      </defs>

      {/* The path, then where it breaks off: a short drop and a few pieces scattered past the edge */}
      <g mask="url(#lost-mask)" className="walker-ground" strokeWidth="1">
        <path d="M0 70.5 H118 l1.4 3.4" />
        <path d="M0 75 H112" strokeDasharray="5 14.9" />
        <path d="M126 73.6 l5 0.9" />
        <path d="M136.5 77.6 l3.6 -0.8" />
        <path d="M146 80.6 l2.4 0.6" />
        <path d="M90 70 l-1.6 -3.6 M92 70 l0.4 -4.6 M94 70 l2 -3.2" />
      </g>

      <g className="walker-figure lost-figure" strokeWidth="2">
        <g className="lost-head">
          <circle cx="96" cy="19.5" r="5.5" />
        </g>
        <path d="M96 25 L96 46" />
        {/* Far arm hangs, near arm is up at the head */}
        <path d="M96 30 L92.5 38.5 L91.5 47" opacity="0.45" />
        <path d="M96 30 L104 24" />
        <g className="lost-scratch">
          <path d="M104 24 L100.5 16.5" />
        </g>
        <path d="M96 46 L92 69.5" opacity="0.45" />
        <path d="M96 46 L100.5 69.5" />
      </g>

      <text x="110" y="11" className="lost-question" fontSize="14" textAnchor="middle">
        ?
      </text>
    </svg>
  );
}
