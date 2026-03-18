/**
 * The frontend-facing form of the Universal Trace Protocol. Every runner is
 * expected to return this shape so the visualizer stays language-agnostic.
 */
export function makeTraceStep({ step, line, statement, variables, index, arrayName, array, action }) {
  return {
    step,
    line,
    statement,
    state: {
      variables,
      pointers: index === null || index === undefined ? {} : { current_index: index },
      dataStructures: arrayName ? { [arrayName]: { type: 'array', values: array } } : {},
    },
    action,
  };
}

export function toDisplayStep(traceStep) {
  const variables = Object.fromEntries(Object.entries(traceStep.state.variables).map(([key, value]) => [key, value === undefined ? '—' : Array.isArray(value) ? `[${value.join(', ')}]` : String(value)]));
  const index = traceStep.state.pointers.current_index ?? null;
  return [traceStep.line, traceStep.action.type, traceStep.action.explanation, variables, index, traceStep.action.changed ?? null];
}
