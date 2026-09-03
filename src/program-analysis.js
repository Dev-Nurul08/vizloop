import { traceJavaScript } from './js-runner.js';
import { tracePython } from './python-runner.js';
import { toDisplayStep } from './trace-protocol.js';

export const WORKFLOW_PHASES = [
  {
    title: 'Code intake',
    detail: 'The learner adds a program and chooses or auto-detects the language.',
  },
  {
    title: 'Format scan',
    detail: 'VizLoop checks the code shape without running unsafe arbitrary source.',
  },
  {
    title: 'Concept detection',
    detail: 'The analyzer identifies loops, conditions, variables, arrays, and output.',
  },
  {
    title: 'Trace build',
    detail: 'Every important statement becomes a numbered execution snapshot.',
  },
  {
    title: '3D motion map',
    detail: 'The current value moves through a visual path so execution feels tangible.',
  },
  {
    title: 'Step mentor',
    detail: 'Each step gets a beginner explanation and a technical explanation.',
  },
  {
    title: 'Algorithm draft',
    detail: 'The program is rewritten as clean human-readable steps.',
  },
  {
    title: 'Flowchart draft',
    detail: 'The same logic becomes a start-to-finish decision diagram.',
  },
  {
    title: 'Prediction quest',
    detail: 'Learners guess the next value before revealing the answer.',
  },
  {
    title: 'Final result',
    detail: 'VizLoop shows the exact output and explains why that result happened.',
  },
];

export const SAMPLE_PROGRAMS = [
  {
    id: 'print-1-10-js',
    title: 'Print 1 to 10',
    language: 'JavaScript',
    topic: 'loops',
    code: `for (let i = 1; i <= 10; i++) {
  console.log(i);
}`,
  },
  {
    id: 'filter-scores-js',
    title: 'Filter high scores',
    language: 'JavaScript',
    topic: 'conditions',
    code: `const scores = [4, 7, 2, 9, 6];
let total = 0;

for (let i = 0; i < scores.length; i++) {
  if (scores[i] > 5) {
    total += scores[i];
  }
}

console.log(total);`,
  },
  {
    id: 'priority-orders-py',
    title: 'Priority orders',
    language: 'Python',
    topic: 'arrays',
    code: `orders = [12, 28, 8, 35, 22]
revenue = 0

for index in range(len(orders)):
    if orders[index] > 20:
        revenue += orders[index]

print(revenue)`,
  },
  {
    id: 'print-1-10-py',
    title: 'Print 1 to 10',
    language: 'Python',
    topic: 'loops',
    code: `for i in range(1, 11):
    print(i)`,
  },
];

const traceByLanguage = {
  JavaScript: traceJavaScript,
  Python: tracePython,
};

export function detectLanguage(source, preferred = 'JavaScript') {
  const code = source.trim();
  if (/^\s*for\s+\w+\s+in\s+range\(/m.test(code) || /^\s*print\(/m.test(code)) return 'Python';
  if (/console\.log|(?:const|let|var)\s+\w+\s*=|for\s*\(/.test(code)) return 'JavaScript';
  return preferred;
}

export function buildLesson({ language = 'JavaScript', code, title = 'Custom program' }) {
  const detectedLanguage = detectLanguage(code, language);
  const runner = traceByLanguage[detectedLanguage] || traceJavaScript;
  const trace = runner(code);
  const meta = getTraceMeta(trace);
  const report = createLearningReport(trace, {
    code,
    language: detectedLanguage,
    title,
    meta,
  });

  return {
    title,
    language: detectedLanguage,
    code,
    trace,
    steps: trace.map(toDisplayStep),
    meta,
    report,
  };
}

export function getTraceMeta(trace) {
  const firstDataStep = trace.find((item) => Object.keys(item.state.dataStructures).length > 0);
  const arrayName = firstDataStep ? Object.keys(firstDataStep.state.dataStructures)[0] : null;
  const totalAction = trace.find((item) => item.action.type === 'VARIABLE_ASSIGN');
  const updateAction = trace.find((item) => item.action.type === 'VARIABLE_UPDATE' && item.action.target !== 'output');
  const loopAction = trace.find((item) => ['LOOP_INIT', 'LOOP_ITERATE'].includes(item.action.type));
  const conditionAction = trace.find((item) => item.action.type === 'CONDITION_EVALUATE');
  const last = trace[trace.length - 1];
  const output = Array.isArray(last?.state.variables.output) ? last.state.variables.output : null;

  return {
    arrayName,
    totalName: totalAction?.action.target || (arrayName ? updateAction?.action.target : null),
    indexName: loopAction?.action.target || updateAction?.action.target || 'i',
    threshold: conditionAction?.action.threshold ?? null,
    finalTarget: last?.action.target || 'output',
    output,
  };
}

export function createLearningReport(trace, { code, language, title, meta = getTraceMeta(trace) } = {}) {
  const pattern = meta.arrayName ? 'accumulation' : 'counting';
  const concepts = createConcepts(trace, pattern, meta);
  const algorithm = pattern === 'accumulation' ? accumulationAlgorithm(trace, meta) : countingAlgorithm(trace, meta);
  const flowchart = pattern === 'accumulation' ? accumulationFlowchart(meta) : countingFlowchart(meta);
  const finalAnswer = createFinalAnswer(trace, pattern, meta);
  const complexity = pattern === 'accumulation'
    ? 'Time: O(n), because each array item is checked once. Space: O(1), because only a few variables are updated.'
    : 'Time: O(n), because the loop prints one value per count. Space: O(n) in VizLoop only because we keep the displayed output list.';

  return {
    title: title || 'Custom program',
    language: language || 'JavaScript',
    pattern,
    lineCount: code?.split('\n').length || 0,
    stepCount: trace.length,
    concepts,
    algorithm,
    flowchart,
    finalAnswer,
    complexity,
    conditionLesson: conditionLesson(pattern, meta),
  };
}

function createConcepts(trace, pattern, meta) {
  const actionTypes = new Set(trace.map((item) => item.action.type));
  const base = [
    {
      name: 'Loop',
      value: meta.indexName,
      detail: pattern === 'counting'
        ? 'Repeats while the counter condition stays true.'
        : 'Visits each array position one by one.',
    },
    {
      name: 'Condition',
      value: meta.threshold === null ? 'none' : String(meta.threshold),
      detail: pattern === 'counting'
        ? 'Controls when the loop stops.'
        : 'Decides whether the current value should be included.',
    },
    {
      name: 'State',
      value: actionTypes.has('VARIABLE_UPDATE') ? 'changes' : 'reads',
      detail: 'Variables are captured after every important statement.',
    },
    {
      name: 'Output',
      value: meta.finalTarget,
      detail: 'The final panel shows exactly what the user would see.',
    },
  ];

  if (meta.arrayName) {
    base.splice(1, 0, {
      name: 'Array',
      value: meta.arrayName,
      detail: 'The visualizer turns list values into movable blocks.',
    });
  }

  return base;
}

function accumulationAlgorithm(trace, meta) {
  const values = getArrayValues(trace, meta.arrayName);
  const final = trace[trace.length - 1]?.action.value;

  return [
    `Create ${meta.arrayName} with values [${values.join(', ')}].`,
    `Set ${meta.totalName} to its starting value.`,
    `Start ${meta.indexName} at 0 and visit each value in ${meta.arrayName}.`,
    `Check whether ${meta.arrayName}[${meta.indexName}] is greater than ${meta.threshold}.`,
    `If the condition is true, add that value into ${meta.totalName}.`,
    `Move ${meta.indexName} to the next position and repeat the check.`,
    `When no items remain, print ${meta.totalName}. Final answer: ${final}.`,
  ];
}

function countingAlgorithm(trace, meta) {
  const first = trace.find((item) => item.action.type === 'LOOP_INIT');
  const condition = trace.find((item) => item.action.type === 'CONDITION_EVALUATE');
  const finalValues = trace[trace.length - 1]?.action.value || [];

  return [
    `Set ${meta.indexName} to ${first?.action.value}.`,
    `Check the loop condition: ${condition?.action.target}.`,
    `If it is true, run the loop body.`,
    `Print the current value of ${meta.indexName}.`,
    `Increase ${meta.indexName} by 1.`,
    `Repeat until the condition becomes false.`,
    `Final output: ${finalValues.join(', ')}.`,
  ];
}

function accumulationFlowchart(meta) {
  return [
    { id: 'start', label: 'Start', detail: 'Program begins' },
    { id: 'data', label: `Load ${meta.arrayName}`, detail: 'Store list values' },
    { id: 'init', label: `Set ${meta.totalName}`, detail: 'Accumulator begins' },
    { id: 'loop', label: `More ${meta.arrayName}?`, detail: 'Choose next index' },
    { id: 'condition', label: `Value > ${meta.threshold}?`, detail: 'Decision point' },
    { id: 'update', label: `Add to ${meta.totalName}`, detail: 'Only when true' },
    { id: 'next', label: `Increase ${meta.indexName}`, detail: 'Advance loop' },
    { id: 'output', label: 'Print answer', detail: 'Show final result' },
  ];
}

function countingFlowchart(meta) {
  return [
    { id: 'start', label: 'Start', detail: 'Program begins' },
    { id: 'init', label: `Set ${meta.indexName}`, detail: 'Counter begins' },
    { id: 'condition', label: `Check ${meta.indexName}`, detail: `Compare with ${meta.threshold}` },
    { id: 'output', label: `Print ${meta.indexName}`, detail: 'Show current value' },
    { id: 'update', label: `Increase ${meta.indexName}`, detail: 'Move to next number' },
    { id: 'exit', label: 'Stop loop', detail: 'Condition is false' },
    { id: 'final', label: 'Final output', detail: 'All printed values' },
  ];
}

function createFinalAnswer(trace, pattern, meta) {
  const last = trace[trace.length - 1];
  if (pattern === 'counting') {
    const output = last.action.value || meta.output || [];
    return {
      label: 'Printed output',
      value: output.join(', '),
      sentence: `The program prints ${output.join(', ')} because the counter is printed once on every successful loop pass.`,
    };
  }

  const outputStep = [...trace].reverse().find((item) => item.action.type === 'OUTPUT') || last;
  return {
    label: outputStep.action.target || meta.totalName,
    value: String(outputStep.action.value),
    sentence: `The final value of ${outputStep.action.target || meta.totalName} is ${outputStep.action.value}. Only values that passed the condition changed the total.`,
  };
}

function conditionLesson(pattern, meta) {
  if (pattern === 'counting') {
    return `The condition matters because it is the loop's brake. While ${meta.indexName} passes the check, the body runs. When it fails, printing stops.`;
  }

  return `The condition matters because it protects ${meta.totalName}. Values that pass are added; values that fail are skipped, so the final answer changes when the threshold changes.`;
}

function getArrayValues(trace, arrayName) {
  if (!arrayName) return [];
  const dataStep = trace.find((item) => item.state.dataStructures[arrayName]);
  return dataStep?.state.dataStructures[arrayName]?.values || [];
}

export function detectMisconceptions(code, language) {
  const alerts = [];
  if (/i\s*<=\s*\w+\.length/.test(code)) {
    alerts.push({
      type: 'off-by-one',
      title: 'Off-by-One Warning',
      detail: 'In 0-indexed arrays, accessing index equal to length causes an out-of-bounds error. Use i < length instead of i <= length.',
    });
  }
  if (language === 'Python' && /range\(\s*\d+\s*,\s*\d+\s*\)/.test(code)) {
    alerts.push({
      type: 'range-stop',
      title: 'Python Range Exclusive Stop',
      detail: 'Python range(start, stop) excludes the stop value. For example, range(1, 10) loops up to 9.',
    });
  }
  return alerts;
}

export function generateWorksheetHTML(lesson) {
  const algoList = lesson.report.algorithm.map((step) => `<li>${escapeHtml(step)}</li>`).join('');
  const stepsList = lesson.trace.map((step, idx) => {
    const variables = formatTraceVariables(step.state?.variables);
    const pointers = formatTracePointers(step.state?.pointers);
    const stateSummary = pointers ? `${variables}; ${pointers}` : variables;

    return [
      '<tr>',
      `<td>${idx + 1}</td>`,
      `<td>Line ${escapeHtml(step.line)}: ${escapeHtml(step.statement || 'program state')}<br><strong>State:</strong> ${escapeHtml(stateSummary)}</td>`,
      `<td>${escapeHtml(step.action?.explanation || 'VizLoop captured this execution step.')}</td>`,
      '</tr>',
    ].join('');
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>VizLoop Worksheet - ${escapeHtml(lesson.title)}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #1e293b; }
        h1 { color: #2563eb; }
        pre { background: #f1f5f9; padding: 12px; border-radius: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        th { background: #e2e8f0; }
      </style>
    </head>
    <body>
      <h1>VizLoop Learning Worksheet: ${escapeHtml(lesson.title)}</h1>
      <p><strong>Language:</strong> ${escapeHtml(lesson.language)} | <strong>Total Steps:</strong> ${lesson.trace.length}</p>
      <h2>Source Code</h2>
      <pre><code>${escapeHtml(lesson.code)}</code></pre>
      <h2>Human-Readable Algorithm</h2>
      <ol>${algoList}</ol>
      <h2>Execution Trace Table</h2>
      <table>
        <thead><tr><th>Step</th><th>State Summary</th><th>Explanation</th></tr></thead>
        <tbody>${stepsList}</tbody>
      </table>
      <h2>Final Answer</h2>
      <p><strong>${escapeHtml(lesson.report.finalAnswer.label)}:</strong> ${escapeHtml(lesson.report.finalAnswer.value)}</p>
      <p>${escapeHtml(lesson.report.finalAnswer.sentence)}</p>
    </body>
    </html>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTraceVariables(variables = {}) {
  const entries = Object.entries(variables);
  if (!entries.length) return 'No tracked variables';
  return entries.map(([key, value]) => `${key}=${formatTraceValue(value)}`).join(', ');
}

function formatTracePointers(pointers = {}) {
  const entries = Object.entries(pointers);
  if (!entries.length) return '';
  return entries.map(([key, value]) => `${key}=${formatTraceValue(value)}`).join(', ');
}

function formatTraceValue(value) {
  if (value === undefined || value === null) return '-';
  if (Array.isArray(value)) return `[${value.join(', ')}]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
