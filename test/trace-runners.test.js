import assert from 'node:assert/strict';
import test from 'node:test';
import { traceJavaScript } from '../src/js-runner.js';
import { tracePython } from '../src/python-runner.js';

const javascript = `const scores = [3, 8, 12];
let total = 0;
for (let i = 0; i < scores.length; i++) {
  if (scores[i] > 5) {
    total += scores[i];
  }
}
console.log(total);`;

const python = `scores = [3, 8, 12]
total = 0
for i in range(len(scores)):
    if scores[i] > 5:
        total += scores[i]
print(total)`;

function assertUniversalTraceProtocol(trace) {
  for (const item of trace) {
    assert.equal(typeof item.step, 'number');
    assert.equal(typeof item.line, 'number');
    assert.equal(typeof item.statement, 'string');
    assert.equal(typeof item.state.variables, 'object');
    assert.equal(typeof item.state.pointers, 'object');
    assert.equal(typeof item.state.dataStructures, 'object');
    assert.equal(typeof item.action.type, 'string');
    assert.equal(typeof item.action.explanation, 'string');
  }
}

for (const [language, runner, source] of [['JavaScript', traceJavaScript, javascript], ['Python', tracePython, python]]) {
  test(`${language} runner emits a valid final trace step`, () => {
    const trace = runner(source);
    const finalStep = trace.at(-1);
    assert.ok(trace.length > 3);
    assert.equal(finalStep.action.type, 'OUTPUT');
    assert.equal(finalStep.action.value, 20);
    assert.equal(finalStep.state.variables.total, 20);
    assert.ok(finalStep.step > 0);
    assert.ok(finalStep.line > 0);
    assertUniversalTraceProtocol(trace);
  });
}

test('runners reject unsupported source without evaluating it', () => {
  assert.throws(() => traceJavaScript('console.log("hello")'), /starter runner/);
  assert.throws(() => tracePython('print("hello")'), /Python runner/);
});

test('runners reject non-numeric values in a supported loop shape', () => {
  assert.throws(() => traceJavaScript(`const scores = [4, nope];
let total = 0;
for (let i = 0; i < scores.length; i++) {
  if (scores[i] > 5) { total += scores[i]; }
}`), /finite numeric values/);
  assert.throws(() => tracePython(`scores = [4, nope]
total = 0
for i in range(len(scores)):
    if scores[i] > 5:
        total += scores[i]`), /finite numeric values/);
});

test('JavaScript runner traces a simple counter print loop', () => {
  const trace = traceJavaScript(`for (let i = 1; i <= 10; i++) {
  console.log(i);
}`);

  assert.equal(trace.at(0).action.type, 'LOOP_INIT');
  assert.equal(trace.at(-1).action.type, 'PROGRAM_COMPLETE');
  assert.deepEqual(trace.at(-1).action.value, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(trace.at(-1).state.variables.output.length, 10);
  assertUniversalTraceProtocol(trace);
});

test('Python runner traces a simple range print loop', () => {
  const trace = tracePython(`for i in range(1, 11):
    print(i)`);

  assert.equal(trace.at(0).action.type, 'LOOP_INIT');
  assert.equal(trace.at(-1).action.type, 'PROGRAM_COMPLETE');
  assert.deepEqual(trace.at(-1).action.value, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(trace.at(-1).state.variables.output.length, 10);
  assertUniversalTraceProtocol(trace);
});
