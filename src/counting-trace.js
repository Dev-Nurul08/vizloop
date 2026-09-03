import { makeTraceStep } from './trace-protocol.js';

const compare = (value, boundary, comparator) => {
  if (comparator === '<=') return value <= boundary;
  if (comparator === '<') return value < boundary;
  throw new Error('Unsupported loop condition. Use < or <= for this starter trace.');
};

const conditionText = (indexName, comparator, boundary) => `${indexName} ${comparator} ${boundary}`;

export function buildCountingTrace({
  lines,
  loopLine,
  outputLine,
  indexName,
  initialValue,
  boundaryValue,
  comparator,
  outputKind = 'print',
}) {
  if (![initialValue, boundaryValue].every(Number.isFinite)) {
    throw new Error('Use finite numeric values for the loop start and loop condition.');
  }

  const trace = [];
  const output = [];
  let count = 0;
  const actionLabel = outputKind === 'console' ? 'console.log' : 'print';
  const maxSteps = 250;

  const add = (line, variables, index, action) => {
    trace.push(
      makeTraceStep({
        step: ++count,
        line: line + 1,
        statement: lines[line]?.trim() || '',
        variables,
        index,
        action,
      }),
    );
  };

  let current = initialValue;
  let guard = 0;

  add(loopLine, { [indexName]: current, output: [] }, current, {
    type: 'LOOP_INIT',
    target: indexName,
    value: current,
    changed: indexName,
    explanation: `The counter ${indexName} starts at ${current}. This is the loop's first value.`,
  });

  while (compare(current, boundaryValue, comparator)) {
    guard += 1;
    if (guard > maxSteps) {
      throw new Error('This loop creates too many trace steps for the classroom visualizer.');
    }

    add(loopLine, { [indexName]: current, output: [...output] }, current, {
      type: 'CONDITION_EVALUATE',
      target: conditionText(indexName, comparator, boundaryValue),
      result: true,
      threshold: boundaryValue,
      explanation: `${current} makes ${conditionText(indexName, comparator, boundaryValue)} true, so the loop body runs.`,
    });

    output.push(current);
    add(outputLine, { [indexName]: current, output: [...output] }, current, {
      type: 'OUTPUT',
      target: actionLabel,
      value: current,
      changed: 'output',
      explanation: `${actionLabel} sends ${current} to the output. The learner can now see one more printed value.`,
    });

    const next = current + 1;
    add(loopLine, { [indexName]: next, output: [...output] }, next, {
      type: 'VARIABLE_UPDATE',
      target: indexName,
      value: next,
      changed: indexName,
      explanation: `The update step increases ${indexName} by 1. Next the condition will be checked again.`,
    });
    current = next;
  }

  add(loopLine, { [indexName]: current, output: [...output] }, null, {
    type: 'LOOP_EXIT',
    target: conditionText(indexName, comparator, boundaryValue),
    value: [...output],
    result: false,
    explanation: `${current} makes ${conditionText(indexName, comparator, boundaryValue)} false, so the loop stops.`,
  });

  add(outputLine, { [indexName]: current, output: [...output] }, null, {
    type: 'PROGRAM_COMPLETE',
    target: 'output',
    value: [...output],
    changed: 'output',
    explanation: `The complete output is ${output.join(', ')}.`,
  });

  return trace;
}
