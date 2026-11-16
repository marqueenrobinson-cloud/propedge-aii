// Change this ONE line when Anthropic retires the model.
// claude-sonnet-4-6 is supported until at least February 17, 2027.
const MODEL = 'claude-sonnet-4-6';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Guard against empty or malformed requests so the function never crashes.
  const { messages, system } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages were sent.' });
  }

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
        model: MODEL,
        // Room for a full answer. 1500 was cutting long replies off mid-sentence.
        max_tokens: 4096,
        ...(system ? { system } : {}),
        messages,
        // Web search lets Claude pull real, current information and cite real
        // links. max_uses caps searches per request to keep costs predictable.
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.error?.message || 'Claude API error';
      // 401 = bad/expired key; signal the client so it can prompt for a new one.
      return res.status(response.status).json({ error: msg, invalidKey: response.status === 401 });
    }

    const blocks = data.content || [];

    // When Claude cites sources it splits ONE sentence into several text
    // blocks. Join them with nothing in between — joining with a line break
    // was chopping sentences into separate lines.
    const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('').trim();

    // Sources: the pages Claude actually cited come first, then other search
    // results as filler. Capped so the list stays short.
    const MAX_SOURCES = 8;
    const sources = [];
    const seen = new Set();
    const addSource = (url, title) => {
      if (!url || seen.has(url) || sources.length >= MAX_SOURCES) return;
      seen.add(url);
      sources.push({ url, title: title || url });
    };

    // 1) cited pages
    for (const block of blocks) {
      if (block.type === 'text' && Array.isArray(block.citations)) {
        for (const c of block.citations) addSource(c.url, c.title);
      }
    }
    // 2) only if nothing was cited, show the top search results
    if (sources.length === 0) {
      for (const block of blocks) {
        if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
          for (const r of block.content) addSource(r.url, r.title);
        }
      }
    }

    if (!text) {
      return res.status(502).json({ error: 'Claude returned an empty reply. Please try again.' });
    }

    // Tell the app if the reply ran out of room so it can say so.
    const truncated = data.stop_reason === 'max_tokens' || data.stop_reason === 'pause_turn';

    res.json({ reply: text, sources, truncated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
