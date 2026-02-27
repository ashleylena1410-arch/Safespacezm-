/**
 * SafeSpaceZM — /api/claude.js
 * Vercel Serverless Function
 *
 * Securely proxies requests to the Anthropic Claude API.
 * Your API key lives in Vercel environment variables — never in the browser.
 *
 * Deploy steps:
 *  1. Push this repo to GitHub
 *  2. Import to Vercel (Framework: Other)
 *  3. Add env var  ANTHROPIC_API_KEY = sk-ant-api03-...
 *  4. Deploy — /api/claude is live automatically
 */

export default async function handler(req, res) {
  // ── CORS ──────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── Method guard ──────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method Not Allowed. Use POST.' } });
  }

  // ── API key check ─────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[SafeSpaceZM] ANTHROPIC_API_KEY is not set in environment variables.');
    return res.status(500).json({ error: { message: 'Server configuration error: API key missing.' } });
  }

  // ── Parse body ────────────────────────────────────────
  const { system, messages, max_tokens = 1024 } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'Missing required field: messages (array).' } });
  }

  // ── Build payload ─────────────────────────────────────
  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens,
    messages,
  };
  if (system && typeof system === 'string') payload.system = system;

  // ── Call Anthropic ────────────────────────────────────
  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('[SafeSpaceZM] Anthropic error:', data);
      return res.status(upstream.status).json({
        error: data.error || { message: 'Upstream API error.' },
      });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('[SafeSpaceZM] Fetch error:', err.message);
    return res.status(500).json({
      error: { message: 'Failed to reach Anthropic API: ' + err.message },
    });
  }
}
