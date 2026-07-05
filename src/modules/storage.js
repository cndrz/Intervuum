// Thin, namespaced localStorage wrapper. Every key lives under "intervuum:*"
// so this app never clobbers anything else in the browser's storage.

const NS = 'intervuum';

const key = (name) => `${NS}:${name}`;

export function get(name, fallback = null) {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(name) {
  localStorage.removeItem(key(name));
}

// ---- Domain-specific helpers ----

export function getProfile() {
  return get('profile', null);
}

export function saveProfile(profile) {
  set('profile', profile);
}

export function getHistory() {
  return get('history', []);
}

export function addHistoryEntry(entry) {
  const history = getHistory();
  history.unshift(entry);
  set('history', history);
}

export function getHistoryEntry(id) {
  return getHistory().find((e) => e.id === id) || null;
}

export function clearHistory() {
  set('history', []);
}

export function resetProfile() {
  remove('profile');
}
