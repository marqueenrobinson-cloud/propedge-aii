// Models to try, in order. The first one is the lighter, faster model.
// If it is too slow, overloaded, or unavailable, the next one is tried.
// (gemini-3.8-flash alone was hanging for 60+ seconds on Google's side.)
// Change these lines when Google retires a model.
const MODELS = [
  { id: 'gemini-3.5-flash-lite', timeoutMs: 25000 },
  { id: 'gemini-3.8-flash', timeoutMs: 28000 },
];

// Ask one model, giving up after its time limit instead of hanging forever.
async function askModel(model, apiKey, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), model.timeoutMs);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Key goes in a header, not the web address, so it never lands in logs.
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    );
    const data = await response.json();
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

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

  const body = {
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    // Convert messages to Gemini format
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    // Gemini "thinks" before answering and that thinking counts against this
    // limit, so it needs plenty of room.
    generationConfig: { maxOutputTokens: 8192 },
  };

  let lastProblem = 'Gemini did not respond.';

  for (const model of MODELS) {
    let result;
    try {
      result = await askModel(model, apiKey, body);
    } catch (err) {
      // Timed out or the connection dropped: note it and try the next model.
      lastProblem = err.name === 'AbortError'
        ? `${model.id} took too long to answer.`
        : `${model.id} connection problem: ${err.message}`;
      console.error('[gemini]', lastProblem);
      continue;
    }

    const { response, data } = result;

    if (!response.ok) {
      const msg = data.error?.message || 'Gemini API error';
      const status = data.error?.status || '';

      // Only treat it as a bad key when Google actually says so.
      const invalidKey =
        /api key/i.test(msg) ||
        status === 'UNAUTHENTICATED' ||
        (response.status === 403 && status === 'PERMISSION_DENIED');
      if (invalidKey) return res.status(response.status).json({ error: msg, invalidKey: true });

      // Busy, rate-limited, or this model isn't available: try the next one.
      if ([404, 429, 500, 502, 503, 504].includes(response.status)) {
        lastProblem = `${model.id}: ${msg}`;
        console.error('[gemini]', response.status, lastProblem);
        continue;
      }

      // Anything else is a problem with the request itself. Retrying won't help.
      return res.status(response.status).json({ error: msg, invalidKey: false });
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
      if (data.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY') {
        return res.status(502).json({ error: 'Gemini declined to answer that one. Try rewording it.' });
      }
      lastProblem = `${model.id} returned an empty reply.`;
      console.error('[gemini]', lastProblem);
      continue;
    }

    // "model" tells the app which model actually answered.
    return res.json({ reply: text, model: model.id, truncated: candidate?.finishReason === 'MAX_TOKENS' });
  }

  // Every model failed. Send a clear message instead of letting Vercel time out.
  return res.status(503).json({
    error: `Gemini is overloaded or slow on Google's side right now. Tap "try again" in a minute, or switch to Claude or GPT. (${lastProblem})`,
  });
}
