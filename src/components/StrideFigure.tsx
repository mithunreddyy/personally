/**
 * The hero's walker at 40px tall, with the same limbs and stride classes, for paths that drive his walk
 * cycle themselves (the reading path by scroll, the film path by playback). One step is 19.9 units
 */
export function StrideFigure({ width = 21 }: { width?: number }) {
  return (
    <svg viewBox="44 4 32 62" width={width} height="40" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g className="walker-figure" strokeWidth="2.2">
        <circle cx="60" cy="13.5" r="5.5" />
        <path d="M60 19 L60 40" />
        <g className="walker-limb walker-arm-b">
          <path d="M60 24 L60 33" />
          <g className="walker-forearm">
            <path d="M60 33 L60 41" />
          </g>
        </g>
        <g className="walker-limb walker-leg-b">
          <path d="M60 40 L60 52" />
          <g className="walker-shin">
            <path d="M60 52 L60 63.5" />
          </g>
        </g>
        <g className="walker-limb walker-leg-a">
          <path d="M60 40 L60 52" />
          <g className="walker-shin">
            <path d="M60 52 L60 63.5" />
          </g>
        </g>
        <g className="walker-limb walker-arm-a">
          <path d="M60 24 L60 33" />
          <g className="walker-forearm">
            <path d="M60 33 L60 41" />
          </g>
        </g>
      </g>
    </svg>
  );
}
