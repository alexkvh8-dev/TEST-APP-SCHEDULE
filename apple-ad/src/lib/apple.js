// Apple visual system: palette, the logo outline, small drawing helpers.

export const A = {
  black: '#000000',
  ink: '#1d1d1f',      // apple.com body text / near-black
  mist: '#f5f5f7',     // apple.com light canvas
  white: '#ffffff',
  gray: '#86868b',     // secondary text
  blue: '#0071e3',     // link / action blue (light)
  blueDark: '#2997ff', // link blue on dark
  sysBlue: '#0A84FF',  // iOS system blue (dark)
  // Siri / intelligence glow ramp
  glow: ['#0A84FF', '#5E5CE6', '#BF5AF2', '#FF375F', '#FF9F0A', '#64D2FF'],
};

// Finishes (fictional names, Apple-like materials).
export const FINISH = {
  titanium: { frame: '#8f8a84', back: '#c9c4bc', plateau: '#c2bdb5' },
  ultramarine: { frame: '#5b67d9', back: '#7f8cf0', name: 'Ultramarine' },
  teal: { frame: '#5fa79f', back: '#9fd2c9', name: 'Teal' },
  pink: { frame: '#e59ac6', back: '#f2bfdc', name: 'Pink' },
  white: { frame: '#e4e4e2', back: '#f4f4f2', name: 'White' },
  black: { frame: '#3a3a3c', back: '#4a4a4d', name: 'Black' },
};

// Apple logo outline (24-unit box). Drawn with Path2D, so canvas does the curves.
export const LOGO_PATH =
  'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701';
const LOGO_BOX = { x0: 2.2, x1: 21.7, y0: 0, y1: 23.95 }; // measured bounds of the path
let _logo = null;

// Draw the logo centred on (x, y), `h` pixels tall.
export function drawLogo(ctx, x, y, h, fill = A.white) {
  if (!_logo) _logo = new Path2D(LOGO_PATH);
  const s = h / (LOGO_BOX.y1 - LOGO_BOX.y0);
  const cx = (LOGO_BOX.x0 + LOGO_BOX.x1) / 2, cy = (LOGO_BOX.y0 + LOGO_BOX.y1) / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = fill;
  ctx.fill(_logo);
  ctx.restore();
}

export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Apple-style "continuous" corner (squircle-ish superellipse) — the shape of iOS icons
// and device corners. n≈5 gives Apple's smooth curvature continuity.
export function squircle(ctx, x, y, w, h, r, n = 5) {
  const steps = 24;
  ctx.beginPath();
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= steps; i++) {
      const a = a0 + (i / steps) * (Math.PI / 2);
      const c = Math.cos(a), s = Math.sin(a);
      const px = cx + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * r;
      const py = cy + Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * r;
      i === 0 && a0 === Math.PI ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
  };
  corner(x + r, y + r, Math.PI);
  corner(x + w - r, y + r, Math.PI * 1.5);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI * 0.5);
  ctx.closePath();
}

export const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
