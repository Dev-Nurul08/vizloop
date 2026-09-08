import { buildLesson, detectLanguage, SAMPLE_PROGRAMS, WORKFLOW_PHASES } from '../src/program-analysis.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      samples: SAMPLE_PROGRAMS,
      phases: WORKFLOW_PHASES
    });
  }

  if (req.method === 'POST') {
    try {
      const { code, language, title } = req.body || {};
      if (!code || typeof code !== 'string' || !code.trim()) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Missing or empty source code in payload'
        });
      }

      const detectedLang = detectLanguage(code, language || 'JavaScript');
      const lesson = buildLesson({
        code,
        language: detectedLang,
        title: title || 'Custom program'
      });

      return res.status(200).json({
        status: 'success',
        lesson
      });
    } catch (err) {
      return res.status(422).json({
        error: 'Unprocessable Entity',
        message: err.message || 'Failed to parse or trace code sample'
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
