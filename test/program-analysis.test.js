import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLesson,
  createLearningReport,
  detectLanguage,
  SAMPLE_PROGRAMS,
  WORKFLOW_PHASES,
} from '../src/program-analysis.js';

test('workflow is divided into exactly ten learning phases', () => {
  assert.equal(WORKFLOW_PHASES.length, 10);
  assert.deepEqual(WORKFLOW_PHASES.map((phase) => phase.title), [
    'Code intake',
    'Format scan',
    'Concept detection',
    'Trace build',
    '3D motion map',
    'Step mentor',
    'Algorithm draft',
    'Flowchart draft',
    'Prediction quest',
    'Final result',
  ]);
});

test('language detection chooses Python for range and print syntax', () => {
  assert.equal(detectLanguage('for i in range(1, 11):\n    print(i)'), 'Python');
  assert.equal(detectLanguage('for (let i = 1; i <= 10; i++) {\n  console.log(i);\n}'), 'JavaScript');
});

test('buildLesson generates a counting report with algorithm, flowchart, and final output', () => {
  const sample = SAMPLE_PROGRAMS.find((program) => program.id === 'print-1-10-js');
  const lesson = buildLesson(sample);

  assert.equal(lesson.report.pattern, 'counting');
  assert.equal(lesson.report.algorithm.at(-1), 'Final output: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10.');
  assert.equal(lesson.report.flowchart.at(-1).label, 'Final output');
  assert.equal(lesson.report.finalAnswer.value, '1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
});

test('createLearningReport explains accumulation programs', () => {
  const sample = SAMPLE_PROGRAMS.find((program) => program.id === 'filter-scores-js');
  const lesson = buildLesson(sample);
  const report = createLearningReport(lesson.trace, {
    code: lesson.code,
    language: lesson.language,
    title: lesson.title,
    meta: lesson.meta,
  });

  assert.equal(report.pattern, 'accumulation');
  assert.match(report.conditionLesson, /protects total/);
  assert.equal(report.finalAnswer.value, '22');
});
