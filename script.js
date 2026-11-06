import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// All texture files live in this folder of the repo
const ASSETS = 'assets/';

// Earth takes about 40 seconds per orbit; others are scaled from that
const ORBIT_BASE = (Math.PI * 2) / 40;

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
  }
];

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

// ---------------- BACKGROUND + LIGHT ----------------
const stars = new THREE.Mesh(
  new THREE.SphereGeometry(1200, 64, 64),
  new THREE.MeshBasicMaterial({ map: tex('2k_stars_milky_way.jpg'), side: THREE.BackSide })
);
scene.add(stars);

scene.add(new THREE.AmbientLight(0xffffff, 0.22));
const sunLight = new THREE.PointLight(0xffffff, 2.6, 0, 0);
scene.add(sunLight);

// ---------------- HELPERS ----------------
const clickables = [];

function makeLabel(text, cls, body) {
  const el = document.createElement('div');
  el.className = cls;
  el.textContent = text;
  if (body) el.addEventListener('click', (e) => { e.stopPropagation(); focusOn(body); });
  return new CSS2DObject(el);
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(255,220,150,0.9)');
  grd.addColorStop(0.25, 'rgba(255,170,60,0.45)');
  grd.addColorStop(0.6, 'rgba(255,120,20,0.12)');
  grd.addColorStop(1, 'rgba(255,100,0,0)');
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
  const pivot = new THREE.Object3D();          // orbits around the Sun
  pivot.rotation.y = Math.random() * Math.PI * 2;
  scene.add(pivot);

  const group = new THREE.Object3D();          // planet position on its orbit
  group.position.x = p.dist;
  pivot.add(group);

  const tilt = new THREE.Object3D();           // axial tilt
  tilt.rotation.z = THREE.MathUtils.degToRad(p.tilt);
  group.add(tilt);

  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(p.r, 48, 48),
    new THREE.MeshStandardMaterial({ map: tex(p.tex), roughness: 1, metalness: 0 })
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
  }

  p.moonObjs = [];
  let maxMoonD = 0;
  for (const m of p.moons) {
    const mp = new THREE.Object3D();
    mp.rotation.y = Math.random() * Math.PI * 2;
    tilt.add(mp);
    const mat = m.tex
      ? new THREE.MeshStandardMaterial({ map: tex(m.tex), roughness: 1 })
      : new THREE.MeshStandardMaterial({ color: m.color, roughness: 1 });
    const mm = new THREE.Mesh(new THREE.SphereGeometry(m.r, 24, 24), mat);
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

// ---------------- INFO CARD ----------------
const card = document.getElementById('card');
const cardThumb = document.getElementById('cardThumb');
const cardName = document.getElementById('cardName');
const cardAbout = document.getElementById('cardAbout');
const moonNum = document.getElementById('moonNum');
const moonLabel = document.getElementById('moonLabel');
const moonTitle = document.getElementById('moonTitle');
const moonList = document.getElementById('moonList');
const cardNote = document.getElementById('cardNote');
let cardOpen = false;

function showCard(b) {
  cardThumb.src = ASSETS + b.tex;
  cardName.textContent = b.name;
  cardAbout.textContent = b.about;
  moonList.innerHTML = '';

  if (b.isSun) {
    moonNum.textContent = '8';
    moonLabel.textContent = 'planets orbit the Sun';
    moonTitle.style.display = 'none';
    cardNote.textContent = 'Tap any planet to see its moons.';
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
  if (cardOpen && innerWidth <= 640) {
    camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * 0.22, innerWidth, innerHeight);
  } else {
    camera.clearViewOffset();
  }
}

document.getElementById('closeBtn').addEventListener('click', goHome);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') goHome(); });

// ---------------- CAMERA FOCUS ----------------
let focus = null;
let fly = null;
const lastPos = new THREE.Vector3();
const tmpP = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

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
  if (focus === body) return;
  setLabels(body);
  focus = body;
  fly = { t: 0, fromCam: camera.position.clone(), fromTarget: controls.target.clone(), home: false };
  controls.enabled = false;
  showCard(body);
}

function goHome() {
  if (!focus && !cardOpen) return;
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
    // Follow the planet as it moves along its orbit
    const p = focus.mesh.getWorldPosition(tmpP);
    tmpV.subVectors(p, lastPos);
    camera.position.add(tmpV);
    controls.target.copy(p);
    lastPos.copy(p);
  }
  controls.update();
}

// ---------------- TAP / CLICK ----------------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let downX = 0, downY = 0;

renderer.domElement.addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; });
renderer.domElement.addEventListener('pointerup', (e) => {
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
  applyViewOffset();
});

// ---------------- LOOP ----------------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  sunMesh.rotation.y += dt * 0.05;
  for (const p of PLANETS) {
    p.pivot.rotation.y += p.orbitSpeed * dt;
    p.mesh.rotation.y += p.spin * dt;
    for (const m of p.moonObjs) m.pivot.rotation.y += m.speed * dt;
  }
  belt.rotation.y += dt * 0.012;

  updateCamera(dt);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();
