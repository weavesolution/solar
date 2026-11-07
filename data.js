// Your firm's data: planet = company, building = project, floor = assignment, window = note.
// Everything is saved in this browser (localStorage).

export const PLANET_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const KEY = 'solarOffice';

function blank() {
  const companies = {};
  for (const p of PLANET_NAMES) companies[p] = { name: '', projects: [] };
  return { v: 1, companies };
}

let db = blank();
try {
  const saved = JSON.parse(localStorage.getItem(KEY));
  if (saved && saved.companies) {
    for (const p of PLANET_NAMES) if (saved.companies[p]) db.companies[p] = saved.companies[p];
  }
} catch (e) { /* start fresh */ }

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* storage blocked */ }
  listeners.forEach((fn) => fn());
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const company = (planet) => db.companies[planet];
export const companyLabel = (planet) => (db.companies[planet] && db.companies[planet].name) || '';

export function findProject(planet, projectId) {
  return company(planet).projects.find((p) => p.id === projectId);
}
export function findFloor(project, floorId) {
  return project && project.floors.find((f) => f.id === floorId);
}

// ---------- Due dates ----------
export function todayStr() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function daysUntil(dateStr) {
  const a = new Date(todayStr() + 'T00:00:00');
  const b = new Date(dateStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}
// 'done' | 'overdue' | 'soon' (within 7 days) | 'later' | 'none'
export function dueStatus(note) {
  if (note.done) return 'done';
  if (!note.due) return 'none';
  const d = daysUntil(note.due);
  if (d < 0) return 'overdue';
  if (d <= 7) return 'soon';
  return 'later';
}
export function dueText(note) {
  if (!note.due) return '';
  if (note.done) return 'Done';
  const d = daysUntil(note.due);
  if (d < -1) return `Overdue by ${-d} days`;
  if (d === -1) return 'Overdue by 1 day';
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}
export function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------- Walking through everything ----------
export function eachNote(fn, onlyPlanet) {
  for (const planet of PLANET_NAMES) {
    if (onlyPlanet && planet !== onlyPlanet) continue;
    for (const project of company(planet).projects) {
      project.floors.forEach((floor, fi) => {
        floor.notes.forEach((note) => fn({ planet, project, floor, floorNo: fi + 1, note }));
      });
    }
  }
}

export function stats(planet) {
  const c = company(planet);
  let floors = 0, notes = 0, overdue = 0, soon = 0;
  for (const p of c.projects) {
    floors += p.floors.length;
    for (const f of p.floors) for (const n of f.notes) {
      notes++;
      const s = dueStatus(n);
      if (s === 'overdue') overdue++;
      if (s === 'soon') soon++;
    }
  }
  return { projects: c.projects.length, floors, notes, overdue, soon };
}

// Overdue first, then nearest due date
export function upcoming(limit = 10, onlyPlanet) {
  const out = [];
  eachNote((x) => {
    const s = dueStatus(x.note);
    if (s === 'overdue' || s === 'soon' || s === 'later') out.push({ ...x, status: s });
  }, onlyPlanet);
  out.sort((a, b) => a.note.due.localeCompare(b.note.due));
  return out.slice(0, limit);
}

export function search(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hit = (s) => (s || '').toLowerCase().includes(q);
  const out = [];
  for (const planet of PLANET_NAMES) {
    const c = company(planet);
    if (hit(c.name) || hit(planet)) out.push({ type: 'company', planet });
    for (const project of c.projects) {
      if (hit(project.name)) out.push({ type: 'project', planet, project });
      project.floors.forEach((floor, fi) => {
        if (hit(floor.name)) out.push({ type: 'floor', planet, project, floor, floorNo: fi + 1 });
        for (const note of floor.notes) {
          if (hit(note.title) || hit(note.text) || hit(note.link)) out.push({ type: 'note', planet, project, floor, floorNo: fi + 1, note });
        }
      });
    }
  }
  return out.slice(0, 60);
}

// ---------- Backup ----------
export function exportJSON() {
  return JSON.stringify({ app: 'solar-office', version: 1, saved: new Date().toISOString(), data: db }, null, 1);
}
export function importJSON(text) {
  const b = JSON.parse(text);
  if (b.app !== 'solar-office' || !b.data || !b.data.companies) throw new Error('This is not a Solar Office backup file.');
  const fresh = blank();
  for (const p of PLANET_NAMES) if (b.data.companies[p]) fresh.companies[p] = b.data.companies[p];
  db = fresh;
  save();
}

// Safe text for HTML
export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Turn what the user typed into a safe clickable link (or null)
export function safeLink(s) {
  s = (s || '').trim();
  if (!s) return null;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return 'mailto:' + s;
  if (/^(https?:|mailto:)/i.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return null; // block javascript: and similar
  return 'https://' + s;
}
