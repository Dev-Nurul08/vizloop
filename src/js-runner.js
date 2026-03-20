import { buildAccumulationTrace } from './accumulation-trace.js';

const unsupported = 'This starter runner supports an array, a numeric total, and a for/if accumulation loop.';

export function traceJavaScript(source) {
  const lines = source.split('\n');
  const arrayLine = lines.findIndex(line => /(?:const|let)\s+\w+\s*=\s*\[/.test(line));
  const totalLine = lines.findIndex(line => /(?:const|let)\s+\w+\s*=\s*-?\d+\s*;/.test(line));
  const loopLine = lines.findIndex(line => /for\s*\(\s*let\s+\w+\s*=/.test(line));
  const ifLine = lines.findIndex(line => /if\s*\(.*>\s*-?\d+/.test(line));
  const updateLine = lines.findIndex(line => /\w+\s*\+=\s*\w+\[\w+\]/.test(line));
  const outputLine = lines.findIndex(line => /console\.log/.test(line));
  const arrayMatch = lines[arrayLine]?.match(/(?:const|let)\s+(\w+)\s*=\s*\[([^\]]*)\]/);
  const totalMatch = lines[totalLine]?.match(/(?:const|let)\s+(\w+)\s*=\s*(-?\d+)/);
  const loopMatch = lines[loopLine]?.match(/for\s*\(\s*let\s+(\w+)\s*=\s*(\d+)\s*;\s*\1\s*<\s*(\w+)\.length\s*;\s*\1\+\+\s*\)/);
  const ifMatch = lines[ifLine]?.match(/if\s*\(\s*(\w+)\s*\[\s*(\w+)\s*\]\s*>\s*(-?\d+)/);
  const updateMatch = lines[updateLine]?.match(/(\w+)\s*\+=\s*(\w+)\s*\[\s*(\w+)\s*\]/);
  if (!arrayMatch || !totalMatch || !loopMatch || !ifMatch || !updateMatch) throw new Error(unsupported);

  const [, arrayName, rawValues] = arrayMatch;
  const [, totalName, rawTotal] = totalMatch;
  const [, indexName, rawIndex, loopArrayName] = loopMatch;
  const [, conditionArrayName, conditionIndexName, rawThreshold] = ifMatch;
  const [, updateTotalName, updateArrayName, updateIndexName] = updateMatch;
  if ([loopArrayName, conditionArrayName, updateArrayName].some(name => name !== arrayName) || [conditionIndexName, updateIndexName].some(name => name !== indexName) || updateTotalName !== totalName) throw new Error(unsupported);

  return buildAccumulationTrace({ lines, arrayLine, totalLine, loopLine, ifLine, updateLine, outputLine, arrayName, values: rawValues.split(',').map(value => Number(value.trim())), totalName, initialTotal: Number(rawTotal), indexName, initialIndex: Number(rawIndex), threshold: Number(rawThreshold) });
}
