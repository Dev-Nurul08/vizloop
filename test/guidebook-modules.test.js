import assert from 'node:assert/strict';
import test from 'node:test';
import {
  answerQuestion,
  createAssessmentSession,
  finishAssessment,
  formatSeconds,
  secondsRemaining,
  selectQuestions,
} from '../src/assessment-engine.js';
import {
  evaluateBigO,
  evaluateBugLine,
  evaluateFillBlank,
  evaluateSortingRace,
  evaluateStackQueue,
  evaluateTraceLoop,
} from '../src/game-engine.js';
import {
  AUTH_PROVIDER_GUIDE,
  CONCEPT_TREE,
  GAME_LIBRARY,
  QUESTION_BANK,
  QUESTION_BANK_VERSION,
} from '../src/product-content.js';
import { buildRoute, parseRoute } from '../src/routing.js';

test('learning hub is driven by one config tree with required concepts', () => {
  const ids = CONCEPT_TREE.map((concept) => concept.id);
  assert.deepEqual(ids, [
    'arrays',
    'loops',
    'stack',
    'queue',
    'linked-list',
    'trees',
    'graphs',
    'recursion',
    'sorting',
    'searching',
  ]);
  assert.ok(CONCEPT_TREE.every((concept) => concept.route === `#/hub/${concept.id}`));
});

test('routes preserve visualizer sample and trace step', () => {
  const hash = buildRoute('visualizer', 'print-1-10-js', 12);
  assert.equal(hash, '#/visualizer/print-1-10-js/step/12');
  assert.deepEqual(parseRoute(hash), {
    section: 'visualizer',
    id: 'print-1-10-js',
    stepIndex: 12,
    hash,
  });
});

test('assessment session randomizes display options but scores against stable original index', () => {
  const session = createAssessmentSession(QUESTION_BANK, {
    language: 'JavaScript',
    level: 'Beginner',
    bankVersion: QUESTION_BANK_VERSION,
    count: 2,
    now: 1000,
    timeLimitSeconds: 60,
  });
  const first = session.questions[0];
  const answered = answerQuestion(session, first.id, first.correctOptionIndex, 4000);
  const finished = finishAssessment(answered, 9000);

  assert.equal(session.bankVersion, QUESTION_BANK_VERSION);
  assert.equal(session.questions.length, 2);
  assert.equal(finished.score >= 1, true);
  assert.equal(finished.elapsedSeconds, 8);
  assert.equal(secondsRemaining(session, 11_000), 50);
  assert.equal(formatSeconds(50), '0:50');
  assert.equal(formatSeconds(125), '2:05');
});

test('assessment selection respects cooldown before fallback', () => {
  const recent = QUESTION_BANK.map((question) => question.id);
  const selected = selectQuestions(QUESTION_BANK, {
    language: 'JavaScript',
    level: 'Beginner',
    count: 3,
    recentQuestionIds: recent,
  });

  assert.equal(selected.length, 0);
});

test('game engine validates all six starter games', () => {
  assert.equal(GAME_LIBRARY.length, 6);
  assert.equal(evaluateFillBlank('log').correct, true);
  assert.equal(evaluateBugLine(1).correct, true);
  assert.equal(evaluateTraceLoop(3).correct, true);
  assert.equal(evaluateStackQueue(['push 4', 'push 7', 'pop 7', 'enqueue 2', 'dequeue 2']).correct, true);
  assert.equal(evaluateSortingRace([1, 2, 3]).correct, true);
  assert.equal(evaluateBigO('O(n)').correct, true);
});

test('provider guide documents the auth and backend environment shape', () => {
  assert.equal(AUTH_PROVIDER_GUIDE.recommendedProvider, 'Supabase Auth');
  assert.ok(AUTH_PROVIDER_GUIDE.env.includes('DATABASE_URL'));
  assert.ok(AUTH_PROVIDER_GUIDE.env.includes('VITE_SUPABASE_URL'));
});

test('extension datasets and misconception analyzers emit valid metadata and worksheets', async () => {
  const { GLOSSARY_DICTIONARY, LANGUAGE_GOTCHAS, SAME_ALGORITHM_COMPARISON, CONCEPT_DEPENDENCIES, BILINGUAL_STRINGS } = await import('../src/product-content.js');
  const { detectMisconceptions, generateWorksheetHTML, buildLesson } = await import('../src/program-analysis.js');

  assert.ok(GLOSSARY_DICTIONARY.for);
  assert.equal(LANGUAGE_GOTCHAS.length >= 4, true);
  assert.equal(SAME_ALGORITHM_COMPARISON.length >= 2, true);
  assert.equal(CONCEPT_DEPENDENCIES.length >= 10, true);
  assert.ok(BILINGUAL_STRINGS.en);
  assert.ok(BILINGUAL_STRINGS.es);
  assert.ok(BILINGUAL_STRINGS.hi);

  const jsMisconception = detectMisconceptions('for (let i = 0; i <= arr.length; i++)', 'JavaScript');
  assert.equal(jsMisconception.length, 1);
  assert.equal(jsMisconception[0].type, 'off-by-one');

  const pyMisconception = detectMisconceptions('for i in range(1, 10):', 'Python');
  assert.equal(pyMisconception.length, 1);
  assert.equal(pyMisconception[0].type, 'range-stop');

  const lesson = buildLesson({
    language: 'JavaScript',
    code: 'for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}',
    title: 'Test Worksheet',
  });
  const html = generateWorksheetHTML(lesson);
  assert.ok(html.includes('VizLoop Learning Worksheet'));
  assert.ok(html.includes('Test Worksheet'));
  assert.ok(html.includes('Line 1:'));
  assert.ok(html.includes('State:'));
  assert.ok(html.includes('&lt;='));
  assert.doesNotMatch(html, /undefined/);
});
