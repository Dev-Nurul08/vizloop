export function evaluateFillBlank(answer) {
  const normalized = String(answer).trim().replace(/\s+/g, '');
  const accepted = new Set(['log', 'console.log']);
  return {
    correct: accepted.has(normalized),
    expectedOutput: [1, 2, 3],
    explanation: 'The completed statement must send the current counter value to the output each time the loop runs.',
  };
}

export function evaluateBugLine(selectedLine) {
  const correctLine = 1;
  return {
    correct: Number(selectedLine) === correctLine,
    correctLine,
    fix: 'Change i < 10 to i <= 10 when the goal is to include 10.',
    explanation: 'The < operator stops before 10. Using <= lets the final value pass the condition.',
  };
}

export function evaluateTraceLoop(answer) {
  const expected = 3;
  return {
    correct: Number(answer) === expected,
    expected,
    explanation: 'After printing 1 and 2, the update step moves the counter to 3.',
  };
}

export function evaluateStackQueue(sequence) {
  const expected = ['push 4', 'push 7', 'pop 7', 'enqueue 2', 'dequeue 2'];
  const normalized = sequence.map((item) => String(item).trim().toLowerCase());
  return {
    correct: expected.every((item, index) => normalized[index] === item) && normalized.length === expected.length,
    expected,
    explanation: 'The stack removes the newest value first, while the queue removes the oldest value first.',
  };
}

export function evaluateSortingRace(values) {
  const expected = [1, 2, 3];
  return {
    correct: expected.every((value, index) => Number(values[index]) === value),
    expected,
    explanation: 'After comparing adjacent values and swapping larger-left pairs, the list becomes sorted.',
  };
}

export function evaluateBigO(answer) {
  return {
    correct: answer === 'O(n)',
    expected: 'O(n)',
    explanation: 'A single loop over n values grows linearly as the input size grows.',
  };
}
