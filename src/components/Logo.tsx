/**
 * The FinX mark, as inline SVG.
 *
 * Same geometry as `scripts/generate-icons.mjs`, flattened to solid fills —
 * at 22px the facet shading turns to noise, so the silhouette does the work.
 * One component so the app icon and the in-app mark cannot drift apart.
 *
 * It carries its own white plate, exactly like the installed app icon. The
 * first version let the dark leaf follow `currentColor` so it would "adapt" to
 * the theme; in dark mode that turned the black leaf white and the white seam
 * black, and the mark came out inverted and unrecognisable. A logo does not
 * get to change colour — it gets a ground that guarantees it reads.
 */

const GREEN_BLADE = "41,25 50,42 52,60 47,78 38,91 30,74 26,50 33,35";
const GREEN_TAB_1 = "27,54 12,63 29,67";
const GREEN_TAB_2 = "29,70 10,81 31,84";
const INK_LEAF = "47,26 58,45 66,50 74,31 86,25 81,54 74,70 58,86 37,91 45,60";
const HEX = "67,5.5 75.2,10.2 75.2,19.8 67,24.5 58.8,19.8 58.8,10.2";

export function Logo({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="FinX"
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill="#ffffff" />
      {/* Inset so the mark sits inside the plate rather than touching its edge. */}
      <g transform="translate(50 50) scale(0.82) translate(-50 -50)">
        <polygon points={INK_LEAF} fill="#111111" />
        <polygon points={HEX} fill="#1c1c1c" />
        {/*
          The white stroke is what keeps the two leaves reading as separate
          shapes — without it they merge into one dark mass where they overlap.
        */}
        <g stroke="#ffffff" strokeWidth="4" strokeLinejoin="round">
          <polygon points={GREEN_BLADE} fill="#22b24c" />
          <polygon points={GREEN_TAB_1} fill="#1c9c42" />
          <polygon points={GREEN_TAB_2} fill="#117a38" />
        </g>
      </g>
    </svg>
  );
}
