// 0:25–0:41 · COLOR. Match cut: the dial becomes the Gamma wheel's hue ring (same size,
// same place). Pull back to the Color page floating above a trackball panel. As the
// trackballs roll, the footage grades live — flat camera log to a contrasty teal/orange
// look — with the wheels' pucks, the RGB parade (computed from real pixels) and the node
// graph all moving in sync. Rack focus to the viewer for a before/after wipe, then a
// burst of looks, then a dive into a node (cut to Fusion).

import * as E from '../lib/ease.js';
import { lerp, seg, clamp, TAU } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B } from '../lib/brand.js';
import { uiPanel, viewer, mountOn, glowBackdrop } from '../lib/stage.js';
import { topBar, pageBar, panel, colorWheels, parade, nodeGraph, label } from '../lib/ui.js';
import { makeScopes } from '../lib/footage.js';
import { makeTrackballPanel } from '../lib/hardware.js';
import { orbit, glide, settle, logLerp } from '../lib/cam.js';
import { DIAL_MATCH_R } from './s03-edit.js';

const LOOKS = {
  log: { log: 1, con: 1, sat: 1, teal: 0, gain: [1, 1, 1], lift: [0, 0, 0], gamma: [1, 1, 1] },
  A: { log: 0, con: 1.2, sat: 1.18, teal: 1, gain: [1.07, 1.0, 0.92], lift: [-0.025, -0.004, 0.032], gamma: [1.0, 1.0, 1.02] },
  B: { log: 0, con: 1.28, sat: 0.82, teal: 0.25, gain: [0.9, 0.98, 1.12], lift: [0, 0.01, 0.04], gamma: [0.97, 1.0, 1.04] },
  C: { log: 0, con: 0.92, sat: 0.88, teal: 0.2, gain: [1.1, 1.02, 0.86], lift: [0.045, 0.025, 0.0], gamma: [1.04, 1.0, 0.96] },
};
const mixLook = (a, b, p) => {
  const o = {};
  for (const k in a) o[k] = Array.isArray(a[k]) ? a[k].map((v, i) => lerp(v, b[k][i], p)) : lerp(a[k], b[k], p);
  return o;
};

export default function create(env) {
  const { THREE, W, H, footage } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.02, 100);
  const shot = { name: 'S04 Color', start: 25, end: 41, scene, camera, useBg: true };

  const base = uiPanel(THREE, 1920, 1080, 6.4);
  scene.add(base.mesh);
  const VR = [480, 50, 960, 540];
  const vw = viewer(THREE, footage, 1.6, 0.9);
  mountOn(base, vw.mesh, ...VR);
  const scopes = makeScopes(env, vw.u);

  const tb = makeTrackballPanel(THREE);
  tb.scale.setScalar(0.82);
  tb.position.set(0, -2.95, 1.9);
  tb.rotation.x = 0.12;
  scene.add(tb);
  const key = new THREE.DirectionalLight('#fff1e0', 2.0);
  key.position.set(-3, 6, 5);
  scene.add(key);

  // the Gamma wheel's centre on the canvas (see colorWheels layout) -> panel-local
  const WP = { x: 12, y: 688, w: 1180, h: 330 };
  const wr = Math.min((WP.w - 60) / 8, WP.h * 0.3);
  const gammaPx = [WP.x + (WP.w / 4) * 1.5, WP.y + 40 + wr + 18 + 8];
  const gammaL = base.rectToLocal(gammaPx[0], gammaPx[1], 0, 0);
  const ringWorldR = (wr / 1920) * 6.4;
  const dMatch = (ringWorldR * 540) / (DIAL_MATCH_R * Math.tan(THREE.MathUtils.degToRad(17.5)));
  const nodePx = [1452 + 228, 40 + 280];
  const nodeL = base.rectToLocal(nodePx[0], nodePx[1], 0, 0);
  const vwW = new THREE.Vector3(), tbW = new THREE.Vector3();
  let scope = null;

  shot.update = (lt, t) => {
    glowBackdrop(env.bg, W, H, { base: '#060709', glows: [[W * 0.5, H * 0.3, 1300, B.resolve, 0.75], [W * 0.15, H * 0.9, 700, '#5a2f10', 0.35]] });

    // ---- the grade ----
    const gr = seg(lt, 2.0, 5.4, E.inOutCubic);
    let L = mixLook(LOOKS.log, LOOKS.A, gr);
    const lookT = [[11.3, 'B'], [12.0, 'C'], [12.7, 'A']];
    let flash = 0;
    let prev = LOOKS.A;
    for (const [t0, name] of lookT) {
      const p = seg(lt, t0, t0 + 0.18, E.inOutSine);
      if (p > 0) { L = mixLook(prev, LOOKS[name], p); flash += E.kick(lt - t0, 0.02, 12) * 0.12; }
      prev = LOOKS[name];
      if (p < 1) break;
    }
    const vign = seg(lt, 10.0, 10.6);
    footage.render(lt + 6, lt < 9 ? 'hiker' : 'valley', 'golden');
    const u = vw.u;
    u.uExposure.value = 1.0;
    u.uLog.value = L.log; u.uContrast.value = L.con; u.uSat.value = L.sat; u.uTeal.value = L.teal;
    u.uGain.value.set(...L.gain); u.uLift.value.set(...L.lift); u.uGamma.value.set(...L.gamma);
    u.uVignette.value = 0.55 * vign;
    const split = seg(lt, 6.0, 8.6, E.inOutCubic);
    u.uSplit.value = lt > 5.8 && lt < 8.8 ? 1 - split : -1;
    if (Math.round(lt * 30) % 2 === 0 || !scope) scope = scopes.sample();

    // ---- pucks follow the grade; trackballs roll with them ----
    const dir = (deg, m) => [Math.sin(deg * Math.PI / 180) * m, -Math.cos(deg * Math.PI / 180) * m];
    const lift = dir(200, 0.5 * (L.teal)), gain = dir(32, 0.45 * Math.max(0, L.gain[0] - L.gain[2]) * 6), gamma = dir(40, 0.15 * gr);
    const pucks = [[...lift, (L.con - 1) * 2], [...gamma, 0], [...gain, (L.sat - 1) * 2], [0, 0, 0]];
    tb.userData.balls.forEach((b, i) => {
      const p = pucks[i] || [0, 0];
      b.rotation.set(p[1] * 2.6 + lt * 0.05, 0, -p[0] * 2.6);
    });
    tb.userData.rings.forEach((r, i) => (r.rotation.y = (pucks[i][2] || 0) * 3));
    tb.userData.knobs.forEach((k, i) => (k.rotation.y = Math.sin(lt * 0.8 + i) * 0.6 * gr));

    // ---- Color page UI ----
    const g = base.g;
    g.reset();
    g.fillStyle = B.ui; g.fillRect(0, 0, 1920, 1080);
    topBar(g, 0, 0, 1920, 'Mountain Film  —  Color');
    panel(g, 12, 40, 452, 560, 'Gallery');
    const tints = ['#c9874d', '#6f8fb8', '#8aa06a', '#b07a8c', '#d0a35a', '#5e7fa6'];
    for (let i = 0; i < 6; i++) { g.fillStyle = tints[i]; g.beginPath(); g.roundRect(28 + (i % 2) * 214, 80 + Math.floor(i / 2) * 160, 196, 112, 4); g.fill(); }
    panel(g, 474, 40, 972, 560);
    g.fillStyle = '#000'; g.fillRect(...VR);
    const nodes = [
      { x: 30, y: 60, w: 150, h: 96, label: '01 Balance', thumb: '#b88a5a', a: 1 },
      { x: 250, y: 120, w: 150, h: 96, label: '02 Contrast', thumb: '#9a7a62', a: E.outBack(1.4)(seg(lt, 9.4, 9.8)) },
      { x: 30, y: 250, w: 150, h: 96, label: '03 Look', thumb: '#6f8c9c', a: E.outBack(1.4)(seg(lt, 9.7, 10.1)) },
      { x: 250, y: 330, w: 150, h: 96, label: '04 Vignette', thumb: '#556070', a: E.outBack(1.4)(seg(lt, 10.0, 10.4)), sel: lt > 10.0 && lt < 11.2 },
      { x: 150, y: 450, w: 150, h: 70, label: 'Output', col: '#2c2c33', a: 1 },
    ];
    nodeGraph(g, 1452, 40, 456, 560, nodes, [[0, 1], [1, 2], [2, 3], [3, 4]], { flow: lt * 0.6, title: 'Nodes' });
    panel(g, 12, 606, 1896, 74);
    for (let i = 0; i < 12; i++) {
      g.fillStyle = tints[i % 6]; g.beginPath(); g.roundRect(24 + i * 156, 616, 146, 54, 4); g.fill();
      if (i === 3) { g.strokeStyle = B.sel; g.lineWidth = 3; g.beginPath(); g.roundRect(24 + i * 156, 616, 146, 54, 4); g.stroke(); }
    }
    colorWheels(g, WP.x, WP.y, WP.w, WP.h, pucks, lt);
    parade(g, 1200, 688, 708, 330, scope);
    pageBar(g, 0, 1024, 1920, 'Color', 1);
    base.commit();

    // ---- camera ----
    base.mesh.updateMatrixWorld(true);
    vw.mesh.getWorldPosition(vwW);
    tb.userData.balls[1].getWorldPosition(tbW);
    const pull = seg(lt, 0, 1.9, E.outExpo);
    const toViewer = seg(lt, 5.4, 6.2, glide) * (1 - seg(lt, 8.9, 9.6, glide));
    const toNodes = seg(lt, 8.9, 9.7, glide);
    const dive = seg(lt, 14.6, 16.0, E.inExpo);
    let T = [lerp(gammaL.x, 0, pull), lerp(gammaL.y, -1.45, pull), lerp(0, 1.25, pull)];
    let d = logLerp(dMatch, 7.6, pull);
    let az = lerp(0, 0.16 * Math.sin(lt * 0.25), pull), el = lerp(0, 0.4, pull);
    T = [lerp(T[0], vwW.x, toViewer), lerp(T[1], vwW.y, toViewer), lerp(T[2], vwW.z, toViewer)];
    d = lerp(d, 3.15, toViewer);
    el = lerp(el, 0.02, toViewer);
    az = lerp(az, 0.0, toViewer);
    T = [lerp(T[0], nodeL.x, toNodes), lerp(T[1], nodeL.y, toNodes), lerp(T[2], 0, toNodes)];
    d = lerp(d, 3.4, toNodes);
    az = lerp(az, -0.22, toNodes);
    el = lerp(el, 0.04, toNodes);
    d = lerp(d, 0.35, dive);
    orbit(camera, T, d, az, el);

    // ---- type ----
    const f = env.fg;
    const scr = seg(lt, 2.2, 2.7) * (1 - seg(lt, 5.0, 5.5));
    if (scr > 0) { const sg = f.createLinearGradient(0, 0, 0, 300); sg.addColorStop(0, `rgba(5,6,8,${0.8 * scr})`); sg.addColorStop(1, 'rgba(5,6,8,0)'); f.fillStyle = sg; f.fillRect(0, 0, W, 300); }
    kText(f, 'Hollywood-grade color.', { x: W / 2, y: 140, size: 96, weight: 900, align: 'center', t: lt - 2.4, dur: 0.6, stagger: 0.02, out: lt - 5.2, outStagger: 0.01, colorAt: (i) => (i === 21 ? B.orange : null) });
    line(f, 'Roll the trackballs. Watch it change.', { x: W / 2, y: 205, size: 38, weight: 500, fill: '#b9bcc6', t: lt - 3.0, out: lt - 5.2, family: 'Inter', tracking: 0 });
    if (lt > 6.2 && lt < 8.8) {
      const a = seg(lt, 6.2, 6.6) * (1 - seg(lt, 8.4, 8.8));
      f.save(); f.globalAlpha = a;
      for (const [s, x] of [['BEFORE', 360], ['AFTER', W - 360]]) {
        f.fillStyle = 'rgba(0,0,0,0.55)'; f.beginPath(); f.roundRect(x - 90, 96, 180, 50, 25); f.fill();
        label(f, s, x, 122, 22, '#fff', 700, 'center');
      }
      f.restore();
    }
    kText(f, 'Nodes, not limits.', { x: 110, y: 900, size: 96, weight: 900, t: lt - 9.9, dur: 0.6, stagger: 0.025, out: lt - 13.6, colorAt: (i) => (i === 17 ? B.orange : null) });
    line(f, 'Any look, in seconds.', { x: 114, y: 970, size: 44, weight: 500, align: 'left', fill: '#b9bcc6', t: lt - 10.6, out: lt - 13.6 });

    const focusD = toViewer > 0.5 ? camera.position.distanceTo(vwW) : camera.position.distanceTo(tbW);
    return {
      bloom: [0.35, 0.5, 0.88],
      streak: 0.3, streakThreshold: 0.92,
      flash: flash + dive * dive * 0.8,
      flashColor: [1, 0.86, 0.66],
      zoomBlur: dive * 0.3,
      dof: lt > 1.9 && dive < 0.3 ? { focus: focusD, aperture: toNodes > 0.5 ? 0.0006 : 0.0016, maxblur: 0.008 } : null,
    };
  };
  return shot;
}
