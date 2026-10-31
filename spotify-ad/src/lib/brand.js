// Spotify brand system: palette, the icon, and the UI glyphs used on the phone screen.

export const C = {
  green: '#1ED760',     // Spotify Green
  greenDeep: '#1DB954', // legacy green, used for depth/shading
  black: '#000000',
  ink: '#121212',       // app background
  card: '#181818',
  elev: '#282828',
  mute: '#B3B3B3',      // secondary text
  dim: '#535353',
  white: '#FFFFFF',
  // Expressive palette (playlist covers / Wrapped-style duotones)
  pink: '#F573A0',
  blue: '#4100F5',
  lime: '#CDF564',
  navy: '#1E3264',
  yellow: '#FFC864',
  orange: '#FF6437',
  red: '#E61E32',
  purple: '#AF2896',
  sky: '#509BF5',
  teal: '#27856A',
  plum: '#3D1A3A',
};

export const hex = (h) => parseInt(h.slice(1), 16);

// The Spotify icon: green disc + three arcs, drawn in canvas units.
// `progress` (0..1 per arc) lets the arcs draw on; `r` is the disc radius.
export function drawSpotifyIcon(ctx, x, y, r, opts = {}) {
  const { disc = true, discColor = C.green, arcColor = C.black, arcs = [1, 1, 1], rot = 0 } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (disc) {
    ctx.fillStyle = discColor;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Each arc: a slice of a large circle whose centre sits far below, so it reads as a
  // gentle upward bow. Slight clockwise tilt, thicker and wider at the top.
  const defs = [
    { y: -0.235, half: 0.62, sag: 0.17, w: 0.16 },
    { y: 0.075, half: 0.52, sag: 0.13, w: 0.13 },
    { y: 0.355, half: 0.43, sag: 0.1, w: 0.105 },
  ];
  ctx.rotate(0.085);
  ctx.strokeStyle = arcColor;
  ctx.lineCap = 'round';
  defs.forEach((d, i) => {
    const p = arcs[i] ?? 1;
    if (p <= 0) return;
    const half = d.half * r, sag = d.sag * r;
    // Circle through (-half, sag), (0, 0), (half, sag) — relative to the arc's peak.
    const R = (half * half + sag * sag) / (2 * sag);
    const cy = d.y * r + R;
    const a = Math.asin(half / R);
    ctx.lineWidth = d.w * r;
    ctx.beginPath();
    const a0 = -Math.PI / 2 - a;
    ctx.arc(0, cy, R, a0, a0 + 2 * a * Math.min(1, p));
    ctx.stroke();
  });
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

// ---- UI glyphs (stroke/fill in current style; s = icon size in px) ----
export const icon = {
  chevronDown(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.18);
    ctx.lineTo(x, y + s * 0.22);
    ctx.lineTo(x + s * 0.4, y - s * 0.18);
    ctx.stroke();
  },
  dots(ctx, x, y, s) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.arc(x + i * s * 0.36, y, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  play(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.4);
    ctx.lineTo(x + s * 0.42, y);
    ctx.lineTo(x - s * 0.3, y + s * 0.4);
    ctx.closePath();
    ctx.fill();
  },
  pause(ctx, x, y, s) {
    roundRect(ctx, x - s * 0.3, y - s * 0.38, s * 0.2, s * 0.76, s * 0.04); ctx.fill();
    roundRect(ctx, x + s * 0.1, y - s * 0.38, s * 0.2, s * 0.76, s * 0.04); ctx.fill();
  },
  next(ctx, x, y, s, flip = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip, 1);
    ctx.beginPath();
    ctx.moveTo(-s * 0.36, -s * 0.36);
    ctx.lineTo(s * 0.22, 0);
    ctx.lineTo(-s * 0.36, s * 0.36);
    ctx.closePath();
    ctx.fill();
    roundRect(ctx, s * 0.24, -s * 0.36, s * 0.12, s * 0.72, s * 0.03);
    ctx.fill();
    ctx.restore();
  },
  shuffle(ctx, x, y, s) {
    const a = s * 0.42;
    ctx.beginPath();
    ctx.moveTo(x - a, y - a * 0.55);
    ctx.bezierCurveTo(x - a * 0.1, y - a * 0.55, x + a * 0.1, y + a * 0.55, x + a * 0.8, y + a * 0.55);
    ctx.moveTo(x - a, y + a * 0.55);
    ctx.bezierCurveTo(x - a * 0.1, y + a * 0.55, x + a * 0.1, y - a * 0.55, x + a * 0.8, y - a * 0.55);
    ctx.stroke();
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + a * 0.55, y + sy * a * 0.55 - a * 0.28);
      ctx.lineTo(x + a * 0.95, y + sy * a * 0.55);
      ctx.lineTo(x + a * 0.55, y + sy * a * 0.55 + a * 0.28);
      ctx.stroke();
    }
  },
  repeat(ctx, x, y, s) {
    const w = s * 0.8, h = s * 0.5;
    roundRect(ctx, x - w / 2, y - h / 2, w, h, h * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.05, y - h / 2 - h * 0.28);
    ctx.lineTo(x + w * 0.25, y - h / 2);
    ctx.lineTo(x + w * 0.05, y - h / 2 + h * 0.28);
    ctx.stroke();
  },
  heartCheck(ctx, x, y, s, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = s * 0.1;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.2, y + s * 0.01);
    ctx.lineTo(x - s * 0.05, y + s * 0.16);
    ctx.lineTo(x + s * 0.22, y - s * 0.14);
    ctx.stroke();
    ctx.restore();
  },
  devices(ctx, x, y, s) {
    roundRect(ctx, x - s * 0.42, y - s * 0.32, s * 0.6, s * 0.5, s * 0.05); ctx.stroke();
    roundRect(ctx, x + s * 0.08, y - s * 0.12, s * 0.32, s * 0.48, s * 0.05); ctx.stroke();
  },
  share(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x - s * 0.3, y - s * 0.05);
    ctx.lineTo(x - s * 0.3, y + s * 0.38);
    ctx.lineTo(x + s * 0.3, y + s * 0.38);
    ctx.lineTo(x + s * 0.3, y - s * 0.05);
    ctx.moveTo(x, y + s * 0.12);
    ctx.lineTo(x, y - s * 0.42);
    ctx.moveTo(x - s * 0.17, y - s * 0.25);
    ctx.lineTo(x, y - s * 0.42);
    ctx.lineTo(x + s * 0.17, y - s * 0.25);
    ctx.stroke();
  },
  queue(ctx, x, y, s) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(x - s * 0.4, y - s * 0.3 + i * s * 0.3);
      ctx.lineTo(x + s * (i === 2 ? 0.05 : 0.4), y - s * 0.3 + i * s * 0.3);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + s * 0.18, y + s * 0.12);
    ctx.lineTo(x + s * 0.44, y + s * 0.3);
    ctx.lineTo(x + s * 0.18, y + s * 0.48);
    ctx.closePath();
    ctx.fill();
  },
};
