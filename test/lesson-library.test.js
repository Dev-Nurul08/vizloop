import assert from 'node:assert/strict';
import test from 'node:test';
import { getLessonTemplate } from '../src/lesson-library.js';
import { traceJavaScript } from '../src/js-runner.js';
import { tracePython } from '../src/python-runner.js';

test('every available lesson has a traceable JavaScript and Python template', () => {
  for (const topic of ['loops', 'arrays']) {
    const javascript = getLessonTemplate(topic, 'JavaScript');
    const python = getLessonTemplate(topic, 'Python');
    assert.ok(javascript.title);
    assert.ok(python.title);
    assert.equal(traceJavaScript(javascript.code).at(-1).action.type, 'OUTPUT');
    assert.equal(tracePython(python.code).at(-1).action.type, 'OUTPUT');
  }
});

test('an unknown topic falls back to the introductory lesson', () => {
  assert.equal(getLessonTemplate('unknown-topic', 'JavaScript').title, 'Filter high scores');
});
