import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { createWorld } from './world.js?v=4';
import { buildRocketModel } from './items.js?v=4';
import * as audio from './audio.js?v=4';
import { allStats, track, checkBadges, BADGES, unlocked } from './badges.js?v=4';

// All texture files live in this folder of the repo
const ASSETS = 'assets/';

// Earth takes about 40 seconds per orbit; others are scaled from that
const ORBIT_BASE = (Math.PI * 2) / 40;
const UP = new THREE.Vector3(0, 1, 0);

// ---------------- SETTINGS ----------------
const settings = Object.assign({ muted: false, dayNight: 'auto' }, (() => {
  try { return JSON.parse(localStorage.getItem('solarSettings') || '{}'); } catch (e) { return {}; }
})());
function saveSettings() {
  try { localStorage.setItem('solarSettings', JSON.stringify(settings)); } catch (e) { /* ignore */ }
}
audio.setMuted(settings.muted);

// ---------------- DATA ----------------
const SUN = {
  name: 'Sun', tex: '2k_sun.jpg', r: 7, isSun: true,
  about: 'The star at the centre of our solar system.'
};

// dist/r are scene units (not to real scale). period = orbit in Earth years.
// day = rotation in Earth days. tilt = axial tilt in degrees.
// Moon counts are recognised totals as of 2025 and keep changing.
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

// ---------------- RENDERER / SCENE ----------------
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  for (let i = 0; i < 40; i++) {
    g.fillStyle = 'rgba(70,40,30,0.25)';
    g.beginPath();
    g.ellipse(Math.random() * 1024, 290 + (Math.random() - 0.5) * 50, 40 + Math.random() * 60, 18 + Math.random() * 20, 0, 0, Math.PI * 2);
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
const sunMesh = new THREE.Mesh(
  new THREE.SphereGeometry(SUN.r, 64, 64),
  new THREE.MeshBasicMaterial({ map: tex(SUN.tex) })
);
scene.add(sunMesh);
SUN.mesh = sunMesh;
SUN.viewDist = 32;
sunMesh.userData.body = SUN;
clickables.push(sunMesh);
SUN.label = makeLabel('Sun', 'planet-label', SUN);
SUN.label.position.set(0, SUN.r + 1.5, 0);
scene.add(SUN.label);

const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
}));
glow.scale.set(36, 36, 1);
scene.add(glow);

// ---------------- PLANETS ----------------
for (const p of PLANETS) {
  let map;
  if (p.tex) map = tex(p.tex);
  else { const pt = plutoTexture(); map = pt.texture; p.thumb = pt.url; }

  const pivot = new THREE.Object3D();          // orbits around the Sun
  pivot.rotation.y = Math.random() * Math.PI * 2;
  if (p.incl) {
    const plane = new THREE.Object3D();
    plane.rotation.z = THREE.MathUtils.degToRad(p.incl);
    scene.add(plane);
    plane.add(pivot);
  } else {
    scene.add(pivot);
  }

  const group = new THREE.Object3D();          // planet position on its orbit
  group.position.x = p.dist;
  pivot.add(group);

  const tilt = new THREE.Object3D();           // axial tilt
  tilt.rotation.z = THREE.MathUtils.degToRad(p.tilt);
  group.add(tilt);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.r, 48, 48),
    new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 })
  );
  tilt.add(mesh);

  // Bigger invisible sphere so small planets are easy to tap on a phone
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(p.r * 1.6, p.r + 1.2), 12, 12),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  hit.userData.body = p;
  group.add(hit);
  clickables.push(hit);

  if (p.ring) {
    const { inner, outer } = p.ring;
    const geo = new THREE.RingGeometry(inner, outer, 128, 1);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
    }
    const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      map: tex(p.ring.tex), color: 0xdddddd, transparent: true, side: THREE.DoubleSide, depthWrite: false
    }));
    ring.rotation.x = -Math.PI / 2;
    tilt.add(ring);
    p.ringTex = ring.material.map;
  }

  p.moonObjs = [];
  let maxMoonD = 0;
  for (const m of p.moons) {
    const mp = new THREE.Object3D();
    mp.rotation.y = Math.random() * Math.PI * 2;
    tilt.add(mp);
    const mtl = m.tex
      ? new THREE.MeshStandardMaterial({ map: tex(m.tex), roughness: 1 })
      : new THREE.MeshStandardMaterial({ color: m.color, roughness: 1 });
    const mm = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 24), mtl);
    mm.position.x = m.d;
    mp.add(mm);
    const lbl = makeLabel(m.name, 'moon-label');
    lbl.position.set(0, m.r + 0.35, 0);
    lbl.visible = false;
    mm.add(lbl);
    p.moonObjs.push({ pivot: mp, speed: ((Math.PI * 2) / m.p) * (m.retro ? -1 : 1), label: lbl });
    maxMoonD = Math.max(maxMoonD, m.d);
  }

  p.label = makeLabel(p.name, 'planet-label', p);
  p.label.position.set(0, p.r + 1, 0);
  group.add(p.label);

  p.pivot = pivot;
  p.mesh = mesh;
  p.orbitSpeed = ORBIT_BASE / Math.sqrt(p.period);
  p.spin = 1.5 / Math.sqrt(p.day);
  p.viewDist = Math.max(p.r * 5, maxMoonD * 1.9, p.ring ? p.ring.outer * 2.4 : 0);
}

// ---------------- ASTEROID BELT ----------------
const BELT_COUNT = 1600;
const belt = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(0.16, 0),
  new THREE.MeshStandardMaterial({ color: 0x8c8378, roughness: 1, flatShading: true }),
  BELT_COUNT
);
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

// ---------------- COMET ----------------
const comet = { a: 96, e: 0.86, M: 2.6, n: (Math.PI * 2) / 170, plane: new THREE.Euler(0.42, 1.1, 0.15) };
const cometHead = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.35, 1),
  new THREE.MeshStandardMaterial({ color: '#d6e2ea', roughness: 1, flatShading: true })
);
const cometGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture(['rgba(200,235,255,0.9)', 'rgba(120,190,255,0.35)', 'rgba(80,150,255,0.08)']),
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
}));
cometGlow.scale.set(4, 4, 1);
function makeTail(color, opacity) {
  const geo = new THREE.ConeGeometry(1, 1, 24, 1, true);
  geo.translate(0, -0.5, 0);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  }));
}
const tailOuter = makeTail('#7fbfff', 0.18);
const tailInner = makeTail('#e6f4ff', 0.3);
scene.add(cometHead, cometGlow, tailOuter, tailInner);
const DOWN = new THREE.Vector3(0, -1, 0);
const cometPos = new THREE.Vector3();

function updateComet(dt) {
  comet.M = (comet.M + comet.n * dt) % (Math.PI * 2);
  let E = comet.M;
  for (let i = 0; i < 6; i++) E -= (E - comet.e * Math.sin(E) - comet.M) / (1 - comet.e * Math.cos(E));
  const b = comet.a * Math.sqrt(1 - comet.e * comet.e);
  cometPos.set(comet.a * (Math.cos(E) - comet.e), 0, b * Math.sin(E)).applyEuler(comet.plane);
  cometHead.position.copy(cometPos);
  cometGlow.position.copy(cometPos);
  cometHead.rotation.y += dt * 0.5;
  const away = cometPos.clone().normalize();
  const len = THREE.MathUtils.clamp(320 / cometPos.length(), 2.5, 24);
  const q = new THREE.Quaternion().setFromUnitVectors(DOWN, away);
  [[tailOuter, 0.14], [tailInner, 0.06]].forEach(([t, w]) => {
    t.position.copy(cometPos);
    t.quaternion.copy(q);
    t.scale.set(len * w + 0.3, len, len * w + 0.3);
  });
}

// ---------------- INFO CARD ----------------
const $ = (id) => document.getElementById(id);
const card = $('card');
const cardThumb = $('cardThumb'), cardName = $('cardName'), cardAbout = $('cardAbout');
const moonNum = $('moonNum'), moonLabel = $('moonLabel'), moonTitle = $('moonTitle');
const moonList = $('moonList'), cardNote = $('cardNote'), cardWorld = $('cardWorld');
const landBtn = $('landBtn');
const totalPop = $('totalPop');
let cardOpen = false;
let cardBody = null;

function showCard(b) {
  cardBody = b;
  cardThumb.src = b.thumb || ASSETS + b.tex;
  cardName.textContent = b.name;
  cardAbout.textContent = b.about;
  moonList.innerHTML = '';

  if (b.isSun) {
    moonNum.textContent = '8';
    moonLabel.textContent = 'planets orbit the Sun';
    moonTitle.style.display = 'none';
    cardNote.textContent = 'Plus the dwarf planet Pluto and a comet. Tap any planet to see its moons.';
    cardWorld.style.display = 'none';
    landBtn.style.display = 'none';
  } else {
    moonNum.textContent = b.moonCount;
    moonLabel.textContent = b.moonCount === 1 ? 'moon' : 'moons';
    moonTitle.style.display = b.moons.length ? '' : 'none';
    for (const m of b.moons) {
      const li = document.createElement('li');
      li.innerHTML = `<i class="dot" style="background:${m.color}"></i><div><b>${m.name}</b><span>${m.info}</span></div>`;
      moonList.appendChild(li);
    }
    cardNote.textContent = b.note;
    const s = allStats().per[b.name];
    cardWorld.style.display = '';
    cardWorld.textContent = s && s.items
      ? `🚩 Your world: ${s.items} items · 👥 ${s.people} people · ⚡ ${s.power} power`
      : "You haven't built anything here yet.";
    landBtn.style.display = '';
    landBtn.textContent = '🚀 Land on ' + b.name;
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

// On phones the card covers the bottom half, so shift the view up
function applyViewOffset() {
  if (cardOpen && innerWidth <= 640 && mode === 'space') {
    camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.22, innerWidth, innerHeight);
  } else {
    camera.clearViewOffset();
  }
}

// Flags on planets you've built on + total population
function refreshWorldMarks() {
  const a = allStats();
  for (const p of PLANETS) {
    const n = a.per[p.name] ? a.per[p.name].items : 0;
    p.label.element.textContent = p.name + (n ? ' 🚩' : '');
  }
  totalPop.textContent = a.people
    ? `👥 Total population: ${a.people.toLocaleString('en-IN')} across your worlds`
    : 'Tap a planet, then land to build your world';
}

$('closeBtn').addEventListener('click', goHome);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.classList.contains('hidden')) { closeModal(); return; }
  if (e.key === 'Escape' && mode === 'space') goHome();
});

// ---------------- CAMERA FOCUS ----------------
let mode = 'space';       // 'space' | 'flying' | 'surface'
let focus = null;
let fly = null;
const lastPos = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpV = new THREE.Vector3();

function setLabels(body) {
  for (const b of [SUN, ...PLANETS]) b.label.visible = !body;
  for (const p of PLANETS) for (const m of p.moonObjs) m.label.visible = p === body;
}

// Camera sits on the sunlit side of the planet, slightly off to one side and above
function cameraSpotFor(body, p) {
  if (body.isSun) return new THREE.Vector3(0, body.viewDist * 0.45, body.viewDist);
  const toSun = p.clone().negate().normalize();
  const side = new THREE.Vector3().crossVectors(toSun, UP).normalize();
  return p.clone()
    .addScaledVector(toSun, body.viewDist * 0.75)
    .addScaledVector(side, body.viewDist * 0.55)
    .addScaledVector(UP, body.viewDist * 0.35);
}

function focusOn(body) {
  if (mode !== 'space' || focus === body) return;
  setLabels(body);
  focus = body;
  fly = { t: 0, fromCam: camera.position.clone(), fromTarget: controls.target.clone(), home: false };
  controls.enabled = false;
  audio.sfx('whoosh');
  showCard(body);
}

function goHome() {
  if (mode !== 'space' || (!focus && !cardOpen)) return;
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
    if (fly.home) {
      targetEnd = new THREE.Vector3();
      camEnd = homeCam();
    } else {
      targetEnd = focus.mesh.getWorldPosition(new THREE.Vector3());
      camEnd = cameraSpotFor(focus, targetEnd);
    }
    camera.position.lerpVectors(fly.fromCam, camEnd, e);
    controls.target.lerpVectors(fly.fromTarget, targetEnd, e);
    camera.lookAt(controls.target);
    if (fly.t >= 1) {
      if (!fly.home) lastPos.copy(targetEnd);
      fly = null;
      controls.enabled = true;
    }
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
const fadeEl = $('fade');
const flightRocket = buildRocketModel();
flightRocket.scale.setScalar(0.18);
flightRocket.visible = false;
scene.add(flightRocket);
let flight = null;

function bezier(a, b, c, t) {
  const u = 1 - t;
  return new THREE.Vector3().addScaledVector(a, u * u).addScaledVector(b, 2 * u * t).addScaledVector(c, t * t);
}

function land() {
  const target = cardBody || focus;
  if (!target || target.isSun || mode !== 'space') return;
  focus = target;
  hideCard();
  mode = 'flying';
  fly = null;
  controls.enabled = false;
  camera.clearViewOffset();
  labelRenderer.domElement.style.display = 'none';
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  const start = camera.position.clone().addScaledVector(fwd, 2.5).add(new THREE.Vector3(0, -0.6, 0));
  const p = focus.mesh.getWorldPosition(new THREE.Vector3());
  flight = { t: 0, start, lift: camera.position.distanceTo(p) * 0.25, done: false };
  flightRocket.position.copy(start);
  flightRocket.visible = true;
  flightRocket.userData.flame.visible = true;
  audio.sfx('launch');
}

function updateFlight(dt) {
  flight.t = Math.min(1, flight.t + dt / 2.6);
  const t = flight.t;
  const e = t * t * (3 - 2 * t);
  const p = focus.mesh.getWorldPosition(new THREE.Vector3());
  const end = p.clone().add(flight.start.clone().sub(p).normalize().multiplyScalar(focus.r * 1.05));
  const ctrl = flight.start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, flight.lift, 0));
  const pos = bezier(flight.start, ctrl, end, e);
  const ahead = bezier(flight.start, ctrl, end, Math.min(1, e + 0.01));
  const dir = ahead.sub(pos);
  if (dir.lengthSq() > 1e-10) flightRocket.quaternion.setFromUnitVectors(UP, dir.normalize());
  flightRocket.position.copy(pos);
  flightRocket.userData.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1);

  const desired = pos.clone().addScaledVector(dir, -1.6).add(new THREE.Vector3(0, 0.6, 0));
  camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
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
    document.body.classList.add('on-surface');
    world.enter(focus);
    track('land', focus.name);
    celebrate();
  } catch (err) {
    showError(err);
    backToSpace();
  }
  fadeEl.classList.remove('on');
}

function takeOff() {
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
  document.body.classList.remove('on-surface');
  labelRenderer.domElement.style.display = '';
  refreshWorldMarks();
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

landBtn.addEventListener('click', (e) => { e.stopPropagation(); land(); });

// ---------------- SURFACE WORLD ----------------
const world = createWorld({
  renderer,
  starsTex: stars.material.map,
  onExit: takeOff,
  onMenu: () => openSettings(true),
  getSettings: () => settings,
  onEvent: (type) => {
    if (type !== 'change') track(type);
    celebrate();
  }
});

// ---------------- TOASTS, BADGES, SETTINGS ----------------
const toastEl = $('toast');
const toastQueue = [];
let toastBusy = false;
function toast(msg) {
  toastQueue.push(msg);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const msg = toastQueue.shift();
  if (!msg) { toastBusy = false; return; }
  toastBusy = true;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => { toastEl.classList.remove('show'); setTimeout(nextToast, 400); }, 2800);
}

function celebrate() {
  const fresh = checkBadges();
  if (fresh.length) audio.sfx('badge');
  fresh.forEach((b) => toast(`🏅 Badge unlocked: ${b.icon} ${b.name}`));
}

const modal = $('modal'), modalBody = $('modalBody');
function openModal(html) { modalBody.innerHTML = html; modal.classList.remove('hidden'); }
function closeModal() { modal.classList.add('hidden'); }
$('modalClose').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

function openBadges() {
  const got = unlocked();
  const count = BADGES.filter((b) => got[b.id]).length;
  openModal(`
    <h2>🏅 Badges</h2>
    <p class="modal-sub">${count} of ${BADGES.length} unlocked</p>
    <div class="badge-grid">
      ${BADGES.map((b) => `
        <div class="badge ${got[b.id] ? 'got' : ''}">
          <span class="b-ic">${b.icon}</span>
          <b>${b.name}</b>
          <span>${b.desc}</span>
        </div>`).join('')}
    </div>`);
}

let settingsOnSurface = false;
function openSettings(onSurface = mode === 'surface') {
  settingsOnSurface = onSurface;
  openModal(`
    <h2>⚙️ Settings</h2>
    <div class="set-row"><span>🔊 Sound</span>
      <div class="seg"><button data-act="sound-on" class="${!settings.muted ? 'on' : ''}">On</button><button data-act="sound-off" class="${settings.muted ? 'on' : ''}">Off</button></div></div>
    <div class="set-row"><span>🌗 Day &amp; night</span>
      <div class="seg"><button data-act="dn-auto" class="${settings.dayNight === 'auto' ? 'on' : ''}">Cycle</button><button data-act="dn-day" class="${settings.dayNight === 'day' ? 'on' : ''}">Always day</button></div></div>
    <button class="set-btn" data-act="badges">🏅 View badges</button>
    <button class="set-btn" data-act="backup">💾 Download backup</button>
    <button class="set-btn" data-act="restore">📂 Restore from backup</button>
    ${onSurface ? '<button class="set-btn danger" data-act="clear">🗑 Clear this world</button>' : ''}
    <p class="modal-sub">Your worlds are saved in this browser. Download a backup to move them to another phone or computer.</p>`);
}

modalBody.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  audio.sfx('click');
  switch (b.dataset.act) {
    case 'sound-on': settings.muted = false; audio.unlock(); break;
    case 'sound-off': settings.muted = true; break;
    case 'dn-auto': settings.dayNight = 'auto'; break;
    case 'dn-day': settings.dayNight = 'day'; break;
    case 'badges': openBadges(); return;
    case 'backup': downloadBackup(); return;
    case 'restore': $('restoreInput').click(); return;
    case 'clear':
      if (confirm('Remove everything you built on this world? (You can still undo.)')) { world.clearWorld(); closeModal(); }
      return;
    default: return;
  }
  audio.setMuted(settings.muted);
  saveSettings();
  openSettings(settingsOnSurface);
});

function downloadBackup() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('solar')) data[k] = localStorage.getItem(k);
  }
  const blob = new Blob([JSON.stringify({ app: 'solar-system', version: 1, saved: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `solar-system-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  toast('💾 Backup downloaded');
}

$('restoreInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      if (backup.app !== 'solar-system' || !backup.data) throw new Error('This is not a Solar System backup file.');
      if (!confirm('Replace all your worlds and badges with this backup?')) return;
      const old = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith('solar')) old.push(k); }
      old.forEach((k) => localStorage.removeItem(k));
      Object.entries(backup.data).forEach(([k, v]) => { if (k.startsWith('solar')) localStorage.setItem(k, v); });
      location.reload();
    } catch (err) {
      toast('⚠️ ' + (err.message || 'Could not read that file'));
    }
  };
  reader.readAsText(file);
});

$('badgeBtn').addEventListener('click', openBadges);
$('settingsBtn').addEventListener('click', () => openSettings(false));

// Show any error on screen so problems are easy to report
function showError(err) {
  let box = $('errBox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'errBox';
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:30;background:#3a1010;color:#ffd2cc;border:1px solid #ff6b5a;border-radius:12px;padding:10px 12px;font:12px/1.4 system-ui;';
    box.onclick = () => box.remove();
    document.body.appendChild(box);
  }
  box.textContent = 'Error: ' + (err && err.message ? err.message : err) + '  (tap to close)';
}
window.addEventListener('error', (e) => showError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

// Sound can only start after the first tap
window.addEventListener('pointerdown', () => audio.unlock());

// ---------------- TAP / CLICK (space) ----------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downX = 0, downY = 0;

renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (mode !== 'space') return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return; // it was a drag
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObjects(clickables, false);
  if (hits.length) focusOn(hits[0].object.userData.body);
});

// ---------------- RESIZE ----------------
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  labelRenderer.setSize(innerWidth, innerHeight);
  world.resize();
  applyViewOffset();
});

// ---------------- LOOP ----------------
refreshWorldMarks();
celebrate();

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
  updateComet(dt);

  if (mode === 'flying') updateFlight(dt);
  else updateCamera(dt);

  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
