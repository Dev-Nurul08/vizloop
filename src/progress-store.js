const PROFILE_KEY = 'vizloop-demo-profile';
const SESSION_KEY = 'vizloop-demo-session';
const PROGRESS_KEY = 'vizloop-progress';
const ATTEMPTS_KEY = 'vizloop-assessment-attempts';
const LAST_ROUTE_KEY = 'vizloop-last-route';
const SPLASH_KEY = 'vizloop-has-seen-splash';

export function loadProfile() {
  return readJson(PROFILE_KEY, null);
}

export function saveProfile(profile) {
  writeJson(PROFILE_KEY, {
    ...profile,
    updatedAt: new Date().toISOString(),
  });
}

export function loadSession() {
  const session = readJson(SESSION_KEY, null);
  const profile = loadProfile();
  return session && profile ? { ...session, profile } : null;
}

export function saveSession(session) {
  writeJson(SESSION_KEY, {
    id: session.id,
    email: session.email,
    createdAt: session.createdAt || new Date().toISOString(),
  });
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function hasSeenSplash() {
  return window.localStorage.getItem(SPLASH_KEY) === 'true';
}

export function markSplashSeen() {
  window.localStorage.setItem(SPLASH_KEY, 'true');
}

export function loadProgress() {
  return readJson(PROGRESS_KEY, {});
}

export function updateProgress(conceptId, patch) {
  const progress = loadProgress();
  const current = progress[conceptId] || {
    conceptId,
    status: 'not-started',
    score: 0,
    lastSeen: null,
  };
  const next = {
    ...progress,
    [conceptId]: {
      ...current,
      ...patch,
      lastSeen: new Date().toISOString(),
    },
  };
  writeJson(PROGRESS_KEY, next);
  return next;
}

export function saveAssessmentAttempt(attempt) {
  const attempts = loadAssessmentAttempts();
  writeJson(ATTEMPTS_KEY, [attempt, ...attempts].slice(0, 20));
}

export function loadAssessmentAttempts() {
  return readJson(ATTEMPTS_KEY, []);
}

export function saveLastRoute(hash) {
  window.localStorage.setItem(LAST_ROUTE_KEY, hash);
}

export function loadLastRoute() {
  return window.localStorage.getItem(LAST_ROUTE_KEY) || '#/hub';
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}
