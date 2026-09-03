export function parseRoute(hash = '#/hub') {
  const clean = hash.startsWith('#') ? hash.slice(1) : hash;
  const parts = clean.split('/').filter(Boolean);
  const [section = 'hub', id = null, nested = null, nestedValue = null] = parts;
  const stepIndex = nested === 'step' ? Number(nestedValue) : null;

  return {
    section,
    id,
    stepIndex: Number.isFinite(stepIndex) ? stepIndex : null,
    hash: buildRoute(section, id, Number.isFinite(stepIndex) ? stepIndex : null),
  };
}

export function buildRoute(section = 'hub', id = null, stepIndex = null) {
  const base = `#/${section}${id ? `/${id}` : ''}`;
  return stepIndex === null || stepIndex === undefined ? base : `${base}/step/${stepIndex}`;
}

export function navigateTo(route) {
  const hash = typeof route === 'string' ? route : buildRoute(route.section, route.id, route.stepIndex);
  if (window.location.hash !== hash) {
    window.history.pushState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
}
