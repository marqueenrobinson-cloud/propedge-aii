export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system } = req.body;

  // Prefer the key the user pasted in the browser (sent as x-api-key);
  // fall back to a server env var if one is configured.
  const apiKey = req.headers['x-api-key'] || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(401).json({ error: 'No Anthropic API key provided. Add your key to continue.' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.error?.message || 'Claude API error';
      // 401 = bad/expired key; signal the client so it can prompt for a new one.
      return res.status(response.status).json({ error: msg, invalidKey: response.status === 401 });
    }

    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
