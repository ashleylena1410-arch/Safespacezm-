/**
 * SafeSpaceZM — /api/claude.js
 * Vercel Serverless Function — Powered by Groq (FREE)
 *
 * No credit card needed. Get your free API key at:
 * https://console.groq.com → API Keys → Create API Key
 *
 * Deploy steps:
 *  1. Paste this file into api/claude.js on GitHub
 *  2. Go to Vercel → Settings → Environment Variables
 *  3. Add:  GROQ_API_KEY  =  your gsk_... key from Groq
 *  4. Redeploy — AI tools will be fully live!
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { message: 'Server config error: GROQ_API_KEY not set in Vercel environment variables.' }
    });
  }

  // ── Parse body ────────────────────────────────────────
  const { system, messages } = req.body || {};
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'Missing required field: messages (array).' } });
  }

  // ── Call Groq API ─────────────────────────────────────
  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages
        ],
        max_tokens: 1024,
        temperature: 0.7
      })
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('[SafeSpaceZM] Groq error:', data);
      return res.status(upstream.status).json({
        error: { message: data.error?.message || 'Groq API error.' }
      });
    }

    // ── Extract text ──────────────────────────────────
    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: { message: 'Empty response from Groq.' } });
    }

    // ── Return in same shape script.js expects ────────
    return res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error('[SafeSpaceZM] Fetch error:', err.message);
    return res.status(500).json({
      error: { message: 'Failed to reach Groq API: ' + err.message }
    });
  }
}
  
