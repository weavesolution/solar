import * as THREE from 'three';
import { company, dueStatus, fmtDate } from './data.js?v=5';
import { sfx } from './audio.js?v=5';

// ---------------- STREET LAYOUT ----------------
const ROAD_HALF = 4;        // road is 8 wide
const WALK_HALF = 5.6;      // how far left/right you can walk (sidewalks)
const FRONT_X = 6.8;        // where building fronts stand
const DEPTH = 7;
const SPACING = 16;         // gap between buildings along the street
const FIRST_Z = -14;
const LOBBY_H = 3.4;
const FLOOR_H = 2.8;
const COL_W = 1.8;
const WIN_W = 1.3;
const WIN_H = 1.5;
const EYE = 1.7;
const SPEED = 6;

const SKY = {
  Mercury: { c: '#2a221c', stars: 0.9 },
  Venus:   { c: '#b98a45', stars: 0.1 },
  Earth:   { c: '#7fb6e6', stars: 0 },
  Mars:    { c: '#c58c63', stars: 0.15 },
  Jupiter: { c: '#4a3626', stars: 0.6 },
  Saturn:  { c: '#4a3d2a', stars: 0.6 },
  Uranus:  { c: '#7cc8cf', stars: 0.2 },
  Neptune: { c: '#2a4a8f', stars: 0.5 },
  Pluto:   { c: '#1a1a26', stars: 1 }
};
const FACADES = ['#d9d4c7', '#c9b8a3', '#a9b7c6', '#cfc1a8', '#b8c4b0', '#d6c6c0', '#b5b9c9', '#e0d8c8'];
const NOTE_COLORS = { overdue: '#ff9b8f', soon: '#ffd36b', later: '#fff2a6', none: '#e8f0ff', done: '#b9efc2' };

// ---------------- CANVAS TEXT HELPERS ----------------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function fitText(g, text, maxW, size, weight = 700) {
  let s = size;
  do { g.font = `${weight} ${s}px "Space Grotesk", system-ui, sans-serif`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}
function wrapLines(g, text, maxW, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (g.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (g.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function signTexture(text) {
  return canvasTex(768, 128, (g, w, h) => {
    g.fillStyle = '#18202f';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ffb84d';
    g.lineWidth = 6;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = '#ffffff';
    fitText(g, text, w - 60, 64);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
  });
}
function floorLabelTexture(no, name, widthUnits) {
  const w = Math.round(widthUnits * 90);
  return canvasTex(w, 40, (g) => {
    g.fillStyle = 'rgba(20,26,40,0.85)';
    g.fillRect(0, 0, w, 40);
    g.fillStyle = '#ffb84d';
    g.font = '700 26px "Space Grotesk", system-ui, sans-serif';
    g.textBaseline = 'middle';
    g.fillText(String(no), 12, 21);
    g.fillStyle = '#ffffff';
    fitText(g, name, w - 70, 24, 500);
    g.fillText(name, 52, 21);
  });
}
function noteTexture(note) {
  const st = dueStatus(note);
  return canvasTex(192, 224, (g, w, h) => {
    g.fillStyle = '#0d1420';
    g.fillRect(0, 0, w, h);
    g.save();
    g.translate(w / 2, h / 2);
    g.rotate(-0.03);
    g.fillStyle = NOTE_COLORS[st];
    g.fillRect(-80, -94, 160, 188);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(-80, 70, 160, 24);
    g.fillStyle = '#c0392b';
    g.beginPath();
    g.arc(0, -86, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1b1b1b';
    g.font = '700 22px "Space Grotesk", system-ui, sans-serif';
    g.textBaseline = 'top';
    wrapLines(g, note.title || 'Note', 140, 4).forEach((l, i) => g.fillText(l, -70, -68 + i * 27));
    g.font = '500 15px "Space Grotesk", system-ui, sans-serif';
    g.fillStyle = st === 'overdue' ? '#8a1c10' : '#333';
    const foot = note.done ? '✓ Done' : note.due ? 'Due ' + fmtDate(note.due) : note.date ? fmtDate(note.date) : '';
    g.fillText(foot, -70, 74);
    g.restore();
  });
}
function plusTexture() {
  return canvasTex(128, 148, (g, w, h) => {
    g.fillStyle = '#1b2a3d';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,184,77,0.9)';
    g.setLineDash([10, 8]);
    g.lineWidth = 4;
    g.strokeRect(12, 12, w - 24, h - 24);
    g.setLineDash([]);
    g.fillStyle = '#ffb84d';
    g.font = '700 64px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('+', w / 2, h / 2 - 8);
    g.font = '600 15px system-ui, sans-serif';
    g.fillText('Add note', w / 2, h / 2 + 36);
  });
}
function roadTexture() {
  const t = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a3d42';
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    g.fillStyle = '#f2d16b';
    g.fillRect(w / 2 - 4, 20, 8, 110);
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.fillRect(8, 0, 5, h);
    g.fillRect(w - 13, 0, 5, h);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function rocketModel() {
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
  return g;
}

// =====================================================================
export function createWorld({ renderer, starsTex, onExit, onPick }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 1500);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(30, 60, 20);
  scene.add(sun);

  const starSphere = new THREE.Mesh(
    new THREE.SphereGeometry(900, 48, 48),
    new THREE.MeshBasicMaterial({ map: starsTex, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false })
  );
  scene.add(starSphere);

  // Ground uses the planet's own texture
  const groundMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  scene.add(ground);

  // Road + sidewalks (long enough for a very long street)
  const ROAD_LEN = 1600;
  const rTex = roadTexture();
  rTex.repeat.set(1, ROAD_LEN / 8);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_HALF * 2, ROAD_LEN), new THREE.MeshStandardMaterial({ map: rTex, roughness: 0.95 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, 30 - ROAD_LEN / 2);
  scene.add(road);
  const walkMat = new THREE.MeshStandardMaterial({ color: '#9a9590', roughness: 1 });
  [-1, 1].forEach((s) => {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.15, ROAD_LEN), walkMat);
    sw.position.set(s * (ROAD_HALF + 1.3), 0.075, 30 - ROAD_LEN / 2);
    scene.add(sw);
  });

  const lander = rocketModel();
  lander.scale.setScalar(1.6);
  lander.position.set(0, 0, 9);
  scene.add(lander);

  const street = new THREE.Group();   // buildings + plot
  const lamps = new THREE.Group();
  scene.add(street, lamps);

  let planet = null;
  let active = false;
  let built = new Map();               // projectId -> { group, sig }
  let plot = null;
  let streetEnd = FIRST_Z;
  let intro = null;
  let tween = null;
  let time = 0;
  const bg = new THREE.Color();
  scene.background = bg;

  // Player
  const pos = new THREE.Vector3(0, EYE, 4);
  let yaw = 0, pitch = 0.08;
  let bob = 0;

  // ---------- BUILDINGS ----------
  function slot(index) {
    const side = index % 2 === 0 ? -1 : 1;
    const z = FIRST_Z - Math.floor(index / 2) * SPACING;
    return { side, z };
  }

  function disposeGroup(g) {
    g.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
      }
    });
  }

  function buildBuilding(project, index) {
    const { side, z } = slot(index);
    const floors = project.floors;
    const maxNotes = floors.reduce((m, f) => Math.max(m, f.notes.length), 0);
    const cols = Math.min(12, Math.max(3, maxNotes + 1));
    const W = cols * COL_W + 1.4;
    const H = LOBBY_H + floors.length * FLOOR_H + 0.5;
    const facade = project.color || FACADES[index % FACADES.length];

    const g = new THREE.Group();
    g.position.set(side * (FRONT_X + DEPTH / 2), 0, z);
    g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const tag = (mesh, data) => { mesh.userData.pick = { projectId: project.id, ...data }; return mesh; };
    const front = DEPTH / 2;

    const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, DEPTH), new THREE.MeshStandardMaterial({ color: facade, roughness: 0.85 }));
    body.position.y = H / 2;
    g.add(tag(body, { type: 'building' }));

    // Lobby: glass doors, canopy and name sign
    const glass = new THREE.MeshStandardMaterial({ color: '#3b5872', roughness: 0.2, metalness: 0.4, emissive: '#1d3346', emissiveIntensity: 0.6 });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), glass);
    door.position.set(0, 1.2, front + 0.02);
    g.add(tag(door, { type: 'building' }));
    [-W / 2 + 1.6, W / 2 - 1.6].forEach((x) => {
      if (W < 7) return;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.6), glass);
      w.position.set(x, 1.5, front + 0.02);
      g.add(tag(w, { type: 'building' }));
    });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.2), new THREE.MeshStandardMaterial({ color: '#2b3342' }));
    canopy.position.set(0, 2.55, front + 0.6);
    g.add(tag(canopy, { type: 'building' }));
    const signW = Math.min(W - 0.4, 7);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signW / 6), new THREE.MeshBasicMaterial({ map: signTexture(project.name || 'Project') }));
    sign.position.set(0, LOBBY_H - 0.45, front + 0.03);
    g.add(tag(sign, { type: 'building' }));

    if (!floors.length) {
      const hint = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), new THREE.MeshBasicMaterial({ map: floorLabelTexture('+', 'Tap to add first assignment', 4) }));
      hint.position.set(0, LOBBY_H + 0.3, front + 0.03);
      g.add(tag(hint, { type: 'building' }));
    }

    // Floors: one per assignment, windows hold notes
    const plusTex = plusTexture();
    const darkGlass = new THREE.MeshStandardMaterial({ color: '#22303f', roughness: 0.25, metalness: 0.5 });
    const ledgeMat = new THREE.MeshStandardMaterial({ color: '#59606b', roughness: 0.7 });
    floors.forEach((floor, k) => {
      const base = LOBBY_H + k * FLOOR_H;
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.1, 0.25), ledgeMat);
      ledge.position.set(0, base, front + 0.1);
      g.add(ledge);
      const label = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.4, 0.42), new THREE.MeshBasicMaterial({ map: floorLabelTexture(k + 1, floor.name || 'Assignment', W - 0.4) }));
      label.position.set(0, base + 0.32, front + 0.03);
      g.add(tag(label, { type: 'floor', floorId: floor.id }));

      for (let i = 0; i < cols; i++) {
        const x = -W / 2 + 0.7 + COL_W * (i + 0.5);
        const y = base + 0.62 + WIN_H / 2 + 0.1;
        let mesh;
        const note = floor.notes[i];
        if (note) {
          mesh = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_H), new THREE.MeshBasicMaterial({ map: noteTexture(note) }));
          tag(mesh, { type: 'note', floorId: floor.id, noteId: note.id });
        } else if (i === floor.notes.length) {
          mesh = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_H), new THREE.MeshBasicMaterial({ map: plusTex }));
          tag(mesh, { type: 'add', floorId: floor.id });
        } else {
          mesh = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W, WIN_H), darkGlass);
          tag(mesh, { type: 'floor', floorId: floor.id });
        }
        mesh.position.set(x, y, front + 0.03);
        g.add(mesh);
        const frame = new THREE.Mesh(new THREE.PlaneGeometry(WIN_W + 0.16, WIN_H + 0.16), ledgeMat);
        frame.position.set(x, y, front + 0.015);
        g.add(frame);
      }
    });

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(W + 0.3, 0.3, DEPTH + 0.3), ledgeMat);
    roof.position.y = H + 0.15;
    g.add(roof);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 8), ledgeMat);
    mast.position.set(W / 2 - 1, H + 1.4, 0);
    g.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: '#ff5a4d' }));
    beacon.position.set(W / 2 - 1, H + 2.55, 0);
    g.add(beacon);
    g.userData.beacon = beacon;
    g.userData.side = side;
    g.userData.z = z;
    return g;
  }

  function buildPlot(index) {
    const { side, z } = slot(index);
    const g = new THREE.Group();
    g.position.set(side * (FRONT_X + DEPTH / 2), 0, z);
    g.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    const pick = { type: 'newProject' };
    const pad = new THREE.Mesh(new THREE.BoxGeometry(9, 0.1, DEPTH), new THREE.MeshStandardMaterial({ color: '#7d6a55', roughness: 1 }));
    pad.position.y = 0.05;
    pad.userData.pick = pick;
    g.add(pad);
    const tape = new THREE.MeshStandardMaterial({ color: '#ffb84d' });
    [[-4.4, 0], [4.4, 0]].forEach(([x]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), tape);
      post.position.set(x, 0.5, DEPTH / 2);
      g.add(post);
    });
    const rope = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.06, 0.06), tape);
    rope.position.set(0, 0.85, DEPTH / 2);
    g.add(rope);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.1), new THREE.MeshBasicMaterial({
      map: canvasTex(512, 256, (c, w, h) => {
        c.fillStyle = '#18202f';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = '#ffb84d';
        c.lineWidth = 8;
        c.strokeRect(8, 8, w - 16, h - 16);
        c.fillStyle = '#ffb84d';
        c.font = '700 90px system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText('+', w / 2, 112);
        c.fillStyle = '#fff';
        c.font = '700 44px "Space Grotesk", system-ui, sans-serif';
        c.fillText('New project', w / 2, 190);
      })
    }));
    board.position.set(0, 2.1, DEPTH / 2 - 0.5);
    board.userData.pick = pick;
    g.add(board);
    [-1.8, 1.8].forEach((x) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), new THREE.MeshStandardMaterial({ color: '#555' }));
      leg.position.set(x, 0.55, DEPTH / 2 - 0.5);
      g.add(leg);
    });
    return g;
  }

  function buildLamps() {
    disposeGroup(lamps);
    lamps.clear();
    const pole = new THREE.MeshStandardMaterial({ color: '#3a3f48' });
    const light = new THREE.MeshBasicMaterial({ color: '#ffe7a8' });
    for (let z = 2; z > streetEnd - 6; z -= SPACING / 2) {
      [-1, 1].forEach((s) => {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4, 8), pole);
        p.position.set(s * (ROAD_HALF + 0.4), 2, z + (s > 0 ? SPACING / 4 : 0));
        lamps.add(p);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), light);
        b.position.set(s * (ROAD_HALF + 0.2), 4.05, p.position.z);
        lamps.add(b);
      });
    }
  }

  // Rebuild only buildings whose data changed
  function sync() {
    if (!planet) return;
    const projects = company(planet.name).projects;
    const keep = new Set();
    projects.forEach((p, i) => {
      const sig = i + '|' + JSON.stringify(p);
      keep.add(p.id);
      const old = built.get(p.id);
      if (old && old.sig === sig) return;
      if (old) { street.remove(old.group); disposeGroup(old.group); }
      const group = buildBuilding(p, i);
      street.add(group);
      built.set(p.id, { group, sig });
    });
    for (const [id, b] of built) {
      if (!keep.has(id)) { street.remove(b.group); disposeGroup(b.group); built.delete(id); }
    }
    if (plot) { street.remove(plot); disposeGroup(plot); }
    plot = buildPlot(projects.length);
    street.add(plot);
    const last = slot(projects.length);
    if (Math.abs(last.z - 4 - streetEnd) > 0.1) {
      streetEnd = last.z - 4;
      buildLamps();
    }
  }

  function clearStreet() {
    for (const [, b] of built) { street.remove(b.group); disposeGroup(b.group); }
    built = new Map();
    if (plot) { street.remove(plot); disposeGroup(plot); plot = null; }
  }

  // ---------- WALKING TO A BUILDING ----------
  function viewFor(projectId, floorId) {
    const projects = company(planet.name).projects;
    const index = projects.findIndex((p) => p.id === projectId);
    if (index < 0) return null;
    const { side, z } = slot(index);
    const project = projects[index];
    const k = floorId ? project.floors.findIndex((f) => f.id === floorId) : -1;
    const targetY = k >= 0 ? LOBBY_H + k * FLOOR_H + 1.4 : LOBBY_H * 0.8;
    // Stand farther back for high floors
    const back = THREE.MathUtils.clamp(2.5 + targetY * 0.12, 2.5, WALK_HALF);
    const x = -side * back;
    const dist = back + FRONT_X;
    return {
      pos: new THREE.Vector3(x, EYE, z),
      yaw: side < 0 ? Math.PI / 2 : -Math.PI / 2,
      pitch: THREE.MathUtils.clamp(Math.atan2(targetY - EYE, dist), -0.2, 1.3)
    };
  }

  function walkTo(projectId, floorId, instant = false) {
    return new Promise((resolve) => {
      const v = viewFor(projectId, floorId);
      if (!v) return resolve();
      if (instant) {
        pos.copy(v.pos); yaw = v.yaw; pitch = v.pitch;
        return resolve();
      }
      let dy = v.yaw - yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      const dur = THREE.MathUtils.clamp(pos.distanceTo(v.pos) / 14, 0.6, 3);
      tween = { t: 0, dur, from: pos.clone(), to: v.pos, y0: yaw, y1: yaw + dy, p0: pitch, p1: v.pitch, resolve };
    });
  }

  // ---------- INPUT ----------
  const canvas = renderer.domElement;
  const joy = document.getElementById('joy');
  const knob = document.getElementById('joyKnob');
  const move = { x: 0, y: 0 };
  const keys = {};
  let lookPointer = null;
  let downInfo = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    lookPointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
    downInfo = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  window.addEventListener('pointermove', (e) => {
    if (!active || !lookPointer || e.pointerId !== lookPointer.id) return;
    const dx = e.clientX - lookPointer.x, dy = e.clientY - lookPointer.y;
    lookPointer.x = e.clientX;
    lookPointer.y = e.clientY;
    if (intro || tween) return;
    // Drag the view like a photo: drag right looks left, drag down looks up
    yaw += dx * 0.0045;
    pitch = THREE.MathUtils.clamp(pitch + dy * 0.0045, -0.6, 1.35);
  });
  window.addEventListener('pointerup', (e) => {
    if (!active || !lookPointer || e.pointerId !== lookPointer.id) return;
    lookPointer = null;
    if (!downInfo) return;
    const moved = Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y);
    if (moved < 8 && performance.now() - downInfo.t < 600 && !intro) pick(e.clientX, e.clientY);
    downInfo = null;
  });

  let joyId = null, joyCenter = null;
  joy.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    joyId = e.pointerId;
    joy.setPointerCapture(e.pointerId);
    const r = joy.getBoundingClientRect();
    joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
    joyMove(e);
  });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = (e) => {
    if (e.pointerId !== joyId) return;
    joyId = null;
    move.x = move.y = 0;
    knob.style.transform = 'translate(-50%, -50%)';
  };
  joy.addEventListener('pointerup', joyEnd);
  joy.addEventListener('pointercancel', joyEnd);
  function joyMove(e) {
    let dx = e.clientX - joyCenter.x, dy = e.clientY - joyCenter.y;
    const len = Math.hypot(dx, dy), max = joyCenter.r * 0.7;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    move.x = dx / max;
    move.y = dy / max;
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  window.addEventListener('keydown', (e) => { if (active && !(e.target.closest && e.target.closest('input, textarea'))) keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(cx, cy) {
    ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(street.children, true);
    for (const h of hits) {
      if (h.object.userData.pick) {
        sfx('click');
        onPick({ planet: planet.name, ...h.object.userData.pick });
        return;
      }
    }
  }

  // ---------- ENTER / EXIT ----------
  function enter(p) {
    planet = p;
    active = true;
    const sky = SKY[p.name] || { c: '#000', stars: 1 };
    bg.set(sky.c);
    scene.fog = new THREE.Fog(sky.c, 60, 260);
    starSphere.material.opacity = sky.stars;

    const map = p.mesh.material.map.clone();
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(30, 30);
    map.needsUpdate = true;
    if (groundMat.map) groundMat.map.dispose();
    groundMat.map = map;
    groundMat.needsUpdate = true;

    clearStreet();
    streetEnd = 1e9;
    sync();

    pos.set(0, EYE, 4);
    yaw = 0;
    pitch = 0.08;
    tween = null;
    intro = { t: 0 };
    sfx('land');
    document.getElementById('surfaceUI').classList.remove('hidden');
  }

  function exit() {
    active = false;
    tween = null;
    intro = null;
    move.x = move.y = 0;
    document.getElementById('surfaceUI').classList.add('hidden');
  }

  // ---------- FRAME ----------
  const fwd = new THREE.Vector3(), right = new THREE.Vector3();
  function update(dt) {
    time += dt;
    if (intro) {
      intro.t = Math.min(1, intro.t + dt / 1.6);
      const e = 1 - Math.pow(1 - intro.t, 3);
      camera.position.set(pos.x, EYE + (1 - e) * 16, pos.z + (1 - e) * 10);
      camera.rotation.set(-0.5 * (1 - e) + pitch * e, yaw, 0);
      if (intro.t >= 1) intro = null;
      return;
    }
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.dur);
      const e = tween.t < 0.5 ? 2 * tween.t * tween.t : 1 - Math.pow(-2 * tween.t + 2, 2) / 2;
      pos.lerpVectors(tween.from, tween.to, e);
      yaw = tween.y0 + (tween.y1 - tween.y0) * e;
      pitch = tween.p0 + (tween.p1 - tween.p0) * e;
      bob += dt * 9;
      if (tween.t >= 1) { const r = tween.resolve; tween = null; r(); }
    } else {
      let mx = move.x, my = move.y;
      if (keys.w || keys.arrowup) my -= 1;
      if (keys.s || keys.arrowdown) my += 1;
      if (keys.a) mx -= 1;
      if (keys.d) mx += 1;
      if (keys.arrowleft) yaw += dt * 1.8;
      if (keys.arrowright) yaw -= dt * 1.8;
      const mag = Math.min(1, Math.hypot(mx, my));
      if (mag > 0.05) {
        fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw));
        right.set(Math.cos(yaw), 0, -Math.sin(yaw));
        pos.addScaledVector(fwd, -my * SPEED * dt).addScaledVector(right, mx * SPEED * dt);
        bob += dt * 9 * mag;
      }
      pos.x = THREE.MathUtils.clamp(pos.x, -WALK_HALF, WALK_HALF);
      pos.z = THREE.MathUtils.clamp(pos.z, streetEnd - 4, 14);
    }
    camera.position.set(pos.x, EYE + Math.sin(bob) * 0.04, pos.z);
    camera.rotation.set(pitch, yaw, 0);
    for (const [, b] of built) b.group.userData.beacon.visible = Math.sin(time * 3) > 0;
  }

  function render() { renderer.render(scene, camera); }
  function resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }

  return {
    enter, exit, update, render, resize, sync, walkTo,
    isActive: () => active,
    planetName: () => (planet ? planet.name : null)
  };
}
