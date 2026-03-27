import './style.css';
import './phase2.css';
import './phase3.css';
import './phase4.css';
import './phase5.css';
import './runner.css';
import { traceJavaScript } from './js-runner.js';
import { tracePython } from './python-runner.js';
import { toDisplayStep } from './trace-protocol.js';
import { getLessonTemplate } from './lesson-library.js';

/**
 * Builds a lesson instance by running the appropriate language trace runner
 * and extracting metadata required by the visualizer and inspector.
 */
function buildLesson(nextLanguage, code) {
  const trace = nextLanguage === 'Python' ? tracePython(code) : traceJavaScript(code);
  const arrayName = Object.keys(trace[0].state.dataStructures)[0] || 'scores';
  const totalName = trace.find((item) => item.action.type === 'VARIABLE_ASSIGN')?.action.target || 'total';
  const indexName = trace.find((item) => item.action.type === 'LOOP_INIT')?.action.target || 'i';
  const threshold = trace.find((item) => item.action.type === 'CONDITION_EVALUATE')?.action.threshold ?? 0;

  return {
    code,
    trace,
    steps: trace.map(toDisplayStep),
    meta: { arrayName, totalName, indexName, threshold },
  };
}

// ── State Initialization ────────────────────────────────────────

let language = 'JavaScript';
let activeTopic = 'loops';
const initialTemplate = getLessonTemplate(activeTopic, language);
let lesson = {
  ...buildLesson(language, initialTemplate.code),
  title: initialTemplate.title,
};

let step = 0;
let playing = false;
let timer = null;
let speed = 800;
let mentorMode = 'ELI5';
let visualMode = 'Array';

const storedNumber = (key, fallback) => {
  const raw = localStorage.getItem(key);
  const value = Number(raw);
  return raw !== null && Number.isFinite(value) && value >= 0 ? value : fallback;
};

let xp = storedNumber('vizloop-xp', 120);
let streak = Math.max(1, storedNumber('vizloop-streak', 1));
let completed = false;
let user = localStorage.getItem('vizloop-user') || '';
let toast = '';
let toastTimer = null;

const app = document.querySelector('#app');

const getSaved = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('vizloop-snippets') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

// ── Rendering Pipeline ──────────────────────────────────────────

function render() {
  const [line, action, mentor, vars, index, changed] = lesson.steps[step];
  const firstDataKey = Object.keys(lesson.trace[step].state.dataStructures)[0];
  const values = (firstDataKey && lesson.trace[step].state.dataStructures[firstDataKey]?.values) || [];

  app.innerHTML = `
    <main class="shell">
      <header class="topbar">
        <a class="brand" href="#"><span class="brand-mark">⌁</span>viz<span>loop</span></a>
        <div class="crumb">
          <span class="dot"></span> ${escapeHtml(language)} foundations <b>/</b> Loops & conditions
        </div>
        <div class="top-actions">
          <div class="xp-chip">
            <b>✦ ${xp} XP</b>
            <span>🔥 ${streak}</span>
          </div>
          <button id="dashboard" class="ghost">My dashboard</button>
          ${
            user
              ? `<button id="profile" class="profile" title="Sign out">${escapeHtml(user[0].toUpperCase())}</button>`
              : '<button id="sign-in" class="sign-in">Sign in</button>'
          }
        </div>
      </header>

      ${toast ? `<div class="toast">✓ ${escapeHtml(toast)}</div>` : ''}

      <section class="workspace">
        <aside class="rail">
          <button class="rail-btn active" aria-label="Trace view">⌘</button>
          <button id="lessons" class="rail-btn" aria-label="Lessons">◇</button>
          <button id="progress" class="rail-btn" aria-label="Progress">◴</button>
          <span></span>
          <button class="rail-btn" aria-label="Settings">⚙</button>
        </aside>

        <section class="editor-panel">
          <div class="panel-head">
            <div>
              <p class="eyebrow">YOUR CODE</p>
              <h1>${escapeHtml(lesson.title || 'Filter high scores')}</h1>
            </div>
            <div class="editor-tools">
              <button id="edit" class="text-btn">⌘ Edit</button>
              <button id="save" class="text-btn">⌑ Save</button>
              <button id="reset" class="text-btn">↺ Reset</button>
              <button id="run" class="run-btn">▶ Run trace</button>
            </div>
          </div>

          <div class="editor-meta">
            <label class="language-picker">
              <i class="${language === 'Python' ? 'python' : ''}"></i>
              <select id="language" aria-label="Choose language">
                <option ${language === 'JavaScript' ? 'selected' : ''}>JavaScript</option>
                <option ${language === 'Python' ? 'selected' : ''}>Python</option>
                <option disabled>C++ · soon</option>
                <option disabled>Java · soon</option>
                <option disabled>PHP · soon</option>
              </select>
            </label>
            <span>${language === 'Python' ? 'main.py' : 'main.js'}</span>
            <span class="save-state">● ${user ? 'Cloud-ready' : 'Guest mode'}</span>
          </div>

          <div class="code-area">
            ${lesson.code
              .split('\n')
              .map(
                (text, i) => `
                  <div class="code-line ${i + 1 === line ? 'focus' : ''}">
                    <span class="line-no">${i + 1}</span>
                    <code>${color(text)}</code>
                  </div>
                `
              )
              .join('')}
          </div>

          <footer class="progress">
            <div>
              <span>TRACE PROGRESS</span>
              <b>${step + 1} <em>/ ${lesson.steps.length}</em></b>
            </div>
            <div class="track">
              <i style="width: ${((step + 1) / lesson.steps.length) * 100}%"></i>
            </div>
          </footer>
        </section>

        <section class="stage-panel">
          <div class="stage-head">
            <div>
              <p class="eyebrow">EXECUTION VIEW</p>
              <h2>Watch it happen</h2>
            </div>
            <span class="step-pill">STEP ${String(step + 1).padStart(2, '0')}</span>
          </div>

          <div class="view-switch" role="group" aria-label="Visualizer view">
            ${['Array', 'Flow', 'Metaphor']
              .map(
                (view) => `
                  <button class="${visualMode === view ? 'selected' : ''}" data-view="${view}">
                    ${view}
                  </button>
                `
              )
              .join('')}
          </div>

          ${visual(visualMode, index, vars, values)}

          <div class="mentor">
            <div class="mentor-icon">✦</div>
            <div>
              <p class="eyebrow">VIZLOOP MENTOR <span>${action.replace(/_/g, ' ')}</span></p>
              <p>${mentorMode === 'ELI5' ? mentor : technical(action, vars, index)}</p>
            </div>
            <button id="mentor-mode" class="mentor-mode">
              ${mentorMode === 'ELI5' ? 'Technical' : 'ELI5'}
            </button>
          </div>

          <div class="controls">
            <button id="back" class="control" ${step === 0 ? 'disabled' : ''}>↶</button>
            <button id="play" class="play">${playing ? 'Ⅱ Pause' : '▶ Play'}</button>
            <button id="next" class="control" ${step === lesson.steps.length - 1 ? 'disabled' : ''}>↷</button>
            <label class="speed">
              Speed
              <input id="speed" type="range" min="350" max="1200" value="${1550 - speed}">
            </label>
          </div>
        </section>

        <aside class="inspector">
          <div class="inspect-head">
            <p class="eyebrow">LIVE STATE</p>
            <span>● synced</span>
          </div>

          <section class="state-section">
            <h3>Variables</h3>
            ${Object.entries(vars)
              .map(
                ([key, value]) => `
                  <div class="variable ${changed === key ? 'changed' : ''}">
                    <span>${escapeHtml(key)}</span>
                    <code>${escapeHtml(value)}</code>
                  </div>
                `
              )
              .join('')}
          </section>

          <section class="state-section">
            <h3>Call stack</h3>
            <div class="frame">
              <span>global()</span>
              <small>${language === 'Python' ? 'main.py' : 'main.js'}</small>
            </div>
          </section>

          <section class="challenge">
            <span>✦</span>
            <div>
              <p>NEXT UP</p>
              <strong>Can you predict the next value of <code>${escapeHtml(lesson.meta.indexName)}</code>?</strong>
            </div>
            <button id="challenge">Try it →</button>
          </section>
        </aside>
      </section>

      <div id="modal-root"></div>
    </main>
  `;

  bind();
}

// ── Syntax Highlighting ─────────────────────────────────────────

function color(text) {
  const keywords = ['const', 'let', 'for', 'if', 'console', 'print'];
  const names = [...new Set([...keywords, ...Object.values(lesson.meta), 'length', 'log'])]
    .map((name) => String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  return escapeHtml(text).replace(
    new RegExp(`\\b(${names})\\b|\\b\\d+\\b`, 'g'),
    (token) => {
      if (keywords.includes(token)) return `<b>${token}</b>`;
      if (/^\d/.test(token)) return `<i>${token}</i>`;
      return `<span>${token}</span>`;
    }
  );
}

// ── Mentor Technical Explanation ────────────────────────────────

function technical(action, vars, index) {
  const pointer = index === null ? 'completed' : `at index ${index}`;
  const totalName = lesson.meta.totalName;
  return `${action.replace(/_/g, ' ')}: current iterator is ${pointer}; ${totalName} is ${vars[totalName]}. The trace snapshot updates after this statement completes.`;
}

// ── Multi-Mode Visualizer ───────────────────────────────────────

function visual(mode, index, vars, values) {
  const { arrayName, totalName, indexName, threshold } = lesson.meta;
  const total = vars[totalName] === '—' ? '0' : vars[totalName];
  const accepted = (value) => value > threshold;

  if (mode === 'Flow') {
    return `
      <div class="canvas flow-view">
        <div class="flow-node active">Initialize<br><b>${escapeHtml(indexName)} = 0</b></div>
        <i></i>
        <div class="flow-node">Check value<br><b>${escapeHtml(arrayName)}[${escapeHtml(indexName)}] &gt; ${threshold}</b></div>
        <i></i>
        <div class="flow-node ${index !== null && accepted(values[index]) ? 'active' : ''}">
          Add to ${escapeHtml(totalName)}<br><b>${escapeHtml(total)}</b>
        </div>
        <i></i>
        <div class="flow-node">Next item</div>
      </div>
    `;
  }

  if (mode === 'Metaphor') {
    return `
      <div class="canvas metaphor-view">
        <p class="metaphor-title">A value conveyor</p>
        <div class="belt">
          ${values
            .map(
              (v, i) => `
                <span class="parcel ${i === index ? 'moving' : ''} ${accepted(v) && i <= (index ?? -1) ? 'approved' : ''}">
                  ${escapeHtml(v)}
                </span>
              `
            )
            .join('')}
        </div>
        <div class="gate">
          ${index !== null && accepted(values[index]) ? '✓ Passes the gate' : '↷ Skips the gate'}
        </div>
        <p>The gate keeps values greater than ${threshold}. The basket holds <b>${escapeHtml(total)}</b>.</p>
      </div>
    `;
  }

  return `
    <div class="canvas">
      <div class="loop-label">
        ${escapeHtml(arrayName)} <small>Array · ${values.length} items</small>
      </div>
      <div class="array-row">
        ${values
          .map(
            (v, i) => `
              <div class="array-item ${i === index ? 'current' : ''} ${accepted(v) && i <= (index ?? -1) ? 'accepted' : ''}">
                <span>${escapeHtml(v)}</span>
                <small>${i}</small>
                ${i === index ? `<b>${escapeHtml(indexName)}</b>` : ''}
              </div>
            `
          )
          .join('')}
      </div>
      <div class="flow-line">
        <i></i>
        <span>if value &gt; ${threshold}</span>
      </div>
      <div class="total-orb">
        <small>RUNNING ${escapeHtml(totalName).toUpperCase()}</small>
        <strong>${escapeHtml(total)}</strong>
        <span>${escapeHtml(totalName)}</span>
      </div>
    </div>
  `;
}

// ── Event Binding ───────────────────────────────────────────────

function bind() {
  document.querySelector('#next')?.addEventListener('click', () => move(1));
  document.querySelector('#back')?.addEventListener('click', () => move(-1));
  document.querySelector('#reset').onclick = () => {
    stop();
    step = 0;
    render();
  };
  document.querySelector('#run').onclick = () => {
    step = 0;
    start();
  };
  document.querySelector('#play').onclick = () => (playing ? stop() : start());
  document.querySelector('#speed').oninput = (e) => {
    speed = 1550 - Number(e.target.value);
    if (playing) {
      stop();
      start();
    }
  };

  document.querySelector('#language').onchange = (event) => {
    language = event.target.value;
    loadTopic(activeTopic === 'custom' ? 'loops' : activeTopic);
    render();
  };

  document.querySelector('#edit').onclick = editCode;
  document.querySelector('#save').onclick = save;
  document.querySelector('#sign-in')?.addEventListener('click', signIn);
  document.querySelector('#profile')?.addEventListener('click', () => {
    user = '';
    localStorage.removeItem('vizloop-user');
    notify('You are now in guest mode.');
  });
  document.querySelector('#dashboard').onclick = dashboard;
  document.querySelector('#challenge').onclick = challenge;
  document.querySelector('#lessons').onclick = curriculum;
  document.querySelector('#progress').onclick = dashboard;

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.onclick = () => {
      visualMode = button.dataset.view;
      render();
    };
  });

  document.querySelector('#mentor-mode').onclick = () => {
    mentorMode = mentorMode === 'ELI5' ? 'Technical' : 'ELI5';
    render();
  };
}

// ── Playback & Progression ──────────────────────────────────────

function loadTopic(topic) {
  stop();
  activeTopic = topic;
  const preset = getLessonTemplate(topic, language);
  lesson = {
    ...buildLesson(language, preset.code),
    title: preset.title,
  };
  step = 0;
  completed = false;
}

function move(by) {
  stop();
  step = Math.max(0, Math.min(lesson.steps.length - 1, step + by));
  rewardIfComplete();
  render();
}

function start() {
  if (step === lesson.steps.length - 1) step = 0;
  playing = true;
  clearInterval(timer);
  timer = setInterval(() => {
    if (step === lesson.steps.length - 1) {
      stop();
      render();
    } else {
      step++;
      rewardIfComplete();
      render();
    }
  }, speed);
  render();
}

function stop() {
  playing = false;
  clearInterval(timer);
}

function rewardIfComplete() {
  if (step === lesson.steps.length - 1 && !completed) {
    completed = true;
    xp += 30;
    streak += 1;
    localStorage.setItem('vizloop-xp', xp);
    localStorage.setItem('vizloop-streak', streak);
    showToast('Lesson complete! +30 XP and a streak boost.');
  }
}

function showToast(message) {
  toast = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast = '';
    document.querySelector('.toast')?.remove();
  }, 2400);
}

function notify(message) {
  showToast(message);
  render();
}

// ── Modals & Dialogs ────────────────────────────────────────────

function modal(html) {
  stop();
  document.querySelector('#modal-root').innerHTML = `
    <div class="modal-backdrop">
      <section class="modal" role="dialog" aria-modal="true">
        ${html}
      </section>
    </div>
  `;
  document.querySelector('#modal-close')?.addEventListener('click', render);
}

function signIn() {
  modal(`
    <button id="modal-close" class="modal-close">×</button>
    <p class="eyebrow">WELCOME TO VIZLOOP</p>
    <h2>Save your learning path</h2>
    <p class="modal-copy">This prototype keeps your work in this browser. Google and GitHub sign-in will connect when a secure backend is added.</p>
    <label class="input-label">
      Display name
      <input id="name" maxlength="20" placeholder="Your name" autofocus>
    </label>
    <button id="continue" class="modal-action">Continue as learner →</button>
    <p class="modal-foot">No password is required here.</p>
  `);

  document.querySelector('#continue').onclick = () => {
    user = document.querySelector('#name').value.trim() || 'Learner';
    localStorage.setItem('vizloop-user', user);
    notify(`Welcome, ${user}! Your workspace is ready.`);
  };
}

function editCode() {
  modal(`
    <button id="modal-close" class="modal-close">×</button>
    <p class="eyebrow">${language.toUpperCase()} TRACE RUNNER</p>
    <h2>Try your own loop</h2>
    <p class="modal-copy">Use an array, numeric total, a <code>for</code> loop, <code>if value &gt; number</code>, and <code>+=</code>. Your code is parsed only; it is never executed.</p>
    <label class="input-label">
      Snippet title
      <input id="snippet-title" maxlength="42" value="${escapeHtml(lesson.title || 'Filter high scores')}">
    </label>
    <textarea id="source-editor" class="source-editor" spellcheck="false">${escapeHtml(lesson.code)}</textarea>
    <p id="editor-error" class="editor-error"></p>
    <button id="trace-source" class="modal-action">Run this trace →</button>
  `);

  document.querySelector('#trace-source').onclick = () => {
    const next = document.querySelector('#source-editor').value;
    const title = document.querySelector('#snippet-title').value.trim() || 'Untitled trace';
    try {
      stop();
      activeTopic = 'custom';
      lesson = { ...buildLesson(language, next), title };
      step = 0;
      completed = false;
      showToast('New trace ready.');
      render();
    } catch (error) {
      document.querySelector('#editor-error').textContent = error.message;
    }
  };
}

function save() {
  const entry = {
    id: `${language}:${lesson.code}`,
    title: lesson.title || 'Filter high scores',
    language,
    code: lesson.code,
    savedAt: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  };
  localStorage.setItem('vizloop-snippets', JSON.stringify([entry, ...getSaved().filter((item) => item.id !== entry.id)]));
  notify(user ? 'Snippet saved to your learner space.' : 'Snippet saved locally — sign in later to sync.');
}

function dashboard() {
  const entries = getSaved();
  modal(`
    <button id="modal-close" class="modal-close">×</button>
    <p class="eyebrow">${user ? `${escapeHtml(user.toUpperCase())}'S DASHBOARD` : 'GUEST DASHBOARD'}</p>
    <h2>Your learning space</h2>
    <div class="dashboard-stats">
      <div><b>${entries.length}</b><span>saved snippets</span></div>
      <div><b>${xp}</b><span>total XP</span></div>
      <div><b>🔥 ${streak}</b><span>day streak</span></div>
    </div>
    <div class="skill-card">
      <div>
        <p class="eyebrow">CURRENT QUEST</p>
        <strong>${escapeHtml(lesson.title || 'Custom trace')}</strong>
        <small>${completed ? 'Complete — next quest unlocked' : 'Trace this lesson to unlock +30 XP'}</small>
      </div>
      <span>${completed ? '✓' : '1 / 1'}</span>
    </div>
    <h3 class="saved-title">Saved snippets</h3>
    ${
      entries.length
        ? `<div class="saved-list">${entries
            .map(
              (entry, index) => `
                <button class="saved-item" data-saved-index="${index}">
                  <span>${escapeHtml(entry.language)}</span>
                  <strong>${escapeHtml(entry.title)}</strong>
                  <small>Saved ${escapeHtml(entry.savedAt)}</small>
                </button>
              `
            )
            .join('')}</div>`
        : '<p class="empty-state">No saved snippets yet. Use “Save” above to keep this lesson.</p>'
    }
    <button id="back-to-trace" class="modal-action secondary">Back to tracing</button>
  `);

  document.querySelectorAll('[data-saved-index]').forEach((button) => {
    button.onclick = () => {
      const entry = entries[Number(button.dataset.savedIndex)];
      if (!entry.code) {
        notify('This older saved snippet has no code to restore. Save it again to update it.');
        return;
      }
      language = entry.language;
      activeTopic = 'custom';
      lesson = { ...buildLesson(language, entry.code), title: entry.title };
      step = 0;
      completed = false;
      showToast(`Loaded ${entry.title}.`);
      render();
    };
  });

  document.querySelector('#back-to-trace').onclick = render;
}

function prediction() {
  const next = lesson.trace.slice(step + 1).find((item) => ['LOOP_INIT', 'LOOP_ITERATE'].includes(item.action.type));
  const value = next?.action.value;
  if (value === undefined) return null;
  return {
    value,
    answers: [value - 1, value, value + 1].sort(() => Math.random() - 0.5),
  };
}

function challenge() {
  const prompt = prediction();
  if (!prompt) {
    notify('Complete the current trace, then start a new one to make another prediction.');
    return;
  }

  let answered = false;

  modal(`
    <button id="modal-close" class="modal-close">×</button>
    <p class="eyebrow">PREDICT BEFORE REVEAL</p>
    <h2>What will <code>${escapeHtml(lesson.meta.indexName)}</code> be next?</h2>
    <div class="choice-row">
      ${prompt.answers.map((answer) => `<button class="choice" data-answer="${answer}">${answer}</button>`).join('')}
    </div>
    <p id="answer" class="modal-foot">Choose an answer, then continue tracing to check it.</p>
  `);

  document.querySelectorAll('.choice').forEach((btn) => {
    btn.onclick = () => {
      if (answered) return;
      answered = true;

      btn.classList.add('selected');
      document.querySelectorAll('.choice').forEach((b) => (b.style.pointerEvents = 'none'));

      const correct = Number(btn.dataset.answer) === prompt.value;
      if (correct) {
        xp += 5;
        localStorage.setItem('vizloop-xp', xp);
        document.querySelector('#answer').textContent = 'Correct! +5 XP. Keep tracing to reveal it.';
      } else {
        document.querySelector('#answer').textContent = 'Good try. Keep tracing to reveal the answer.';
      }
    };
  });
}

function curriculum() {
  const topics = [
    ['loops', '✓', 'Loops & conditions', 'A traceable starter loop', 'ready'],
    ['arrays', '2', 'Arrays', 'Find priority orders', 'ready'],
    ['searching', '3', 'Searching', 'Linear & binary search', 'locked'],
    ['sorting', '4', 'Sorting', 'Bubble & merge sort', 'locked'],
    ['recursion', '5', 'Recursion', 'Think in smaller calls', 'locked'],
  ];

  modal(`
    <button id="modal-close" class="modal-close">×</button>
    <p class="eyebrow">VIZLOOP CURRICULUM</p>
    <h2>Choose your next quest</h2>
    <p class="modal-copy">Build core problem-solving skills one visual trace at a time.</p>
    <div class="curriculum">
      ${topics
        .map(
          ([topic, number, title, detail, state]) => `
            <button class="topic ${state}" ${state === 'ready' ? `data-topic="${topic}"` : 'disabled'}>
              <span>${number}</span>
              <div>
                <strong>${title}</strong>
                <small>${detail}</small>
              </div>
              <em>${state === 'ready' ? (activeTopic === topic ? 'Active' : 'Start →') : 'Locked'}</em>
            </button>
          `
        )
        .join('')}
    </div>
    <button id="back-to-trace" class="modal-action secondary">Back to tracing</button>
  `);

  document.querySelectorAll('[data-topic]').forEach((button) => {
    button.onclick = () => {
      loadTopic(button.dataset.topic);
      showToast(`${lesson.title} is ready.`);
      render();
    };
  });

  document.querySelector('#back-to-trace').onclick = render;
}

// ── Boot ────────────────────────────────────────────────────────
render();
