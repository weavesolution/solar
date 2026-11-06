import { ITEMS, ITEM_BY_ID } from './items.js?v=4';

export const WORLD_NAMES = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
const GREEN = new Set(ITEMS.filter((i) => i.green).map((i) => i.id));

function loadJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch (e) { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
}

export function loadRecords(name) {
  const d = loadJSON('solarWorld_' + name, []);
  return Array.isArray(d) ? d : [];
}

export function statsFor(records) {
  let people = 0, power = 0, items = 0;
  const counts = {};
  for (const r of records) {
    items++;
    counts[r.t] = (counts[r.t] || 0) + 1;
    const def = ITEM_BY_ID[r.t];
    if (def) { people += def.people || 0; power += def.power || 0; }
  }
  return { people, power, items, counts };
}

export function allStats() {
  const per = {};
  let people = 0, items = 0, green = 0;
  for (const n of WORLD_NAMES) {
    const s = statsFor(loadRecords(n));
    per[n] = s;
    people += s.people;
    items += s.items;
    for (const id in s.counts) if (GREEN.has(id)) green += s.counts[id];
  }
  return { per, people, items, green };
}

// Counters for things that aren't stored in the worlds themselves
const counters = Object.assign(
  { landed: [], launches: 0, paints: 0, roads: 0, photos: 0, nights: 0 },
  loadJSON('solarStats', {})
);

export function track(type, planet) {
  switch (type) {
    case 'land': if (planet && !counters.landed.includes(planet)) counters.landed.push(planet); break;
    case 'launch': counters.launches++; break;
    case 'paint': counters.paints++; break;
    case 'road': counters.roads++; break;
    case 'photo': counters.photos++; break;
    case 'night': counters.nights++; break;
    default: return;
  }
  saveJSON('solarStats', counters);
}

const anyWorld = (a, fn) => WORLD_NAMES.some((n) => fn(a.per[n]));

export const BADGES = [
  { id: 'first', icon: '🌱', name: 'First Steps', desc: 'Place your first item', test: (a) => a.items >= 1 },
  { id: 'homes', icon: '🏠', name: 'Home Sweet Home', desc: 'Build 5 houses on one world', test: (a) => anyWorld(a, (s) => (s.counts.house || 0) >= 5) },
  { id: 'green', icon: '🌳', name: 'Green Thumb', desc: 'Plant 20 trees, flowers or plants', test: (a) => a.green >= 20 },
  { id: 'power', icon: '⚡', name: 'Power Up', desc: 'Fully power a world with 10+ people', test: (a) => anyWorld(a, (s) => s.people >= 10 && s.power >= s.people) },
  { id: 'city', icon: '🏙️', name: 'City Builder', desc: 'Reach 100 people on one world', test: (a) => anyWorld(a, (s) => s.people >= 100) },
  { id: 'mega', icon: '🌆', name: 'Megacity', desc: 'Reach 500 people across all worlds', test: (a) => a.people >= 500 },
  { id: 'explorer', icon: '🧭', name: 'Explorer', desc: 'Land on all 8 planets and Pluto', test: (a, c) => WORLD_NAMES.every((n) => c.landed.includes(n)) },
  { id: 'colonist', icon: '🚩', name: 'Colonist', desc: 'Build something on every world', test: (a) => WORLD_NAMES.every((n) => a.per[n].items > 0) },
  {
    id: 'local', icon: '⭐', name: 'Local Expert', desc: "Build each world's special item",
    test: (a) => WORLD_NAMES.every((n) => ITEMS.some((i) => i.only && i.only.includes(n) && (a.per[n].counts[i.id] || 0) > 0))
  },
  { id: 'roads', icon: '🛣️', name: 'Road Trip', desc: 'Build 10 road sections', test: (a, c) => c.roads >= 10 },
  { id: 'liftoff', icon: '🚀', name: 'Liftoff', desc: 'Launch a rocket from your world', test: (a, c) => c.launches >= 1 },
  { id: 'painter', icon: '🎨', name: 'Painter', desc: 'Repaint 10 items', test: (a, c) => c.paints >= 10 },
  { id: 'night', icon: '🌙', name: 'Night Owl', desc: 'Watch night fall on a world', test: (a, c) => c.nights >= 1 },
  { id: 'photo', icon: '📷', name: 'Photographer', desc: 'Take a photo of your world', test: (a, c) => c.photos >= 1 }
];

export const unlocked = () => loadJSON('solarBadges', {});

// Returns badges unlocked just now
export function checkBadges() {
  const a = allStats();
  const got = unlocked();
  const fresh = [];
  for (const b of BADGES) {
    if (!got[b.id] && b.test(a, counters)) {
      got[b.id] = Date.now();
      fresh.push(b);
    }
  }
  if (fresh.length) saveJSON('solarBadges', got);
  return fresh;
}
