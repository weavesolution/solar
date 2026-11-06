import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ITEMS, ITEM_BY_ID, mat, part, setGlowLevel, buildRocketModel } from './items.js?v=4';
import { sfx } from './audio.js?v=4';

// Radius of the tiny planet you build on
const R = 10;
const UP = new THREE.Vector3(0, 1, 0);

// Sky colour and how visible the stars are on each world
const SKY = {
  Mercury: { c: '#15110e', stars: 1 },
  Venus:   { c: '#a9772c', stars: 0.15 },
  Earth:   { c: '#4f9ad8', stars: 0.1 },
  Mars:    { c: '#b67a52', stars: 0.25 },
  Jupiter: { c: '#2e2117', stars: 0.9 },
  Saturn:  { c: '#251f16', stars: 0.9 },
  Uranus:  { c: '#5fbac2', stars: 0.3 },
  Neptune: { c: '#132a66', stars: 0.8 },
  Pluto:   { c: '#0d0d16', stars: 1 }
};
const WEATHER = { Earth: 'rain', Mars: 'dust', Venus: 'ash', Jupiter: 'aurora', Saturn: 'aurora', Uranus: 'snow', Neptune: 'snow', Pluto: 'snow' };
const SWATCHES = ['#ffffff', '#e84a3c', '#ff8c2e', '#ffd23f', '#5cc96b', '#2fb3a5', '#3d8bfd', '#8e5cf7', '#ff6fb5', '#4a4a4a', '#a0743f'];
const ROAD_TOOL = { id: 'road', icon: '🛣️', name: 'Road', color: '#5a5a5a' };

function randomUnit(v = new THREE.Vector3()) {
  const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
  return v.set(s * Math.cos(th), u, s * Math.sin(th));
}

export function createWorld({ renderer, starsTex, onExit, onEvent, onMenu, getSettings }) {
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

  const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 0.9);
  scene.add(hemi);
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
  const walkersGroup = new THREE.Group();
  scene.add(itemsGroup, walkersGroup);

  // Selection highlight
  const selHolder = new THREE.Group();
  const selRing = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.05, 48),
    new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  );
  selRing.rotation.x = -Math.PI / 2;
  selRing.position.y = 0.04;
  selHolder.add(selRing);

  // Road start marker
  const marker = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffb84d }));
  marker.visible = false;
  scene.add(marker);

  // Lander rocket (not part of your saved world)
  const lander = buildRocketModel();
  lander.visible = false;
  scene.add(lander);
  const landerN = new THREE.Vector3(0, 0.33, 0.94).normalize();

  let skyRing = null;
  let planet = null;
  let active = false;
  let tool = null;
  let selected = null;
  let moving = false;
  let painting = false;
  let roadStart = null;
  let intro = null;
  let outro = null;
  let time = 0;
  let history = [];
  let dayAngle = 0.4;
  let wasNight = false;
  let weather = null;
  let walkers = [];
  let stats = { people: 0, power: 0, items: 0 };
  const sunDir = new THREE.Vector3(1, 0.35, 0).normalize();
  const daySky = new THREE.Color();
  const nightSky = new THREE.Color('#04060d');
  const bg = new THREE.Color();
  scene.background = bg;

  // ---------- UI ----------
  const $ = (id) => document.getElementById(id);
  const ui = $('surfaceUI'), sName = $('sName'), sStats = $('sStats'), sHint = $('sHint');
  const selBar = $('selBar'), swatchRow = $('swatchRow'), palette = $('palette'), undoBtn = $('undoBtn');

  // Colour swatches
  swatchRow.innerHTML = '<button class="swatch reset" data-c="" aria-label="Original colour">↺</button>' +
    SWATCHES.map((c) => `<button class="swatch" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
  swatchRow.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b || !selected) return;
    pushHistory();
    selected.userData.rec.c = b.dataset.c || undefined;
    const obj = rebuild(selected);
    select(obj, true);
    onEvent('paint');
    sfx('click');
    afterChange();
  });

  $('takeOffBtn').addEventListener('click', () => launchOut(onExit));
  undoBtn.addEventListener('click', undo);
  $('photoBtn').addEventListener('click', photo);
  $('menuBtn').addEventListener('click', () => onMenu && onMenu());

  selBar.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn || !selected) return;
    const rec = selected.userData.rec;
    const act = btn.dataset.act;
    if (act === 'paint') { painting = !painting; moving = false; sfx('click'); refreshUI(); return; }
    if (act === 'move') { moving = !moving; painting = false; sfx('click'); refreshUI(); return; }
    if (act === 'done') { deselect(); refreshUI(); return; }
    if (act === 'launch') { launchItem(selected); return; }
    if (act === 'delete') {
      pushHistory();
      const obj = selected;
      deselect();
      removeObj(obj);
      sfx('delete');
      afterChange();
      return;
    }
    if (act === 'copy') {
      pushHistory();
      const n = new THREE.Vector3().fromArray(rec.n).normalize();
      const axis = randomUnit().cross(n).normalize();
      n.applyAxisAngle(axis, 0.14);
      const obj = addItem({ ...rec, n: n.toArray() });
      select(obj);
      sfx('place');
      afterChange();
      return;
    }
    pushHistory();
    if (act === 'rotate') rec.rot += Math.PI / 4;
    if (act === 'bigger') rec.s = Math.min(2.5, rec.s * 1.15);
    if (act === 'smaller') rec.s = Math.max(0.4, rec.s / 1.15);
    applyTransform(selected);
    sfx('click');
    afterChange();
  });

  function buildPalette() {
    const specials = ITEMS.filter((i) => i.only && i.only.includes(planet.name));
    const general = ITEMS.filter((i) => !i.only);
    palette.innerHTML = '';
    [...specials, ...general, ROAD_TOOL].forEach((it) => {
      const b = document.createElement('button');
      b.className = 'tool';
      b.dataset.id = it.id;
      const extra = it.people ? `👥${it.people}` : it.power ? `⚡${it.power}` : '';
      b.innerHTML = (it.only ? '<span class="star">⭐</span>' : '') +
        `<span class="ic">${it.icon}</span><span class="nm">${it.name}</span>` + (extra ? `<span class="ex">${extra}</span>` : '');
      b.addEventListener('click', () => {
        deselect();
        tool = tool === it.id ? null : it.id;
        roadStart = null;
        marker.visible = false;
        sfx('click');
        refreshUI();
      });
      palette.appendChild(b);
    });
  }

  function refreshUI() {
    const short = stats.people > 0 && stats.power < stats.people;
    sStats.innerHTML = `${stats.items} items · 👥 ${stats.people} · <span class="${short ? 'warn' : ''}">⚡ ${stats.power}/${stats.people}</span>`;
    for (const b of palette.children) b.classList.toggle('active', b.dataset.id === tool);
    undoBtn.disabled = history.length === 0;

    selBar.classList.toggle('hidden', !selected);
    swatchRow.classList.toggle('hidden', !(selected && painting));
    if (selected) {
      const rec = selected.userData.rec;
      const isRoad = rec.t === 'road';
      const def = ITEM_BY_ID[rec.t];
      const show = {
        rotate: !isRoad, move: !isRoad, copy: !isRoad, bigger: !isRoad, smaller: !isRoad,
        paint: true, delete: true, done: true, launch: !!(def && def.launch)
      };
      for (const b of selBar.querySelectorAll('button')) b.classList.toggle('hidden', !show[b.dataset.act]);
      selBar.querySelector('[data-act="move"]').classList.toggle('on', moving);
      selBar.querySelector('[data-act="paint"]').classList.toggle('on', painting);
    }

    let hint;
    if (selected && moving) hint = 'Tap the ground where it should go';
    else if (selected && painting) hint = 'Pick a colour';
    else if (selected) hint = 'Edit it with the buttons below';
    else if (tool === 'road') hint = roadStart ? 'Tap where the road goes next · tap 🛣️ to finish' : 'Tap where the road starts';
    else if (tool) hint = `Tap the ground to place: ${ITEM_BY_ID[tool].name}`;
    else if (short) hint = '⚡ Not enough power — add solar panels or windmills';
    else hint = 'Pick an item below, then tap the ground';
    sHint.textContent = hint;
  }

  // ---------- items ----------
  function applyTransform(obj) {
    const rec = obj.userData.rec;
    if (rec.t === 'road') return;
    const n = new THREE.Vector3().fromArray(rec.n).normalize();
    obj.position.copy(n).multiplyScalar(R - 0.05);
    obj.quaternion.setFromUnitVectors(UP, n);
    obj.rotateY(rec.rot || 0);
    obj.scale.setScalar(rec.s || 1);
  }

  function slerpDir(a, b, t) {
    const q = new THREE.Quaternion().setFromUnitVectors(a, b);
    const qi = new THREE.Quaternion().slerp(q, t);
    return a.clone().applyQuaternion(qi);
  }

  function buildRoad(g, rec) {
    const a = new THREE.Vector3().fromArray(rec.n).normalize();
    const b = new THREE.Vector3().fromArray(rec.n2).normalize();
    const steps = Math.max(2, Math.ceil((a.angleTo(b) * R) / 0.35));
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push(slerpDir(a, b, i / steps));
    const pos = [], idx = [];
    pts.forEach((p, i) => {
      const prev = pts[Math.max(0, i - 1)], next = pts[Math.min(pts.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const side = new THREE.Vector3().crossVectors(p, tangent).normalize().multiplyScalar(0.32);
      const c = p.clone().multiplyScalar(R + 0.03);
      pos.push(...c.clone().add(side).toArray(), ...c.clone().sub(side).toArray());
      if (i < pts.length - 1) {
        const k = i * 2;
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(rec.c || ROAD_TOOL.color, { side: THREE.DoubleSide, roughness: 0.95 }));
    m.receiveShadow = true;
    g.add(m);
    g.userData.mid = slerpDir(a, b, 0.5);
  }

  function addItem(rec) {
    const g = new THREE.Group();
    if (rec.t === 'road') {
      if (!rec.n2) return null;
      buildRoad(g, rec);
    } else {
      const def = ITEM_BY_ID[rec.t];
      if (!def) return null;
      def.build(g, rec.c || def.color);
      g.userData.def = def;
    }
    rec.rot = rec.rot || 0;
    rec.s = rec.s || 1;
    g.userData.rec = rec;
    applyTransform(g);
    itemsGroup.add(g);
    return g;
  }

  function removeObj(obj) {
    if (selHolder.parent) selHolder.parent.remove(selHolder);
    obj.traverse((o) => { if (o.geometry && o !== selRing) o.geometry.dispose(); });
    itemsGroup.remove(obj);
  }

  function rebuild(obj) {
    const rec = obj.userData.rec;
    deselect();
    removeObj(obj);
    return addItem(rec);
  }

  function clearItems() {
    deselect();
    while (itemsGroup.children.length) removeObj(itemsGroup.children[0]);
  }

  function select(obj, keepPaint = false) {
    deselect();
    selected = obj;
    painting = keepPaint;
    tool = null;
    roadStart = null;
    marker.visible = false;
    if (obj.userData.rec.t === 'road') {
      const mid = obj.userData.mid;
      selHolder.position.copy(mid).multiplyScalar(R);
      selHolder.quaternion.setFromUnitVectors(UP, mid);
      selHolder.scale.setScalar(1);
      scene.add(selHolder);
    } else {
      selHolder.position.set(0, 0, 0);
      selHolder.quaternion.identity();
      selHolder.scale.setScalar(1);
      obj.add(selHolder);
    }
  }

  function deselect() {
    if (selHolder.parent) selHolder.parent.remove(selHolder);
    selected = null;
    moving = false;
    painting = false;
  }

  function launchItem(obj) {
    if (obj.userData.launch) return;
    obj.userData.launch = { t: 0 };
    deselect();
    refreshUI();
    sfx('launch');
    onEvent('launch');
  }

  function updateLaunch(obj, dt) {
    const L = obj.userData.launch;
    const body = obj.userData.body, flame = obj.userData.flame;
    L.t += dt;
    if (L.t < 3) {
      const k = L.t / 3;
      body.position.y = k * k * 28;
      flame.visible = true;
    } else if (L.t < 4.5) {
      body.visible = false;
    } else if (L.t < 7) {
      body.visible = true;
      const k = (L.t - 4.5) / 2.5;
      body.position.y = (1 - k) * (1 - k) * 20;
      flame.visible = k < 0.95;
    } else {
      body.position.y = 0;
      flame.visible = false;
      delete obj.userData.launch;
    }
    if (flame.visible) flame.scale.set(1, 0.8 + Math.random() * 0.6, 1);
  }

  // ---------- stats, power, walkers ----------
  function computeStats() {
    let people = 0, power = 0;
    for (const o of itemsGroup.children) {
      const def = o.userData.def;
      if (def) { people += def.people || 0; power += def.power || 0; }
    }
    stats = { people, power, items: itemsGroup.children.length };
    syncWalkers();
  }

  function makeAstronaut() {
    const g = new THREE.Group();
    const body = new THREE.Group();
    g.add(body);
    const suit = mat('#f4f4f4');
    body.add(part(new THREE.CylinderGeometry(0.09, 0.1, 0.22, 10), suit, 0, 0.2, 0));
    body.add(part(new THREE.SphereGeometry(0.09, 12, 12), suit, 0, 0.38, 0));
    body.add(part(new THREE.SphereGeometry(0.06, 10, 10), mat('#ffb84d', { metalness: 0.6, roughness: 0.2 }), 0, 0.39, 0.05));
    body.add(part(new THREE.BoxGeometry(0.12, 0.14, 0.06), mat('#cfcfcf'), 0, 0.22, -0.1));
    body.add(part(new THREE.BoxGeometry(0.05, 0.12, 0.05), suit, 0.04, 0.06, 0));
    body.add(part(new THREE.BoxGeometry(0.05, 0.12, 0.05), suit, -0.04, 0.06, 0));
    g.userData.body = body;
    return g;
  }

  function syncWalkers() {
    const homes = itemsGroup.children.filter((o) => o.userData.def && o.userData.def.people);
    const target = Math.min(12, Math.floor(stats.people / 4));
    if (target === walkers.length && walkers.every((w) => homes.includes(w.homeObj))) return;
    walkers.forEach((w) => walkersGroup.remove(w.g));
    walkers = [];
    for (let i = 0; i < target && homes.length; i++) {
      const homeObj = homes[i % homes.length];
      const home = new THREE.Vector3().fromArray(homeObj.userData.rec.n).normalize();
      const dir = home.clone().applyAxisAngle(randomUnit().cross(home).normalize(), 0.12);
      const head = randomUnit().cross(dir).normalize();
      const g = makeAstronaut();
      walkersGroup.add(g);
      walkers.push({ g, dir, head, home, homeObj, speed: 0.5 + Math.random() * 0.4, phase: Math.random() * 6 });
    }
  }

  const tmpM = new THREE.Matrix4(), tmpX = new THREE.Vector3(), tmpT = new THREE.Vector3();
  function updateWalkers(dt) {
    for (const w of walkers) {
      if (w.dir.angleTo(w.home) > 0.22) {
        tmpT.copy(w.home).sub(w.dir);
        tmpT.addScaledVector(w.dir, -tmpT.dot(w.dir));
        if (tmpT.lengthSq() > 1e-8) w.head.lerp(tmpT.normalize(), 0.06);
      } else {
        w.head.applyAxisAngle(w.dir, (Math.random() - 0.5) * 3 * dt);
      }
      w.dir.addScaledVector(w.head, (w.speed * dt) / R).normalize();
      w.head.addScaledVector(w.dir, -w.head.dot(w.dir)).normalize();
      tmpX.crossVectors(w.dir, w.head);
      tmpM.makeBasis(tmpX, w.dir, w.head);
      w.g.quaternion.setFromRotationMatrix(tmpM);
      w.g.position.copy(w.dir).multiplyScalar(R);
      w.g.userData.body.position.y = Math.abs(Math.sin(time * 9 + w.phase)) * 0.04;
    }
  }

  // ---------- weather ----------
  function disposeWeather() {
    if (!weather) return;
    scene.remove(weather.obj);
    weather.obj.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    weather = null;
  }

  function buildWeather(type) {
    disposeWeather();
    if (!type) return;
    if (type === 'aurora') {
      const g = new THREE.Group();
      const color = planet.name === 'Saturn' ? '#b98cff' : '#7dffb0';
      [1, -1].forEach((s) => {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(R * 0.45, 0.35, 12, 64),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.y = s * R * 0.93;
        g.add(ring);
      });
      scene.add(g);
      weather = { type, obj: g };
      return;
    }
    const N = type === 'rain' ? 600 : 420;
    const H = type === 'dust' ? 3 : 14;
    const dirs = [], h = new Float32Array(N);
    for (let i = 0; i < N; i++) { dirs.push(randomUnit()); h[i] = Math.random() * H; }
    const geo = new THREE.BufferGeometry();
    let obj;
    if (type === 'rain') {
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
      obj = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#d6ecff', transparent: true, opacity: 0.55, depthWrite: false }));
    } else {
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
      const color = type === 'dust' ? '#d9a066' : type === 'ash' ? '#ffb36b' : '#ffffff';
      obj = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: type === 'dust' ? 0.12 : 0.15, transparent: true, opacity: 0.85, depthWrite: false }));
    }
    obj.frustumCulled = false;
    scene.add(obj);
    weather = { type, obj, dirs, h, H, N, base: obj.material.opacity };
  }

  function updateWeather(dt, nf) {
    if (!weather) return;
    if (weather.type === 'aurora') {
      weather.obj.children.forEach((r, i) => {
        r.material.opacity = (0.15 + 0.55 * nf) * (0.6 + 0.4 * Math.sin(time * 2 + i));
        r.rotation.z += dt * 0.2;
      });
      return;
    }
    // Weather comes and goes: about 45 s on, 30 s off
    const c = time % 75;
    const strength = c < 45 ? THREE.MathUtils.clamp(Math.min(c, 45 - c) / 5, 0, 1) : 0;
    weather.obj.visible = strength > 0.01;
    if (!weather.obj.visible) return;
    weather.obj.material.opacity = weather.base * strength;
    const arr = weather.obj.geometry.attributes.position.array;
    const { dirs, h, H, N, type } = weather;
    const speed = type === 'rain' ? 9 : type === 'dust' ? 0 : 1.2;
    for (let i = 0; i < N; i++) {
      const d = dirs[i];
      if (type === 'dust') {
        d.applyAxisAngle(UP, dt * 0.35);
      } else {
        h[i] -= speed * dt;
        if (h[i] < 0) { h[i] = H; randomUnit(d); }
      }
      const r = R + h[i] + (type === 'dust' ? Math.sin(time + i) * 0.15 : 0);
      if (type === 'rain') {
        arr[i * 6] = d.x * r; arr[i * 6 + 1] = d.y * r; arr[i * 6 + 2] = d.z * r;
        arr[i * 6 + 3] = d.x * (r + 0.45); arr[i * 6 + 4] = d.y * (r + 0.45); arr[i * 6 + 5] = d.z * (r + 0.45);
      } else {
        arr[i * 3] = d.x * r; arr[i * 3 + 1] = d.y * r; arr[i * 3 + 2] = d.z * r;
      }
    }
    weather.obj.geometry.attributes.position.needsUpdate = true;
  }

  // ---------- day & night ----------
  const right = new THREE.Vector3(), upV = new THREE.Vector3(), camDir = new THREE.Vector3();
  function updateLight(dt) {
    const sky = SKY[planet.name] || { c: '#000000', stars: 1 };
    let nf = 0;
    if (getSettings().dayNight === 'auto') {
      dayAngle += dt * ((Math.PI * 2) / 150);
      sunDir.set(Math.cos(dayAngle), 0.35, Math.sin(dayAngle)).normalize();
      camDir.copy(camera.position).normalize();
      nf = THREE.MathUtils.clamp(0.5 - camDir.dot(sunDir) * 1.2, 0, 1);
      sun.position.copy(sunDir).multiplyScalar(40);
    } else {
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      upV.setFromMatrixColumn(camera.matrixWorld, 1);
      sun.position.copy(camera.position).addScaledVector(right, -10).addScaledVector(upV, 12).setLength(40);
    }
    sun.intensity = 2 * (1 - nf * 0.85);
    hemi.intensity = 0.95 - nf * 0.65;
    daySky.set(sky.c);
    bg.copy(daySky).lerp(nightSky, nf * 0.9);
    starSphere.material.opacity = sky.stars + (1 - sky.stars) * nf;
    const powerFactor = stats.people === 0 ? 1 : Math.min(1, 0.2 + (0.8 * stats.power) / stats.people);
    setGlowLevel((0.55 + nf * 1.2) * powerFactor);
    if (nf > 0.85 && !wasNight) { wasNight = true; onEvent('night'); }
    if (nf < 0.3) wasNight = false;
    return nf;
  }

  // ---------- history (undo) & saving ----------
  const key = () => 'solarWorld_' + planet.name;
  function serialize() {
    return itemsGroup.children.map((o) => {
      const r = o.userData.rec;
      const out = { t: r.t, n: r.n.map((v) => +(+v).toFixed(4)), rot: +(r.rot || 0).toFixed(3), s: +(r.s || 1).toFixed(2) };
      if (r.c) out.c = r.c;
      if (r.n2) out.n2 = r.n2.map((v) => +(+v).toFixed(4));
      return out;
    });
  }
  function pushHistory() {
    history.push(JSON.stringify(serialize()));
    if (history.length > 40) history.shift();
  }
  function undo() {
    if (!history.length) return;
    const data = JSON.parse(history.pop());
    clearItems();
    data.forEach((r) => addItem(r));
    sfx('undo');
    afterChange();
  }
  function save() {
    try { localStorage.setItem(key(), JSON.stringify(serialize())); } catch (e) { /* storage blocked */ }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(key()) || '[]');
      if (Array.isArray(data)) data.forEach((r) => addItem({ ...r }));
    } catch (e) { /* nothing saved */ }
  }
  function afterChange() {
    save();
    computeStats();
    refreshUI();
    onEvent('change', { planet: planet.name });
  }

  function clearWorld() {
    if (!active || !itemsGroup.children.length) return;
    pushHistory();
    clearItems();
    sfx('delete');
    afterChange();
  }

  // ---------- photo ----------
  function photo() {
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    const flash = $('flash');
    flash.classList.add('on');
    setTimeout(() => flash.classList.remove('on'), 150);
    sfx('photo');
    onEvent('photo');
    const bin = atob(url.split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    const name = `my-${planet.name.toLowerCase()}-world.png`;
    const download = () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    };
    try {
      const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: `My ${planet.name} world` }).catch((e) => { if (e.name !== 'AbortError') download(); });
        return;
      }
    } catch (e) { /* fall back to download */ }
    download();
  }

  // ---------- tapping ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downX = 0, downY = 0;
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => { if (active) { downX = e.clientX; downY = e.clientY; } });
  canvas.addEventListener('pointerup', (e) => {
    if (!active || intro || outro) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8) return;
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const groundHit = raycaster.intersectObject(globe, false)[0];
    const itemHit = raycaster.intersectObjects(itemsGroup.children, true)[0];
    const n = groundHit ? groundHit.point.clone().normalize() : null;

    if (selected && moving && n) {
      pushHistory();
      selected.userData.rec.n = n.toArray();
      applyTransform(selected);
      moving = false;
      sfx('place');
      afterChange();
      return;
    }
    if (tool === 'road' && n) {
      if (!roadStart) {
        roadStart = n;
        sfx('click');
      } else if (n.angleTo(roadStart) > 0.03) {
        pushHistory();
        addItem({ t: 'road', n: roadStart.toArray(), n2: n.toArray(), rot: 0, s: 1 });
        roadStart = n;
        onEvent('road');
        sfx('place');
        afterChange();
      }
      marker.position.copy(n).multiplyScalar(R + 0.1);
      marker.visible = true;
      refreshUI();
      return;
    }
    if (itemHit && (!groundHit || itemHit.distance <= groundHit.distance)) {
      let obj = itemHit.object;
      while (obj.parent && obj.parent !== itemsGroup) obj = obj.parent;
      if (obj.parent === itemsGroup) {
        select(obj);
        sfx('select');
        refreshUI();
        return;
      }
    }
    if (tool && n) {
      pushHistory();
      addItem({ t: tool, n: n.toArray(), rot: Math.random() * Math.PI * 2, s: 0.9 + Math.random() * 0.2 });
      sfx('place');
      afterChange();
      return;
    }
    if (selected) { deselect(); refreshUI(); }
  });

  // ---------- lander ----------
  function placeLander(height, flameOn) {
    lander.position.copy(landerN).multiplyScalar(R - 0.05);
    lander.quaternion.setFromUnitVectors(UP, landerN);
    lander.userData.body.position.y = height;
    lander.userData.flame.visible = flameOn;
    if (flameOn) lander.userData.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1);
  }

  function launchOut(cb) {
    if (outro || intro || !active) return;
    deselect();
    tool = null;
    roadStart = null;
    marker.visible = false;
    refreshUI();
    controls.enabled = false;
    outro = { t: 0, cb };
    sfx('launch');
  }

  // ---------- enter / exit ----------
  function enter(p) {
    planet = p;
    active = true;
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

    clearItems();
    history = [];
    load();
    computeStats();
    buildWeather(WEATHER[p.name]);
    tool = null;
    roadStart = null;
    marker.visible = false;

    controls.target.set(0, 0, 0);
    intro = { t: 0, from: new THREE.Vector3(0, R * 1.6, R * 5.5), to: new THREE.Vector3(0, R * 0.9, R * 2.6) };
    camera.position.copy(intro.from);
    camera.lookAt(0, 0, 0);
    controls.enabled = false;
    lander.visible = true;
    placeLander(16, true);
    sfx('land');

    sName.textContent = p.name;
    buildPalette();
    ui.classList.remove('hidden');
    refreshUI();
  }

  function exit() {
    active = false;
    controls.enabled = false;
    deselect();
    tool = null;
    outro = null;
    lander.visible = false;
    ui.classList.add('hidden');
    setGlowLevel(0.9);
  }

  // ---------- per frame ----------
  function update(dt) {
    time += dt;
    if (intro) {
      intro.t = Math.min(1, intro.t + dt / 2.2);
      const e = 1 - Math.pow(1 - intro.t, 3);
      camera.position.lerpVectors(intro.from, intro.to, e);
      camera.lookAt(0, 0, 0);
      placeLander(16 * (1 - e), intro.t < 0.97);
      if (intro.t >= 1) { intro = null; controls.enabled = true; }
    } else if (outro) {
      outro.t = Math.min(1, outro.t + dt / 1.8);
      const k = outro.t * outro.t;
      placeLander(k * 30, true);
      const top = lander.userData.body.getWorldPosition(new THREE.Vector3());
      camera.lookAt(new THREE.Vector3().lerpVectors(new THREE.Vector3(), top, Math.min(1, outro.t * 1.2)));
      if (outro.t >= 1) { const cb = outro.cb; outro = null; cb && cb(); }
    } else {
      controls.update();
    }

    const nf = updateLight(dt);
    for (const o of itemsGroup.children) {
      const d = o.userData.def;
      if (d && d.anim) d.anim(o, time, dt);
      if (o.userData.launch) updateLaunch(o, dt);
    }
    updateWalkers(dt);
    updateWeather(dt, nf);
    if (skyRing) skyRing.rotation.z += dt * 0.01;
    if (selected) selRing.material.opacity = 0.55 + 0.45 * Math.sin(time * 5);
    if (marker.visible) marker.scale.setScalar(1 + 0.2 * Math.sin(time * 6));
  }

  function render() { renderer.render(scene, camera); }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }

  return { enter, exit, update, render, resize, launchOut, clearWorld, isActive: () => active };
}
