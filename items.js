import * as THREE from 'three';

// ---------------- MATERIAL HELPERS ----------------
const matCache = new Map();
const glowSet = new Set();

export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts }));
  return matCache.get(key);
}

// Glowing materials (windows, lamps). Their brightness follows day/night and power.
export function glowMat(color) {
  const key = 'glow|' + color;
  if (!matCache.has(key)) {
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.5 });
    matCache.set(key, m);
    glowSet.add(m);
  }
  return matCache.get(key);
}
export function setGlowLevel(v) { for (const m of glowSet) m.emissiveIntensity = v; }

export function part(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (rt, rb, h, s = 12) => new THREE.CylinderGeometry(rt, rb, h, s);
const S = (r, s = 16) => new THREE.SphereGeometry(r, s, s);
const K = (r, h, s = 12) => new THREE.ConeGeometry(r, h, s);

// ---------------- ITEMS ----------------
// color = default main colour (can be repainted). people / power feed the population stats.
// only = planets where this special item appears.
export const ITEMS = [
  // ===== Planet specials =====
  {
    id: 'sunshield', icon: '🪞', name: 'Sun collector', color: '#d8dde6', power: 25, only: ['Mercury'],
    build(g, c) {
      g.add(part(C(0.05, 0.06, 1.0), mat('#777'), -0.6, 0.5, 0));
      g.add(part(C(0.05, 0.06, 1.0), mat('#777'), 0.6, 0.5, 0));
      const p = part(B(1.7, 0.05, 1.0), mat(c, { metalness: 0.9, roughness: 0.15 }), 0, 1.05, 0);
      p.rotation.x = -0.6;
      g.add(p);
      g.add(part(S(0.1, 10), glowMat('#ffd27a'), 0, 0.25, 0.3));
    }
  },
  {
    id: 'lavavent', icon: '🌋', name: 'Lava vent', color: '#ff5a1f', power: 20, only: ['Venus'],
    build(g, c) {
      g.add(part(K(0.7, 0.9, 10), mat('#3b2a24', { flatShading: true }), 0, 0.45, 0));
      g.add(part(C(0.22, 0.28, 0.06, 16), glowMat(c), 0, 0.88, 0));
      const puffs = [];
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(S(0.22, 10), new THREE.MeshStandardMaterial({ color: '#8a7f78', transparent: true, opacity: 0.6, depthWrite: false }));
        g.add(m);
        puffs.push(m);
      }
      g.userData.puffs = puffs;
    },
    anim(g, t) {
      g.userData.puffs.forEach((m, i) => {
        const k = (t * 0.35 + i / 3) % 1;
        m.position.set(Math.sin(k * 6 + i) * 0.1, 0.95 + k * 1.6, 0);
        m.scale.setScalar(0.6 + k * 1.4);
        m.material.opacity = 0.55 * (1 - k);
      });
    }
  },
  {
    id: 'palm', icon: '🌴', name: 'Palm tree', color: '#3f9b3a', only: ['Earth'], green: true,
    build(g, c) {
      const trunk = mat('#9a6b3f');
      for (let i = 0; i < 5; i++) {
        const s = part(C(0.09 - i * 0.008, 0.1 - i * 0.008, 0.36, 8), trunk, i * 0.05, 0.18 + i * 0.34, 0);
        s.rotation.z = -0.12;
        g.add(s);
      }
      const top = new THREE.Group();
      top.position.set(0.24, 1.75, 0);
      g.add(top);
      for (let i = 0; i < 6; i++) {
        const holder = new THREE.Group();
        holder.rotation.y = (i / 6) * Math.PI * 2;
        const leaf = part(K(0.15, 0.95, 4), mat(c, { flatShading: true }), 0.43, -0.15, 0);
        leaf.rotation.z = -1.9;
        holder.add(leaf);
        top.add(holder);
      }
      top.add(part(S(0.08, 8), mat('#6b4a2f'), 0.06, -0.1, 0.05));
      top.add(part(S(0.08, 8), mat('#6b4a2f'), -0.05, -0.1, -0.04));
    }
  },
  {
    id: 'pond', icon: '🐟', name: 'Pond', color: '#3a8fd8', only: ['Earth'],
    build(g, c) {
      g.add(part(C(0.9, 0.9, 0.06, 32), mat(c, { roughness: 0.1, metalness: 0.3 }), 0, 0.03, 0));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        g.add(part(new THREE.DodecahedronGeometry(0.13, 0), mat('#8b857d', { flatShading: true }), Math.cos(a) * 0.95, 0.06, Math.sin(a) * 0.95));
      }
      g.add(part(C(0.16, 0.16, 0.02, 16), mat('#4f9d3a'), 0.3, 0.07, -0.2));
      g.add(part(S(0.05, 8), mat('#ff8fc7'), 0.3, 0.1, -0.2));
    }
  },
  {
    id: 'habitat', icon: '🛖', name: 'Habitat', color: '#e8e8e8', people: 6, only: ['Mars'],
    build(g, c) {
      const body = part(C(0.4, 0.4, 1.4, 20), mat(c), 0, 0.45, 0);
      body.rotation.z = Math.PI / 2;
      g.add(body);
      g.add(part(S(0.4, 20), mat(c), 0.7, 0.45, 0));
      g.add(part(S(0.4, 20), mat(c), -0.7, 0.45, 0));
      [-0.35, 0, 0.35].forEach((x) => g.add(part(B(0.2, 0.14, 0.05), glowMat('#ffd27a'), x, 0.55, 0.38)));
      const band = part(C(0.41, 0.41, 0.1, 20), mat('#c0533a'), 0, 0.45, 0);
      band.rotation.z = Math.PI / 2;
      g.add(band);
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        mat('#9fe8ff', { transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false }));
      glass.position.y = 0.82;
      g.add(glass);
    }
  },
  {
    id: 'cloudcity', icon: '☁️', name: 'Cloud city', color: '#f0e6d8', people: 20, only: ['Jupiter', 'Saturn'],
    build(g, c) {
      g.add(part(C(0.03, 0.03, 2.3, 6), mat('#9aa1ab'), 0, 1.15, 0));
      const plat = new THREE.Group();
      plat.position.y = 2.4;
      g.add(plat);
      plat.add(part(C(1.1, 0.6, 0.25, 24), mat('#cfd6df', { metalness: 0.4 }), 0, 0, 0));
      plat.add(part(C(0.25, 0.15, 0.2, 12), glowMat('#7fd8ff'), 0, -0.2, 0));
      [[-0.45, 0.5, 0.1], [0.1, 0.8, -0.3], [0.45, 0.4, 0.3], [0.05, 0.35, 0.5]].forEach(([x, h, z]) => {
        plat.add(part(B(0.3, h, 0.3), mat(c), x, 0.125 + h / 2, z));
        plat.add(part(B(0.31, 0.05, 0.31), glowMat('#ffd27a'), x, 0.125 + h * 0.7, z));
      });
      g.userData.plat = plat;
    },
    anim(g, t) {
      const p = g.userData.plat;
      p.position.y = 2.4 + Math.sin(t * 1.2) * 0.12;
      p.rotation.y = t * 0.15;
    }
  },
  {
    id: 'icespikes', icon: '🧊', name: 'Ice spikes', color: '#bff3ff', only: ['Uranus'],
    build(g, c) {
      const m = mat(c, { transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.1 });
      [[0, 1.6, 0, 0], [0.3, 1.0, 0.1, -0.3], [-0.28, 1.2, -0.1, 0.3], [0.1, 0.8, -0.32, 0.25], [-0.1, 0.9, 0.3, -0.25]].forEach(([x, h, z, tilt]) => {
        const s = part(K(0.16, h, 6), m, x, h / 2, z);
        s.rotation.z = tilt;
        g.add(s);
      });
    }
  },
  {
    id: 'alienplant', icon: '🪼', name: 'Alien plant', color: '#33ffcc', only: ['Neptune'], green: true,
    build(g, c) {
      const sway = new THREE.Group();
      g.add(sway);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.1, 0.5, 0), new THREE.Vector3(-0.05, 1.0, 0.05), new THREE.Vector3(0.15, 1.4, 0)
      ]);
      sway.add(part(new THREE.TubeGeometry(curve, 20, 0.05, 6), mat('#1f6b5a')));
      sway.add(part(S(0.18, 14), glowMat(c), 0.15, 1.5, 0));
      sway.add(part(S(0.09, 10), glowMat(c), 0.3, 0.8, 0.05));
      sway.add(part(S(0.08, 10), glowMat(c), -0.2, 1.1, 0.1));
      g.userData.sway = sway;
      g.userData.phase = Math.random() * 6;
    },
    anim(g, t) { g.userData.sway.rotation.z = Math.sin(t * 1.3 + g.userData.phase) * 0.12; }
  },
  {
    id: 'icelab', icon: '🔬', name: 'Ice lab', color: '#cfd8ff', people: 4, only: ['Pluto'],
    build(g, c) {
      g.add(part(B(1.0, 0.6, 0.8), mat(c), 0, 0.3, 0));
      g.add(part(B(0.5, 0.15, 0.04), glowMat('#7fd8ff'), 0, 0.4, 0.41));
      g.add(part(C(0.02, 0.02, 0.6, 6), mat('#888'), 0.35, 0.9, 0));
      const dish = part(new THREE.SphereGeometry(0.25, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), mat('#eee', { side: THREE.DoubleSide }), -0.25, 0.85, 0);
      dish.rotation.x = Math.PI - 0.5;
      g.add(dish);
    }
  },

  // ===== Everyday items =====
  {
    id: 'house', icon: '🏠', name: 'House', color: '#c0533a', people: 4,
    build(g, c) {
      g.add(part(B(1.2, 0.9, 1), mat('#efe3c8'), 0, 0.45, 0));
      const roof = part(K(0.95, 0.7, 4), mat(c), 0, 1.25, 0);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      g.add(part(B(0.28, 0.5, 0.04), mat('#6b4a2f'), 0, 0.25, 0.51));
      g.add(part(B(0.25, 0.22, 0.04), glowMat('#ffd27a'), 0.38, 0.55, 0.51));
      g.add(part(B(0.25, 0.22, 0.04), glowMat('#ffd27a'), -0.38, 0.55, 0.51));
    }
  },
  {
    id: 'tower', icon: '🏢', name: 'Tower', color: '#b9c0cc', people: 12,
    build(g, c) {
      g.add(part(C(0.45, 0.5, 2.6, 20), mat(c, { metalness: 0.3 }), 0, 1.3, 0));
      for (let i = 0; i < 4; i++) g.add(part(C(0.47, 0.47, 0.08, 20), glowMat('#7fd8ff'), 0, 0.6 + i * 0.5, 0));
      g.add(part(K(0.45, 0.5, 20), mat('#8a93a3'), 0, 2.85, 0));
      g.add(part(S(0.08, 10), glowMat('#ff5a4d'), 0, 3.15, 0));
    }
  },
  {
    id: 'dome', icon: '🫧', name: 'Dome', color: '#9fe8ff', people: 3,
    build(g, c) {
      g.add(part(C(0.95, 0.95, 0.12, 32), mat('#9aa1ab', { metalness: 0.4 }), 0, 0.06, 0));
      g.add(part(new THREE.IcosahedronGeometry(0.3, 1), mat('#4f9d3a', { flatShading: true }), 0, 0.4, 0));
      const glass = new THREE.Mesh(new THREE.SphereGeometry(0.9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        mat(c, { transparent: true, opacity: 0.4, roughness: 0.1, metalness: 0.1, depthWrite: false }));
      glass.position.y = 0.12;
      g.add(glass);
    }
  },
  {
    id: 'greenhouse', icon: '🪴', name: 'Greenhouse', color: '#9fffb0',
    build(g, c) {
      g.add(part(B(1.25, 0.08, 0.85), mat('#8a6a48'), 0, 0.04, 0));
      const glassM = mat(c, { transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
      const box = new THREE.Mesh(B(1.2, 0.7, 0.8), glassM);
      box.position.y = 0.43;
      g.add(box);
      const roof = new THREE.Mesh(K(0.85, 0.35, 4), glassM);
      roof.position.y = 0.95;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1, 1, 0.7);
      g.add(roof);
      [[-0.35, -0.2], [0, 0.15], [0.35, -0.15], [-0.15, 0.2]].forEach(([x, z]) =>
        g.add(part(new THREE.IcosahedronGeometry(0.15, 0), mat('#4f9d3a', { flatShading: true }), x, 0.25, z)));
    }
  },
  {
    id: 'tree', icon: '🌳', name: 'Tree', color: '#4f9d3a', green: true,
    build(g, c) {
      g.add(part(C(0.1, 0.14, 0.7, 8), mat('#7a5232'), 0, 0.35, 0));
      g.add(part(new THREE.IcosahedronGeometry(0.55, 1), mat(c, { flatShading: true }), 0, 1.05, 0));
    }
  },
  {
    id: 'pine', icon: '🌲', name: 'Pine', color: '#2f6b3a', green: true,
    build(g, c) {
      g.add(part(C(0.08, 0.1, 0.4, 8), mat('#6b4a2f'), 0, 0.2, 0));
      g.add(part(K(0.55, 0.9, 8), mat(c, { flatShading: true }), 0, 0.75, 0));
      g.add(part(K(0.4, 0.7, 8), mat(c, { flatShading: true }), 0, 1.2, 0));
    }
  },
  {
    id: 'bush', icon: '🌸', name: 'Flowers', color: '#ff8fc7', green: true,
    build(g, c) {
      const green = mat('#5aa646', { flatShading: true });
      g.add(part(new THREE.IcosahedronGeometry(0.32, 0), green, 0, 0.25, 0));
      g.add(part(new THREE.IcosahedronGeometry(0.25, 0), green, 0.3, 0.2, 0.1));
      g.add(part(new THREE.IcosahedronGeometry(0.22, 0), green, -0.28, 0.18, -0.05));
      [[0, 0.55, 0.1], [0.3, 0.42, 0.2], [-0.25, 0.4, 0.12], [0.1, 0.45, -0.25], [-0.1, 0.35, 0.3]].forEach(([x, y, z]) =>
        g.add(part(S(0.07, 8), mat(c), x, y, z)));
    }
  },
  {
    id: 'rock', icon: '🪨', name: 'Rock', color: '#8b857d',
    build(g, c) {
      const r = part(new THREE.DodecahedronGeometry(0.5, 0), mat(c, { flatShading: true }), 0, 0.25, 0);
      r.scale.set(1, 0.7, 1.2);
      g.add(r);
    }
  },
  {
    id: 'crystal', icon: '💎', name: 'Crystal', color: '#b07cff',
    build(g, c) {
      const m = mat(c, { emissive: c, emissiveIntensity: 0.45, roughness: 0.2 });
      [[0, 0.6, 0, 0.35, 0], [0.3, 0.35, 0.1, 0.22, -0.5], [-0.28, 0.3, -0.05, 0.2, 0.5]].forEach(([x, y, z, r, rz]) => {
        const s = part(new THREE.OctahedronGeometry(r, 0), m, x, y, z);
        s.scale.set(1, 2, 1);
        s.rotation.z = rz;
        g.add(s);
      });
    }
  },
  {
    id: 'solar', icon: '🔋', name: 'Solar panel', color: '#1d3f8f', power: 10,
    build(g, c) {
      g.add(part(C(0.04, 0.05, 0.6, 8), mat('#888'), 0, 0.3, 0));
      const p = part(B(1.1, 0.04, 0.7), mat(c, { metalness: 0.5, roughness: 0.3 }), 0, 0.65, 0);
      p.rotation.x = -0.5;
      g.add(p);
    }
  },
  {
    id: 'windmill', icon: '🌬️', name: 'Windmill', color: '#f2f2f2', power: 15,
    build(g, c) {
      g.add(part(C(0.08, 0.14, 2.2, 10), mat('#e9e9e9'), 0, 1.1, 0));
      g.add(part(B(0.2, 0.2, 0.4), mat('#d0d0d0'), 0, 2.25, 0.05));
      const blades = new THREE.Group();
      blades.position.set(0, 2.25, 0.28);
      for (let i = 0; i < 3; i++) {
        const h = new THREE.Group();
        h.rotation.z = (i / 3) * Math.PI * 2;
        h.add(part(B(0.1, 1.0, 0.02), mat(c), 0, 0.5, 0));
        blades.add(h);
      }
      blades.add(part(S(0.07, 10), mat('#999'), 0, 0, 0));
      g.add(blades);
      g.userData.blades = blades;
    },
    anim(g, t, dt) { g.userData.blades.rotation.z += dt * 2.5; }
  },
  {
    id: 'rocket', icon: '🚀', name: 'Rocket', color: '#d9423a', launch: true,
    build(g, c) {
      const body = new THREE.Group();
      g.add(body);
      body.add(part(C(0.2, 0.28, 0.2, 16), mat('#444a55'), 0, 0.1, 0));
      body.add(part(C(0.3, 0.3, 1.6, 24), mat('#f2f2f2'), 0, 1.0, 0));
      body.add(part(K(0.3, 0.6, 24), mat(c), 0, 2.1, 0));
      body.add(part(S(0.1, 12), glowMat('#7fd8ff'), 0, 1.35, 0.28));
      for (let i = 0; i < 3; i++) {
        const fin = part(B(0.06, 0.5, 0.35), mat(c));
        const a = (i / 3) * Math.PI * 2;
        fin.position.set(Math.sin(a) * 0.36, 0.45, Math.cos(a) * 0.36);
        fin.rotation.y = a;
        body.add(fin);
      }
      const flame = new THREE.Mesh(K(0.22, 0.9, 12), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }));
      flame.rotation.x = Math.PI;
      flame.position.y = -0.45;
      flame.visible = false;
      body.add(flame);
      g.userData.body = body;
      g.userData.flame = flame;
    }
  },
  {
    id: 'rover', icon: '🚙', name: 'Rover', color: '#e8e8e8',
    build(g, c) {
      const pivot = new THREE.Group();
      g.add(pivot);
      const car = new THREE.Group();
      car.position.x = 1.3;
      car.rotation.y = Math.PI / 2;
      pivot.add(car);
      car.add(part(B(1, 0.35, 0.65), mat(c), 0, 0.45, 0));
      const wheel = mat('#2b2b2b');
      [[0.35, 0.36], [0.35, -0.36], [-0.35, 0.36], [-0.35, -0.36]].forEach(([x, z]) => {
        const w = part(C(0.18, 0.18, 0.12, 16), wheel, x, 0.18, z);
        w.rotation.x = Math.PI / 2;
        car.add(w);
      });
      car.add(part(C(0.03, 0.03, 0.5, 8), mat('#888'), 0.3, 0.85, 0));
      car.add(part(B(0.18, 0.12, 0.14), mat('#3a3f48'), 0.3, 1.12, 0));
      car.add(part(B(0.5, 0.03, 0.5), mat('#1d3f8f', { metalness: 0.5, roughness: 0.3 }), -0.2, 0.65, 0));
      g.userData.pivot = pivot;
    },
    anim(g, t, dt) { g.userData.pivot.rotation.y += dt * 0.45; }
  },
  {
    id: 'satellite', icon: '🛰️', name: 'Satellite', color: '#d4af37',
    build(g, c) {
      g.add(part(C(0.04, 0.05, 1.2, 8), mat('#888'), 0, 0.6, 0));
      const head = new THREE.Group();
      head.position.y = 1.35;
      g.add(head);
      head.add(part(B(0.3, 0.3, 0.3), mat(c, { metalness: 0.6, roughness: 0.3 })));
      head.add(part(B(0.7, 0.02, 0.3), mat('#1d3f8f', { metalness: 0.5 }), 0.52, 0, 0));
      head.add(part(B(0.7, 0.02, 0.3), mat('#1d3f8f', { metalness: 0.5 }), -0.52, 0, 0));
      const d = part(K(0.12, 0.15, 12), mat('#eee'), 0, 0.22, 0);
      d.rotation.x = Math.PI;
      head.add(d);
      g.userData.head = head;
    },
    anim(g, t, dt) { g.userData.head.rotation.y += dt * 0.6; }
  },
  {
    id: 'dish', icon: '📡', name: 'Dish', color: '#e6e6e6',
    build(g, c) {
      g.add(part(C(0.08, 0.14, 0.8, 10), mat('#9aa1ab'), 0, 0.4, 0));
      const bowl = part(new THREE.SphereGeometry(0.55, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), mat(c, { side: THREE.DoubleSide }), 0, 1.15, 0);
      bowl.rotation.x = Math.PI - 0.6;
      g.add(bowl);
      g.add(part(S(0.06, 8), glowMat('#ff5a4d'), 0, 1.0, 0.2));
    }
  },
  {
    id: 'lamp', icon: '💡', name: 'Lamp', color: '#ffe28a',
    build(g, c) {
      g.add(part(C(0.04, 0.06, 1.6, 8), mat('#3a3f48'), 0, 0.8, 0));
      g.add(part(S(0.15, 16), glowMat(c), 0, 1.65, 0));
    }
  },
  {
    id: 'flag', icon: '🚩', name: 'Flag', color: '#ff7a3d',
    build(g, c) {
      g.add(part(C(0.03, 0.03, 1.8, 8), mat('#cfcfcf'), 0, 0.9, 0));
      g.add(part(new THREE.PlaneGeometry(0.7, 0.45), mat(c, { side: THREE.DoubleSide }), 0.35, 1.55, 0));
    }
  },
  {
    id: 'fence', icon: '🪵', name: 'Fence', color: '#a0743f',
    build(g, c) {
      const m = mat(c);
      [-0.6, 0, 0.6].forEach((x) => g.add(part(B(0.07, 0.5, 0.07), m, x, 0.25, 0)));
      g.add(part(B(1.3, 0.05, 0.04), m, 0, 0.18, 0));
      g.add(part(B(1.3, 0.05, 0.04), m, 0, 0.38, 0));
    }
  },
  {
    id: 'bridge', icon: '🌉', name: 'Bridge', color: '#8a6a48',
    build(g, c) {
      const m = mat(c);
      for (let i = 0; i < 9; i++) {
        const a = -0.9 + (i / 8) * 1.8;
        const p = part(B(0.26, 0.05, 0.7), m, Math.sin(a) * 1.0, Math.cos(a) * 0.55 - 0.05, 0);
        p.rotation.z = -a * 0.7;
        g.add(p);
      }
      [-0.8, 0.8].forEach((x) => [-0.33, 0.33].forEach((z) => g.add(part(B(0.06, 0.45, 0.06), m, x, 0.22, z))));
    }
  },
  {
    id: 'statue', icon: '🗿', name: 'Statue', color: '#d4af37',
    build(g, c) {
      g.add(part(B(0.6, 0.4, 0.6), mat('#cfcfcf'), 0, 0.2, 0));
      const m = mat(c, { metalness: 0.7, roughness: 0.3 });
      g.add(part(C(0.14, 0.16, 0.45, 12), m, 0, 0.63, 0));
      g.add(part(S(0.13, 14), m, 0, 0.97, 0));
      const arm = part(C(0.04, 0.04, 0.38, 8), m, 0.18, 0.98, 0);
      arm.rotation.z = -0.4;
      g.add(arm);
      g.add(part(new THREE.OctahedronGeometry(0.07, 0), glowMat('#ffe28a'), 0.27, 1.2, 0));
    }
  }
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));

// Rocket used for flights between space and planets
export function buildRocketModel(color = '#d9423a') {
  const g = new THREE.Group();
  ITEM_BY_ID.rocket.build(g, color);
  return g;
}
