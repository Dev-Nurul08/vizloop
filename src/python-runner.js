import { buildAccumulationTrace } from './accumulation-trace.js';
import { buildCountingTrace } from './counting-trace.js';

const unsupported =
  'This Python runner supports an array accumulation loop or a simple range loop that prints the counter.';

export function tracePython(source) {
  try {
    return traceAccumulationPython(source);
  } catch (error) {
    if (!String(error.message).includes('Python runner')) throw error;
  }

  return traceCountingPython(source);
}

function traceAccumulationPython(source) {
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

function traceCountingPython(source) {
  const lines = source.split('\n');
  const loopLine = lines.findIndex(line => /^\s*for\s+\w+\s+in\s+range\(/.test(line));
  const outputLine = lines.findIndex((line, index) => index > loopLine && /^\s*print\(/.test(line));
  const loopMatch =
    lines[loopLine]?.match(/^\s*for\s+(\w+)\s+in\s+range\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\):/) ||
    lines[loopLine]?.match(/^\s*for\s+(\w+)\s+in\s+range\(\s*(-?\d+)\s*\):/);
  const outputMatch = lines[outputLine]?.match(/^\s*print\(\s*(\w+)\s*\)/);

  if (!loopMatch || !outputMatch) throw new Error(unsupported);

  const indexName = loopMatch[1];
  const hasStart = loopMatch.length === 4;
  const initialValue = hasStart ? Number(loopMatch[2]) : 0;
  const stopValue = hasStart ? Number(loopMatch[3]) : Number(loopMatch[2]);
  const [, printedName] = outputMatch;
  if (printedName !== indexName) throw new Error(unsupported);

  return buildCountingTrace({
    lines,
    loopLine,
    outputLine,
    indexName,
    initialValue,
    boundaryValue: stopValue,
    comparator: '<',
    outputKind: 'print',
  });
}
