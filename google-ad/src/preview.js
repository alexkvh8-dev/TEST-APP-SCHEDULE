// Interactive preview player for index.html (not loaded by the renderers): plays the film
// in real time, scrubs, and steps frame by frame. Space = play/pause, arrows = step,
// shift+arrows = 1 s, ?t=12 opens paused at 12 s.
const params = new URLSearchParams(location.search);
if (!params.has('render')) {
  const wait = () => (window.__ad && (window.__ad.ready || window.__ad.error) ? start() : setTimeout(wait, 50));
  wait();
}
function start() {
  if (window.__ad.error) return;
  const { renderAt, DURATION, FPS } = window.__ad;
  const btn = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const tc = document.getElementById('tc');
  scrub.max = DURATION;
  let t = Number(params.get('t') || 0), playing = !params.has('t'), last = performance.now();
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(2).padStart(5, '0')}`;
  btn.onclick = () => { playing = !playing; last = performance.now(); };
  scrub.oninput = () => { t = Number(scrub.value); playing = false; };
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { playing = !playing; last = performance.now(); e.preventDefault(); }
    if (e.code === 'ArrowRight') t = Math.min(DURATION, t + (e.shiftKey ? 1 : 1 / FPS));
    if (e.code === 'ArrowLeft') t = Math.max(0, t - (e.shiftKey ? 1 : 1 / FPS));
  });
  const loop = (now) => {
    if (playing) { t += (now - last) / 1000; if (t >= DURATION) t = 0; }
    last = now;
    renderAt(t);
    scrub.value = t;
    tc.textContent = fmt(t);
    btn.textContent = playing ? '❚❚' : '▶';
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
