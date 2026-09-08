import { createAssessmentSession, finishAssessment } from '../src/assessment-engine.js';
import { QUESTION_BANK } from '../src/product-content.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { language = 'Mixed', level = 'Mixed', count = 5 } = req.query || {};
    const session = createAssessmentSession(QUESTION_BANK, {
      language,
      level,
      count: Number(count) || 5
    });

    return res.status(200).json({
      status: 'success',
      session
    });
  }

  if (req.method === 'POST') {
    try {
      const { session, now } = req.body || {};
      if (!session || !session.questions || !session.answers) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid assessment session object'
        });
      }

      const completed = finishAssessment(session, now || Date.now());
      return res.status(200).json({
        status: 'success',
        result: completed
      });
    } catch (err) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: err.message || 'Failed to score assessment'
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
