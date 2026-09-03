export const DEFAULT_TIME_LIMIT_SECONDS = 8 * 60;

export function selectQuestions(questionBank, { language, level, count = 5, recentQuestionIds = [] } = {}) {
  const exact = questionBank.filter(
    (question) =>
      (!language || question.language === language) &&
      (!level || question.level === level) &&
      !recentQuestionIds.includes(question.id),
  );
  const fallback = questionBank.filter((question) => !recentQuestionIds.includes(question.id));
  return deterministicShuffle(exact.length ? exact : fallback).slice(0, count);
}

export function createAssessmentSession(questionBank, options = {}) {
  const startedAt = options.now ?? Date.now();
  const questions = selectQuestions(questionBank, options).map((question) => ({
    id: question.id,
    language: question.language,
    level: question.level,
    topic: question.topic,
    question: question.question,
    code: question.code,
    explanation: question.explanation,
    options: question.options.map((text, originalIndex) => ({
      text,
      originalIndex,
    })),
    correctOptionIndex: question.correctOptionIndex,
  }));

  return {
    id: `attempt-${startedAt}`,
    bankVersion: options.bankVersion || 'local-bank',
    language: options.language || 'Mixed',
    level: options.level || 'Mixed',
    startedAt,
    timeLimitSeconds: options.timeLimitSeconds || DEFAULT_TIME_LIMIT_SECONDS,
    questions: questions.map((question, index) => ({
      ...question,
      options: deterministicShuffle(question.options, `${question.id}-${startedAt}-${index}`),
    })),
    answers: {},
    answerEvents: [],
    completedAt: null,
  };
}

export function answerQuestion(session, questionId, originalIndex, now = Date.now()) {
  if (session.completedAt) return session;

  return {
    ...session,
    answers: {
      ...session.answers,
      [questionId]: originalIndex,
    },
    answerEvents: [
      ...session.answerEvents,
      {
        questionId,
        originalIndex,
        answeredAt: now,
        secondsFromStart: Math.max(0, Math.round((now - session.startedAt) / 1000)),
      },
    ],
  };
}

export function finishAssessment(session, now = Date.now()) {
  const completedAt = session.completedAt || now;
  const scored = scoreAssessment({ ...session, completedAt });
  return {
    ...session,
    completedAt,
    score: scored.score,
    total: scored.total,
    percentage: scored.percentage,
    topicBreakdown: scored.topicBreakdown,
    weakTopics: scored.weakTopics,
    elapsedSeconds: scored.elapsedSeconds,
  };
}

export function scoreAssessment(session) {
  const topicBreakdown = {};
  let score = 0;

  for (const question of session.questions) {
    const selected = session.answers[question.id];
    const correct = selected === question.correctOptionIndex;
    if (correct) score += 1;

    if (!topicBreakdown[question.topic]) {
      topicBreakdown[question.topic] = { correct: 0, total: 0 };
    }
    topicBreakdown[question.topic].total += 1;
    if (correct) topicBreakdown[question.topic].correct += 1;
  }

  const total = session.questions.length;
  const weakTopics = Object.entries(topicBreakdown)
    .filter(([, value]) => value.correct / value.total < 0.7)
    .map(([topic]) => topic);

  return {
    score,
    total,
    percentage: total ? Math.round((score / total) * 100) : 0,
    topicBreakdown,
    weakTopics,
    elapsedSeconds: session.completedAt
      ? Math.max(0, Math.round((session.completedAt - session.startedAt) / 1000))
      : 0,
  };
}

export function secondsRemaining(session, now = Date.now()) {
  const elapsed = Math.max(0, Math.round((now - session.startedAt) / 1000));
  return Math.max(0, session.timeLimitSeconds - elapsed);
}

export function formatSeconds(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function deterministicShuffle(items, seed = 'vizloop') {
  const next = [...items];
  let value = stringHash(seed);

  for (let index = next.length - 1; index > 0; index -= 1) {
    value = (value * 1664525 + 1013904223) % 4294967296;
    const swapIndex = value % (index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function stringHash(value) {
  return String(value)
    .split('')
    .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}
