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
        max_tokens: 1500,
        system,
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

    // The reply is the text blocks joined together.
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');

    // Pull out real source links. They appear in two places:
    //  1) citations attached to text blocks (the pages Claude actually used)
    //  2) web_search_tool_result blocks (everything the search returned)
    // We dedupe by URL and prefer the cited ones.
    const sources = [];
    const seen = new Set();
    const addSource = (url, title) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      sources.push({ url, title: title || url });
    };

    for (const block of (data.content || [])) {
      // Citations on text blocks
      if (block.type === 'text' && Array.isArray(block.citations)) {
        for (const c of block.citations) addSource(c.url, c.title);
      }
      // Raw search result blocks
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        for (const r of block.content) addSource(r.url, r.title);
      }
    }

    res.json({ reply: text, sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
