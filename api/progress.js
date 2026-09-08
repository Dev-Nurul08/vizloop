export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'success',
      storageMode: process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL ? 'database' : 'demo-local',
      message: 'Progress state endpoint ready for database sync.'
    });
  }

  if (req.method === 'POST') {
    const { userId = 'guest-user', progress = {} } = req.body || {};
    return res.status(200).json({
      status: 'success',
      syncedAt: new Date().toISOString(),
      userId,
      progress
    });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
