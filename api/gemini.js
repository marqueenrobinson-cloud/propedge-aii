export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system } = req.body;

  // Prefer the key the user pasted in the browser; fall back to a server env var.
  const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(401).json({ error: 'No Gemini API key provided. Add your key to continue.' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;

    // Convert messages to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 1024 },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.error?.message || 'Gemini API error';
      // Google returns 400/403 for a bad or unauthorized key, not 401.
      const invalidKey = response.status === 400 || response.status === 403;
      return res.status(response.status).json({ error: msg, invalidKey });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
