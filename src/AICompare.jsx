import { useState, useRef } from 'react'

/**
 * PropEdge AI — Ask All 3
 * Type one question, pick an expert, and Claude, GPT and Gemini all answer at
 * once so you can compare them side by side (stacked on a phone).
 *
 * It reuses the same /api routes and the same saved keys as the chat screens.
 * A model with no saved key is skipped and shows a reminder instead.
 */

const WAIT_LIMIT_MS = 65000 // the server gives up at 60s, so stop waiting just after

// Turn whatever came back from the server into a clear result for one card.
async function askOne(model, apiKey, agent, question, signal) {
  const started = Date.now()
  try {
    const res = await fetch(model.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify({
        messages: [{ role: 'user', content: question }],
        system: agent.persona,
      }),
      signal,
    })
    const raw = await res.text()
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      const timedOut = res.status === 504 || res.status === 502 || res.status === 408
      return {
        status: 'error',
        error: timedOut
          ? 'This one took too long and timed out.'
          : "The server didn't send a usable answer. Try again.",
        ms: Date.now() - started,
      }
    }
    if (data.invalidKey) {
      return { status: 'error', rejected: true, error: 'Your key was rejected (invalid or expired).', ms: Date.now() - started }
    }
    if (!data.reply) {
      return { status: 'error', error: data.error || 'No response received.', ms: Date.now() - started }
    }
    return {
      status: 'done',
      reply: data.reply,
      sources: data.sources || [],
      label: data.model || '',
      truncated: !!data.truncated,
      ms: Date.now() - started,
    }
  } catch (err) {
    return {
      status: 'error',
      error: err.name === 'AbortError' ? 'This one took too long. Try again.' : `Connection error: ${err.message}`,
      ms: Date.now() - started,
    }
  }
}

export default function AICompare({ models, agents, apiKeys, renderText, onKeyRejected }) {
  const [agentId, setAgentId] = useState(agents[0].id)
  const [question, setQuestion] = useState('')
  const [run, setRun] = useState(null) // { question, agentName, results: { [modelId]: result } }
  const [copied, setCopied] = useState('')
  const runId = useRef(0)

  const agent = agents.find((a) => a.id === agentId) || agents[0]
  const readyModels = models.filter((m) => apiKeys[m.id])
  const busy = run && Object.values(run.results).some((r) => r.status === 'loading')

  const ask = async () => {
    const q = question.trim()
    if (!q || busy || readyModels.length === 0) return
    const myRun = ++runId.current

    // Start every card: models with a key spin, the rest show a reminder.
    const initial = {}
    models.forEach((m) => {
      initial[m.id] = apiKeys[m.id] ? { status: 'loading' } : { status: 'nokey' }
    })
    setRun({ question: q, agentName: agent.name, results: initial })

    // Ask all of them at the same time. Each card fills in as its answer lands.
    await Promise.all(
      readyModels.map(async (m) => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), WAIT_LIMIT_MS)
        const result = await askOne(m, apiKeys[m.id], agent, q, controller.signal)
        clearTimeout(timer)
        if (result.rejected && onKeyRejected) onKeyRejected(m.id)
        // Ignore late answers from an older question.
        if (runId.current !== myRun) return
        setRun((prev) => (prev ? { ...prev, results: { ...prev.results, [m.id]: result } } : prev))
      })
    )
  }

  const copyText = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 1500)
    } catch {}
  }

  const copyAll = () => {
    if (!run) return
    const text = models
      .filter((m) => run.results[m.id]?.status === 'done')
      .map((m) => `${m.name}:\n${run.results[m.id].reply}`)
      .join('\n\n---\n\n')
    copyText('all', `Question: ${run.question}\n\n${text}`)
  }

  const anyDone = run && models.some((m) => run.results[m.id]?.status === 'done')

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={S.kicker}>PropEdge AI · Ask All 3</div>
        <h1 style={S.h1}>Ask All Three</h1>
        <p style={S.sub}>
          One question, three answers. Pick who should answer, then see how Claude, GPT and Gemini
          compare.
        </p>
      </header>

      <label style={S.label}>Who should answer?</label>
      <select style={S.select} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.icon} {a.name} — {a.desc}
          </option>
        ))}
      </select>

      <label style={{ ...S.label, marginTop: 16 }}>Your question</label>
      <textarea
        style={S.textarea}
        rows={4}
        value={question}
        placeholder="Should I use an LLC for my rentals?"
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        style={{ ...S.askBtn, ...(!question.trim() || busy || readyModels.length === 0 ? S.askBtnOff : null) }}
        disabled={!question.trim() || busy || readyModels.length === 0}
        onClick={ask}
      >
        {busy
          ? 'Waiting for answers…'
          : readyModels.length === 0
          ? 'Add at least one key first'
          : `Ask ${readyModels.length === models.length ? 'all 3' : `${readyModels.length} of 3`} →`}
      </button>

      {readyModels.length < models.length && (
        <p style={S.keyNote}>
          {models
            .filter((m) => !apiKeys[m.id])
            .map((m) => m.name)
            .join(' and ')}{' '}
          will be skipped until you add {models.length - readyModels.length === 1 ? 'its' : 'their'} key (open any
          expert and tap the model's button at the top).
        </p>
      )}

      {run && (
        <section style={{ marginTop: 28 }}>
          <div style={S.runHead}>
            <div>
              <div style={S.runLabel}>{run.agentName} was asked</div>
              <div style={S.runQ}>{run.question}</div>
            </div>
            {anyDone && (
              <button style={S.smallBtn} onClick={copyAll}>
                {copied === 'all' ? '✓ copied' : 'copy all'}
              </button>
            )}
          </div>

          <div style={S.grid}>
            {models.map((m) => {
              const r = run.results[m.id]
              return (
                <div key={m.id} style={{ ...S.card, borderColor: r.status === 'done' ? `${m.color}55` : '#28281e' }}>
                  <div style={S.cardHead}>
                    <span style={{ color: m.color, fontSize: 16 }}>{m.icon}</span>
                    <span style={{ ...S.cardName, color: m.color }}>{m.name}</span>
                    <span style={S.cardMeta}>
                      {r.status === 'done' && `${(r.ms / 1000).toFixed(1)}s · ${r.label || m.label}`}
                      {r.status === 'loading' && m.label}
                    </span>
                  </div>

                  {r.status === 'loading' && (
                    <div className="typing" style={{ padding: '12px 0' }}>
                      <div className="dot" style={{ background: m.color }} />
                      <div className="dot" style={{ background: m.color }} />
                      <div className="dot" style={{ background: m.color }} />
                    </div>
                  )}

                  {r.status === 'nokey' && (
                    <div style={S.muted}>No {m.name} key saved, so it sat this one out.</div>
                  )}

                  {r.status === 'error' && <div className="err">⚠ {r.error}</div>}

                  {r.status === 'done' && (
                    <>
                      <div style={S.answer}>{renderText(r.reply)}</div>
                      {r.sources.length > 0 && (
                        <div className="sources">
                          <div className="sources-label">Sources</div>
                          {r.sources.map((s, si) => (
                            <a key={si} href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">
                              <span className="source-num">{si + 1}</span>
                              <span className="source-title">{s.title}</span>
                            </a>
                          ))}
                        </div>
                      )}
                      {r.truncated && <div className="cutoff-note">This answer hit the length limit.</div>}
                      <div className="msg-actions">
                        <button className="msg-action" onClick={() => copyText(m.id, r.reply)}>
                          {copied === m.id ? '✓ copied' : 'copy'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

const S = {
  page: {
    background: '#0e0e0c', color: '#ece9e0', padding: '24px 16px 80px', boxSizing: 'border-box',
    width: '100%', maxWidth: 1200, margin: '0 auto', fontFamily: "'DM Sans', -apple-system, system-ui, sans-serif",
  },
  header: { marginBottom: 22 },
  kicker: {
    fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: '#d8b46a', marginBottom: 8,
  },
  h1: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 600, margin: 0 },
  sub: { color: '#9a978c', maxWidth: 560, marginTop: 10, lineHeight: 1.55, fontSize: 15 },
  label: { display: 'block', fontSize: 12, color: '#9a978c', fontFamily: "'DM Mono', monospace", marginBottom: 6 },
  // 16px on purpose: anything smaller makes phones zoom the page when you tap.
  select: {
    width: '100%', boxSizing: 'border-box', background: '#16160f', color: '#ece9e0', border: '1px solid #2c2c20',
    borderRadius: 8, padding: '12px 10px', fontSize: 16, fontFamily: "'DM Sans', system-ui, sans-serif", outline: 'none',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box', background: '#0e0e0c', color: '#ece9e0', border: '1px solid #2c2c20',
    borderRadius: 8, padding: '12px 12px', fontSize: 16, lineHeight: 1.5, fontFamily: "'DM Sans', system-ui, sans-serif",
    outline: 'none', resize: 'vertical',
  },
  askBtn: {
    display: 'block', width: '100%', marginTop: 14, background: '#d8b46a', color: '#0e0e0c', border: 'none',
    borderRadius: 10, padding: '14px 18px', cursor: 'pointer', fontSize: 15, fontWeight: 600,
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  askBtnOff: { opacity: 0.4, cursor: 'not-allowed' },
  keyNote: { color: '#9a978c', fontSize: 12.5, lineHeight: 1.5, marginTop: 10, fontFamily: "'DM Mono', monospace" },
  runHead: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
  runLabel: { fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6f6f63' },
  runQ: { fontSize: 15, color: '#ece9e0', marginTop: 4, lineHeight: 1.45 },
  smallBtn: {
    flexShrink: 0, background: 'transparent', border: '1px solid #28281e', borderRadius: 6, color: '#9a978c',
    fontFamily: "'DM Mono', monospace", fontSize: 11, padding: '8px 12px', cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, alignItems: 'start' },
  card: { background: '#16160f', border: '1px solid #28281e', borderRadius: 14, padding: 16, minWidth: 0 },
  cardHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  cardName: { fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 17 },
  cardMeta: { marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#6f6f63' },
  muted: { color: '#6f6f63', fontSize: 13, lineHeight: 1.5 },
  answer: { fontSize: 13.5, lineHeight: 1.75, color: '#d4cfc6', overflowWrap: 'anywhere' },
}
