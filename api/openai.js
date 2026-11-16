// Change this ONE line when OpenAI retires the model.
// HEADS UP: gpt-4o leaves the OpenAI API on January 14, 2027.
// Swap it for a current model before then (see platform.openai.com/docs/models).
const MODEL = 'gpt-4o';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Guard against empty or malformed requests so the function never crashes.
  const { messages, system } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages were sent.' });
  }

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
        model: MODEL,
        // max_completion_tokens is the current name for this setting. The old
        // name (max_tokens) is rejected by OpenAI's newer models.
        max_completion_tokens: 4096,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages,
        ],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.error?.message || 'OpenAI API error';
      return res.status(response.status).json({ error: msg, invalidKey: response.status === 401 });
    }

    const choice = data.choices?.[0];
    const text = (choice?.message?.content || '').trim();
    if (!text) {
      return res.status(502).json({ error: 'GPT returned an empty reply. Please try again.' });
    }

    res.json({ reply: text, truncated: choice?.finish_reason === 'length' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
