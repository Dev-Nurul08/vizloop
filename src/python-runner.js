import { buildAccumulationTrace } from './accumulation-trace.js';

const unsupported = 'This Python runner supports an array, numeric total, for i in range(len(array)), if value > threshold, and +=.';

export function tracePython(source) {
  const lines = source.split('\n');
  const arrayLine = lines.findIndex(line => /^\s*\w+\s*=\s*\[/.test(line));
  const totalLine = lines.findIndex(line => /^\s*\w+\s*=\s*-?\d+\s*$/.test(line));
  const loopLine = lines.findIndex(line => /^\s*for\s+\w+\s+in\s+range\(len\(\w+\)\):/.test(line));
  const ifLine = lines.findIndex(line => /^\s*if\s+\w+\[\w+\]\s*>\s*-?\d+/.test(line));
  const updateLine = lines.findIndex(line => /^\s*\w+\s*\+=\s*\w+\[\w+\]/.test(line));
  const outputLine = lines.findIndex(line => /^\s*print\(/.test(line));
  const arrayMatch = lines[arrayLine]?.match(/^\s*(\w+)\s*=\s*\[([^\]]*)\]/);
  const totalMatch = lines[totalLine]?.match(/^\s*(\w+)\s*=\s*(-?\d+)/);
  const loopMatch = lines[loopLine]?.match(/^\s*for\s+(\w+)\s+in\s+range\(len\((\w+)\)\):/);
  const ifMatch = lines[ifLine]?.match(/^\s*if\s+(\w+)\[(\w+)\]\s*>\s*(-?\d+)/);
  const updateMatch = lines[updateLine]?.match(/^\s*(\w+)\s*\+=\s*(\w+)\[(\w+)\]/);
  if (!arrayMatch || !totalMatch || !loopMatch || !ifMatch || !updateMatch) throw new Error(unsupported);

  const [, arrayName, rawValues] = arrayMatch;
  const [, totalName, rawTotal] = totalMatch;
  const [, indexName, loopArrayName] = loopMatch;
  const [, conditionArrayName, conditionIndexName, rawThreshold] = ifMatch;
  const [, updateTotalName, updateArrayName, updateIndexName] = updateMatch;
  if ([loopArrayName, conditionArrayName, updateArrayName].some(name => name !== arrayName) || [conditionIndexName, updateIndexName].some(name => name !== indexName) || updateTotalName !== totalName) throw new Error(unsupported);

  return buildAccumulationTrace({ lines, arrayLine, totalLine, loopLine, ifLine, updateLine, outputLine, arrayName, values: rawValues.split(',').map(value => Number(value.trim())), totalName, initialTotal: Number(rawTotal), indexName, threshold: Number(rawThreshold) });
}
