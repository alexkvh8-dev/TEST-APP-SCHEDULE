// 0:50–0:58 · FAIRLIGHT. Landing out of the whip: a 3D audio landscape — a dialogue
// track as a ridge of bars — with the Fairlight page glowing behind it. A light blade
// sweeps across: Voice Isolation strips the noise, the ragged bars settle into clean
// speech as it passes.

import * as E from '../lib/ease.js';
import { lerp, seg, clamp, noise1 } from '../lib/util.js';
import { kText, line } from '../lib/type.js';
import { B } from '../lib/brand.js';
import { uiPanel, glowBackdrop } from '../lib/stage.js';
import { topBar, pageBar, fairlight, label } from '../lib/ui.js';
import { orbit, glide } from '../lib/cam.js';

const N = 240;

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.environment = env.envDark;
  const camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 100);
  const shot = { name: 'S06 Fairlight', start: 50, end: 58, scene, camera, useBg: true };

  const ui = uiPanel(THREE, 1920, 1080, 9.6);
  ui.mesh.position.set(0, 1.6, -4.2);
  ui.mesh.rotation.y = 0.18;
  scene.add(ui.mesh);

  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(0.036, 1, 0.12), new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.6, emissive: '#ffffff', emissiveIntensity: 0.0 }), N);
  const glowMat = bars.material;
  glowMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vColor.rgb * 0.55;');
  };
  scene.add(bars);
  const blade = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 3.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.6) }));
  scene.add(blade);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshPhysicalMaterial({ color: '#07080b', roughness: 0.25, metalness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  scene.add(floor);
  const d = new THREE.Object3D(), c = new THREE.Color();
  const noisy = new THREE.Color('#9a6b62'), clean = new THREE.Color('#2bd47a'), cleanHi = new THREE.Color('#7ff0c0');

  shot.update = (lt, t) => {
    glowBackdrop(env.bg, W, H, { base: '#05060a', glows: [[W * 0.5, H * 0.3, 1300, '#132a22', 0.9], [W * 0.5, H * 0.9, 900, '#0c1a14', 0.6]] });
    const g = ui.g;
    g.reset(); g.fillStyle = B.ui; g.fillRect(0, 0, 1920, 1080);
    topBar(g, 0, 0, 1920, 'Mountain Film  —  Fairlight');
    const wipe = seg(lt, 2.4, 5.6, E.inOutSine);
    fairlight(g, 12, 46, 1896, 970, { t: lt, clean: wipe, playhead: 0.2 + lt * 0.06 });
    pageBar(g, 0, 1024, 1920, 'Fairlight', 1);
    ui.commit();

    const xw = lerp(-7.5, 7.5, wipe);
    for (let i = 0; i < N; i++) {
      const x = (i - N / 2) * 0.064;
      const ph = i * 0.11 - lt * 2.2;
      const env = Math.max(0, Math.sin(i * 0.045 - lt * 0.6)) ** 0.6;
      const syll = Math.max(0, Math.sin(i * 0.31 - lt * 2.6)) ** 1.5;
      const speech = env * (0.25 + 0.75 * syll) * (0.5 + 0.5 * Math.abs(noise1(ph * 0.6, 2)));
      const noise = 0.25 + 0.75 * Math.abs(noise1(i * 1.7 + lt * 18, 5));
      const isClean = x < xw;
      const hgt = 0.03 + (isClean ? speech * 1.15 : speech * 0.9 + noise * 0.5) * E.outExpo(seg(lt, 0.1 + i * 0.002, 0.8 + i * 0.002));
      d.position.set(x, 0, 0);
      d.scale.set(1, hgt * 2, 1);
      d.updateMatrix();
      bars.setMatrixAt(i, d.matrix);
      c.copy(isClean ? clean : noisy);
      if (isClean) c.lerp(cleanHi, clamp(hgt - 0.6));
      const near = Math.exp(-(((x - xw) / 0.25) ** 2));
      c.lerp(new THREE.Color('#ffffff'), near * 0.8);
      bars.setColorAt(i, c);
    }
    bars.instanceMatrix.needsUpdate = true;
    bars.instanceColor.needsUpdate = true;
    blade.position.set(xw, 0.2, 0.2);
    blade.visible = wipe > 0.001 && wipe < 0.999;

    const p = seg(lt, 0, 8, E.inOutSine);
    orbit(camera, [lerp(-2.6, 2.6, p), 0.2, 0], lerp(9.4, 8.4, p), lerp(-0.45, 0.32, p), lerp(0.3, 0.2, p));
    const land = 1 - E.outExpo(seg(lt, 0, 0.7));
    camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), 0.6 * land);
    camera.updateMatrixWorld(true);

    const f = env.fg;
    kText(f, 'Studio-grade sound.', { x: 110, y: 200, size: 100, weight: 900, t: lt - 0.8, dur: 0.6, stagger: 0.02, out: lt - 5.2, colorAt: (i) => (i === 18 ? B.orange : null) });
    line(f, 'Fairlight audio, built in.', { x: 114, y: 272, size: 46, weight: 500, align: 'left', fill: '#b9bcc6', t: lt - 1.5, out: lt - 5.2 });
    if (wipe > 0.02 && wipe < 0.98) {
      const [sx, sy] = env.project(new THREE.Vector3(xw, 1.45, 0.2), camera);
      f.save();
      f.globalAlpha = seg(wipe, 0.02, 0.1) * (1 - seg(wipe, 0.9, 0.98));
      f.fillStyle = 'rgba(10,12,14,0.75)'; f.beginPath(); f.roundRect(sx - 140, sy - 64, 280, 52, 26); f.fill();
      f.strokeStyle = 'rgba(127,240,192,0.8)'; f.lineWidth = 2; f.stroke();
      label(f, 'Voice Isolation', sx, sy - 38, 24, '#e9fff4', 600, 'center');
      f.restore();
    }
    line(f, 'Noise out. Voice in.', { x: W / 2, y: 980, size: 56, weight: 600, t: lt - 4.0, out: lt - 7.0 });

    return {
      bloom: [0.5, 0.5, 0.8],
      streak: 0.5, streakThreshold: 0.88,
      dirBlur: [0.25 * land * land, 0],
      flash: seg(lt, 7.5, 8.0, E.inQuad) * 0.8,
      flashColor: [0.9, 1, 0.95],
      dof: { focus: camera.position.distanceTo(new THREE.Vector3(lerp(-2.6, 2.6, p), 0.2, 0)), aperture: 0.0014, maxblur: 0.008 },
    };
  };
  return shot;
}
