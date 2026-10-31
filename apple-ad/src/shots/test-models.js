// Development-only turntable for checking models and materials (?test=models).
import { makeIPhone, makeWatch, makeAirPods, makeMacBook } from '../lib/models.js';

export default function create(env) {
  const { THREE, W, H } = env;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#000');
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.01, 100);
  const pro = makeIPhone(THREE, { finish: 'titanium', pro: true, internals: true });
  const col = makeIPhone(THREE, { finish: 'ultramarine', pro: false });
  const watch = makeWatch(THREE);
  const pods = makeAirPods(THREE);
  const mac = makeMacBook(THREE);
  scene.add(pro, col, watch, pods, mac);
  return {
    name: 'test', start: 0, end: 60, scene, camera,
    update(lt) {
      // t 0..10: pro back; 10..20 pro front; 20..30 colour back; 30..40 watch+pods; 40..50 mac; 50..60 exploded
      const mode = Math.floor(lt / 10), a = (lt % 10) / 10;
      [pro, col, watch, pods, mac].forEach((o) => (o.visible = false));
      scene.environment = mode === 4 || mode === 3 ? env.envLight : env.envDark;
      scene.background = new THREE.Color(mode === 4 || mode === 3 ? '#f5f5f7' : '#000');
      scene.environmentRotation.y = a * Math.PI * 2;
      camera.position.set(0, 0, 3.2);
      camera.lookAt(0, 0, 0);
      if (mode === 0 || mode === 1 || mode === 5) {
        pro.visible = true;
        pro.rotation.set(0.1, mode === 0 ? Math.PI + 0.5 : mode === 1 ? -0.4 : -0.9, 0);
        pro.userData.drawScreen({ wake: 1, t: lt, island: mode === 1 ? 1 : 0, glow: mode === 1 ? 0.8 : 0 });
        pro.userData.scrMat.emissiveIntensity = 1;
        const e = mode === 5 ? 1 : 0;
        const u = pro.userData;
        u.front.position.z = 0.0375 + 0.4 * e;
        u.back.position.z = -0.0375 - 0.4 * e;
        u.mid.position.z = 0.2 * e; u.board.position.z = 0.07 * e; u.battery.position.z = -0.06 * e; u.camMod.position.z = -0.2 * e;
        u.drawBoard(lt, e);
        if (mode === 5) camera.position.set(2.2, 0.6, 2.6), camera.lookAt(0, 0, 0);
      } else if (mode === 2) {
        col.visible = true;
        col.rotation.set(0.1, Math.PI + 0.5, 0);
      } else if (mode === 3) {
        watch.visible = pods.visible = true;
        watch.position.set(-0.45, 0, 0); watch.rotation.set(0.1, -0.4, 0); watch.userData.draw(lt, 1);
        pods.position.set(0.5, -0.1, 0); pods.rotation.set(0.15, -0.5, 0);
        camera.position.set(0, 0.2, 2.6); camera.lookAt(0, 0, 0);
      } else {
        mac.visible = true;
        mac.userData.hinge.rotation.x = -0.26;
        mac.userData.draw(lt, 1);
        camera.position.set(0, 2.2, 6.5); camera.lookAt(0, 0.8, 0);
      }
      return { bloom: [0.3, 0.45, 0.9] };
    },
  };
}
