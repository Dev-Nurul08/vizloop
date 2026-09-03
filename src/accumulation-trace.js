import { makeTraceStep } from './trace-protocol.js';

export function buildAccumulationTrace({ lines, arrayLine, totalLine, loopLine, ifLine, updateLine, outputLine, arrayName, values, totalName, initialTotal, indexName, initialIndex = 0, threshold }) {
  if (values.some(value => !Number.isFinite(value)) || !Number.isFinite(initialTotal) || !Number.isFinite(threshold)) throw new Error('Use finite numeric values for the array, accumulator, and condition threshold.');

  let total = initialTotal, count = 0;
  const steps = [];
  const state = index => ({ [arrayName]: values, [totalName]: total, [indexName]: index });
  const add = (line, variables, index, action) => steps.push(makeTraceStep({ step: ++count, line: line + 1, statement: lines[line].trim(), variables, index, arrayName, array: values, action }));
  const itemName = arrayName.replace(/s$/, '') || 'item';

  add(arrayLine, { [arrayName]: values, [totalName]: undefined, [indexName]: undefined }, 0, { type: 'DECLARATION', target: arrayName, explanation: `${arrayName} is ready with ${values.length} values.` });
  add(totalLine, { [arrayName]: values, [totalName]: total, [indexName]: undefined }, 0, { type: 'VARIABLE_ASSIGN', target: totalName, value: total, changed: totalName, explanation: `We start the running ${totalName} at ${total}.` });

  for (let index = initialIndex; index < values.length; index += 1) {
    const first = index === initialIndex;
    add(loopLine, state(index), index, { type: first ? 'LOOP_INIT' : 'LOOP_ITERATE', target: indexName, value: index, changed: indexName, explanation: first ? `The loop begins at the first ${itemName}.` : 'Move to the next item.' });
    const passes = values[index] > threshold;
    add(ifLine, state(index), index, { type: 'CONDITION_EVALUATE', target: `${values[index]} > ${threshold}`, threshold, result: passes, explanation: passes ? `${values[index]} is greater than ${threshold} - this value qualifies.` : `${values[index]} is not greater than ${threshold}, so we skip it.` });
    if (passes) { total += values[index]; add(updateLine, state(index), index, { type: 'VARIABLE_UPDATE', target: totalName, value: total, changed: totalName, explanation: `Add ${values[index]} to our ${totalName}.` }); }
  }
  if (outputLine >= 0) add(outputLine, state(values.length), null, { type: 'OUTPUT', target: totalName, value: total, explanation: `The final ${totalName} is ${total}. Nice work tracing!` });
  return steps;
}
