export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, system } = req.body;

  // Prefer the key the user pasted in the browser; fall back to a server env var.
  const apiKey = req.headers['x-api-key'] || process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(401).json({ error: 'No OpenAI API key provided. Add your key to continue.' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: system },
          ...messages,
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.error?.message || 'OpenAI API error';
      return res.status(response.status).json({ error: msg, invalidKey: response.status === 401 });
    }

    const text = data.choices?.[0]?.message?.content || '';
    res.json({ reply: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
