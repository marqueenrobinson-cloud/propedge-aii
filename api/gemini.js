// Change this ONE line when Google retires the model.
// The old value (gemini-1.5-pro) was shut down by Google on September 29, 2025,
// which is why Gemini was returning "model not found".
const MODEL = 'gemini-3.8-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Guard against empty or malformed requests so the function never crashes.
  const { messages, system } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages were sent.' });
  }

  // Prefer the key the user pasted in the browser; fall back to a server env var.
  const apiKey = req.headers['x-api-key'] || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(401).json({ error: 'No Gemini API key provided. Add your key to continue.' });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    // Convert messages to Gemini format
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Key goes in a header, not the web address, so it never lands in logs.
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
        contents,
        // Newer Gemini models "think" before answering and that thinking
        // counts against this limit, so it needs plenty of room.
        generationConfig: { maxOutputTokens: 8192 },
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.error?.message || 'Gemini API error';
      // Only treat it as a bad key when Google actually says so. Before, ANY
      // 400 error wiped the saved key, even when the key was fine.
      const status = data.error?.status || '';
      const invalidKey =
        /api key/i.test(msg) ||
        status === 'UNAUTHENTICATED' ||
        (response.status === 403 && status === 'PERMISSION_DENIED');
      return res.status(response.status).json({ error: msg, invalidKey });
    }

    // A reply can come back in several parts. Join all of them and skip the
    // model's private "thinking" parts.
    const candidate = data.candidates?.[0];
    const text = (candidate?.content?.parts || [])
      .filter(p => typeof p.text === 'string' && !p.thought)
      .map(p => p.text)
      .join('')
      .trim();

    if (!text) {
      const why = data.promptFeedback?.blockReason || candidate?.finishReason;
      return res.status(502).json({
        error: why === 'SAFETY' || data.promptFeedback?.blockReason
          ? 'Gemini declined to answer that one. Try rewording it.'
          : 'Gemini returned an empty reply. Please try again.',
      });
    }

    res.json({ reply: text, truncated: candidate?.finishReason === 'MAX_TOKENS' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
