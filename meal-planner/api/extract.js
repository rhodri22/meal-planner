// Vercel Serverless Function — proxies AI requests to Anthropic API.
// The API key stays server-side; the browser never sees it.
//
// Required: set ANTHROPIC_API_KEY in Vercel project Environment Variables.
// IMPORTANT: must be set for "Production" AND "Preview" environments
// (each Vercel branch deployment is a "Preview" — env vars don't inherit).

// Force Node.js runtime (not Edge). Edge runtime mimics Web Workers, which
// can cause Anthropic to reject the request as "browser-originated."
export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: { message: 'Method not allowed' } });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: {
        message: 'ANTHROPIC_API_KEY not set in Vercel environment variables. Add it under Project Settings → Environment Variables (make sure it applies to Production AND Preview environments), then redeploy.',
        diagnostic: 'env-missing',
      },
    });
  }

  if (apiKey.startsWith('VITE_')) {
    return res.status(500).json({
      error: {
        message: 'API key looks wrong. The env var must be named ANTHROPIC_API_KEY (no VITE_ prefix). VITE_ prefixed vars get exposed to the browser, which Anthropic rejects.',
        diagnostic: 'env-wrong-prefix',
      },
    });
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Explicit Node-ish UA so Anthropic doesn't classify as browser-origin
        'User-Agent': 'meal-planner-proxy/1.0 (+vercel-serverless)',
      },
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (e) {
    return res.status(500).json({
      error: { message: e.message || 'Proxy request failed', diagnostic: 'fetch-threw' },
    });
  }
}
