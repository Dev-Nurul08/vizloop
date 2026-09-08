export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const databaseConfigured = Boolean(process.env.DATABASE_URL || process.env.VITE_SUPABASE_URL);
  const authConfigured = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const sandboxConfigured = Boolean(process.env.SANDBOX_API_KEY);

  res.status(200).json({
    status: 'ok',
    service: 'vizloop-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: {
      database: databaseConfigured ? 'connected' : 'demo-local',
      auth: authConfigured ? 'provider-ready' : 'demo-local',
      sandbox: sandboxConfigured ? 'enabled' : 'constrained-ast-runners'
    }
  });
}
