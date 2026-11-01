// Product-photography lighting as environment maps: long softbox strips in a black room
// (Pro look) or a bright seamless cove (consumer look). Rotating scene.environmentRotation
// slides these strip reflections along metal and glass — Apple's signature light sweep.

export function studioEnv(THREE, renderer, kind = 'dark') {
  const scene = new THREE.Scene();
  const dark = kind === 'dark';
  scene.background = new THREE.Color(dark ? 0x000000 : 0x9a9aa0);
  const box = (w, h, pos, k, tint = [1, 1, 1]) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(k * tint[0], k * tint[1], k * tint[2]), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  if (dark) {
    box(9, 0.55, [0, 6, 0.5], 9);          // overhead strip
    box(0.5, 8, [-6, 0.5, 1.5], 7);        // left vertical strip
    box(0.4, 8, [6, 0.2, -1.5], 6);        // right rim strip
    box(7, 0.35, [0, -1.5, -6], 5);        // low back strip (edge kicker)
    box(2.2, 1.4, [-3, 2.2, 5], 2.2);      // soft key
    box(0.25, 5, [3.5, 1, 5], 8);          // thin front-right strip (screen glint)
  } else {
    // bright cove: grey room, big soft fills, a couple of crisp strips for definition
    box(16, 16, [0, 9, 0], 1.6);
    box(10, 6, [0, 2, 9], 1.4);
    box(6, 6, [-8, 2, 0], 1.0);
    box(6, 6, [8, 2, 0], 1.0);
    box(0.4, 7, [-4, 1, 6], 5);
    box(0.3, 7, [5, 1, 3], 4);
    box(12, 3, [0, -6, 0], 0.55);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, dark ? 0.01 : 0.03, 0.1, 50).texture;
  pmrem.dispose();
  return tex;
}
