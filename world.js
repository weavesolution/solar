import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Radius of the tiny planet you build on
const R = 10;

// Sky colour and how visible the stars are on each planet
const SKY = {
  Mercury: { c: '#15110e', stars: 1 },
  Venus:   { c: '#a9772c', stars: 0.15 },
  Earth:   { c: '#4f9ad8', stars: 0.1 },
  Mars:    { c: '#b67a52', stars: 0.25 },
  Jupiter: { c: '#2e2117', stars: 0.9 },
  Saturn:  { c: '#251f16', stars: 0.9 },
  Uranus:  { c: '#5fbac2', stars: 0.3 },
  Neptune: { c: '#132a66', stars: 0.8 }
};

// ---------------- BUILDING ITEMS (made from simple shapes) ----------------
const matCache = new Map();
function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return matCache.get(key);
}
function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const glowMat = (c) => mat(c, { emissive: c, emissiveIntensity: 0.9 });

const ITEMS = [
  {
    id: 'house', icon: '🏠', name: 'House', build(g) {
      g.add(part(new THREE.BoxGeometry(1.2, 0.9, 1), mat('#efe3c8'), 0, 0.45, 0));
      const roof = part(new THREE.ConeGeometry(0.95, 0.7, 4), mat('#c0533a'), 0, 1.25, 0);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      g.add(part(new THREE.BoxGeometry(0.28, 0.5, 0.04), mat('#6b4a2f'), 0, 0.25, 0.51));
      g.add(part(new THREE.BoxGeometry(0.25, 0.22, 0.04), glowMat('#ffd27a'), 0.38, 0.55, 0.51));
      g.add(part(new THREE.BoxGeometry(0.25, 0.22, 0.04), glowMat('#ffd27a'), -0.38, 0.55, 0.51));
    }
  },
  {
    id: 'tower', icon: '🏢', name: 'Tower', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.45, 0.5, 2.6, 20), mat('#b9c0cc', { metalness: 0.3 }), 0, 1.3, 0));
      for (let i = 0; i < 4; i++) {
        g.add(part(new THREE.CylinderGeometry(0.47, 0.47, 0.08, 20), glowMat('#7fd8ff'), 0, 0.6 + i * 0.5, 0));
      }
      g.add(part(new THREE.ConeGeometry(0.45, 0.5, 20), mat('#8a93a3'), 0, 2.85, 0));
      g.add(part(new THREE.SphereGeometry(0.08, 10, 10), glowMat('#ff5a4d'), 0, 3.15, 0));
    }
  },
  {
    id: 'tree', icon: '🌳', name: 'Tree', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.1, 0.14, 0.7, 8), mat('#7a5232'), 0, 0.35, 0));
      g.add(part(new THREE.IcosahedronGeometry(0.55, 1), mat('#4f9d3a', { flatShading: true }), 0, 1.05, 0));
    }
  },
  {
    id: 'pine', icon: '🌲', name: 'Pine', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8), mat('#6b4a2f'), 0, 0.2, 0));
      g.add(part(new THREE.ConeGeometry(0.55, 0.9, 8), mat('#2f6b3a', { flatShading: true }), 0, 0.75, 0));
      g.add(part(new THREE.ConeGeometry(0.4, 0.7, 8), mat('#3a7d45', { flatShading: true }), 0, 1.2, 0));
    }
  },
  {
    id: 'bush', icon: '🌸', name: 'Flowers', build(g) {
      const green = mat('#5aa646', { flatShading: true });
      g.add(part(new THREE.IcosahedronGeometry(0.32, 0), green, 0, 0.25, 0));
      g.add(part(new THREE.IcosahedronGeometry(0.25, 0), green, 0.3, 0.2, 0.1));
      g.add(part(new THREE.IcosahedronGeometry(0.22, 0), green, -0.28, 0.18, -0.05));
      const pink = mat('#ff8fc7');
      [[0, 0.55, 0.1], [0.3, 0.42, 0.2], [-0.25, 0.4, 0.12], [0.1, 0.45, -0.25], [-0.1, 0.35, 0.3]].forEach(([x, y, z]) =>
        g.add(part(new THREE.SphereGeometry(0.07, 8, 8), pink, x, y, z)));
    }
  },
  {
    id: 'rock', icon: '🪨', name: 'Rock', build(g) {
      const r = part(new THREE.DodecahedronGeometry(0.5, 0), mat('#8b857d', { flatShading: true }), 0, 0.25, 0);
      r.scale.set(1, 0.7, 1.2);
      g.add(r);
    }
  },
  {
    id: 'crystal', icon: '💎', name: 'Crystal', build(g) {
      const m = mat('#b07cff', { emissive: '#7a3cff', emissiveIntensity: 0.6, roughness: 0.2 });
      const a = part(new THREE.OctahedronGeometry(0.35, 0), m, 0, 0.6, 0);
      a.scale.set(1, 2, 1);
      const b = part(new THREE.OctahedronGeometry(0.22, 0), m, 0.3, 0.35, 0.1);
      b.scale.set(1, 2, 1);
      b.rotation.z = -0.5;
      const c = part(new THREE.OctahedronGeometry(0.2, 0), m, -0.28, 0.3, -0.05);
      c.scale.set(1, 2, 1);
      c.rotation.z = 0.5;
      g.add(a, b, c);
    }
  },
  {
    id: 'dome', icon: '🫧', name: 'Dome', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 32), mat('#9aa1ab', { metalness: 0.4 }), 0, 0.06, 0));
      g.add(part(new THREE.IcosahedronGeometry(0.3, 1), mat('#4f9d3a', { flatShading: true }), 0, 0.4, 0));
      const glass = new THREE.Mesh(
        new THREE.SphereGeometry(0.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat('#9fe8ff', { transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.1, depthWrite: false })
      );
      glass.position.y = 0.12;
      g.add(glass);
    }
  },
  {
    id: 'rocket', icon: '🚀', name: 'Rocket', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.2, 0.28, 0.2, 16), mat('#444a55'), 0, 0.1, 0));
      g.add(part(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 24), mat('#f2f2f2'), 0, 1.0, 0));
      g.add(part(new THREE.ConeGeometry(0.3, 0.6, 24), mat('#d9423a'), 0, 2.1, 0));
      g.add(part(new THREE.SphereGeometry(0.1, 12, 12), glowMat('#7fd8ff'), 0, 1.35, 0.28));
      for (let i = 0; i < 3; i++) {
        const fin = part(new THREE.BoxGeometry(0.06, 0.5, 0.35), mat('#d9423a'));
        const a = (i / 3) * Math.PI * 2;
        fin.position.set(Math.sin(a) * 0.36, 0.45, Math.cos(a) * 0.36);
        fin.rotation.y = a;
        g.add(fin);
      }
    }
  },
  {
    id: 'rover', icon: '🚙', name: 'Rover', build(g) {
      g.add(part(new THREE.BoxGeometry(1, 0.35, 0.65), mat('#e8e8e8'), 0, 0.45, 0));
      const wheel = mat('#2b2b2b');
      [[0.35, 0.36], [0.35, -0.36], [-0.35, 0.36], [-0.35, -0.36]].forEach(([x, z]) => {
        const w = part(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), wheel, x, 0.18, z);
        w.rotation.x = Math.PI / 2;
        g.add(w);
      });
      g.add(part(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), mat('#888'), 0.3, 0.85, 0));
      g.add(part(new THREE.BoxGeometry(0.18, 0.12, 0.14), mat('#3a3f48'), 0.3, 1.12, 0));
      g.add(part(new THREE.BoxGeometry(0.5, 0.03, 0.5), mat('#1d3f8f', { metalness: 0.5, roughness: 0.3 }), -0.2, 0.65, 0));
    }
  },
  {
    id: 'solar', icon: '🔋', name: 'Solar panel', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 8), mat('#888'), 0, 0.3, 0));
      const p = part(new THREE.BoxGeometry(1.1, 0.04, 0.7), mat('#1d3f8f', { metalness: 0.5, roughness: 0.3 }), 0, 0.65, 0);
      p.rotation.x = -0.5;
      g.add(p);
    }
  },
  {
    id: 'dish', icon: '📡', name: 'Dish', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.08, 0.14, 0.8, 10), mat('#9aa1ab'), 0, 0.4, 0));
      const bowl = part(new THREE.SphereGeometry(0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), mat('#e6e6e6', { side: THREE.DoubleSide }), 0, 1.15, 0);
      bowl.rotation.x = Math.PI - 0.6;
      g.add(bowl);
      g.add(part(new THREE.SphereGeometry(0.06, 8, 8), glowMat('#ff5a4d'), 0, 1.0, 0.2));
    }
  },
  {
    id: 'lamp', icon: '💡', name: 'Lamp', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.04, 0.06, 1.6, 8), mat('#3a3f48'), 0, 0.8, 0));
      g.add(part(new THREE.SphereGeometry(0.15, 16, 16), glowMat('#ffe28a'), 0, 1.65, 0));
    }
  },
  {
    id: 'flag', icon: '🚩', name: 'Flag', build(g) {
      g.add(part(new THREE.CylinderGeometry(0.03, 0.03, 1.8, 8), mat('#cfcfcf'), 0, 0.9, 0));
      g.add(part(new THREE.PlaneGeometry(0.7, 0.45), mat('#ff7a3d', { side: THREE.DoubleSide }), 0.35, 1.55, 0));
    }
  }
];
const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// ---------------- WORLD ----------------
export function createWorld({ renderer, starsTex, onExit }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.rotateSpeed = 0.7;
  controls.minDistance = R + 2.5;
  controls.maxDistance = R * 4.5;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 90 });
  scene.add(sun, sun.target);

  const starSphere = new THREE.Mesh(
    new THREE.SphereGeometry(800, 48, 48),
    new THREE.MeshBasicMaterial({ map: starsTex, side: THREE.BackSide, transparent: true, depthWrite: false })
  );
  scene.add(starSphere);

  const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), new THREE.MeshStandardMaterial({ roughness: 1 }));
  globe.receiveShadow = true;
  scene.add(globe);

  const itemsGroup = new THREE.Group();
  scene.add(itemsGroup);

  const selRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.05, 48),
    new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.04;

  let skyRing = null;
  let planet = null;
  let active = false;
  let tool = null;
  let selected = null;
  let moving = false;
  let intro = null;
  let time = 0;

  // ---------- UI ----------
  const ui = document.getElementById('surfaceUI');
  const sName = document.getElementById('sName');
  const sCount = document.getElementById('sCount');
  const sHint = document.getElementById('sHint');
  const selBar = document.getElementById('selBar');
  const palette = document.getElementById('palette');

  for (const it of ITEMS) {
    const b = document.createElement('button');
    b.className = 'tool';
    b.dataset.id = it.id;
    b.innerHTML = `<span class="ic">${it.icon}</span><span class="nm">${it.name}</span>`;
    b.addEventListener('click', () => {
      deselect();
      tool = tool === it.id ? null : it.id;
      refreshUI();
    });
    palette.appendChild(b);
  }

  document.getElementById('takeOffBtn').addEventListener('click', () => onExit && onExit());
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (!itemsGroup.children.length) return;
    if (!confirm(`Remove everything you built on ${planet.name}?`)) return;
    deselect();
    while (itemsGroup.children.length) removeObj(itemsGroup.children[0]);
    save();
    refreshUI();
  });

  selBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !selected) return;
    const rec = selected.userData.rec;
    switch (btn.dataset.act) {
      case 'rotate': rec.rot += Math.PI / 4; break;
      case 'move': moving = !moving; break;
      case 'bigger': rec.s = Math.min(2.5, rec.s * 1.15); break;
      case 'smaller': rec.s = Math.max(0.4, rec.s / 1.15); break;
      case 'delete': {
        const obj = selected;
        deselect();
        removeObj(obj);
        save();
        refreshUI();
        return;
      }
      case 'done': deselect(); refreshUI(); return;
    }
    applyTransform(selected);
    save();
    refreshUI();
  });

  function refreshUI() {
    const n = itemsGroup.children.length;
    sCount.textContent = n === 1 ? '1 item' : `${n} items`;
    for (const b of palette.children) b.classList.toggle('active', b.dataset.id === tool);
    selBar.classList.toggle('hidden', !selected);
    selBar.querySelector('[data-act="move"]').classList.toggle('on', moving);
    if (selected && moving) sHint.textContent = 'Tap the ground where it should go';
    else if (selected) sHint.textContent = 'Rotate, resize, move or delete it';
    else if (tool) sHint.textContent = `Tap the ground to place a ${ITEM_BY_ID[tool].name.toLowerCase()}`;
    else sHint.textContent = 'Pick an item below, then tap the ground';
  }

  // ---------- items ----------
  function applyTransform(obj) {
    const rec = obj.userData.rec;
    const n = new THREE.Vector3().fromArray(rec.n).normalize();
    obj.position.copy(n).multiplyScalar(R - 0.05);
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    obj.rotateY(rec.rot);
    obj.scale.setScalar(rec.s);
  }

  function addItem(rec) {
    const def = ITEM_BY_ID[rec.t];
    if (!def) return null;
    const g = new THREE.Group();
    def.build(g);
    g.userData.rec = rec;
    applyTransform(g);
    itemsGroup.add(g);
    return g;
  }

  function removeObj(obj) {
    if (selRing.parent === obj) obj.remove(selRing);
    obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    itemsGroup.remove(obj);
  }

  function select(obj) {
    deselect();
    selected = obj;
    tool = null;
    obj.add(selRing);
  }

  function deselect() {
    if (selected && selRing.parent === selected) selected.remove(selRing);
    selected = null;
    moving = false;
  }

  // ---------- saving (in this browser) ----------
  const key = () => 'solarWorld_' + planet.name;
  function save() {
    const data = itemsGroup.children.map((o) => {
      const r = o.userData.rec;
      return { t: r.t, n: r.n.map((v) => +v.toFixed(4)), rot: +r.rot.toFixed(3), s: +r.s.toFixed(2) };
    });
    try { localStorage.setItem(key(), JSON.stringify(data)); } catch (e) { /* storage blocked */ }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(key()) || '[]');
      if (Array.isArray(data)) data.forEach((r) => addItem({ t: r.t, n: r.n, rot: r.rot || 0, s: r.s || 1 }));
    } catch (e) { /* nothing saved */ }
  }

  // ---------- tapping ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0, downY = 0;
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => { if (active) { downX = e.clientX; downY = e.clientY; } });
  canvas.addEventListener('pointerup', (e) => {
    if (!active || intro) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const groundHit = raycaster.intersectObject(globe, false)[0];
    const itemHit = raycaster.intersectObjects(itemsGroup.children, true)[0];

    if (selected && moving && groundHit) {
      selected.userData.rec.n = groundHit.point.clone().normalize().toArray();
      applyTransform(selected);
      moving = false;
      save();
      refreshUI();
      return;
    }
    if (itemHit && (!groundHit || itemHit.distance <= groundHit.distance)) {
      let obj = itemHit.object;
      while (obj.parent !== itemsGroup) obj = obj.parent;
      select(obj);
      refreshUI();
      return;
    }
    if (tool && groundHit) {
      addItem({
        t: tool,
        n: groundHit.point.clone().normalize().toArray(),
        rot: Math.random() * Math.PI * 2,
        s: 0.9 + Math.random() * 0.2
      });
      save();
      refreshUI();
      return;
    }
    if (selected) { deselect(); refreshUI(); }
  });

  // ---------- enter / exit ----------
  function enter(p) {
    planet = p;
    active = true;
    const sky = SKY[p.name] || { c: '#000000', stars: 1 };
    scene.background = new THREE.Color(sky.c);
    starSphere.material.opacity = sky.stars;
    globe.material.map = p.mesh.material.map;
    globe.material.needsUpdate = true;

    if (skyRing) { scene.remove(skyRing); skyRing.geometry.dispose(); skyRing = null; }
    if (p.ringTex) {
      const inner = R * 1.4, outer = R * 2.3;
      const geo = new THREE.RingGeometry(inner, outer, 128, 1);
      const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
      }
      skyRing = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        map: p.ringTex, color: 0xdddddd, transparent: true, side: THREE.DoubleSide, depthWrite: false
      }));
      skyRing.rotation.x = -Math.PI / 2 + 0.35;
      scene.add(skyRing);
    }

    while (itemsGroup.children.length) removeObj(itemsGroup.children[0]);
    load();
    tool = null;
    deselect();

    controls.target.set(0, 0, 0);
    intro = { t: 0, from: new THREE.Vector3(0, R * 1.6, R * 5.5), to: new THREE.Vector3(0, R * 0.9, R * 2.6) };
    camera.position.copy(intro.from);
    controls.enabled = false;

    sName.textContent = p.name;
    ui.classList.remove('hidden');
    refreshUI();
  }

  function exit() {
    active = false;
    controls.enabled = false;
    deselect();
    tool = null;
    ui.classList.add('hidden');
  }

  // ---------- per frame ----------
  const right = new THREE.Vector3(), up = new THREE.Vector3();
  function update(dt) {
    time += dt;
    if (intro) {
      intro.t = Math.min(1, intro.t + dt / 1.3);
      const e = 1 - Math.pow(1 - intro.t, 3);
      camera.position.lerpVectors(intro.from, intro.to, e);
      camera.lookAt(0, 0, 0);
      if (intro.t >= 1) { intro = null; controls.enabled = true; }
    } else {
      controls.update();
    }
    // Light always comes from over your shoulder, so the side you build on is lit
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    sun.position.copy(camera.position).addScaledVector(right, -10).addScaledVector(up, 12).setLength(40);
    if (skyRing) skyRing.rotation.z += dt * 0.01;
    if (selected) selRing.material.opacity = 0.55 + 0.45 * Math.sin(time * 5);
  }

  function render() { renderer.render(scene, camera); }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  return { enter, exit, update, render, resize };
}
