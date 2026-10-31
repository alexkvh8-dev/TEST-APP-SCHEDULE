// 0:13–0:25 · EDIT. Out of the glass, the camera pulls back from a playing viewer to
// reveal the Edit page floating in 3D with its timeline exploded forward. Clips snap
// onto the magnetic timeline, the playhead really cuts between shots in the viewer, the
// layers clap together, then the camera cranes down to a Speed Editor whose search dial
// scrubs the timeline. Ends looking straight down at the dial (match cut: dial -> wheel).

import * as E from '../lib/ease.js';
import { lerp, seg, clamp } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B } from '../lib/brand.js';
import { uiPanel, viewer, mountOn, glowBackdrop } from '../lib/stage.js';
import { topBar, pageBar, mediaPool, timeline, panel, timecode, CLIPS, label } from '../lib/ui.js';
import { makeSpeedEditor } from '../lib/hardware.js';
import { orbit, glide, settle, logLerp } from '../lib/cam.js';

export const DIAL_MATCH_R = 380; // px radius of the dial at the cut (Shot 4 matches it)
const CLIP_SHOTS = [['valley', 'golden'], ['orbit', 'golden'], ['lake', 'dawn'], ['hiker', 'golden']];

export function clipAt(p) {
  for (let k = 0; k < 4; k++) if (p >= CLIPS[k].a && p < CLIPS[k].b + 0.01) return k;
  return 0;
}

export default function create(env) {
  const { THREE, W, H, footage } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.02, 100);
  const shot = { name: 'S03 Edit', start: 13, end: 25, scene, camera, useBg: true };

  const base = uiPanel(THREE, 1920, 1080, 6.4);
  scene.add(base.mesh);
  const vw = viewer(THREE, footage, 1.6, 0.9);
  const VR = [751, 84, 889, 500];
  mountOn(base, vw.mesh, ...VR);
  const tl = uiPanel(THREE, 1920, 400, 6.4, { radius: 12 });
  const tlHome = base.rectToLocal(0, 616, 1920, 400);
  base.mesh.add(tl.mesh);

  const ed = makeSpeedEditor(THREE);
  ed.scale.setScalar(0.75);
  scene.add(ed);
  const key = new THREE.DirectionalLight('#fff4e8', 2.2);
  key.position.set(-3, 6, 4);
  scene.add(key, key.target);
  const dialW = new THREE.Vector3(), vwW = new THREE.Vector3();

  shot.update = (lt, t) => {
    glowBackdrop(env.bg, W, H, { base: '#060709', glows: [[W * 0.5, H * 0.35, 1300, B.resolve, 0.7], [W * 0.85, H * 0.1, 600, '#6a3a12', 0.3]] });

    // ---- timeline state ----
    const arrive = seg(lt, 1.6, 4.4);
    const dialTurn = seg(lt, 8.0, 11.4, E.inOutSine);
    let playhead = lerp(0.03, 0.62, seg(lt, 0.0, 7.6, E.inOutSine)) + dialTurn * 0.33;
    const k = clipAt(playhead);
    const cutFlash = E.kick(lt - 9.3, 0.02, 10);
    const [fs, fp] = CLIP_SHOTS[k];
    vw.u.uExposure.value = footage.render(lt + k * 3.1, fs, fp);
    Object.assign(vw.u.uContrast, { value: 1.06 });
    vw.u.uTeal.value = 0.7;
    vw.u.uSat.value = 1.08;
    vw.u.uBright.value = 1 + cutFlash * 0.6;

    // ---- base window ----
    const g = base.g;
    g.reset();
    g.fillStyle = B.ui; g.fillRect(0, 0, 1920, 1080);
    topBar(g, 0, 0, 1920, 'Mountain Film  —  Edit');
    mediaPool(g, 12, 46, 460, 560, lt);
    panel(g, 484, 46, 1424, 560, 'Timeline – Mountain Film');
    g.fillStyle = '#000'; g.fillRect(...VR);
    timecode(g, 1700, 62, (t - 13) * 1.0 + playhead * 120, 18);
    panel(g, 12, 616, 1896, 400);
    pageBar(g, 0, 1024, 1920, 'Edit', 1);
    base.commit();

    // ---- floating timeline (exploded, then clapped back) ----
    tl.g.reset();
    timeline(tl.g, 0, 0, 1920, 400, { playhead, arrive, t: lt, highlight: lt > 9.3 && lt < 10.4 ? k : -1 });
    tl.commit();
    const ex = 1 - seg(lt, 5.4, 6.2, E.inExpo);
    const clap = E.kick(lt - 6.2, 0.02, 9);
    tl.mesh.position.set(tlHome.x, tlHome.y + 0.12 * ex, 0.01 + 0.62 * ex);
    tl.mesh.rotation.x = -0.12 * ex;
    base.mesh.position.z = -0.03 * clap;

    // ---- Speed Editor ----
    const rise = seg(lt, 5.8, 7.6, settle);
    ed.position.set(0, lerp(-5.2, -2.85, rise), 1.75);
    ed.rotation.set(0.1, 0, 0);
    ed.visible = rise > 0;
    ed.userData.dial.rotation.y = -dialTurn * Math.PI * 3.2 - seg(lt, 11.0, 12.0, E.inQuad) * 1.2;
    ed.userData.keys[9].position.y = 0.42 - 0.05 * E.kick(lt - 9.25, 0.04, 8); // CUT key press
    ed.updateMatrixWorld(true);
    ed.userData.dial.getWorldPosition(dialW);
    vw.mesh.getWorldPosition(vwW);

    // ---- camera ----
    const pull = seg(lt, 0, 1.6, E.outExpo);
    const down = seg(lt, 6.0, 8.0, glide);
    const top = seg(lt, 10.9, 12.0, E.inOutCubic);
    let T = [lerp(vwW.x, 0, pull), lerp(vwW.y, -0.15, pull), lerp(vwW.z, 0, pull)];
    let d = logLerp(0.75, 8.6, pull) - 0.6 * seg(lt, 1.6, 6.0, E.inOutSine);
    let az = lerp(0, lerp(0.42, 0.12, seg(lt, 1.6, 6.0, E.inOutSine)), pull);
    let el = lerp(0, 0.16, pull);
    T = [lerp(T[0], dialW.x - 0.9, down), lerp(T[1], dialW.y + 0.25, down), lerp(T[2], dialW.z - 0.1, down)];
    d = lerp(d, 4.3, down);
    az = lerp(az, -0.18, down);
    el = lerp(el, 0.62, down);
    // straight down onto the dial, sized for the match cut
    const dMatch = (0.66 * 0.75 * 540) / (DIAL_MATCH_R * Math.tan(THREE.MathUtils.degToRad(17.5)));
    T = [lerp(T[0], dialW.x, top), lerp(T[1], dialW.y + 0.06, top), lerp(T[2], dialW.z, top)];
    d = lerp(d, dMatch, top);
    el = lerp(el, 1.5, top);
    az = lerp(az, 0, top);
    orbit(camera, T, d, az, el);

    // ---- type ----
    const f = env.fg;
    const scr = seg(lt, 1.8, 2.4) * (1 - seg(lt, 5.2, 5.7));
    if (scr > 0) {
      const sg = f.createLinearGradient(0, 0, 900, 0);
      sg.addColorStop(0, `rgba(5,6,8,${0.75 * scr})`); sg.addColorStop(1, 'rgba(5,6,8,0)');
      f.fillStyle = sg; f.fillRect(0, 0, 900, 420);
    }
    kText(f, 'Cut fast.', { x: 110, y: 230, size: 140, weight: 900, t: lt - 2.1, dur: 0.6, stagger: 0.03, out: lt - 5.3, colorAt: (i) => (i === 8 ? B.orange : null) });
    line(f, 'Edit with precision.', { x: 114, y: 320, size: 62, weight: 500, align: 'left', t: lt - 2.8, out: lt - 5.3 });
    line(f, 'Speed Editor', { x: 120, y: 900, size: 64, weight: 600, align: 'left', t: lt - 8.3, out: lt - 10.7 });
    line(f, 'Hands-on editing, built for Resolve.', { x: 122, y: 958, size: 32, weight: 500, align: 'left', fill: '#a9adb8', t: lt - 8.8, out: lt - 10.7, family: 'Inter', tracking: 0 });

    const camD = camera.position.distanceTo(dialW);
    return {
      bloom: [0.35, 0.5, 0.88],
      streak: 0.35, streakThreshold: 0.92,
      flash: (1 - seg(lt, 0, 0.45, E.outCubic)) * 0.7 + cutFlash * 0.12,
      flashColor: [1, 0.86, 0.68],
      zoomBlur: (1 - seg(lt, 0, 0.6, E.outQuad)) * 0.18,
      dof: lt > 6.0 ? { focus: camD, aperture: 0.0016, maxblur: 0.007 } : null,
    };
  };
  return shot;
}
