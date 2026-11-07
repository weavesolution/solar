import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createWorld } from './world.js?v=5';
import * as audio from './audio.js?v=5';
import * as D from './data.js?v=5';

const { esc } = D;

// All texture files live in this folder of the repo
const ASSETS = 'assets/';

// Earth takes about 40 seconds per orbit; others are scaled from that
const ORBIT_BASE = (Math.PI * 2) / 40;
const UP = new THREE.Vector3(0, 1, 0);

// ---------------- SETTINGS ----------------
const settings = Object.assign({ muted: false }, (() => {
  try { return JSON.parse(localStorage.getItem('solarSettings') || '{}'); } catch (e) { return {}; }
})());
function saveSettings() {
  try { localStorage.setItem('solarSettings', JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
audio.setMuted(settings.muted);

// ---------------- PLANET DATA ----------------
const SUN = { name: 'Sun', tex: '2k_sun.jpg', r: 7, isSun: true, about: 'The star at the centre of our solar system.' };

const PLANETS = [
  {
    name: 'Mercury', tex: '2k_mercury.jpg', r: 0.6, dist: 14, period: 0.241, day: 58.6, tilt: 0.03,
    about: 'Smallest planet and closest to the Sun.',
    moonCount: 0, note: 'Mercury has no moons. It is too close to the Sun to hold on to one.',
    moons: []
  },
  {
    name: 'Venus', tex: '2k_venus_atmosphere.jpg', r: 1.1, dist: 20, period: 0.615, day: 243, tilt: 177.4,
    about: 'Hottest planet, wrapped in thick clouds.',
    moonCount: 0, note: 'Venus has no moons either. It also spins backwards compared with most planets.',
    moons: []
  },
  {
    name: 'Earth', tex: '2k_earth_daymap.jpg', r: 1.2, dist: 27, period: 1, day: 1, tilt: 23.4,
    about: 'Our home, the only known world with life.',
    moonCount: 1, note: 'The Moon slowly drifts about 3.8 cm farther from Earth every year.',
    moons: [
      { name: 'Moon', r: 0.33, d: 3.2, p: 12, tex: '2k_moon.jpg', color: '#b9b5ae', info: 'Controls our ocean tides. Humans first walked on it in 1969.' }
    ]
  },
  {
    name: 'Mars', tex: '2k_mars.jpg', r: 0.8, dist: 34, period: 1.881, day: 1.03, tilt: 25.2,
    about: 'The Red Planet, home to the tallest volcano.',
    moonCount: 2, note: 'Both moons are probably captured asteroids.',
    moons: [
      { name: 'Phobos', r: 0.14, d: 1.6, p: 4, color: '#8a7d72', info: 'Slowly spiralling inward. It may break apart in about 50 million years.' },
      { name: 'Deimos', r: 0.1, d: 2.4, p: 8, color: '#a39a8c', info: 'Tiny moon only about 12 km across.' }
    ]
  },
  {
    name: 'Jupiter', tex: '2k_jupiter.jpg', r: 3.6, dist: 62, period: 11.86, day: 0.41, tilt: 3.1,
    about: 'Largest planet, a giant ball of gas.',
    moonCount: 95, note: 'The four big ones are the Galilean moons, found by Galileo in 1610. The rest are mostly small captured rocks.',
    moons: [
      { name: 'Io', r: 0.36, d: 5.2, p: 6, color: '#e3c35a', info: 'Most volcanically active body in the solar system.' },
      { name: 'Europa', r: 0.31, d: 6.6, p: 9, color: '#d8cbb3', info: 'Its ice shell hides a salty ocean underneath.' },
      { name: 'Ganymede', r: 0.5, d: 8.4, p: 14, color: '#9b8e7f', info: 'Largest moon in the solar system, bigger than Mercury.' },
      { name: 'Callisto', r: 0.46, d: 10.6, p: 22, color: '#6a5e52', info: 'One of the most heavily cratered surfaces known.' }
    ]
  },
  {
    name: 'Saturn', tex: '2k_saturn.jpg', r: 3, dist: 84, period: 29.46, day: 0.44, tilt: 26.7,
    ring: { inner: 3.7, outer: 6.6, tex: '2k_saturn_ring_alpha.png' },
    about: 'Famous for its bright icy rings.',
    moonCount: 274, note: 'Saturn has the most known moons of any planet. 128 new ones were announced in 2025.',
    moons: [
      { name: 'Enceladus', r: 0.16, d: 7.6, p: 7, color: '#f3f6f8', info: 'Shoots jets of water ice into space from its south pole.' },
      { name: 'Rhea', r: 0.24, d: 8.8, p: 10, color: '#c4c4c4', info: "Saturn's second-largest moon." },
      { name: 'Titan', r: 0.52, d: 10.8, p: 16, color: '#d9a54a', info: 'Thick orange haze and lakes of liquid methane.' },
      { name: 'Iapetus', r: 0.23, d: 13, p: 26, color: '#7d6e5c', info: 'Two-toned: one side bright, the other dark.' }
    ]
  },
  {
    name: 'Uranus', tex: '2k_uranus.jpg', r: 2, dist: 106, period: 84.01, day: 0.72, tilt: 97.8,
    about: 'Ice giant that spins on its side.',
    moonCount: 29, note: "Uranus's moons are named after characters from Shakespeare and Alexander Pope.",
    moons: [
      { name: 'Miranda', r: 0.14, d: 3.2, p: 5, color: '#b8b8b4', info: 'Has cliffs up to 20 km high.' },
      { name: 'Ariel', r: 0.22, d: 4, p: 7, color: '#c9c6c0', info: "Brightest of Uranus's large moons." },
      { name: 'Umbriel', r: 0.22, d: 4.9, p: 9, color: '#6f6c68', info: "Darkest of Uranus's large moons." },
      { name: 'Titania', r: 0.3, d: 6, p: 12, color: '#b5a79a', info: 'Largest moon of Uranus.' },
      { name: 'Oberon', r: 0.29, d: 7.2, p: 15, color: '#9b8c80', info: 'Outermost major moon, old and cratered.' }
    ]
  },
  {
    name: 'Neptune', tex: '2k_neptune.jpg', r: 1.9, dist: 122, period: 164.8, day: 0.67, tilt: 28.3,
    about: 'Windiest planet, farthest from the Sun.',
    moonCount: 16, note: 'Triton holds almost all the mass of everything orbiting Neptune.',
    moons: [
      { name: 'Proteus', r: 0.16, d: 3.2, p: 5, color: '#7a746e', info: 'Irregular, box-shaped moon.' },
      { name: 'Triton', r: 0.38, d: 4.8, p: 10, color: '#d6c8c2', retro: true, info: 'Orbits backwards, so it is likely a captured dwarf planet.' }
    ]
  },
  {
    name: 'Pluto', tex: null, r: 0.45, dist: 138, period: 248, day: 6.4, tilt: 120, incl: 12,
    about: 'Dwarf planet with a giant heart-shaped glacier.',
    moonCount: 5, note: 'Pluto and Charon are so close in size that they orbit a point between them.',
    moons: [
      { name: 'Charon', r: 0.23, d: 1.6, p: 8, color: '#9a8f88', info: 'Half the size of Pluto, with a reddish north pole.' },
      { name: 'Hydra', r: 0.06, d: 2.6, p: 14, color: '#c9c9c9', info: 'Tiny, oddly shaped and spinning fast.' }
    ]
  }
];

const PLANET_BY_NAME = Object.fromEntries(PLANETS.map((p) => [p.name, p]));

// ---------------- RENDERER / SCENE ----------------
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
container.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(innerWidth, innerHeight);
labelRenderer.domElement.className = 'label-layer';
container.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 3000);
const isPortrait = () => innerWidth < innerHeight;
const homeCam = () => (isPortrait() ? new THREE.Vector3(0, 160, 260) : new THREE.Vector3(0, 70, 150));
camera.position.copy(homeCam());

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 2;
controls.maxDistance = 600;

// ---------------- LOADING ----------------
const loaderEl = document.getElementById('loader');
const barFill = document.getElementById('barFill');
const loaderMsg = document.getElementById('loaderMsg');
const manager = new THREE.LoadingManager();
const texLoader = new THREE.TextureLoader(manager);
const missing = [];
manager.onProgress = (url, loaded, total) => { barFill.style.width = (loaded / total) * 100 + '%'; };
manager.onError = (url) => missing.push(url.replace(ASSETS, ''));
manager.onLoad = () => {
  if (missing.length) {
    loaderMsg.textContent = 'Could not load: ' + missing.join(', ') + '. Check the file names in the assets folder.';
    setTimeout(() => loaderEl.classList.add('done'), 6000);
  } else {
    loaderEl.classList.add('done');
  }
};

function tex(file) {
  const t = texLoader.load(ASSETS + file);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Pluto has no downloaded image, so its surface is painted in code
function plutoTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#c4a07c';
  g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 1024, y = Math.random() * 512, r = 8 + Math.random() * 50;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(120,80,55,0.18)' : 'rgba(240,225,205,0.15)';
    g.beginPath();
    g.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2);
    g.fill();
  }
  const hx = 560, hy = 250;
  g.fillStyle = 'rgba(248,240,226,0.95)';
  g.beginPath();
  g.moveTo(hx, hy + 90);
  g.bezierCurveTo(hx - 140, hy + 10, hx - 90, hy - 80, hx, hy - 30);
  g.bezierCurveTo(hx + 90, hy - 80, hx + 140, hy + 10, hx, hy + 90);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { texture: t, url: c.toDataURL('image/jpeg', 0.8) };
}

// ---------------- BACKGROUND + LIGHT ----------------
const stars = new THREE.Mesh(
  new THREE.SphereGeometry(1200, 64, 64),
  new THREE.MeshBasicMaterial({ map: tex('2k_stars_milky_way.jpg'), side: THREE.BackSide })
);
scene.add(stars);
scene.add(new THREE.AmbientLight(0xffffff, 0.22));
scene.add(new THREE.PointLight(0xffffff, 2.6, 0, 0));

// ---------------- HELPERS ----------------
const clickables = [];
function makeLabel(text, cls, body) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  if (body) el.addEventListener('click', (e) => { e.stopPropagation(); focusOn(body); });
  return new CSS2DObject(el);
}
function glowTexture(stops = ['rgba(255,220,150,0.9)', 'rgba(255,170,60,0.45)', 'rgba(255,120,20,0.12)']) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, stops[0]);
  grd.addColorStop(0.25, stops[1]);
  grd.addColorStop(0.6, stops[2]);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- SUN ----------------
const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(SUN.r, 64, 64), new THREE.MeshBasicMaterial({ map: tex(SUN.tex) }));
scene.add(sunMesh);
SUN.mesh = sunMesh;
SUN.viewDist = 32;
sunMesh.userData.body = SUN;
clickables.push(sunMesh);
SUN.label = makeLabel('Sun', 'planet-label', SUN);
SUN.label.position.set(0, SUN.r + 1.5, 0);
scene.add(SUN.label);
const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
glow.scale.set(36, 36, 1);
scene.add(glow);

// ---------------- PLANETS ----------------
for (const p of PLANETS) {
  let map;
  if (p.tex) map = tex(p.tex);
  else { const pt = plutoTexture(); map = pt.texture; p.thumb = pt.url; }

  const pivot = new THREE.Object3D();
  pivot.rotation.y = Math.random() * Math.PI * 2;
  if (p.incl) {
    const plane = new THREE.Object3D();
    plane.rotation.z = THREE.MathUtils.degToRad(p.incl);
    scene.add(plane);
    plane.add(pivot);
  } else scene.add(pivot);

  const group = new THREE.Object3D();
  group.position.x = p.dist;
  pivot.add(group);
  const tilt = new THREE.Object3D();
  tilt.rotation.z = THREE.MathUtils.degToRad(p.tilt);
  group.add(tilt);

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 48), new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 }));
  tilt.add(mesh);

  const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(p.r * 1.6, p.r + 1.2), 12, 12), new THREE.MeshBasicMaterial({ visible: false }));
  hit.userData.body = p;
  group.add(hit);
  clickables.push(hit);

  if (p.ring) {
    const { inner, outer } = p.ring;
    const geo = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = geo.attributes.position, uv = geo.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex(p.ring.tex), color: 0xdddddd, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    tilt.add(ring);
  }

  p.moonObjs = [];
  let maxMoonD = 0;
  for (const m of p.moons) {
    const mp = new THREE.Object3D();
    mp.rotation.y = Math.random() * Math.PI * 2;
    tilt.add(mp);
    const mtl = m.tex ? new THREE.MeshStandardMaterial({ map: tex(m.tex), roughness: 1 }) : new THREE.MeshStandardMaterial({ color: m.color, roughness: 1 });
    const mm = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 24), mtl);
    mm.position.x = m.d;
    mp.add(mm);
    p.moonObjs.push({ pivot: mp, speed: ((Math.PI * 2) / m.p) * (m.retro ? -1 : 1) });
    maxMoonD = Math.max(maxMoonD, m.d);
  }

  p.label = makeLabel(p.name, 'planet-label', p);
  p.label.position.set(0, p.r + 1, 0);
  group.add(p.label);

  p.mesh = mesh;
  p.pivot = pivot;
  p.orbitSpeed = ORBIT_BASE / Math.sqrt(p.period);
  p.spin = 1.5 / Math.sqrt(p.day);
  p.viewDist = Math.max(p.r * 5, maxMoonD * 1.9, p.ring ? p.ring.outer * 2.4 : 0);
}

// ---------------- ASTEROID BELT ----------------
const BELT_COUNT = 1600;
const belt = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshStandardMaterial({ color: 0x8c8378, roughness: 1, flatShading: true }), BELT_COUNT);
const dummy = new THREE.Object3D();
for (let i = 0; i < BELT_COUNT; i++) {
  const a = Math.random() * Math.PI * 2;
  const rad = 41 + Math.random() * 8;
  dummy.position.set(Math.cos(a) * rad, (Math.random() - 0.5) * 1.4, Math.sin(a) * rad);
  dummy.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  const s = 0.4 + Math.random() * 1.4;
  dummy.scale.set(s, s * (0.6 + Math.random() * 0.6), s);
  dummy.updateMatrix();
  belt.setMatrixAt(i, dummy.matrix);
}
scene.add(belt);

// ---------------- LABELS SHOW COMPANY NAMES ----------------
function refreshLabels() {
  for (const p of PLANETS) {
    const c = D.companyLabel(p.name);
    const s = D.stats(p.name);
    p.label.element.textContent = c ? `${p.name} · ${c}` : p.name;
    p.label.element.classList.toggle('has-company', !!c);
    p.label.element.classList.toggle('alert', s.overdue > 0);
  }
}

// ---------------- MODAL ----------------
const $ = (id) => document.getElementById(id);
const modal = $('modal'), modalBody = $('modalBody');
function openModal(html) { modalBody.innerHTML = html; modal.classList.remove('hidden'); modalBody.scrollTop = 0; }
function closeModal() { modal.classList.add('hidden'); modalBody.innerHTML = ''; }
$('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

const toastEl = $('toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ---------------- SMALL VIEW HELPERS ----------------
const STATUS_LABEL = { overdue: 'Overdue', soon: 'Due soon', later: 'Upcoming', none: 'No due date', done: 'Done' };
const dot = (st) => `<i class="sdot s-${st}"></i>`;
const companyName = (planet) => D.companyLabel(planet) || `${planet} (no company name)`;
const pathOf = (x) => `${esc(companyName(x.planet))} › ${esc(x.project.name)} › Floor ${x.floorNo}: ${esc(x.floor.name)}`;

function dueRow(x) {
  const st = D.dueStatus(x.note);
  return `<button class="row" data-act="go" data-planet="${x.planet}" data-project="${x.project.id}" data-floor="${x.floor.id}" data-note="${x.note.id}">
    ${dot(st)}<span class="row-main"><b>${esc(x.note.title)}</b><small>${pathOf(x)}</small></span>
    <span class="chip c-${st}">${esc(D.dueText(x.note) || STATUS_LABEL[st])}</span></button>`;
}

// ---------------- COMPANY / PROJECT / FLOOR / NOTE VIEWS ----------------
function lookup(planet, projectId, floorId, noteId) {
  const project = projectId ? D.findProject(planet, projectId) : null;
  const floor = project && floorId ? D.findFloor(project, floorId) : null;
  const floorNo = project && floor ? project.floors.indexOf(floor) + 1 : 0;
  const note = floor && noteId ? floor.notes.find((n) => n.id === noteId) : null;
  return { planet, project, floor, floorNo, note };
}
const ids = (x, o = {}) => {
  const v = {
    planet: x.planet,
    project: x.project ? x.project.id : '',
    floor: x.floor ? x.floor.id : '',
    note: x.note ? x.note.id : '',
    ...o
  };
  return `data-planet="${v.planet}" data-project="${v.project}" data-floor="${v.floor}" data-note="${v.note}"`;
};
const onThisStreet = (planet) => mode === 'surface' && world.planetName() === planet;

function viewBuilding(planet, projectId) {
  const x = lookup(planet, projectId);
  if (!x.project) return closeModal();
  const floors = x.project.floors;
  const rows = floors.slice().reverse().map((f) => {
    const no = floors.indexOf(f) + 1;
    const over = f.notes.filter((n) => D.dueStatus(n) === 'overdue').length;
    return `<button class="row" data-act="floor" ${ids(x, { floor: f.id })}>
      <span class="fno">${no}</span><span class="row-main"><b>${esc(f.name)}</b><small>${f.notes.length} note${f.notes.length === 1 ? '' : 's'}</small></span>
      ${over ? `<span class="chip c-overdue">${over} overdue</span>` : ''}</button>`;
  }).join('');
  openModal(`
    <p class="crumb">${esc(companyName(planet))}</p>
    <h2>🏢 ${esc(x.project.name)}</h2>
    <p class="modal-sub">${floors.length} assignment${floors.length === 1 ? '' : 's'} (floors). Floor 1 is at the bottom.</p>
    <button class="primary" data-act="newFloor" ${ids(x)}>＋ Add assignment (new floor)</button>
    <div class="list">${rows || '<p class="empty">No assignments yet.</p>'}</div>
    <div class="btn-row">
      ${onThisStreet(planet) ? `<button class="ghost" data-act="walk" ${ids(x)}>🚶 Walk here</button>` : `<button class="ghost" data-act="go" ${ids(x)}>🚀 Go there</button>`}
      <button class="ghost" data-act="editProject" ${ids(x)}>✏️ Rename</button>
      <button class="ghost danger" data-act="delProject" ${ids(x)}>🗑 Delete</button>
    </div>`);
}

function viewFloor(planet, projectId, floorId) {
  const x = lookup(planet, projectId, floorId);
  if (!x.floor) return viewBuilding(planet, projectId);
  const rows = x.floor.notes.map((n) => {
    const st = D.dueStatus(n);
    return `<button class="row" data-act="note" ${ids(x, { note: n.id })}>
      ${dot(st)}<span class="row-main"><b>${esc(n.title)}</b><small>${esc(n.text ? n.text.slice(0, 80) : n.date ? D.fmtDate(n.date) : '')}</small></span>
      ${n.due || n.done ? `<span class="chip c-${st}">${esc(D.dueText(n))}</span>` : ''}</button>`;
  }).join('');
  openModal(`
    <p class="crumb">${esc(companyName(planet))} › <a data-act="building" ${ids(x)}>${esc(x.project.name)}</a></p>
    <h2><span class="fno big">${x.floorNo}</span> ${esc(x.floor.name)}</h2>
    <p class="modal-sub">${x.floor.notes.length} note${x.floor.notes.length === 1 ? '' : 's'} on this floor's windows.</p>
    <button class="primary" data-act="newNote" ${ids(x)}>＋ Add note</button>
    <div class="list">${rows || '<p class="empty">No notes yet.</p>'}</div>
    <div class="btn-row">
      ${onThisStreet(planet) ? `<button class="ghost" data-act="walk" ${ids(x)}>🚶 Look at floor</button>` : ''}
      <button class="ghost" data-act="editFloor" ${ids(x)}>✏️ Rename</button>
      <button class="ghost danger" data-act="delFloor" ${ids(x)}>🗑 Delete</button>
    </div>`);
}

function viewNote(planet, projectId, floorId, noteId) {
  const x = lookup(planet, projectId, floorId, noteId);
  if (!x.note) return viewFloor(planet, projectId, floorId);
  const n = x.note;
  const st = D.dueStatus(n);
  const link = D.safeLink(n.link);
  openModal(`
    <p class="crumb">${esc(companyName(planet))} › <a data-act="building" ${ids(x)}>${esc(x.project.name)}</a> › <a data-act="floor" ${ids(x)}>Floor ${x.floorNo}: ${esc(x.floor.name)}</a></p>
    <div class="note-card s-bg-${st}">
      <h2>${esc(n.title)}</h2>
      <div class="note-meta">
        ${n.date ? `<span>📅 ${esc(D.fmtDate(n.date))}</span>` : ''}
        ${n.due ? `<span>⏰ Due ${esc(D.fmtDate(n.due))}</span>` : ''}
        ${n.due || n.done ? `<span class="chip c-${st}">${esc(D.dueText(n))}</span>` : ''}
      </div>
      ${n.text ? `<p class="note-text">${esc(n.text)}</p>` : ''}
      ${link ? `<a class="note-link" href="${esc(link)}" target="_blank" rel="noopener">🔗 ${esc(n.link)}</a>` : ''}
    </div>
    <div class="btn-row">
      <button class="ghost" data-act="toggleDone" ${ids(x)}>${n.done ? '↺ Mark not done' : '✓ Mark done'}</button>
      <button class="ghost" data-act="editNote" ${ids(x)}>✏️ Edit</button>
      <button class="ghost danger" data-act="delNote" ${ids(x)}>🗑 Delete</button>
    </div>`);
}

// ---------------- FORMS ----------------
let formSave = null;
function openForm(title, fields, onSave, saveLabel = 'Save') {
  formSave = onSave;
  openModal(`
    <h2>${esc(title)}</h2>
    <form id="theForm" class="form" autocomplete="off">
      ${fields.map((f) => {
        if (f.type === 'textarea') return `<label>${esc(f.label)}<textarea name="${f.key}" rows="5" placeholder="${esc(f.ph || '')}">${esc(f.value || '')}</textarea></label>`;
        if (f.type === 'checkbox') return `<label class="check"><input type="checkbox" name="${f.key}" ${f.value ? 'checked' : ''}> ${esc(f.label)}</label>`;
        return `<label>${esc(f.label)}<input type="${f.type || 'text'}" name="${f.key}" value="${esc(f.value || '')}" placeholder="${esc(f.ph || '')}" ${f.required ? 'required' : ''}></label>`;
      }).join('')}
      <button class="primary" type="submit">${esc(saveLabel)}</button>
    </form>`);
  const first = modalBody.querySelector('input:not([type=checkbox]), textarea');
  if (first && !('ontouchstart' in window)) first.focus();
}
modalBody.addEventListener('submit', (e) => {
  if (e.target.id !== 'theForm') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const values = {};
  for (const el of e.target.elements) {
    if (!el.name) continue;
    values[el.name] = el.type === 'checkbox' ? el.checked : String(fd.get(el.name) || '').trim();
  }
  if (formSave) formSave(values);
});

function formCompany(planet) {
  openForm(`Company on ${planet}`, [{ key: 'name', label: 'Company name', value: D.companyLabel(planet), ph: 'e.g. ABC Pvt Ltd', required: true }], (v) => {
    D.company(planet).name = v.name;
    D.save();
    audio.sfx('place');
    toast(`🪐 ${planet} is now ${v.name}`);
    if (mode === 'surface') closeModal(); else { closeModal(); if (cardBody) showCard(cardBody); }
  });
}

function formProject(planet, projectId) {
  const p = projectId ? D.findProject(planet, projectId) : null;
  openForm(p ? 'Rename project' : 'New project (building)', [{ key: 'name', label: 'Project name', value: p ? p.name : '', ph: 'e.g. Statutory audit FY 2025-26', required: true }], (v) => {
    let id = projectId;
    if (p) p.name = v.name;
    else {
      id = D.uid();
      D.company(planet).projects.push({ id, name: v.name, floors: [] });
    }
    D.save();
    audio.sfx('place');
    viewBuilding(planet, id);
    if (!p && onThisStreet(planet)) world.walkTo(id);
  }, p ? 'Save' : 'Build it');
}

function formFloor(planet, projectId, floorId) {
  const project = D.findProject(planet, projectId);
  const f = floorId ? D.findFloor(project, floorId) : null;
  openForm(f ? 'Rename assignment' : `New assignment in ${project.name}`, [{ key: 'name', label: 'Assignment name', value: f ? f.name : '', ph: 'e.g. GST return Oct 2026', required: true }], (v) => {
    let id = floorId;
    if (f) f.name = v.name;
    else {
      id = D.uid();
      project.floors.push({ id, name: v.name, notes: [] });
    }
    D.save();
    audio.sfx('place');
    viewFloor(planet, projectId, id);
    if (!f && onThisStreet(planet)) world.walkTo(projectId, id);
  }, f ? 'Save' : 'Add floor');
}

function formNote(planet, projectId, floorId, noteId) {
  const x = lookup(planet, projectId, floorId, noteId);
  const n = x.note;
  openForm(n ? 'Edit note' : `New note · Floor ${x.floorNo}`, [
    { key: 'title', label: 'Title', value: n ? n.title : '', ph: 'e.g. Bank statement pending', required: true },
    { key: 'text', label: 'Details', type: 'textarea', value: n ? n.text : '', ph: 'Anything you want to remember…' },
    { key: 'date', label: 'Date', type: 'date', value: n ? n.date : D.todayStr() },
    { key: 'due', label: 'Due date (optional)', type: 'date', value: n ? n.due : '' },
    { key: 'link', label: 'Link (optional)', type: 'text', value: n ? n.link : '', ph: 'Drive link, website or email' },
    ...(n ? [{ key: 'done', label: 'Done', type: 'checkbox', value: n.done }] : [])
  ], (v) => {
    let id = noteId;
    if (n) Object.assign(n, v);
    else {
      id = D.uid();
      x.floor.notes.push({ id, title: v.title, text: v.text, date: v.date, due: v.due, link: v.link, done: false });
    }
    D.save();
    audio.sfx('place');
    viewNote(planet, projectId, floorId, id);
  }, n ? 'Save' : 'Pin note');
}

// ---------------- SEARCH / DIRECTORY / SETTINGS ----------------
let lastResults = [];
function viewSearch(q = '') {
  openModal(`
    <h2>🔍 Find</h2>
    <input id="searchInput" class="search" type="search" placeholder="Company, project, assignment or note…" value="${esc(q)}">
    <div id="searchResults" class="list"></div>`);
  const input = $('searchInput');
  input.addEventListener('input', () => renderResults(input.value));
  renderResults(q);
  if (!('ontouchstart' in window)) input.focus();
}
function renderResults(q) {
  const box = $('searchResults');
  if (!box) return;
  if (!q.trim()) {
    const up = D.upcoming(20);
    box.innerHTML = '<p class="section-title">Due &amp; overdue</p>' + (up.length ? up.map(dueRow).join('') : '<p class="empty">Nothing due. Notes with a due date show up here.</p>');
    return;
  }
  lastResults = D.search(q);
  if (!lastResults.length) { box.innerHTML = '<p class="empty">No matches.</p>'; return; }
  box.innerHTML = lastResults.map((r) => {
    const base = `data-act="go" data-planet="${r.planet}" data-project="${r.project ? r.project.id : ''}" data-floor="${r.floor ? r.floor.id : ''}" data-note="${r.note ? r.note.id : ''}"`;
    if (r.type === 'company') return `<button class="row" ${base}><span class="ic">🪐</span><span class="row-main"><b>${esc(companyName(r.planet))}</b><small>Company on ${r.planet}</small></span></button>`;
    if (r.type === 'project') return `<button class="row" ${base}><span class="ic">🏢</span><span class="row-main"><b>${esc(r.project.name)}</b><small>${esc(companyName(r.planet))}</small></span></button>`;
    if (r.type === 'floor') return `<button class="row" ${base}><span class="fno">${r.floorNo}</span><span class="row-main"><b>${esc(r.floor.name)}</b><small>${esc(companyName(r.planet))} › ${esc(r.project.name)}</small></span></button>`;
    return dueRow(r);
  }).join('');
}

function viewDirectory(planet) {
  const projects = D.company(planet).projects;
  openModal(`
    <p class="crumb">${planet}</p>
    <h2>🏢 ${esc(companyName(planet))}</h2>
    <p class="modal-sub">Buildings on this street, in walking order.</p>
    <div class="list">${projects.map((p) => {
      const notes = p.floors.reduce((a, f) => a + f.notes.length, 0);
      return `<button class="row" data-act="go" data-planet="${planet}" data-project="${p.id}" data-floor="" data-note="">
        <span class="ic">🏢</span><span class="row-main"><b>${esc(p.name)}</b><small>${p.floors.length} floors · ${notes} notes</small></span></button>`;
    }).join('') || '<p class="empty">No projects yet.</p>'}</div>
    <div class="btn-row">
      <button class="primary" data-act="newProject" data-planet="${planet}">＋ New project</button>
      <button class="ghost" data-act="editCompany" data-planet="${planet}">✏️ Rename company</button>
    </div>`);
}

function viewSettings() {
  const planet = mode === 'surface' ? world.planetName() : null;
  openModal(`
    <h2>⚙️ Settings</h2>
    <div class="set-row"><span>🔊 Sound</span>
      <div class="seg"><button data-act="sound-on" class="${!settings.muted ? 'on' : ''}">On</button><button data-act="sound-off" class="${settings.muted ? 'on' : ''}">Off</button></div></div>
    ${planet ? `<button class="set-btn" data-act="editCompany" data-planet="${planet}">✏️ Rename this company</button>` : ''}
    <button class="set-btn" data-act="backup">💾 Download backup</button>
    <button class="set-btn" data-act="restore">📂 Restore from backup</button>
    <p class="modal-sub">Everything is saved in this browser only. Download a backup regularly, and use it to move your data to another phone or computer.</p>
    <p class="modal-sub">On the street: use the joystick (or W A S D keys) to walk, drag to look around, tap a window to open its note.</p>`);
}

function downloadBackup() {
  const blob = new Blob([D.exportJSON()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `solar-office-backup-${D.todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  try { localStorage.setItem('solarLastBackup', D.todayStr()); } catch (e) { /* ignore */ }
  toast('💾 Backup downloaded');
}
$('restoreInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      if (!confirm('Replace ALL your companies, projects and notes with this backup?')) return;
      D.importJSON(reader.result);
      closeModal();
      toast('📂 Backup restored');
    } catch (err) { toast('⚠️ ' + (err.message || 'Could not read that file')); }
  };
  reader.readAsText(file);
});

// ---------------- ONE CLICK HANDLER FOR ALL PANELS ----------------
function handleAction(b) {
  const d = b.dataset;
  const { planet, project, floor, note } = d;
  switch (d.act) {
    case 'building': return viewBuilding(planet, project);
    case 'floor': return viewFloor(planet, project, floor);
    case 'note': return viewNote(planet, project, floor, note);
    case 'newProject': return formProject(planet);
    case 'editProject': return formProject(planet, project);
    case 'newFloor': return formFloor(planet, project);
    case 'editFloor': return formFloor(planet, project, floor);
    case 'newNote': return formNote(planet, project, floor);
    case 'editNote': return formNote(planet, project, floor, note);
    case 'editCompany': return formCompany(planet);
    case 'land': return land();
    case 'go': return goTo({ planet, projectId: project || null, floorId: floor || null, noteId: note || null });
    case 'walk': closeModal(); return world.walkTo(project, floor || null);
    case 'toggleDone': {
      const x = lookup(planet, project, floor, note);
      x.note.done = !x.note.done;
      D.save();
      audio.sfx('place');
      return viewNote(planet, project, floor, note);
    }
    case 'delProject': {
      const x = lookup(planet, project);
      if (!confirm(`Delete "${x.project.name}" with all its floors and notes?`)) return;
      const list = D.company(planet).projects;
      list.splice(list.indexOf(x.project), 1);
      D.save();
      audio.sfx('delete');
      return closeModal();
    }
    case 'delFloor': {
      const x = lookup(planet, project, floor);
      if (!confirm(`Delete assignment "${x.floor.name}" and its ${x.floor.notes.length} notes?`)) return;
      x.project.floors.splice(x.project.floors.indexOf(x.floor), 1);
      D.save();
      audio.sfx('delete');
      return viewBuilding(planet, project);
    }
    case 'delNote': {
      const x = lookup(planet, project, floor, note);
      if (!confirm(`Delete note "${x.note.title}"?`)) return;
      x.floor.notes.splice(x.floor.notes.indexOf(x.note), 1);
      D.save();
      audio.sfx('delete');
      return viewFloor(planet, project, floor);
    }
    case 'sound-on': settings.muted = false; audio.setMuted(false); audio.unlock(); saveSettings(); return viewSettings();
    case 'sound-off': settings.muted = true; audio.setMuted(true); saveSettings(); return viewSettings();
    case 'backup': return downloadBackup();
    case 'restore': return $('restoreInput').click();
  }
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b || !(modalBody.contains(b) || card.contains(b))) return;
  e.preventDefault();
  audio.sfx('click');
  handleAction(b);
});

// ---------------- PLANET CARD ----------------
const card = $('card'), cardInner = $('cardInner');
let cardOpen = false;
let cardBody = null;

function showCard(b) {
  cardBody = b;
  if (b.isSun) {
    const rows = PLANETS.map((p) => {
      const s = D.stats(p.name);
      const c = D.companyLabel(p.name);
      return `<button class="row" data-act="go" data-planet="${p.name}" data-project="" data-floor="" data-note="">
        <img class="mini" src="${p.thumb || ASSETS + p.tex}" alt=""><span class="row-main"><b>${c ? esc(c) : '<i class="muted">Free planet</i>'}</b><small>${p.name} · ${s.projects} projects · ${s.floors} assignments</small></span>
        ${s.overdue ? `<span class="chip c-overdue">${s.overdue}</span>` : ''}</button>`;
    }).join('');
    const up = D.upcoming(5);
    cardInner.innerHTML = `
      <div class="card-head"><img class="thumb" src="${ASSETS + SUN.tex}" alt=""><div><h2>Your firm</h2><p class="about">Every planet is one company.</p></div></div>
      <p class="section-title">Companies</p><div class="list">${rows}</div>
      ${up.length ? `<p class="section-title">Due &amp; overdue</p><div class="list">${up.map(dueRow).join('')}</div>` : ''}`;
  } else {
    const c = D.companyLabel(b.name);
    const s = D.stats(b.name);
    const up = D.upcoming(5, b.name);
    cardInner.innerHTML = `
      <div class="card-head"><img class="thumb" src="${b.thumb || ASSETS + b.tex}" alt="">
        <div><h2>${c ? esc(c) : 'No company yet'}</h2><p class="about">🪐 ${b.name} · ${esc(b.about)}</p></div></div>
      ${c ? `<div class="stat-row">
        <div><b>${s.projects}</b><span>Projects</span></div>
        <div><b>${s.floors}</b><span>Assignments</span></div>
        <div><b>${s.notes}</b><span>Notes</span></div>
        <div class="${s.overdue ? 'red' : ''}"><b>${s.overdue}</b><span>Overdue</span></div></div>
        ${up.length ? `<p class="section-title">Due &amp; overdue</p><div class="list">${up.map(dueRow).join('')}</div>` : ''}`
      : `<p class="note">Give this planet a company name to start building its street.</p>`}
      <div class="btn-row">
        <button class="ghost" data-act="editCompany" data-planet="${b.name}">✏️ ${c ? 'Rename' : 'Name company'}</button>
      </div>
      <button class="land-btn" data-act="land">🚀 Land on ${b.name}</button>`;
  }
  card.classList.add('open');
  card.setAttribute('aria-hidden', 'false');
  cardOpen = true;
  applyViewOffset();
}
function hideCard() {
  card.classList.remove('open');
  card.setAttribute('aria-hidden', 'true');
  cardOpen = false;
  applyViewOffset();
}
function applyViewOffset() {
  if (cardOpen && innerWidth <= 640 && mode === 'space') camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.22, innerWidth, innerHeight);
  else camera.clearViewOffset();
}
$('closeBtn').addEventListener('click', () => goHome());

// ---------------- CAMERA FOCUS ----------------
let mode = 'space';       // 'space' | 'flying' | 'surface'
let focus = null;
let fly = null;
const lastPos = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpV = new THREE.Vector3();

function setLabels(body) { for (const b of [SUN, ...PLANETS]) b.label.visible = !body; }

function cameraSpotFor(body, p) {
  if (body.isSun) return new THREE.Vector3(0, body.viewDist * 0.45, body.viewDist);
  const toSun = p.clone().negate().normalize();
  const side = new THREE.Vector3().crossVectors(toSun, UP).normalize();
  return p.clone().addScaledVector(toSun, body.viewDist * 0.75).addScaledVector(side, body.viewDist * 0.55).addScaledVector(UP, body.viewDist * 0.35);
}

function focusOn(body) {
  if (mode !== 'space') return;
  if (focus === body) { showCard(body); return; }
  setLabels(body);
  focus = body;
  fly = { t: 0, fromCam: camera.position.clone(), fromTarget: controls.target.clone(), home: false };
  controls.enabled = false;
  audio.sfx('whoosh');
  showCard(body);
}

function goHome() {
  if (mode !== 'space') return;
  setLabels(null);
  focus = null;
  fly = { t: 0, fromCam: camera.position.clone(), fromTarget: controls.target.clone(), home: true };
  controls.enabled = false;
  hideCard();
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function updateCamera(dt) {
  if (fly) {
    fly.t = Math.min(1, fly.t + dt / 1.4);
    const e = ease(fly.t);
    let targetEnd, camEnd;
    if (fly.home) { targetEnd = new THREE.Vector3(); camEnd = homeCam(); }
    else { targetEnd = focus.mesh.getWorldPosition(new THREE.Vector3()); camEnd = cameraSpotFor(focus, targetEnd); }
    camera.position.lerpVectors(fly.fromCam, camEnd, e);
    controls.target.lerpVectors(fly.fromTarget, targetEnd, e);
    camera.lookAt(controls.target);
    if (fly.t >= 1) { if (!fly.home) lastPos.copy(targetEnd); fly = null; controls.enabled = true; }
    return;
  }
  if (focus) {
    const p = focus.mesh.getWorldPosition(tmpP);
    tmpV.subVectors(p, lastPos);
    camera.position.add(tmpV);
    controls.target.copy(p);
    lastPos.copy(p);
  }
  controls.update();
}

// ---------------- ROCKET FLIGHT (space → planet) ----------------
function buildRocket() {
  const g = new THREE.Group();
  const m = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 });
  const add = (geo, mat, y) => { const x = new THREE.Mesh(geo, mat); x.position.y = y; g.add(x); return x; };
  add(new THREE.CylinderGeometry(0.2, 0.28, 0.2, 16), m('#444a55'), 0.1);
  add(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 24), m('#f2f2f2'), 1.0);
  add(new THREE.ConeGeometry(0.3, 0.6, 24), m('#d9423a'), 2.1);
  for (let i = 0; i < 3; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.35), m('#d9423a'));
    const a = (i / 3) * Math.PI * 2;
    fin.position.set(Math.sin(a) * 0.36, 0.45, Math.cos(a) * 0.36);
    fin.rotation.y = a;
    g.add(fin);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 12), new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9 }));
  flame.rotation.x = Math.PI;
  flame.position.y = -0.45;
  g.add(flame);
  g.userData.flame = flame;
  return g;
}
const fadeEl = $('fade');
const flightRocket = buildRocket();
flightRocket.scale.setScalar(0.18);
flightRocket.visible = false;
scene.add(flightRocket);
let flight = null;
let pendingGo = null;

function bezier(a, b, c, t) {
  const u = 1 - t;
  return new THREE.Vector3().addScaledVector(a, u * u).addScaledVector(b, 2 * u * t).addScaledVector(c, t * t);
}

function land() {
  const target = cardBody || focus;
  if (!target || target.isSun || mode !== 'space') return;
  if (!D.companyLabel(target.name)) { formCompany(target.name); toast('Name the company first'); return; }
  closeModal();
  focus = target;
  hideCard();
  mode = 'flying';
  fly = null;
  controls.enabled = false;
  camera.clearViewOffset();
  labelRenderer.domElement.style.display = 'none';
  document.body.classList.add('flying');
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const start = camera.position.clone().addScaledVector(fwd, 2.5).add(new THREE.Vector3(0, -0.6, 0));
  const p = focus.mesh.getWorldPosition(new THREE.Vector3());
  flight = { t: 0, start, lift: camera.position.distanceTo(p) * 0.25, done: false };
  flightRocket.position.copy(start);
  flightRocket.visible = true;
  audio.sfx('launch');
}

function updateFlight(dt) {
  flight.t = Math.min(1, flight.t + dt / 2.4);
  const t = flight.t, e = t * t * (3 - 2 * t);
  const p = focus.mesh.getWorldPosition(new THREE.Vector3());
  const end = p.clone().add(flight.start.clone().sub(p).normalize().multiplyScalar(focus.r * 1.05));
  const ctrl = flight.start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, flight.lift, 0));
  const pos = bezier(flight.start, ctrl, end, e);
  const dir = bezier(flight.start, ctrl, end, Math.min(1, e + 0.01)).sub(pos);
  if (dir.lengthSq() > 1e-10) flightRocket.quaternion.setFromUnitVectors(UP, dir.normalize());
  flightRocket.position.copy(pos);
  flightRocket.userData.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1);
  camera.position.lerp(pos.clone().addScaledVector(dir, -1.6).add(new THREE.Vector3(0, 0.6, 0)), 1 - Math.exp(-dt * 4));
  const look = pos.clone().lerp(p, Math.min(1, t * 1.2));
  camera.lookAt(look);
  controls.target.copy(look);
  if (t >= 1 && !flight.done) {
    flight.done = true;
    fadeEl.classList.add('on');
    setTimeout(enterSurface, 350);
  }
}

function enterSurface() {
  try {
    mode = 'surface';
    flight = null;
    flightRocket.visible = false;
    document.body.classList.remove('flying');
    document.body.classList.add('on-surface');
    world.enter(focus);
    refreshSurfaceTitle();
    if (pendingGo) {
      const g = pendingGo;
      pendingGo = null;
      if (g.projectId) world.walkTo(g.projectId, g.floorId, true);
      setTimeout(() => openTarget(g), 1700);
    } else if (!D.company(focus.name).projects.length) {
      setTimeout(() => toast('Walk to the "+ New project" plot and tap it'), 1800);
    }
  } catch (err) {
    showError(err);
    backToSpace();
  }
  fadeEl.classList.remove('on');
}

function takeOff() {
  closeModal();
  audio.sfx('launch');
  fadeEl.classList.add('on');
  setTimeout(() => {
    world.exit();
    backToSpace();
    fadeEl.classList.remove('on');
  }, 450);
}

function backToSpace() {
  mode = 'space';
  flight = null;
  flightRocket.visible = false;
  document.body.classList.remove('on-surface', 'flying');
  labelRenderer.domElement.style.display = '';
  refreshLabels();
  if (focus) {
    const p = focus.mesh.getWorldPosition(new THREE.Vector3());
    camera.position.copy(cameraSpotFor(focus, p));
    controls.target.copy(p);
    lastPos.copy(p);
    setLabels(focus);
    showCard(focus);
  }
  controls.enabled = true;
}

// Open the panel for a search result once you're standing in front of it
function openTarget(g) {
  if (g.noteId) viewNote(g.planet, g.projectId, g.floorId, g.noteId);
  else if (g.floorId) viewFloor(g.planet, g.projectId, g.floorId);
  else if (g.projectId) viewBuilding(g.planet, g.projectId);
}

// Go to any company / project / floor / note from anywhere
function goTo(g) {
  const planetObj = PLANET_BY_NAME[g.planet];
  if (!planetObj) return;
  if (mode === 'surface' && world.planetName() === g.planet) {
    closeModal();
    if (!g.projectId) return;
    world.walkTo(g.projectId, g.floorId).then(() => openTarget(g));
    return;
  }
  if (mode === 'surface') {
    closeModal();
    fadeEl.classList.add('on');
    setTimeout(() => {
      world.exit();
      focus = planetObj;
      pendingGo = g;
      enterSurface();
    }, 450);
    return;
  }
  if (mode !== 'space') return;
  if (!g.projectId || !D.companyLabel(g.planet)) { closeModal(); focusOn(planetObj); return; }
  pendingGo = g;
  cardBody = planetObj;
  land();
}

// ---------------- SURFACE WORLD ----------------
const world = createWorld({
  renderer,
  starsTex: stars.material.map,
  onExit: takeOff,
  onPick: (x) => {
    switch (x.type) {
      case 'building': return viewBuilding(x.planet, x.projectId);
      case 'floor': return viewFloor(x.planet, x.projectId, x.floorId);
      case 'note': return viewNote(x.planet, x.projectId, x.floorId, x.noteId);
      case 'add': return formNote(x.planet, x.projectId, x.floorId);
      case 'newProject': return formProject(x.planet);
    }
  }
});

function refreshSurfaceTitle() {
  if (mode !== 'surface') return;
  const planet = world.planetName();
  const s = D.stats(planet);
  $('sName').textContent = companyName(planet);
  $('sSub').innerHTML = `${planet} · ${s.projects} projects · ${s.floors} assignments` + (s.overdue ? ` · <span class="warn">${s.overdue} overdue</span>` : '');
}

$('takeOffBtn').addEventListener('click', takeOff);
$('dirBtn').addEventListener('click', () => viewDirectory(world.planetName()));
$('searchBtn').addEventListener('click', () => viewSearch());
$('searchBtn2').addEventListener('click', () => viewSearch());
$('settingsBtn').addEventListener('click', viewSettings);
$('settingsBtn2').addEventListener('click', viewSettings);

// Any data change: rebuild changed buildings, labels and titles
D.onChange(() => {
  world.sync();
  refreshLabels();
  refreshSurfaceTitle();
  if (cardOpen && cardBody && mode === 'space' && modal.classList.contains('hidden')) showCard(cardBody);
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!modal.classList.contains('hidden')) { closeModal(); return; }
    if (mode === 'space') goHome();
  }
});

// Show any error on screen so problems are easy to report
function showError(err) {
  let box = $('errBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'errBox';
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:40;background:#3a1010;color:#ffd2cc;border:1px solid #ff6b5a;border-radius:12px;padding:10px 12px;font:12px/1.4 system-ui;';
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  }
  box.textContent = 'Error: ' + (err && err.message ? err.message : err) + '  (tap to close)';
}
window.addEventListener('error', (e) => showError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));
window.addEventListener('pointerdown', () => audio.unlock());

// ---------------- TAP (space) ----------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downX = 0, downY = 0;
renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (mode !== 'space') return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(clickables, false);
  if (hits.length) focusOn(hits[0].object.userData.body);
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  world.resize();
  applyViewOffset();
});

// ---------------- START ----------------
refreshLabels();
(() => {
  // Gentle reminder to back up once a week
  let last = null;
  try { last = localStorage.getItem('solarLastBackup'); } catch (e) { /* ignore */ }
  const anyData = D.PLANET_NAMES.some((p) => D.company(p).projects.length);
  if (anyData && (!last || (new Date(D.todayStr()) - new Date(last)) / 86400000 >= 7)) {
    setTimeout(() => toast('💾 Tip: download a backup from ⚙️ Settings'), 4000);
  }
})();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (mode === 'surface') {
    world.update(dt);
    world.render();
    return;
  }
  sunMesh.rotation.y += dt * 0.05;
  for (const p of PLANETS) {
    p.pivot.rotation.y += p.orbitSpeed * dt;
    p.mesh.rotation.y += p.spin * dt;
    for (const m of p.moonObjs) m.pivot.rotation.y += m.speed * dt;
  }
  belt.rotation.y += dt * 0.012;
  if (mode === 'flying') updateFlight(dt);
  else updateCamera(dt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
