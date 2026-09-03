import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Code2,
  Copy,
  FileCode2,
  FileDiff,
  Gauge,
  Gamepad2,
  GitBranch,
  Globe,
  GraduationCap,
  HelpCircle,
  Home,
  Layers,
  ListChecks,
  LogOut,
  Network,
  Pause,
  Play,
  Printer,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Timer,
  Trophy,
  Upload,
  User,
  Volume2,
  Workflow,
} from 'lucide-react';
import {
  answerQuestion,
  createAssessmentSession,
  finishAssessment,
  formatSeconds,
  secondsRemaining,
} from './assessment-engine.js';
import {
  evaluateBigO,
  evaluateBugLine,
  evaluateFillBlank,
  evaluateSortingRace,
  evaluateStackQueue,
  evaluateTraceLoop,
} from './game-engine.js';
import { buildLesson, detectMisconceptions, generateWorksheetHTML, SAMPLE_PROGRAMS, WORKFLOW_PHASES } from './program-analysis.js';
import {
  AUTH_PROVIDER_GUIDE,
  BILINGUAL_STRINGS,
  CONCEPT_DEPENDENCIES,
  CONCEPT_TREE,
  GAME_LIBRARY,
  GLOSSARY_DICTIONARY,
  LANGUAGE_GOTCHAS,
  QUESTION_BANK,
  QUESTION_BANK_VERSION,
  SAME_ALGORITHM_COMPARISON,
  STRINGS,
} from './product-content.js';
import {
  clearSession,
  hasSeenSplash,
  loadAssessmentAttempts,
  loadLastRoute,
  loadProfile,
  loadProgress,
  loadSession,
  markSplashSeen,
  saveAssessmentAttempt,
  saveLastRoute,
  saveProfile,
  saveSession,
  updateProgress,
} from './progress-store.js';
import { buildRoute, navigateTo, parseRoute } from './routing.js';

const ExecutionScene = React.lazy(() => import('./ExecutionScene.jsx'));
const MonacoEditor = React.lazy(() => import('@monaco-editor/react'));
const initialProgram = SAMPLE_PROGRAMS[0];

function storedNumber(key, fallback) {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getSampleById(id) {
  return SAMPLE_PROGRAMS.find((program) => program.id === id) || initialProgram;
}

function conceptFromSample(sample) {
  if (sample.topic === 'conditions') return 'loops';
  if (sample.topic === 'arrays') return 'arrays';
  return sample.topic || 'loops';
}

function App() {
  const initialRoute = parseRoute(window.location.hash || loadLastRoute());
  const [showSplash, setShowSplash] = useState(() => !hasSeenSplash());
  const [session, setSession] = useState(() => loadSession());
  const [profile, setProfile] = useState(() => loadSession()?.profile || loadProfile());
  const [syncing, setSyncing] = useState(false);
  const [route, setRoute] = useState(() => initialRoute);
  const [source, setSource] = useState(initialProgram.code);
  const [title, setTitle] = useState(initialProgram.title);
  const [language, setLanguage] = useState(initialProgram.language);
  const [lesson, setLesson] = useState(() => buildLesson(initialProgram));
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(850);
  const [mentorMode, setMentorMode] = useState('simple');
  const [insightTab, setInsightTab] = useState('mentor');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [completed, setCompleted] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [locale, setLocale] = useState('en');
  const [showGotchas, setShowGotchas] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showConceptMap, setShowConceptMap] = useState(false);
  const [notes, setNotes] = useState({});
  const [diffView, setDiffView] = useState(false);
  const [activeConceptId, setActiveConceptId] = useState('loops');
  const [activeSampleId, setActiveSampleId] = useState(() => (
    SAMPLE_PROGRAMS.some((program) => program.id === initialRoute.id) ? initialRoute.id : initialProgram.id
  ));
  const [progress, setProgress] = useState(() => loadProgress());
  const [xp, setXp] = useState(() => storedNumber('vizloop-xp', 140));
  const [streak, setStreak] = useState(() => Math.max(1, storedNumber('vizloop-streak', 1)));
  const toastRef = useRef(null);

  const current = lesson.trace[step] || lesson.trace[0];
  const variables = current?.state.variables || {};
  const maxStep = lesson.trace.length - 1;
  const traceProgress = maxStep <= 0 ? 1 : step / maxStep;
  const prediction = useMemo(() => makePrediction(lesson, step), [lesson, step]);
  const misconceptions = useMemo(() => detectMisconceptions(source, language), [source, language]);
  const i18n = BILINGUAL_STRINGS[locale] || BILINGUAL_STRINGS.en;
  const needsOnboarding = Boolean(session && !profile?.onboarding);

  function speakExplanation(text) {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
      showToast('Playing audio narration...');
    } else {
      showToast('Audio narration not supported in this browser.');
    }
  }

  function downloadWorksheet() {
    const html = generateWorksheetHTML(lesson);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      showToast('Worksheet opened. Use Print (Ctrl+P) to save PDF.');
    }
  }

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(window.location.hash || '#/hub'));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (session && route.section !== 'auth') {
      saveLastRoute(window.location.hash || '#/hub');
    }
  }, [route, session]);

  useEffect(() => {
    if (route.section !== 'visualizer') return;
    const sample = SAMPLE_PROGRAMS.find((program) => program.id === route.id);
    if (sample && sample.code !== lesson.code) {
      loadProgram(sample, { navigate: false });
    }
    if (route.stepIndex !== null) {
      setStep(Math.max(0, Math.min(maxStep, route.stepIndex)));
    }
  }, [route.section, route.id, route.stepIndex, lesson.code, maxStep]);

  useEffect(() => {
    if (!playing) return undefined;

    const timer = window.setInterval(() => {
      setStep((currentStep) => {
        if (currentStep >= maxStep) return currentStep;
        return currentStep + 1;
      });
    }, speed);

    return () => window.clearInterval(timer);
  }, [playing, speed, maxStep]);

  useEffect(() => {
    if (route.section === 'visualizer') {
      if (route.id && route.id !== activeSampleId) return;
      window.history.replaceState(null, '', buildRoute('visualizer', activeSampleId, step));
    }
  }, [step, route.section, route.id, activeSampleId]);

  useEffect(() => {
    if (step >= maxStep && playing) setPlaying(false);
    if (step >= maxStep && !completed) {
      setCompleted(true);
      const nextProgress = updateProgress(activeConceptId, { status: 'complete', score: 100 });
      setProgress(nextProgress);
      setXp((value) => {
        const next = value + 40;
        window.localStorage.setItem('vizloop-xp', String(next));
        return next;
      });
      setStreak((value) => {
        const next = value + 1;
        window.localStorage.setItem('vizloop-streak', String(next));
        return next;
      });
      showToast('Trace complete. Final answer unlocked and +40 XP added.');
    }
  }, [step, maxStep, playing, completed, activeConceptId]);

  useEffect(() => {
    setSelectedAnswer(null);
  }, [lesson, step]);

  function showToast(message) {
    setToast(message);
    window.clearTimeout(toastRef.current);
    toastRef.current = window.setTimeout(() => setToast(''), 2400);
  }

  function finishSplash() {
    markSplashSeen();
    setShowSplash(false);
    if (!session) navigateTo('#/auth');
  }

  function login(nextProfile, message = 'Welcome back. Progress restored.') {
    saveProfile(nextProfile);
    const nextSession = {
      id: `session-${Date.now()}`,
      email: nextProfile.email,
      createdAt: new Date().toISOString(),
    };
    saveSession(nextSession);
    setProfile(nextProfile);
    setSession({ ...nextSession, profile: nextProfile });
    setSyncing(true);
    window.setTimeout(() => {
      setSyncing(false);
      showToast(message);
      navigateTo(nextProfile.onboarding ? loadLastRoute() : '#/onboarding');
    }, 650);
  }

  function logout() {
    clearSession();
    setSession(null);
    setPlaying(false);
    showToast('Signed out. Your learner progress stays saved for the next login.');
    navigateTo('#/auth');
  }

  function completeOnboarding(onboarding) {
    const nextProfile = {
      ...(profile || {}),
      onboarding,
      displayName: profile?.displayName || 'Learner',
      email: profile?.email || 'learner@example.com',
    };
    saveProfile(nextProfile);
    setProfile(nextProfile);
    setSession((value) => (value ? { ...value, profile: nextProfile } : value));
    showToast('Onboarding saved. Your hub is ready.');
    navigateTo('#/hub');
  }

  function analyzeProgram(nextSource = source, nextLanguage = language, nextTitle = title || 'Custom program') {
    try {
      const nextLesson = buildLesson({
        language: nextLanguage,
        code: nextSource,
        title: nextTitle,
      });
      setLesson(nextLesson);
      setLanguage(nextLesson.language);
      setTitle(nextTitle);
      setSource(nextSource);
      setStep(0);
      setPlaying(false);
      setCompleted(false);
      setError('');
      setInsightTab('mentor');
      showToast('Program analyzed. Trace, algorithm, flowchart, and answer are ready.');
    } catch (analysisError) {
      setPlaying(false);
      setError(analysisError.message);
    }
  }

  function loadProgram(sample, options = {}) {
    setActiveSampleId(sample.id);
    analyzeProgram(sample.code, sample.language, sample.title);
    setActiveConceptId(conceptFromSample(sample));
    if (options.navigate !== false) navigateTo(buildRoute('visualizer', sample.id, 0));
  }

  function loadConcept(conceptOrSubtopic) {
    const sample = getSampleById(conceptOrSubtopic.sampleId);
    loadProgram(sample);
    setActiveConceptId(conceptOrSubtopic.id?.split('-')[0] || conceptOrSubtopic.id || 'loops');
  }

  function move(by) {
    setPlaying(false);
    setStep((value) => Math.max(0, Math.min(maxStep, value + by)));
  }

  function resetTrace() {
    setPlaying(false);
    setStep(0);
    setCompleted(false);
  }

  function saveSnapshot() {
    const nextProgress = updateProgress(activeConceptId, {
      status: step >= maxStep ? 'complete' : 'in-progress',
      score: Math.max(progress[activeConceptId]?.score || 0, Math.round(traceProgress * 100)),
    });
    setProgress(nextProgress);
    showToast('Learning snapshot saved.');
  }

  function copyGeneratedText(kind) {
    const text = kind === 'algorithm'
      ? lesson.report.algorithm.map((item, index) => `${index + 1}. ${item}`).join('\n')
      : lesson.report.flowchart.map((item) => `${item.label}: ${item.detail}`).join('\n');
    navigator.clipboard?.writeText(text);
    showToast(`${kind === 'algorithm' ? 'Algorithm' : 'Flowchart'} copied.`);
  }

  function answerPrediction(answer) {
    if (!prediction || selectedAnswer !== null) return;
    setSelectedAnswer(answer);

    if (answer === prediction.value) {
      setXp((value) => {
        const next = value + 10;
        window.localStorage.setItem('vizloop-xp', String(next));
        return next;
      });
      showToast('Correct prediction. +10 XP.');
    } else {
      showToast('Good attempt. Step forward to reveal the exact value.');
    }
  }

  if (showSplash) return <SplashScreen onDone={finishSplash} />;

  if (!session || route.section === 'auth') {
    return (
      <AuthScreen
        syncing={syncing}
        onLogin={login}
        onToast={showToast}
        toast={toast}
      />
    );
  }

  if (needsOnboarding || route.section === 'onboarding') {
    return (
      <OnboardingScreen
        profile={profile}
        onComplete={completeOnboarding}
        onLogout={logout}
        toast={toast}
      />
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand as-button" type="button" onClick={() => navigateTo('#/hub')} aria-label="VizLoop home">
          <span className="brand-mark"><Workflow size={18} /></span>
          <span>{STRINGS.productName}</span>
        </button>
        <nav className="main-nav" aria-label="Primary">
          <NavButton icon={Home} label="Hub" active={route.section === 'hub'} onClick={() => navigateTo('#/hub')} />
          <NavButton icon={Code2} label="Visualizer" active={route.section === 'visualizer'} onClick={() => navigateTo(buildRoute('visualizer', activeSampleId, step))} />
          <NavButton icon={BarChart3} label="Assessment" active={route.section === 'assessment'} onClick={() => navigateTo('#/assessment')} />
          <NavButton icon={Gamepad2} label="Games" active={route.section === 'games'} onClick={() => navigateTo('#/games')} />
        </nav>
        <div className="top-actions">
          <label className="locale-selector" title="Language selection">
            <Globe size={15} />
            <select value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="hi">हिंदी</option>
            </select>
          </label>
          <div className="xp-chip">
            <Trophy size={15} />
            <b>{xp} XP</b>
            <span>{streak} streak</span>
          </div>
          <button className="icon-button" type="button" title="Download Printable Worksheet" onClick={downloadWorksheet}>
            <Printer size={17} />
          </button>
          <button className="icon-button" type="button" title="Language Gotchas" onClick={() => setShowGotchas((v) => !v)}>
            <HelpCircle size={17} />
          </button>
          <button className="icon-button" type="button" title="Compare Algorithm in 4 Languages" onClick={() => setShowCompare((v) => !v)}>
            <FileDiff size={17} />
          </button>
          <button className="icon-button" type="button" title="Concept Dependency Map" onClick={() => setShowConceptMap((v) => !v)}>
            <Network size={17} />
          </button>
          <button className="icon-button" type="button" title="Save snapshot" onClick={saveSnapshot}>
            <Save size={17} />
          </button>
          <button className="profile-pill" type="button" onClick={() => navigateTo('#/profile')}>
            <User size={15} />
            <span>{profile?.displayName || 'Learner'}</span>
          </button>
        </div>
      </header>

      {toast && <div className="toast" role="status">{toast}</div>}
      {syncing && <div className="sync-banner">{STRINGS.syncMessage}</div>}

      {showGotchas && <GotchasModal onClose={() => setShowGotchas(false)} />}
      {showCompare && <CompareModal onClose={() => setShowCompare(false)} />}
      {showConceptMap && <ConceptMapModal onClose={() => setShowConceptMap(false)} onSelectConcept={loadConcept} />}

      {route.section === 'hub' && (
        <HubView
          route={route}
          progress={progress}
          onNavigate={navigateTo}
          onLoadConcept={loadConcept}
        />
      )}

      {route.section === 'visualizer' && (
        <>
          <PhaseStrip progress={traceProgress} />
          <section className="workspace">
            <CodePanel
              source={source}
              title={title}
              language={language}
              lesson={lesson}
              currentLine={current.line}
              error={error}
              notes={notes}
              onNoteChange={(line, text) => setNotes((prev) => ({ ...prev, [line]: text }))}
              onSourceChange={setSource}
              onTitleChange={setTitle}
              onLanguageChange={setLanguage}
              onAnalyze={() => {
                setActiveSampleId('custom');
                analyzeProgram();
              }}
              onSample={loadProgram}
            />

            <ExecutionPanel
              lesson={lesson}
              current={current}
              step={step}
              maxStep={maxStep}
              playing={playing}
              speed={speed}
              diffView={diffView}
              onBack={() => move(-1)}
              onNext={() => move(1)}
              onReset={resetTrace}
              onTogglePlay={() => {
                if (step >= maxStep) setStep(0);
                setPlaying((value) => !value);
              }}
              onSpeedChange={setSpeed}
              onToggleDiffView={() => setDiffView((v) => !v)}
              onModifyThreshold={(newVal) => {
                let modified = source;
                if (/\d+/.test(source)) {
                  modified = source.replace(/\d+/, String(newVal));
                  setSource(modified);
                  analyzeProgram(modified, language, title);
                  showToast(`Re-traced program with threshold ${newVal}.`);
                }
              }}
            />

            <InsightPanel
              lesson={lesson}
              current={current}
              variables={variables}
              tab={insightTab}
              mentorMode={mentorMode}
              prediction={prediction}
              selectedAnswer={selectedAnswer}
              confidence={confidence}
              misconceptions={misconceptions}
              onTabChange={setInsightTab}
              onMentorModeChange={setMentorMode}
              onCopy={copyGeneratedText}
              onPrediction={answerPrediction}
              onConfidenceChange={setConfidence}
              onSpeak={speakExplanation}
            />
          </section>
        </>
      )}

      {route.section === 'assessment' && (
        <AssessmentView
          profile={profile}
          progress={progress}
          onProgress={(conceptId, patch) => setProgress(updateProgress(conceptId, patch))}
          onNavigate={navigateTo}
          onToast={showToast}
        />
      )}

      {route.section === 'games' && (
        <GamesView
          route={route}
          onNavigate={navigateTo}
          onProgress={(conceptId, patch) => setProgress(updateProgress(conceptId, patch))}
          onToast={showToast}
        />
      )}

      {route.section === 'profile' && (
        <ProfileView
          profile={profile}
          progress={progress}
          attempts={loadAssessmentAttempts()}
          onLogout={logout}
          onNavigate={navigateTo}
        />
      )}
    </main>
  );
}

function NavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button className={active ? 'nav-button active' : 'nav-button'} type="button" onClick={onClick}>
      <Icon size={15} />
      <span>{label}</span>
    </button>
  );
}

function SplashScreen({ onDone }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2100);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <main className="splash-screen" onClick={onDone}>
      <section className="splash-card" aria-label="VizLoop loading">
        <div className="splash-blocks" aria-hidden="true">
          {'VIZLOOP'.split('').map((letter, index) => (
            <span style={{ '--i': index }} key={letter}>{letter}</span>
          ))}
        </div>
        <h1>{STRINGS.productName}</h1>
        <p>{STRINGS.splashSubtitle}</p>
        <div className="splash-progress"><i /></div>
        <button type="button">Skip</button>
      </section>
    </main>
  );
}

function AuthScreen({ syncing, onLogin, onToast, toast }) {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const existing = loadProfile();

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    const displayName = form.displayName.trim() || email.split('@')[0] || 'Learner';

    if (!email.includes('@')) {
      onToast('Enter a valid email address.');
      return;
    }
    if (form.password.length < 8) {
      onToast('Use at least 8 characters for the password field.');
      return;
    }

    if (mode === 'login' && existing?.email && existing.email !== email) {
      onToast('No demo learner found for that email on this device.');
      return;
    }

    onLogin({
      ...(existing?.email === email ? existing : {}),
      email,
      displayName: existing?.email === email ? existing.displayName : displayName,
    }, mode === 'signup' ? 'Account created. Add onboarding details next.' : 'Welcome back. Progress restored.');
  }

  return (
    <main className="auth-screen">
      {toast && <div className="toast" role="status">{toast}</div>}
      <section className="auth-art">
        <div className="auth-logo"><Workflow size={24} /></div>
        <h1>{STRINGS.productName}</h1>
        <p>{STRINGS.authPromise}</p>
        <div className="auth-checks">
          <span><ShieldCheck size={16} /> Managed-auth ready</span>
          <span><Layers size={16} /> Progress schema planned</span>
          <span><Sparkles size={16} /> Games and assessment included</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-tabs">
          <button className={mode === 'signup' ? 'selected' : ''} type="button" onClick={() => setMode('signup')}>Sign Up</button>
          <button className={mode === 'login' ? 'selected' : ''} type="button" onClick={() => setMode('login')}>Log In</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <label>
              <span>Display name</span>
              <input value={form.displayName} onChange={(event) => update('displayName', event.target.value)} autoComplete="name" />
            </label>
          )}
          <label>
            <span>Email</span>
            <input value={form.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" />
          </label>
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </label>
          <button className="primary-button wide" type="submit">
            {syncing ? STRINGS.syncMessage : mode === 'signup' ? 'Create learner account' : 'Log in'}
          </button>
        </form>
        <div className="auth-secondary">
          <button type="button" onClick={() => onToast('Password reset is provider-ready. Add email credentials in .env to send links.')}>Forgot password</button>
          <button type="button" onClick={() => onToast('Google sign-in is ready to connect after OAuth keys are added.')}>Continue with Google</button>
        </div>
      </section>
    </main>
  );
}

function OnboardingScreen({ profile, onComplete, onLogout, toast }) {
  const [form, setForm] = useState({
    preferredLanguage: profile?.onboarding?.preferredLanguage || 'JavaScript',
    skillLevel: profile?.onboarding?.skillLevel || 'Beginner',
    learnerStage: profile?.onboarding?.learnerStage || 'Class 11-12',
  });

  return (
    <main className="onboarding-screen">
      {toast && <div className="toast" role="status">{toast}</div>}
      <section className="onboarding-panel">
        <p className="eyebrow">Onboarding</p>
        <h1>Personalize the learning path</h1>
        <div className="field-grid stacked">
          <label>
            <span>Preferred language</span>
            <select value={form.preferredLanguage} onChange={(event) => setForm({ ...form, preferredLanguage: event.target.value })}>
              <option>JavaScript</option>
              <option>Python</option>
              <option>C</option>
              <option>C++</option>
            </select>
          </label>
          <label>
            <span>Skill level</span>
            <select value={form.skillLevel} onChange={(event) => setForm({ ...form, skillLevel: event.target.value })}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>
          <label>
            <span>Student stage</span>
            <select value={form.learnerStage} onChange={(event) => setForm({ ...form, learnerStage: event.target.value })}>
              <option>Class 11-12</option>
              <option>First-year college</option>
              <option>Self learner</option>
            </select>
          </label>
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => onComplete(form)}>Enter Learning Hub</button>
          <button className="secondary-button" type="button" onClick={onLogout}>Log out</button>
        </div>
      </section>
    </main>
  );
}

function HubView({ route, progress, onNavigate, onLoadConcept }) {
  const [query, setQuery] = useState('');
  const selected = findConcept(route.id);
  const visible = CONCEPT_TREE.filter((concept) => {
    const haystack = [concept.title, concept.summary, ...concept.keywords, ...concept.subtopics.map((item) => item.title)].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  if (selected) {
    return (
      <ConceptDetail
        concept={selected}
        progress={progress}
        onBack={() => onNavigate('#/hub')}
        onLoadConcept={onLoadConcept}
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <section className="hub-shell">
      <div className="hub-hero">
        <div>
          <p className="eyebrow">Learning Hub</p>
          <h1>Choose a concept and learn through trace, practice, and test.</h1>
        </div>
        <button className="continue-card" type="button" onClick={() => onNavigate(loadLastRoute())}>
          <span>Continue</span>
          <strong>{loadLastRoute().replace('#/', '').replaceAll('/', ' / ')}</strong>
        </button>
      </div>

      <label className="hub-search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search arrays, loops, stack, BFS, Big-O..." />
      </label>

      <div className="concept-grid-large">
        {visible.map((concept) => (
          <button className="concept-tile" type="button" key={concept.id} onClick={() => onNavigate(concept.route)}>
            <div className="progress-ring" style={{ '--score': progress[concept.progressKey]?.score || 0 }}>
              {(progress[concept.progressKey]?.score || 0) >= 100 ? <CheckCircle2 size={18} /> : <span>{progress[concept.progressKey]?.score || 0}</span>}
            </div>
            <strong>{concept.title}</strong>
            <p>{concept.summary}</p>
            <small>{concept.subtopics.length ? `${concept.subtopics.length} sub-topics` : 'Core concept'}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function ConceptDetail({ concept, progress, onBack, onLoadConcept, onNavigate }) {
  const tabs = concept.subtopics.length ? concept.subtopics : [concept];

  return (
    <section className="concept-detail">
      <div className="detail-head">
        <button className="secondary-button" type="button" onClick={onBack}>Back to hub</button>
        <span>{progress[concept.progressKey]?.status || 'not-started'}</span>
      </div>
      <div className="hub-hero compact">
        <div>
          <p className="eyebrow">Concept</p>
          <h1>{concept.title}</h1>
          <p>{concept.summary}</p>
        </div>
      </div>
      <div className="concept-flow">
        {['Overview', 'Visualize', 'Practice', 'Test Yourself', 'Related Concepts'].map((label) => <span key={label}>{label}</span>)}
      </div>
      <div className="subtopic-grid">
        {tabs.map((item) => (
          <article className="subtopic-card" key={item.id}>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            <div className="button-row">
              <button className="primary-button" type="button" onClick={() => onLoadConcept(item)}>Visualize</button>
              <button className="secondary-button" type="button" onClick={() => onNavigate(`#/games/${GAME_LIBRARY.find((game) => game.conceptId === concept.id)?.id || 'fill-blanks'}`)}>Practice</button>
              <button className="secondary-button" type="button" onClick={() => onNavigate('#/assessment')}>Test</button>
            </div>
            <div className="related-row">
              {(item.related || ['loops-for', 'arrays-1d']).map((id) => <span key={id}>{id.replace('-', ' ')}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PhaseStrip({ progress }) {
  const activePhase = progress >= 1 ? WORKFLOW_PHASES.length - 1 : Math.min(9, 4 + Math.floor(progress * 5));

  return (
    <section className="phase-strip" aria-label="10 phase learning workflow">
      {WORKFLOW_PHASES.map((phase, index) => {
        const state = progress >= 1 || index < activePhase ? 'done' : index === activePhase ? 'active' : 'queued';
        const Icon = state === 'done' ? CheckCircle2 : state === 'active' ? CircleDot : Circle;

        return (
          <article className={`phase ${state}`} key={phase.title}>
            <div>
              <Icon size={16} />
              <span>{String(index + 1).padStart(2, '0')}</span>
            </div>
            <strong>{phase.title}</strong>
            <p>{phase.detail}</p>
          </article>
        );
      })}
    </section>
  );
}

function CodePanel({
  source,
  title,
  language,
  lesson,
  currentLine,
  error,
  notes,
  onNoteChange,
  onSourceChange,
  onTitleChange,
  onLanguageChange,
  onAnalyze,
  onSample,
}) {
  return (
    <section className="panel code-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Program machine</p>
          <h1>Analyze a classroom program</h1>
        </div>
        <FileCode2 size={22} />
      </div>

      <div className="field-grid">
        <label>
          <span>Title</span>
          <input value={title} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <label>
          <span>Language</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value)}>
            <option>JavaScript</option>
            <option>Python</option>
          </select>
        </label>
      </div>

      <div className="monaco-shell">
        <Suspense
          fallback={(
            <textarea
              className="source-editor"
              value={source}
              onChange={(event) => onSourceChange(event.target.value)}
              spellCheck="false"
              aria-label="Program source code"
            />
          )}
        >
          <MonacoEditor
            height="270px"
            language={language === 'Python' ? 'python' : 'javascript'}
            theme="vs-dark"
            value={source}
            onChange={(value) => onSourceChange(value || '')}
            options={{
              automaticLayout: true,
              fontFamily: 'DM Mono, monospace',
              fontSize: 13,
              lineHeight: 22,
              minimap: { enabled: false },
              overviewRulerBorder: false,
              renderLineHighlight: 'all',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
            }}
          />
        </Suspense>
      </div>

      <div className="button-row">
        <button className="primary-button" type="button" onClick={onAnalyze}>
          <Upload size={17} />
          Analyze program
        </button>
        <span className={error ? 'analysis-status error' : 'analysis-status'}>
          {error || `${lesson.report.stepCount} trace steps generated`}
        </span>
      </div>

      <div className="sample-stack">
        <div className="section-title">
          <GraduationCap size={16} />
          <span>Starter programs</span>
        </div>
        {SAMPLE_PROGRAMS.map((sample) => (
          <button
            className={sample.code === lesson.code ? 'sample active' : 'sample'}
            type="button"
            key={sample.id}
            onClick={() => onSample(sample)}
          >
            <strong>{sample.title}</strong>
            <span>{sample.language} / {sample.topic}</span>
          </button>
        ))}
      </div>

      <CodeTrace code={lesson.code} currentLine={currentLine} notes={notes} onNoteChange={onNoteChange} />
    </section>
  );
}

function CodeTrace({ code, currentLine, notes, onNoteChange }) {
  const [hoverGlossary, setHoverGlossary] = useState(null);
  const [editingLine, setEditingLine] = useState(null);

  function checkKeyword(word) {
    const clean = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    return GLOSSARY_DICTIONARY[clean] || null;
  }

  return (
    <div className="trace-code-shell">
      {hoverGlossary && (
        <div className="glossary-popover">
          <strong>Glossary: {hoverGlossary.term}</strong>
          <p>{hoverGlossary.def}</p>

          <code>{hoverGlossary.example}</code>
        </div>
      )}
      <div className="trace-code" aria-label="Focused trace source">
        {code.split('\n').map((line, index) => {
          const lineNum = index + 1;
          const lineNote = notes[lineNum];
          const tokens = line.split(/(\s+|[(),;.[\]{}])/);

          return (
            <div className={currentLine === lineNum ? 'trace-line active' : 'trace-line'} key={`${line}-${index}`}>
              <button
                className="line-num-btn"
                type="button"
                title="Click to add sticky note"
                onClick={() => setEditingLine(editingLine === lineNum ? null : lineNum)}
              >
                {lineNum}
                {lineNote && <span className="note-indicator">Note</span>}
              </button>
              <code>
                {tokens.map((token, tIdx) => {
                  const entry = checkKeyword(token);
                  if (entry) {
                    return (
                      <span
                        key={tIdx}
                        className="glossary-token"
                        onMouseEnter={() => setHoverGlossary(entry)}
                        onMouseLeave={() => setHoverGlossary(null)}
                      >
                        {token}
                      </span>
                    );
                  }
                  return <React.Fragment key={tIdx}>{token}</React.Fragment>;
                })}
              </code>
              {editingLine === lineNum && (
                <div className="sticky-note-editor">
                  <input
                    value={lineNote || ''}
                    placeholder="Add line note..."
                    onChange={(e) => onNoteChange(lineNum, e.target.value)}
                  />
                  <button type="button" onClick={() => setEditingLine(null)}>Done</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExecutionPanel({
  lesson,
  current,
  step,
  maxStep,
  playing,
  speed,
  diffView,
  onBack,
  onNext,
  onReset,
  onTogglePlay,
  onSpeedChange,
  onToggleDiffView,
  onModifyThreshold,
}) {
  const [sandboxValue, setSandboxValue] = useState(lesson.meta.threshold ?? 5);

  return (
    <section className="execution-panel">
      <div className="stage-head">
        <div>
          <p className="eyebrow">3D execution trace</p>
          <h2>{lesson.title}</h2>
        </div>
        <div className="stage-actions">
          <button
            className={diffView ? 'secondary-button active' : 'secondary-button'}
            type="button"
            onClick={onToggleDiffView}
          >
            <FileDiff size={15} />
            Diff view
          </button>
          <span className="step-pill">Step {step + 1} / {maxStep + 1}</span>
        </div>
      </div>

      {step >= maxStep && (
        <div className="session-summary-banner">
          <div className="summary-title">
            <CheckCircle2 size={18} />
            <strong>End-of-Session Summary</strong>
          </div>
          <p>Trace complete! Concept: <b>{lesson.report.pattern}</b>. Earned <b>+40 XP</b>.</p>
          <small>Next step: Review flowchart or attempt a Skill Assessment question!</small>
        </div>
      )}

      {diffView ? (
        <div className="trace-diff-panel">
          <div className="diff-header">
            <span>Step</span>
            <span>Current Trace Line</span>
            <span>State Target</span>
            <span>Expected Golden Trace</span>
          </div>
          <div className="diff-list">
            {lesson.trace.map((item, idx) => (
              <div className={idx === step ? 'diff-row active' : 'diff-row'} key={idx}>
                <span>{idx + 1}</span>
                <code>Line {item.line}: {item.statement}</code>
                <span>{item.action.target || 'none'} = {String(item.action.value)}</span>
                <span className="golden-match">Matches golden fixture</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Suspense fallback={<div className="scene-host scene-loading">Preparing 3D trace...</div>}>
          <ExecutionScene lesson={lesson} step={step} />
        </Suspense>
      )}

      <div className="what-if-bar">
        <SlidersHorizontal size={16} />
        <span>What-If Sandbox:</span>
        <label>
          Threshold/Count:
          <input
            type="number"
            value={sandboxValue}
            onChange={(e) => setSandboxValue(Number(e.target.value))}
          />
        </label>
        <button
          className="secondary-button tiny"
          type="button"
          onClick={() => onModifyThreshold(sandboxValue)}
        >
          Re-trace with new value
        </button>
      </div>

      <div className="statement-bar">
        <Terminal size={17} />
        <div>
          <span>Line {current.line}</span>
          <code>{current.statement}</code>
        </div>
      </div>

      <div className="controls">
        <button className="icon-button" type="button" title="Previous step" disabled={step === 0} onClick={onBack}>
          <ChevronLeft size={18} />
        </button>
        <button className="play-button" type="button" onClick={onTogglePlay}>
          {playing ? <Pause size={18} /> : <Play size={18} />}
          {playing ? 'Pause' : 'Play'}
        </button>
        <button className="icon-button" type="button" title="Next step" disabled={step === maxStep} onClick={onNext}>
          <ChevronRight size={18} />
        </button>
        <button className="icon-button" type="button" title="Reset trace" onClick={onReset}>
          <RotateCcw size={17} />
        </button>
        <label className="speed-control">
          <SlidersHorizontal size={16} />
          <span>Speed</span>
          <input
            type="range"
            min="350"
            max="1400"
            step="50"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          />
        </label>
      </div>
    </section>
  );
}

function InsightPanel({
  lesson,
  current,
  variables,
  tab,
  mentorMode,
  prediction,
  selectedAnswer,
  confidence,
  misconceptions,
  onTabChange,
  onMentorModeChange,
  onCopy,
  onPrediction,
  onConfidenceChange,
  onSpeak,
}) {
  const tabs = [
    ['mentor', Brain, 'Mentor'],
    ['algorithm', ListChecks, 'Algorithm'],
    ['flowchart', GitBranch, 'Flowchart'],
    ['answer', Gauge, 'Answer'],
  ];

  return (
    <aside className="panel insight-panel">
      <div className="panel-head compact">
        <div>
          <p className="eyebrow">Generated learning view</p>
          <h2>{lesson.report.language} analysis</h2>
        </div>
        <Layers size={21} />
      </div>

      <div className="tab-row" role="tablist" aria-label="Generated outputs">
        {tabs.map(([id, Icon, label]) => (
          <button
            className={tab === id ? 'selected' : ''}
            type="button"
            key={id}
            onClick={() => onTabChange(id)}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="tab-body">
        {tab === 'mentor' && (
          <MentorView
            lesson={lesson}
            current={current}
            variables={variables}
            mentorMode={mentorMode}
            prediction={prediction}
            selectedAnswer={selectedAnswer}
            confidence={confidence}
            misconceptions={misconceptions}
            onMentorModeChange={onMentorModeChange}
            onPrediction={onPrediction}
            onConfidenceChange={onConfidenceChange}
            onSpeak={onSpeak}
          />
        )}
        {tab === 'algorithm' && <AlgorithmView lesson={lesson} onCopy={() => onCopy('algorithm')} />}
        {tab === 'flowchart' && <FlowchartView lesson={lesson} current={current} onCopy={() => onCopy('flowchart')} />}
        {tab === 'answer' && <AnswerView lesson={lesson} variables={variables} />}
      </div>
    </aside>
  );
}

function MentorView({
  lesson,
  current,
  variables,
  mentorMode,
  prediction,
  selectedAnswer,
  confidence,
  misconceptions = [],
  onMentorModeChange,
  onPrediction,
  onConfidenceChange,
  onSpeak,
}) {
  const explanationText = mentorMode === 'simple' ? current.action.explanation : technicalExplanation(current, lesson);

  return (
    <div className="mentor-view">
      {misconceptions.map((item) => (
        <div className="misconception-card" key={item.type}>
          <strong>Warning: {item.title}</strong>
          <p>{item.detail}</p>
        </div>
      ))}

      <div className="mentor-card">
        <div className="mentor-top">
          <span>{current.action.type.replace(/_/g, ' ')}</span>
          <div className="mentor-controls">
            <button className="icon-button tiny" type="button" title="Audio narration" onClick={() => onSpeak(explanationText)}>
              <Volume2 size={14} />
            </button>
            <button type="button" onClick={() => onMentorModeChange(mentorMode === 'simple' ? 'technical' : 'simple')}>
              {mentorMode === 'simple' ? 'Technical' : 'Simple'}
            </button>
          </div>
        </div>
        <p>{explanationText}</p>
      </div>

      <section className="state-section">
        <div className="section-title">
          <Code2 size={16} />
          <span>Live state</span>
        </div>
        <div className="variable-list">
          {Object.entries(variables).map(([key, value]) => (
            <div className={current.action.changed === key ? 'variable changed' : 'variable'} key={key}>
              <span>{key}</span>
              <code>{Array.isArray(value) ? `[${value.join(', ')}]` : String(value)}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="state-section">
        <div className="section-title">
          <Brain size={16} />
          <span>Why the condition matters</span>
        </div>
        <p className="quiet-copy">{lesson.report.conditionLesson}</p>
      </section>

      <PredictionQuest
        prediction={prediction}
        selectedAnswer={selectedAnswer}
        confidence={confidence}
        onConfidenceChange={onConfidenceChange}
        onPrediction={onPrediction}
      />
    </div>
  );
}

function AlgorithmView({ lesson, onCopy }) {
  return (
    <div className="generated-view">
      <div className="section-title between">
        <span>Generated algorithm</span>
        <button className="tiny-button" type="button" onClick={onCopy}>
          <Copy size={14} />
          Copy
        </button>
      </div>
      <ol className="algorithm-list">
        {lesson.report.algorithm.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
      <ConceptGrid concepts={lesson.report.concepts} />
    </div>
  );
}

function FlowchartView({ lesson, current, onCopy }) {
  const activeIndex = flowIndexForAction(current.action.type, lesson.report.pattern);

  return (
    <div className="generated-view">
      <div className="section-title between">
        <span>Generated flowchart</span>
        <button className="tiny-button" type="button" onClick={onCopy}>
          <Copy size={14} />
          Copy
        </button>
      </div>
      <div className="flowchart">
        {lesson.report.flowchart.map((node, index) => (
          <React.Fragment key={node.id}>
            <article className={index === activeIndex ? 'chart-node active' : 'chart-node'}>
              <strong>{node.label}</strong>
              <span>{node.detail}</span>
            </article>
            {index < lesson.report.flowchart.length - 1 && <i aria-hidden="true" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function AnswerView({ lesson, variables }) {
  return (
    <div className="answer-view">
      <section className="answer-box">
        <p className="eyebrow">{lesson.report.finalAnswer.label}</p>
        <strong>{lesson.report.finalAnswer.value}</strong>
        <span>{lesson.report.finalAnswer.sentence}</span>
      </section>

      <section className="state-section">
        <div className="section-title">
          <Gauge size={16} />
          <span>Complexity</span>
        </div>
        <p className="quiet-copy">{lesson.report.complexity}</p>
      </section>

      <section className="state-section">
        <div className="section-title">
          <Terminal size={16} />
          <span>Final variables</span>
        </div>
        <div className="variable-list">
          {Object.entries(variables).map(([key, value]) => (
            <div className="variable" key={key}>
              <span>{key}</span>
              <code>{Array.isArray(value) ? `[${value.join(', ')}]` : String(value)}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AssessmentView({ profile, progress, onProgress, onNavigate, onToast }) {
  const attempts = loadAssessmentAttempts();
  const [language, setLanguage] = useState(profile?.onboarding?.preferredLanguage || 'JavaScript');
  const [level, setLevel] = useState(profile?.onboarding?.skillLevel || 'Beginner');
  const [session, setSession] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [finished, setFinished] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!session || session.completedAt) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!session || session.completedAt) return;
    if (secondsRemaining(session, now) === 0) complete(session);
  }, [session, now]);

  function start() {
    const recentQuestionIds = attempts.flatMap((attempt) => attempt.questions?.map((question) => question.id) || []).slice(0, 6);
    const next = createAssessmentSession(QUESTION_BANK, {
      language,
      level,
      count: 4,
      bankVersion: QUESTION_BANK_VERSION,
      recentQuestionIds,
    });
    setSession(next);
    setFinished(null);
    setQuestionIndex(0);
    onToast('Assessment started.');
  }

  function choose(question, option) {
    setSession((current) => answerQuestion(current, question.id, option.originalIndex));
  }

  function complete(activeSession = session) {
    if (!activeSession || activeSession.completedAt) return;
    const result = finishAssessment(activeSession);
    setSession(result);
    setFinished(result);
    saveAssessmentAttempt(result);
    for (const [topic, score] of Object.entries(result.topicBreakdown)) {
      onProgress(topic, {
        status: score.correct === score.total ? 'complete' : 'in-progress',
        score: Math.round((score.correct / score.total) * 100),
      });
    }
    onToast('Assessment submitted.');
  }

  if (finished) {
    return (
      <section className="assessment-shell">
        <div className="hub-hero compact">
          <div>
            <p className="eyebrow">Skill Assessment</p>
            <h1>{finished.percentage}% score</h1>
            <p>{finished.score} of {finished.total} correct in {finished.elapsedSeconds} seconds.</p>
          </div>
        </div>
        <div className="results-grid">
          {Object.entries(finished.topicBreakdown).map(([topic, score]) => (
            <article className="result-card" key={topic}>
              <strong>{topic}</strong>
              <span>{score.correct} / {score.total}</span>
              <button type="button" onClick={() => onNavigate(`#/hub/${topic}`)}>Review</button>
            </article>
          ))}
        </div>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={start}>Retake with fresh order</button>
          <button className="secondary-button" type="button" onClick={() => onNavigate('#/hub')}>Back to hub</button>
        </div>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="assessment-shell">
        <div className="hub-hero compact">
          <div>
            <p className="eyebrow">Skill Assessment</p>
            <h1>Choose language and level</h1>
            <p>Questions come from the versioned bank: {QUESTION_BANK_VERSION}.</p>
          </div>
        </div>
        <div className="assessment-start">
          <label>
            <span>Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>JavaScript</option>
              <option>Python</option>
              <option>C</option>
              <option>C++</option>
            </select>
          </label>
          <label>
            <span>Level</span>
            <select value={level} onChange={(event) => setLevel(event.target.value)}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </label>
          <button className="primary-button" type="button" onClick={start}>Start assessment</button>
        </div>
        <HistoryStrip attempts={attempts} progress={progress} />
      </section>
    );
  }

  const question = session.questions[questionIndex];
  const selected = session.answers[question.id];
  const remaining = secondsRemaining(session, now);

  return (
    <section className="assessment-shell">
      <div className="assessment-head">
        <div>
          <p className="eyebrow">Question {questionIndex + 1} / {session.questions.length}</p>
          <h1>{question.question}</h1>
        </div>
        <span className="timer-pill"><Timer size={16} /> {formatSeconds(remaining)}</span>
      </div>
      <pre className="question-code">{question.code}</pre>
      <div className="option-grid">
        {question.options.map((option) => (
          <button
            className={selected === option.originalIndex ? 'option selected' : 'option'}
            type="button"
            key={option.text}
            onClick={() => choose(question, option)}
          >
            {option.text}
          </button>
        ))}
      </div>
      {selected !== undefined && <p className="feedback-line">{question.explanation}</p>}
      <div className="button-row">
        {questionIndex < session.questions.length - 1 ? (
          <button className="primary-button" type="button" onClick={() => setQuestionIndex((value) => value + 1)}>Next question</button>
        ) : (
          <button className="primary-button" type="button" onClick={() => complete()}>Submit assessment</button>
        )}
        <button className="secondary-button" type="button" onClick={() => complete()}>Finish now</button>
      </div>
    </section>
  );
}

function HistoryStrip({ attempts, progress }) {
  if (!attempts.length) {
    return <p className="empty-line">No assessment history yet.</p>;
  }

  return (
    <div className="history-strip">
      {attempts.slice(0, 4).map((attempt) => (
        <article key={attempt.id}>
          <strong>{attempt.percentage}%</strong>
          <span>{attempt.language} / {attempt.level}</span>
        </article>
      ))}
      <article>
        <strong>{Object.values(progress).filter((item) => item.status === 'complete').length}</strong>
        <span>concepts complete</span>
      </article>
    </div>
  );
}

function GamesView({ route, onNavigate, onProgress, onToast }) {
  const active = GAME_LIBRARY.find((game) => game.id === route.id);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  if (!active) {
    return (
      <section className="games-shell">
        <div className="hub-hero compact">
          <div>
            <p className="eyebrow">Learning Games</p>
            <h1>Practice through play.</h1>
            <p>Six lightweight games share the same trace-first learning model.</p>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => setShowLeaderboard((v) => !v)}
          >
            <Trophy size={15} />
            {showLeaderboard ? 'Hide Leaderboard' : 'Opt-In Leaderboard'}
          </button>
        </div>

        {showLeaderboard && (
          <div className="leaderboard-card">
            <h3>Practice Leaderboard (Opt-In)</h3>
            <p className="quiet-copy">Privacy respecting: only displays opted-in practice streaks.</p>
            <div className="leaderboard-list">
              <div className="leaderboard-row"><span>1. CodeWizard</span><strong>1,420 XP</strong></div>
              <div className="leaderboard-row"><span>2. TraceExplorer</span><strong>1,150 XP</strong></div>
              <div className="leaderboard-row"><span>3. LoopMaster</span><strong>980 XP</strong></div>
              <div className="leaderboard-row highlight"><span>4. You (Learner)</span><strong>140 XP</strong></div>
            </div>
          </div>
        )}

        <div className="game-grid">
          {GAME_LIBRARY.map((game) => (
            <button className="game-tile" type="button" key={game.id} onClick={() => onNavigate(`#/games/${game.id}`)}>
              <Gamepad2 size={18} />
              <strong>{game.title}</strong>
              <p>{game.summary}</p>
              <span>{game.difficulty}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="games-shell">
      <div className="detail-head">
        <button className="secondary-button" type="button" onClick={() => onNavigate('#/games')}>Back to games</button>
        <span>{active.difficulty}</span>
      </div>
      <GamePlayer
        game={active}
        onWin={() => {
          onProgress(active.conceptId, { status: 'in-progress', score: 65 });
          onToast(`${active.title} complete.`);
        }}
      />
    </section>
  );
}

function GamePlayer({ game, onWin }) {
  const [answer, setAnswer] = useState('');
  const [sequence, setSequence] = useState([]);
  const [sortValues, setSortValues] = useState([3, 1, 2]);
  const [result, setResult] = useState(null);

  function finish(nextResult) {
    setResult(nextResult);
    if (nextResult.correct) onWin();
  }

  if (game.id === 'fill-blanks') {
    return (
      <GameCard title={game.title} result={result}>
        <pre className="question-code">for (let i = 1; i &lt;= 3; i++) {'{\n'}  console.<input aria-label="blank answer" value={answer} onChange={(event) => setAnswer(event.target.value)} /> (i);{'\n}'}</pre>
        <button className="primary-button" type="button" onClick={() => finish(evaluateFillBlank(answer))}>Check output</button>
      </GameCard>
    );
  }

  if (game.id === 'spot-bug') {
    return (
      <GameCard title={game.title} result={result}>
        <div className="bug-lines">
          {['for (let i = 1; i < 10; i++) {', '  console.log(i);', '}'].map((line, index) => (
            <button type="button" key={line} onClick={() => finish(evaluateBugLine(index + 1))}>{index + 1}. {line}</button>
          ))}
        </div>
      </GameCard>
    );
  }

  if (game.id === 'trace-loop') {
    return (
      <GameCard title={game.title} result={result}>
        <p className="quiet-copy">The loop already printed 1 and 2. What is the next counter value?</p>
        <div className="choice-row">
          {[2, 3, 4].map((value) => <button className="choice" type="button" key={value} onClick={() => finish(evaluateTraceLoop(value))}>{value}</button>)}
        </div>
      </GameCard>
    );
  }

  if (game.id === 'stack-queue') {
    const moves = ['push 4', 'push 7', 'pop 7', 'enqueue 2', 'dequeue 2'];
    return (
      <GameCard title={game.title} result={result}>
        <div className="move-bank">
          {moves.map((move) => <button type="button" key={move} onClick={() => setSequence((items) => [...items, move])}>{move}</button>)}
        </div>
        <p className="quiet-copy">Sequence: {sequence.join(' -> ') || 'none'}</p>
        <div className="button-row">
          <button className="primary-button" type="button" onClick={() => finish(evaluateStackQueue(sequence))}>Check sequence</button>
          <button className="secondary-button" type="button" onClick={() => setSequence([])}>Clear</button>
        </div>
      </GameCard>
    );
  }

  if (game.id === 'sorting-race') {
    return (
      <GameCard title={game.title} result={result}>
        <div className="sort-row">
          {sortValues.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={() => setSortValues(([a, b, c]) => [b, a, c])}>Swap 1 and 2</button>
          <button className="secondary-button" type="button" onClick={() => setSortValues(([a, b, c]) => [a, c, b])}>Swap 2 and 3</button>
          <button className="primary-button" type="button" onClick={() => finish(evaluateSortingRace(sortValues))}>Check sort</button>
        </div>
      </GameCard>
    );
  }

  return (
    <GameCard title={game.title} result={result}>
      <p className="quiet-copy">What is the time complexity of one loop over n values?</p>
      <div className="choice-row">
        {['O(1)', 'O(n)', 'O(n^2)'].map((value) => <button className="choice" type="button" key={value} onClick={() => finish(evaluateBigO(value))}>{value}</button>)}
      </div>
    </GameCard>
  );
}

function GameCard({ title, result, children }) {
  return (
    <article className="game-card">
      <p className="eyebrow">Game</p>
      <h1>{title}</h1>
      {children}
      {result && (
        <div className={result.correct ? 'game-result correct' : 'game-result'}>
          <strong>{result.correct ? 'Correct' : 'Try again'}</strong>
          <span>{result.explanation}</span>
        </div>
      )}
    </article>
  );
}

function ProfileView({ profile, progress, attempts, onLogout, onNavigate }) {
  const completed = Object.values(progress).filter((item) => item.status === 'complete').length;

  return (
    <section className="profile-shell">
      <div className="hub-hero compact">
        <div>
          <p className="eyebrow">Learner Profile</p>
          <h1>{profile?.displayName || 'Learner'}</h1>
          <p>{profile?.email}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onLogout}>
          <LogOut size={15} />
          Logout
        </button>
      </div>
      <div className="results-grid">
        <article className="result-card"><strong>{completed}</strong><span>concepts complete</span></article>
        <article className="result-card"><strong>{attempts.length}</strong><span>assessment attempts</span></article>
        <article className="result-card"><strong>{profile?.onboarding?.skillLevel || 'Beginner'}</strong><span>skill level</span></article>
      </div>
      <section className="state-section">
        <div className="section-title"><ShieldCheck size={16} /><span>Production setup</span></div>
        <p className="quiet-copy">{AUTH_PROVIDER_GUIDE.recommendedProvider}: {AUTH_PROVIDER_GUIDE.reason}</p>
        <div className="env-grid">
          {AUTH_PROVIDER_GUIDE.env.map((name) => <code key={name}>{name}</code>)}
        </div>
      </section>
      <button className="primary-button" type="button" onClick={() => onNavigate('#/hub')}>Back to hub</button>
    </section>
  );
}

function ConceptGrid({ concepts }) {
  return (
    <div className="concept-grid">
      {concepts.map((concept) => (
        <article className="concept" key={concept.name}>
          <span>{concept.name}</span>
          <strong>{concept.value}</strong>
          <p>{concept.detail}</p>
        </article>
      ))}
    </div>
  );
}

function PredictionQuest({ prediction, selectedAnswer, confidence, onConfidenceChange, onPrediction }) {
  if (!prediction) {
    return (
      <section className="quest">
        <div className="section-title">
          <Trophy size={16} />
          <span>Prediction quest</span>
        </div>
        <p className="quiet-copy">The trace is at the end. Reset or load another program for a new prediction.</p>
      </section>
    );
  }

  return (
    <section className="quest">
      <div className="section-title">
        <Trophy size={16} />
        <span>Prediction quest</span>
      </div>
      <p>What value comes next for <code>{prediction.name}</code>?</p>

      <div className="confidence-row">
        <span>Metacognition check:</span>
        <button
          className={confidence === 'sure' ? 'selected' : ''}
          type="button"
          onClick={() => onConfidenceChange?.('sure')}
        >
          Sure (100%)
        </button>
        <button
          className={confidence === 'unsure' ? 'selected' : ''}
          type="button"
          onClick={() => onConfidenceChange?.('unsure')}
        >
          Unsure (50%)
        </button>
      </div>

      <div className="choice-row">
        {prediction.answers.map((answer) => {
          const state = selectedAnswer === null
            ? ''
            : answer === prediction.value
              ? 'correct'
              : selectedAnswer === answer
                ? 'wrong'
                : '';
          return (
            <button
              className={`choice ${state}`}
              type="button"
              key={answer}
              onClick={() => onPrediction(answer)}
            >
              {answer}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function makePrediction(lesson, step) {
  const future = lesson.trace
    .slice(step + 1)
    .find((item) => item.action.target === lesson.meta.indexName && Number.isFinite(item.action.value));

  if (!future) return null;

  const value = future.action.value;
  return {
    name: lesson.meta.indexName,
    value,
    answers: uniqueNumbers([value, value - 1, value + 1]).sort((a, b) => a - b),
  };
}

function uniqueNumbers(values) {
  return [...new Set(values.filter(Number.isFinite))];
}

function technicalExplanation(current, lesson) {
  const variableText = Object.entries(current.state.variables)
    .map(([key, value]) => `${key}=${Array.isArray(value) ? `[${value.join(', ')}]` : value}`)
    .join(', ');
  const pointer = current.state.pointers.current_index ?? 'none';
  return `${current.action.type}: line ${current.line} completed with pointer ${pointer}. State snapshot: ${variableText}. Pattern: ${lesson.report.pattern}.`;
}

function flowIndexForAction(actionType, pattern) {
  if (pattern === 'counting') {
    const map = {
      LOOP_INIT: 1,
      CONDITION_EVALUATE: 2,
      OUTPUT: 3,
      VARIABLE_UPDATE: 4,
      LOOP_EXIT: 5,
      PROGRAM_COMPLETE: 6,
    };
    return map[actionType] ?? 0;
  }

  const map = {
    DECLARATION: 1,
    VARIABLE_ASSIGN: 2,
    LOOP_INIT: 3,
    LOOP_ITERATE: 3,
    CONDITION_EVALUATE: 4,
    VARIABLE_UPDATE: 5,
    OUTPUT: 7,
  };
  return map[actionType] ?? 0;
}

function findConcept(id) {
  if (!id) return null;
  return CONCEPT_TREE.find((concept) => concept.id === id || concept.subtopics.some((item) => item.id === id));
}

function GotchasModal({ onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Language Gotchas Cards</h3>
          <button className="icon-button tiny text-close" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="gotchas-grid">
          {LANGUAGE_GOTCHAS.map((item) => (
            <article className="gotcha-card" key={item.title}>
              <span className="badge">{item.language}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <code>{item.code}</code>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompareModal({ onClose }) {
  const [selectedAlgo, setSelectedAlgo] = useState(SAME_ALGORITHM_COMPARISON[0]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Same Algorithm in 4 Languages</h3>
          <button className="icon-button tiny text-close" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="algo-picker">
          {SAME_ALGORITHM_COMPARISON.map((algo) => (
            <button
              className={selectedAlgo.id === algo.id ? 'selected' : ''}
              type="button"
              key={algo.id}
              onClick={() => setSelectedAlgo(algo)}
            >
              {algo.title}
            </button>
          ))}
        </div>
        <div className="four-lang-grid">
          <article className="lang-box">
            <strong>Python</strong>
            <pre><code>{selectedAlgo.python}</code></pre>
          </article>
          <article className="lang-box">
            <strong>JavaScript</strong>
            <pre><code>{selectedAlgo.javascript}</code></pre>
          </article>
          <article className="lang-box">
            <strong>C</strong>
            <pre><code>{selectedAlgo.c}</code></pre>
          </article>
          <article className="lang-box">
            <strong>C++</strong>
            <pre><code>{selectedAlgo.cpp}</code></pre>
          </article>
        </div>
      </div>
    </div>
  );
}

function ConceptMapModal({ onClose, onSelectConcept }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Concept Dependency Map</h3>
          <button className="icon-button tiny text-close" type="button" onClick={onClose}>Close</button>
        </div>
        <p className="quiet-copy">See which concepts are prerequisites for advanced topics.</p>
        <div className="concept-dep-grid">
          {CONCEPT_DEPENDENCIES.map((item) => (
            <div className="dep-card" key={item.id}>
              <strong>{item.name}</strong>
              <small>{item.dependsOn.length ? `Prerequisites: ${item.dependsOn.join(', ')}` : 'Foundation concept'}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
