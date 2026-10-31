// DaVinci Resolve / Blackmagic Design visual system.
// Logo outlines are from Simple Icons (CC0 path data; the marks are Blackmagic trademarks).
// Brand hexes: DaVinci Resolve #233A51, Blackmagic Design #FFA200 (Simple Icons data).

export const B = {
  resolve: '#233A51',   // DaVinci Resolve brand navy
  orange: '#FFA200',    // Blackmagic Design orange
  ink: '#0d0e10',       // stage black
  ui: '#1c1c1e',        // Resolve window background
  panel: '#232326',     // panel
  panel2: '#2b2b30',    // raised panel
  line: '#3a3a40',      // hairlines
  text: '#d9d9de',      // UI text
  mute: '#8b8b93',      // secondary UI text
  playhead: '#e8453c',  // timeline playhead red
  clipV: '#3e6d8f',     // video clip (teal-blue)
  clipV2: '#5a4f8f',    // second video track tint
  clipA: '#3f7a52',     // audio clip (green)
  clipFx: '#8a5a2b',    // effect / title clip
  sel: '#f0a43a',       // selection outline (warm orange)
  // the three petals: rendered as R / G / B tinted glass (stylised; see BRIEF.md)
  petals: ['#ff4b3e', '#3fe08a', '#3f8cff'],
};

export const PAGES = ['Media', 'Cut', 'Edit', 'Fusion', 'Color', 'Fairlight', 'Deliver'];

export const RESOLVE_PATH =
  'M17.621 0 5.977.004c-1.37 0-2.756.345-3.762 1.11a4.925 4.925 0 0 0-1.61 2.003C.233 3.93 0 5.02 0 5.951l.012 12.2c.002 1.604.479 3.057 1.461 4.112.984 1.056 2.462 1.683 4.331 1.691L16.856 24c1.26.005 3.095-.036 4.303-.714 1.075-.605 2.025-1.556 2.497-2.984.278-.84.345-2.084.344-3.147l-.021-11.13c-.002-.888-.15-2.023-.547-2.934-.425-.976-1.181-1.815-2.322-2.425C20.353.26 19.123 0 17.622 0zm0 .93c1.378 0 2.538.295 3.04.565.977.523 1.544 1.166 1.889 1.96.315.721.47 1.793.473 2.572l.018 11.13c.002 1.013-.097 2.257-.298 2.86-.396 1.202-1.146 1.946-2.063 2.462-.814.457-2.612.593-3.82.588l-11.05-.044c-1.657-.007-2.832-.534-3.626-1.386-.792-.851-1.212-2.06-1.212-3.485L.999 5.95c0-.829.196-1.827.474-2.437.345-.757.75-1.207 1.365-1.674C3.585 1.27 4.868.97 6.08.97z';
// The three petals as separate sub-paths (top, bottom-right, bottom-left), same 24-unit box.
export const PETAL_PATHS = [
  'M11.961 4.353c-1.976.089-3.204 1.658-3.214 3.29.019 1.443 1.635 3.481 2.884 4.53.12.099.154.109.33.18.062.025.198-.047.327-.135.36-.245.993-.947 1.648-1.738a7.67 7.67 0 0 0 1.031-1.683c.409-.89.261-1.599.235-1.888a3.983 3.983 0 0 0-.99-1.692 3.36 3.36 0 0 0-2.251-.864z',
  'M16.133 12.275a10.185 10.185 0 0 0-3.244.61c-.15.058-.26.1-.374.17-.057.036-.11.135-.105.292.017.433.29 1.278.624 2.27.384 1.135 1.066 2.27 1.844 2.74a3.23 3.23 0 0 0 2.53.342c.832-.243 1.595-.868 1.962-1.546.986-1.818.19-3.548-1.121-4.417-.447-.296-1.133-.445-1.89-.46-.074 0-.15-.002-.226-.001z',
  'M7.701 12.313a6.201 6.201 0 0 0-.752.047c-.596.078-.932.273-1.29.51a3.177 3.177 0 0 0-1.365 1.979c-.075.552-.086 1.053.033 1.507.433 1.389 1.326 2.222 2.847 2.452.636.028 1.37-.063 1.99-.45 1.269-.782 2.08-3.17 2.412-4.742.053-.176.035-.357-.013-.42-.005-.067-.044-.113-.19-.183-.398-.192-1.32-.417-2.375-.6a7.68 7.68 0 0 0-1.297-.1z',
];
export const BMD_PATH =
  'M10.385 0c-1.15 0-2.076.93-2.076 2.076V5.31c0 1.148.929 2.076 2.076 2.076h3.23c1.15 0 2.076-.93 2.076-2.076V2.076A2.074 2.074 0 0 0 13.615 0h-3.23zm0 .924h3.23c.638 0 1.155.514 1.155 1.152V5.31c0 .638-.516 1.152-1.155 1.152h-3.23A1.152 1.152 0 0 1 9.23 5.309V2.076c0-.638.516-1.152 1.155-1.152zm0 7.385c-1.15 0-2.076.929-2.076 2.076v3.23c0 1.15.929 2.076 2.076 2.076h3.23c1.15 0 2.076-.929 2.076-2.076v-3.23c0-1.15-.929-2.076-2.076-2.076h-3.23zm0 .921h3.23c.638 0 1.155.516 1.155 1.155v3.23c0 .638-.516 1.155-1.155 1.155h-3.23a1.154 1.154 0 0 1-1.155-1.155v-3.23c0-.638.516-1.155 1.155-1.155zm0 7.385c-1.15 0-2.076.93-2.076 2.076v3.233c0 1.149.929 2.076 2.076 2.076h3.23c1.15 0 2.076-.93 2.076-2.076V18.69a2.075 2.075 0 0 0-2.076-2.076h-3.23zm0 .924h3.23c.638 0 1.155.514 1.155 1.152v3.233c0 .638-.516 1.152-1.155 1.152h-3.23a1.152 1.152 0 0 1-1.155-1.152V18.69c0-.638.516-1.152 1.155-1.152Z';

const _p = {};
const path = (d) => (_p[d] ||= new Path2D(d));

// Flat 2D Resolve mark: navy rounded square, light frame, three coloured petals.
export function drawResolveIcon(ctx, x, y, size, { frame = '#c9ced6', fill = B.resolve, petals = B.petals, alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(0.5, 0.5, 23, 23, 5);
  ctx.fill();
  ctx.fillStyle = frame;
  ctx.fill(path(RESOLVE_PATH));
  PETAL_PATHS.forEach((d, i) => { ctx.fillStyle = petals[i]; ctx.fill(path(d)); });
  ctx.restore();
}

export function drawBMD(ctx, x, y, size, color = '#ffffff') {
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = color;
  ctx.fill(path(BMD_PATH));
  ctx.restore();
}

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
