import { useState, useRef, useEffect } from "react";
import PropertyCompare from "./PropertyCompare";import { useState, useRef, useEffect } from "react";

// ── MODELS ──────────────────────────────────────────────────────────────────
const MODELS = [
  {
    id: "claude",
    name: "Claude",
    label: "claude-sonnet-4",
    icon: "✦",
    color: "#c9a84c",
    endpoint: "/api/claude",
    badge: "Anthropic",
  },
  {
    id: "gpt4",
    name: "GPT-4o",
    label: "gpt-4o",
    icon: "◆",
    color: "#10a37f",
    endpoint: "/api/openai",
    badge: "OpenAI",
  },
  {
    id: "gemini",
    name: "Gemini",
    label: "gemini-1.5-pro",
    icon: "✸",
    color: "#4285f4",
    endpoint: "/api/gemini",
    badge: "Google",
  },
];

// ── AGENTS ───────────────────────────────────────────────────────────────────
const AGENTS = [
  {
    id: "dealfinder", icon: "🔍", name: "Deal Finder", tag: "ACQUISITIONS", color: "#c9a84c",
    desc: "Find undervalued properties & off-market deals",
    persona: `You are an expert real estate deal finder and acquisitions specialist with 20+ years experience. You help investors identify undervalued properties, off-market deals, and investment opportunities. You know the 70% rule, ARV calculations, MAO formulas, motivated seller strategies, driving for dollars, direct mail, and wholesaling. When analyzing deals always ask for: address/market, asking price, ARV, repair costs, exit strategy. Give clear go/no-go recommendations.`,
  },
  {
    id: "analyzer", icon: "📊", name: "Deal Analyzer", tag: "UNDERWRITING", color: "#4caf91",
    desc: "Run numbers: ROI, cash flow, cap rate & more",
    persona: `You are a real estate financial analyst. You calculate Cash-on-Cash Return, Cap Rate, NOI, Cash Flow, BRRRR analysis, fix & flip profits, GRM, 1% rule, 50% rule, IRR, DSCR, and refinance scenarios. Always show step-by-step math. Flag red flags and strengths. Build complete pro formas when given numbers.`,
  },
  {
    id: "wholesaler", icon: "📋", name: "Wholesaler", tag: "WHOLESALE", color: "#e67e22",
    desc: "Contracts, assignment fees & buyer lists",
    persona: `You are a veteran real estate wholesaler. You know MAO formulas (ARV × 65-70% - Repairs - Fee), assignment of contract vs double close, building cash buyer lists, motivated seller scripts, equitable interest laws, and disposition strategies. Provide word-for-word scripts and calculate realistic assignment fees.`,
  },
  {
    id: "flipper", icon: "🔨", name: "Fix & Flip Pro", tag: "FLIPPING", color: "#e74c3c",
    desc: "Rehab budgets, timelines & profit maximization",
    persona: `You are an expert house flipper. You estimate rehab costs by category (foundation, roof, HVAC, plumbing, electrical, kitchen, baths, flooring, paint, landscaping), manage project timelines, hire/manage contractors, pull permits, and maximize ARV. You know hard money financing, carrying costs, and value-add improvements with best ROI.`,
  },
  {
    id: "landlord", icon: "🏠", name: "Landlord AI", tag: "PROPERTY MGMT", color: "#3498db",
    desc: "Tenant screening, leases, maintenance & laws",
    persona: `You are a seasoned landlord with 100+ units. You help with tenant screening (credit, income, background), Fair Housing compliance, lease drafting, security deposits, eviction processes, rent pricing, maintenance systems, and real estate tax deductions (Schedule E, depreciation, cost seg, 1031). Always remind users to consult local laws.`,
  },
  {
    id: "brrrr", icon: "♻️", name: "BRRRR Strategist", tag: "BRRRR", color: "#9b59b6",
    desc: "Buy, Rehab, Rent, Refinance, Repeat strategy",
    persona: `You are a BRRRR strategy expert. You guide investors through Buy, Rehab, Rent, Refinance, Repeat to recycle capital and build portfolios. You calculate all-in costs vs refinance amounts, % of capital returned, DSCR after refi, seasoning requirements, and forced appreciation. You know hard money, DSCR loans, portfolio lenders, and scaling strategies.`,
  },
  {
    id: "creative", icon: "💡", name: "Creative Finance", tag: "CREATIVE DEALS", color: "#1abc9c",
    desc: "Subject-to, seller finance, lease options & more",
    persona: `You are a creative real estate financing expert. You know subject-to (taking over existing mortgage), seller financing/owner carry, wraparound mortgages, land contracts, lease options, sandwich leases, master leases, assumable mortgages (FHA/VA), novation agreements, and JV partnerships. Explain due-on-sale risks and recommend attorneys for docs.`,
  },
  {
    id: "market", icon: "🌍", name: "Market Analyst", tag: "MARKETS", color: "#f39c12",
    desc: "Market research, trends & where to invest",
    persona: `You are a real estate market analyst. You analyze population growth, job markets, rent-to-price ratios, landlord vs tenant friendly states, supply/demand, neighborhood grades (A/B/C/D class), emerging markets, and gentrification signals. You know cash flow markets (Midwest/Southeast) vs appreciation markets (coasts) vs hybrid markets. Give specific data-driven recommendations.`,
  },
  {
    id: "negotiator", icon: "🤝", name: "Negotiator", tag: "NEGOTIATION", color: "#e91e63",
    desc: "Scripts, offers & closing strategies",
    persona: `You are a master real estate negotiator. You provide word-for-word seller scripts, objection handlers, lowball offer justifications, creative term negotiation, auction strategies, REO negotiation with banks, and inspection negotiation tactics. Role-play negotiations on request. Always give specific scripts not generic advice.`,
  },
  {
    id: "legal", icon: "⚖️", name: "Legal & Tax", tag: "LEGAL / TAX", color: "#607d8b",
    desc: "Entity structure, taxes & legal protection",
    persona: `You are a real estate legal and tax strategy advisor. You cover LLC/S-Corp/land trust structures, series LLCs, asset protection, cost segregation, bonus depreciation, Real Estate Professional Status (REPS), 1031 exchanges, opportunity zones, self-directed IRAs, installment sales, and contract due diligence. Always recommend consulting licensed attorneys and CPAs.`,
  },{
    id: "compare", icon: "⚖️", name: "Deal Compare", tag: "SIDE-BY-SIDE", color: "#c9a84c",
    desc: "Compare 2–3 properties side by side", persona: "", isTool: true,
  },
];

const STARTERS = {
  dealfinder: ["How do I find off-market deals?", "Analyze: $120K asking, $180K ARV, $25K repairs", "What is the 70% rule?"],
  analyzer: ["Run numbers: $150K price, $1,400/mo rent, 20% down, 7% rate", "What's a good cap rate?", "Explain cash-on-cash return"],
  wholesaler: ["How do I build a cash buyers list?", "Write me a seller script", "Calculate assignment fee: $180K ARV, $40K repairs"],
  flipper: ["Estimate rehab for a 3/2 1200sqft house", "What renovations have best ROI?", "How do I find good contractors?"],
  landlord: ["Write a lease clause for late fees", "How do I screen tenants?", "Walk me through the eviction process"],
  brrrr: ["Walk me through a full BRRRR deal", "All-in $95K, ARV $130K, rent $1,100 — does BRRRR work?", "How do I find BRRRR lenders?"],
  creative: ["Explain subject-to investing", "How does seller financing work?", "Write a lease option offer"],
  market: ["Best cash flow markets right now?", "Is Memphis a good market?", "Compare Nashville vs Charlotte"],
  negotiator: ["Give me a cold call script", "How do I counter a high asking price?", "Role play a seller negotiation with me"],
  legal: ["Should I use an LLC for rentals?", "How does a 1031 exchange work?", "What is cost segregation?"],
};

// ── STYLES ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0a0a08;
    --surface: #111110;
    --surface2: #181816;
    --border: #242420;
    --text: #e8e4dc;
    --muted: #6b6860;
    --gold: #c9a84c;
  }
  body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; height: 100vh; height: 100dvh; overflow: hidden; }
  .app { display: flex; height: 100vh; height: 100dvh; }

  /* SIDEBAR */
  .sidebar { width: 188px; min-width: 188px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
  .brand { padding: 13px 13px 10px; border-bottom: 1px solid var(--border); background: var(--bg); }
  .brand-title { font-family: 'Playfair Display', serif; font-weight: 900; font-size: 16px; color: var(--gold); letter-spacing: -0.5px; }
  .brand-sub { font-family: 'DM Mono', monospace; font-size: 8px; color: var(--muted); letter-spacing: 2.5px; text-transform: uppercase; margin-top: 2px; }
  .sec-label { font-family: 'DM Mono', monospace; font-size: 8px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; padding: 9px 13px 3px; }
  .agent-list { flex: 1; overflow-y: auto; padding: 2px 6px 6px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
  .agent-btn { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 9px; border-radius: 6px; border: 1px solid transparent; background: transparent; cursor: pointer; transition: all 0.15s; text-align: left; margin-bottom: 1px; }
  .agent-btn:hover { background: var(--surface2); }
  .agent-btn.active { background: var(--surface2); border-color: var(--border); }
  .a-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .a-info { overflow: hidden; flex: 1; }
  .a-name { font-weight: 600; font-size: 11.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .agent-btn.active .a-name { color: #fff; }
  .a-desc { display: none; }
  .clear-btn { margin: 8px; padding: 7px 12px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-family: 'DM Mono', monospace; font-size: 10px; cursor: pointer; transition: all 0.15s; letter-spacing: 1px; }
  .clear-btn:hover { color: #ef4444; border-color: #ef444440; }

  /* MAIN */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  /* TOPBAR */
  .topbar { padding: 12px 24px; border-bottom: 1px solid var(--border); background: var(--surface); display: flex; align-items: center; gap: 14px; }
  .t-icon { font-size: 22px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 9px; background: var(--bg); border: 1px solid var(--border); flex-shrink: 0; }
  .t-info { flex: 1; }
  .t-name { font-family: 'Playfair Display', serif; font-weight: 700; font-size: 17px; }
  .t-tag { font-family: 'DM Mono', monospace; font-size: 9px; color: var(--muted); letter-spacing: 2px; margin-top: 1px; }

  /* MODEL SWITCHER */
  .model-switcher { display: flex; gap: 5px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 4px; }
  .model-btn { display: flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 7px; border: none; background: transparent; cursor: pointer; transition: all 0.15s; font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); white-space: nowrap; }
  .model-btn:hover { color: var(--text); background: var(--surface); }
  .model-btn.active { background: var(--surface2); border: 1px solid var(--border); }
  .model-icon { font-size: 13px; font-weight: 700; }
  .model-label { font-size: 10px; }
  .change-key { background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.5px; padding: 6px 10px; cursor: pointer; transition: all 0.15s; white-space: nowrap; flex-shrink: 0; }
  .change-key:hover { color: var(--gold); border-color: #c9a84c40; }

  /* KEY SETUP */
  .key-banner { margin: 8px 24px; padding: 10px 14px; background: #1a1505; border: 1px solid #c9a84c30; border-radius: 8px; display: flex; align-items: center; gap: 10px; }
  .key-text { font-size: 12px; color: #c9a84c; flex: 1; font-family: 'DM Mono', monospace; }
  .key-input { flex: 1; background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 5px 9px; color: var(--text); font-family: 'DM Mono', monospace; font-size: 11px; outline: none; }
  .key-save { padding: 5px 12px; background: var(--gold); color: #000; border: none; border-radius: 5px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; font-weight: 600; white-space: nowrap; }

  /* MESSAGES */
  .messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 18px; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }
  .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px; padding: 40px; }
  .empty-icon { font-size: 48px; opacity: 0.25; }
  .empty-name { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 700; color: #fff; opacity: 0.6; }
  .empty-desc { font-size: 12.5px; color: var(--muted); max-width: 320px; line-height: 1.7; }
  .starters { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 6px; max-width: 480px; }
  .starter { padding: 6px 13px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-size: 11.5px; cursor: pointer; transition: all 0.15s; }
  .starter:hover { color: var(--text); border-color: #3a3a36; background: var(--surface2); }

  .msg { display: flex; gap: 12px; max-width: 840px; animation: rise 0.2s ease; }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  .msg.user { align-self: flex-end; flex-direction: row-reverse; max-width: 660px; }
  .avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; border: 1px solid var(--border); background: var(--surface); }
  .bubble { padding: 12px 16px; border-radius: 11px; font-size: 13.5px; line-height: 1.75; border: 1px solid var(--border); max-width: calc(100% - 46px); }
  .msg.user .bubble { background: var(--surface2); border-bottom-right-radius: 3px; }
  .msg.ai .bubble { background: var(--surface); border-bottom-left-radius: 3px; color: #d4cfc6; }
  .bubble strong { color: #fff; font-weight: 600; }
  .bubble pre { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 11px; font-family: 'DM Mono', monospace; font-size: 11.5px; overflow-x: auto; margin: 8px 0; line-height: 1.55; }
  .sources { margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border); }
  .sources-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); margin-bottom: 7px; }
  .source-link { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; text-decoration: none; transition: background 0.15s; margin-bottom: 2px; }
  .source-link:hover { background: var(--surface2); }
  .source-num { flex-shrink: 0; width: 18px; height: 18px; border-radius: 50%; background: var(--gold); color: var(--bg); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .source-title { font-size: 12px; color: var(--gold); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .num { color: var(--gold); font-family: 'DM Mono', monospace; font-size: 13px; }

  .model-tag { display: inline-flex; align-items: center; gap: 4px; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 1px; padding: 2px 6px; border-radius: 3px; margin-bottom: 6px; opacity: 0.7; }

  .typing { display: flex; align-items: center; gap: 5px; padding: 3px 0; }
  .dot { width: 7px; height: 7px; border-radius: 50%; animation: blink 1.3s ease infinite; }
  .dot:nth-child(2) { animation-delay: 0.2s; }
  .dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes blink { 0%,100% { opacity: 0.2; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }

  /* INPUT */
  .input-zone { padding: 14px 24px 20px; border-top: 1px solid var(--border); background: var(--surface); }
  .input-wrap { display: flex; gap: 9px; align-items: flex-end; background: var(--bg); border: 1px solid var(--border); border-radius: 11px; padding: 11px 13px; transition: border-color 0.2s; }
  .input-wrap:focus-within { border-color: #3a3a36; }
  .input-field { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 13.5px; line-height: 1.5; resize: none; max-height: 130px; scrollbar-width: none; }
  .input-field::placeholder { color: var(--muted); }
  .send { width: 36px; height: 36px; border-radius: 7px; border: none; background: var(--border); color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; font-size: 17px; flex-shrink: 0; }
  .send:hover:not(:disabled) { background: #2a2a26; color: var(--text); }
  .send.ready { background: #1a1508; color: var(--gold); border: 1px solid #c9a84c35; }
  .send:disabled { opacity: 0.3; cursor: not-allowed; }
  .hint { font-family: 'DM Mono', monospace; font-size: 9.5px; color: var(--muted); text-align: center; margin-top: 8px; letter-spacing: 0.5px; }

  .err { color: #ef4444; font-family: 'DM Mono', monospace; font-size: 12px; padding: 3px 0; }

  /* MARKDOWN BLOCKS */
  .md-p { margin-bottom: 2px; }
  .md-gap { height: 8px; }
  .md-h1 { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 900; color: #fff; margin: 14px 0 5px; }
  .md-h2 { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; color: #fff; margin: 12px 0 4px; }
  .md-h3 { font-family: 'Playfair Display', serif; font-size: 14px; font-weight: 700; color: #fff; margin: 10px 0 3px; }
  .md-li { display: flex; gap: 8px; margin-bottom: 3px; padding-left: 4px; }
  .md-li-marker { color: var(--gold); flex-shrink: 0; }
  .md-hr { border: none; border-top: 1px solid var(--border); margin: 12px 0; }
  .md-quote { border-left: 2px solid var(--gold); padding: 2px 0 2px 12px; margin: 6px 0; color: var(--muted); font-style: italic; }
  .inline-code { font-family: 'DM Mono', monospace; font-size: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 1px 5px; color: var(--gold); }
  .md-table { border-collapse: collapse; margin: 10px 0; font-size: 12.5px; width: 100%; }
  .md-table th, .md-table td { border: 1px solid var(--border); padding: 6px 10px; text-align: left; }
  .md-table th { background: var(--surface2); color: #fff; font-weight: 600; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.5px; }
  .md-table tr:nth-child(even) td { background: rgba(255,255,255,0.015); }

  /* MOBILE MENU BUTTON + OVERLAY (hidden on desktop) */
  .menu-btn { display: none; width: 38px; height: 38px; flex-shrink: 0; align-items: center; justify-content: center; border-radius: 9px; background: var(--bg); border: 1px solid var(--border); color: var(--text); font-size: 18px; cursor: pointer; }
  .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 40; }

  /* MOBILE LAYOUT */
  @media (max-width: 768px) {
    body { overflow: hidden; }
    .menu-btn { display: flex; }
    .overlay.show { display: block; }

    .sidebar {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 50;
      width: 256px; min-width: 256px;
      transform: translateX(-100%);
      transition: transform 0.22s ease;
      box-shadow: 2px 0 24px rgba(0,0,0,0.5);
    }
    .sidebar.open { transform: translateX(0); }

    /* roomier tap targets + show descriptions again in the drawer */
    .agent-btn { padding: 11px 12px; }
    .a-name { font-size: 14px; }
    .a-desc { display: block; font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
    .a-dot { width: 8px; height: 8px; }

    .topbar { padding: 10px 14px; gap: 10px; }
    .t-icon { display: none; }
    .t-name { font-size: 15px; }
    /* Keep the menu button always visible and let the title shrink/truncate
       instead of overflowing the row and pushing it off-screen. */
    .menu-btn { display: flex; }
    /* Pin the top bar so the menu button always stays reachable, even if the
       mobile keyboard or scrolling shifts the layout. */
    .topbar { position: sticky; top: 0; z-index: 30; flex-shrink: 0; }
    .t-info { min-width: 0; overflow: hidden; }
    .t-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .t-tag { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .model-switcher { flex-shrink: 0; }

    /* let the model switcher wrap/scroll instead of overflowing */
    .model-switcher { gap: 3px; padding: 3px; }
    .model-btn { padding: 6px 8px; }
    .model-label { display: none; }
    .change-key { padding: 6px 8px; font-size: 9px; }

    .messages { padding: 16px 14px; gap: 14px; }
    .msg, .msg.user { max-width: 100%; }
    .bubble { max-width: calc(100% - 44px); font-size: 14px; }
    .input-zone { padding: 12px 14px 16px; }
    .key-banner { margin: 8px 14px; flex-wrap: wrap; }
    .hint { font-size: 9px; }
  }
`;

// ── TEXT PARSER ───────────────────────────────────────────────────────────────
// Inline formatting: bold, italic, bold-italic, inline code, and number/currency
// highlighting. Order matters — code is pulled out first so its contents are not
// re-parsed, then bold-italic before bold before italic.
function renderInline(str, keyPrefix) {
  const tokens = str.split(/(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|(?<!\*)\*(?!\s)[^*]+\*|\$[\d,]+\.?\d*[KMBkmb%]?|\b\d+\.?\d*%)/g);
  return tokens.filter(Boolean).map((p, j) => {
    const key = `${keyPrefix}-${j}`;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={key} className="inline-code">{p.slice(1, -1)}</code>;
    if (p.startsWith('***') && p.endsWith('***')) return <strong key={key}><em>{p.slice(3, -3)}</em></strong>;
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={key}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={key}>{p.slice(1, -1)}</em>;
    if (p.match(/^\$[\d,]/) || p.match(/^\d+\.?\d*%$/)) return <span key={key} className="num">{p}</span>;
    return p;
  });
}

// Block-level parser. Walks the text line by line and groups multi-line blocks
// (code fences, tables, list runs) so they render as proper elements instead of
// leaking raw markdown symbols into the chat bubble.
function parseText(text) {
  const lines = (text || "").split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```
    if (/^\s*```/.test(line)) {
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```/.test(lines[i])) { code.push(lines[i]); i++; }
      i++; // skip closing fence
      blocks.push(<pre key={`code-${i}`}>{code.join('\n')}</pre>);
      continue;
    }

    // Table: header row of pipes followed by a separator row of dashes
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
      const splitRow = (r) => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
      const headers = splitRow(line);
      i += 2; // skip header + separator
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { rows.push(splitRow(lines[i])); i++; }
      blocks.push(
        <table key={`tbl-${i}`} className="md-table">
          <thead><tr>{headers.map((h, hi) => <th key={hi}>{renderInline(h, `th${i}-${hi}`)}</th>)}</tr></thead>
          <tbody>{rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}>{renderInline(c, `td${i}-${ri}-${ci}`)}</td>)}</tr>)}</tbody>
        </table>
      );
      continue;
    }

    // Headings
    if (line.startsWith('### ')) { blocks.push(<h3 key={i} className="md-h3">{renderInline(line.slice(4), `h3-${i}`)}</h3>); i++; continue; }
    if (line.startsWith('## '))  { blocks.push(<h2 key={i} className="md-h2">{renderInline(line.slice(3), `h2-${i}`)}</h2>); i++; continue; }
    if (line.startsWith('# '))   { blocks.push(<h1 key={i} className="md-h1">{renderInline(line.slice(2), `h1-${i}`)}</h1>); i++; continue; }

    // Horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { blocks.push(<hr key={i} className="md-hr" />); i++; continue; }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      blocks.push(<blockquote key={i} className="md-quote">{renderInline(line.replace(/^\s*>\s?/, ''), `q-${i}`)}</blockquote>);
      i++; continue;
    }

    // Ordered list item — anchored to start, keeps the real number
    const ordered = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ordered) {
      blocks.push(
        <div key={i} className="md-li">
          <span className="md-li-marker num">{ordered[1]}.</span>
          <span>{renderInline(ordered[2], `ol-${i}`)}</span>
        </div>
      );
      i++; continue;
    }

    // Unordered list item — anchored to start so mid-sentence dashes are safe
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    if (bullet) {
      blocks.push(
        <div key={i} className="md-li">
          <span className="md-li-marker">›</span>
          <span>{renderInline(bullet[1], `ul-${i}`)}</span>
        </div>
      );
      i++; continue;
    }

    // Blank line → spacer
    if (!line.trim()) { blocks.push(<div key={i} className="md-gap" />); i++; continue; }

    // Plain paragraph line
    blocks.push(<div key={i} className="md-p">{renderInline(line, `p-${i}`)}</div>);
    i++;
  }

  return blocks;
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeAgent, setActiveAgent] = useState(AGENTS[0]);
  const [activeModel, setActiveModel] = useState(MODELS[0]);
  const [chats, setChats] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState({ claude: "", gpt4: "", gemini: "" });
  const [keyInput, setKeyInput] = useState("");
  const [keySaved, setKeySaved] = useState({ claude: false, gpt4: false, gemini: false });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const endRef = useRef(null);
  const taRef = useRef(null);

  const messages = chats[`${activeAgent.id}:${activeModel.id}`] || [];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Load saved keys from localStorage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('propedge_keys') || '{}');
      if (saved) {
        setApiKeys(saved);
        setKeySaved({ claude: !!saved.claude, gpt4: !!saved.gpt4, gemini: !!saved.gemini });
      }
    } catch {}
  }, []);

  // Load saved conversations from localStorage on startup, so chat history
  // survives page reloads and returning later (per device).
  const [chatsLoaded, setChatsLoaded] = useState(false);
  useEffect(() => {
    try {
      const savedChats = JSON.parse(localStorage.getItem('propedge_chats') || '{}');
      if (savedChats && typeof savedChats === 'object') setChats(savedChats);
    } catch {}
    setChatsLoaded(true);
  }, []);

  // Auto-save conversations whenever they change (only after the initial load,
  // so we never overwrite saved history with the empty starting state).
  useEffect(() => {
    if (!chatsLoaded) return;
    try {
      localStorage.setItem('propedge_chats', JSON.stringify(chats));
    } catch {}
  }, [chats, chatsLoaded]);

  const saveKey = () => {
    if (!keyInput.trim()) return;
    const updated = { ...apiKeys, [activeModel.id]: keyInput.trim() };
    setApiKeys(updated);
    setKeySaved(k => ({ ...k, [activeModel.id]: true }));
    localStorage.setItem('propedge_keys', JSON.stringify(updated));
    setKeyInput("");
  };

  // Forget the saved key for the active model so the user can paste a new one.
  const changeKey = () => {
    const updated = { ...apiKeys, [activeModel.id]: "" };
    setApiKeys(updated);
    setKeySaved(k => ({ ...k, [activeModel.id]: false }));
    localStorage.setItem('propedge_keys', JSON.stringify(updated));
    setKeyInput("");
  };

  const needsKey = !keySaved[activeModel.id];

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (needsKey) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";

    const chatKey = `${activeAgent.id}:${activeModel.id}`;
    const history = [...messages, { role: "user", content: msg }];
    setChats(c => ({ ...c, [chatKey]: history }));
    setLoading(true);

    try {
      const res = await fetch(activeModel.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKeys[activeModel.id] || "",
        },
        body: JSON.stringify({
          messages: history.map(m => ({ role: m.role, content: m.content })),
          system: activeAgent.persona,
        }),
      });

      // Read the raw response first. If the /api routes aren't running (e.g.
      // viewing the static preview, or a dev server without serverless functions),
      // the server returns an HTML error page instead of JSON. Detect that and
      // explain it clearly rather than throwing "Unexpected token '<'".
      const raw = await res.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        const looksLikeHtml = raw.trim().startsWith("<");
        const message = looksLikeHtml
          ? "The API endpoint isn't responding. The /api routes only run when the app is deployed (e.g. on Vercel) — they can't run in a static preview or plain dev server. Deploy the project, then try again."
          : `Unexpected response from the server: ${raw.slice(0, 120)}`;
        setChats(c => ({
          ...c,
          [chatKey]: [...history, { role: "assistant", content: message, error: true, model: activeModel.id }],
        }));
        setLoading(false);
        return;
      }

      const isError = !!data.error;

      // If the server flagged the key as bad/expired, forget it and tell the
      // user clearly instead of surfacing a raw API error.
      if (data.invalidKey) {
        changeKey();
        setChats(c => ({
          ...c,
          [chatKey]: [...history, {
            role: "assistant",
            content: `Your ${activeModel.name} API key was rejected (invalid or expired). Please add a new key above to continue.`,
            error: true,
            model: activeModel.id,
          }],
        }));
        setLoading(false);
        return;
      }

      const reply = data.reply || data.error || "No response received.";
      setChats(c => ({
        ...c,
        [chatKey]: [...history, { role: "assistant", content: reply, error: isError, model: activeModel.id, sources: data.sources || [] }],
      }));
    } catch (err) {
      setChats(c => ({
        ...c,
        [chatKey]: [...history, { role: "assistant", content: `Connection error: ${err.message}`, error: true, model: activeModel.id }],
      }));
    }

    setLoading(false);
  };

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  const clearChat = () => setChats(c => ({ ...c, [`${activeAgent.id}:${activeModel.id}`]: [] }));

  return (
    <>
      <style>{STYLES}</style>
      <div className="app">

        {/* ── MOBILE OVERLAY ── */}
        <div className={`overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

        {/* ── SIDEBAR ── */}
        <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="brand">
            <div className="brand-title">PropEdge AI</div>
            <div className="brand-sub">Real Estate Intelligence</div>
          </div>
          <div className="sec-label">Agents</div>
          <div className="agent-list">
            {AGENTS.map(a => (
              <button key={a.id} className={`agent-btn ${activeAgent.id === a.id ? "active" : ""}`}
                onClick={() => { setActiveAgent(a); setInput(""); setSidebarOpen(false); }}>
                <div className="a-dot" style={{ background: a.color, boxShadow: activeAgent.id === a.id ? `0 0 6px ${a.color}` : "none" }} />
                <div className="a-info">
                  <div className="a-name" style={activeAgent.id === a.id ? { color: a.color } : {}}>{a.icon} {a.name}</div>
                  <div className="a-desc">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
          {messages.length > 0 && <button className="clear-btn" onClick={clearChat}>⌫ clear chat</button>}
        </div>

        {/* ── MAIN ── */}
        <div className="main">

          {activeAgent.isTool ? <PropertyCompare /> : <>

          {/* TOPBAR */}
          <div className="topbar">
            <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button>
            <div className="t-icon">{activeAgent.icon}</div>
            <div className="t-info">
              <div className="t-name" style={{ color: activeAgent.color }}>{activeAgent.name}</div>
              <div className="t-tag">{activeAgent.tag} · PROPEDGE AI</div>
            </div>

            {/* MODEL SWITCHER */}
            <div className="model-switcher">
              {MODELS.map(m => (
                <button key={m.id} className={`model-btn ${activeModel.id === m.id ? "active" : ""}`}
                  onClick={() => setActiveModel(m)}
                  style={activeModel.id === m.id ? { color: m.color } : {}}>
                  <span className="model-icon" style={{ color: m.color }}>{m.icon}</span>
                  <span className="model-label">{m.name}</span>
                  {!keySaved[m.id] && <span style={{ color: "#ef4444", fontSize: 9 }}>●</span>}
                </button>
              ))}
            </div>

            {!needsKey && (
              <button className="change-key" onClick={changeKey} title={`Replace your saved ${activeModel.name} key`}>
                change key
              </button>
            )}
          </div>

          {/* API KEY BANNER */}
          {needsKey && (
            <div className="key-banner">
              <span className="key-text">
                {activeModel.icon} {activeModel.name} API key required
                {activeModel.id === 'claude' && ' → console.anthropic.com'}
                {activeModel.id === 'gpt4' && ' → platform.openai.com'}
                {activeModel.id === 'gemini' && ' → aistudio.google.com'}
              </span>
              <input className="key-input" type="password" placeholder={`Paste ${activeModel.name} API key...`}
                value={keyInput} onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && saveKey()} />
              <button className="key-save" onClick={saveKey}>Save</button>
            </div>
          )}

          {/* MESSAGES */}
          <div className="messages">
            {messages.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">{activeAgent.icon}</div>
                <div className="empty-name">{activeAgent.name}</div>
                <div className="empty-desc">{activeAgent.desc}</div>
                {needsKey
                  ? <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#c9a84c", marginTop: 8 }}>
                      ↑ Add your {activeModel.name} API key above to start
                    </div>
                  : <div className="starters">
                      {(STARTERS[activeAgent.id] || []).map((s, i) => (
                        <button key={i} className="starter" onClick={() => send(s)}>{s}</button>
                      ))}
                    </div>
                }
              </div>
            ) : (
              <>
                {messages.map((m, i) => {
                  const model = MODELS.find(x => x.id === m.model);
                  return (
                    <div key={i} className={`msg ${m.role === "user" ? "user" : "ai"}`}>
                      <div className="avatar" style={m.role === "assistant" ? { borderColor: `${activeAgent.color}40` } : {}}>
                        {m.role === "user" ? "👤" : activeAgent.icon}
                      </div>
                      <div className="bubble">
                        {m.role === "assistant" && model && (
                          <div className="model-tag" style={{ background: `${model.color}15`, color: model.color, border: `1px solid ${model.color}30` }}>
                            {model.icon} {model.label}
                          </div>
                        )}
                        {m.error
                          ? <span className="err">⚠ {m.content}</span>
                          : parseText(m.content)
                        }
                        {!m.error && m.sources && m.sources.length > 0 && (
                          <div className="sources">
                            <div className="sources-label">Sources</div>
                            {m.sources.map((s, si) => (
                              <a key={si} href={s.url} target="_blank" rel="noopener noreferrer" className="source-link">
                                <span className="source-num">{si + 1}</span>
                                <span className="source-title">{s.title}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {loading && (
                  <div className="msg ai">
                    <div className="avatar" style={{ borderColor: `${activeAgent.color}40` }}>{activeAgent.icon}</div>
                    <div className="bubble">
                      <div className="model-tag" style={{ background: `${activeModel.color}15`, color: activeModel.color, border: `1px solid ${activeModel.color}30` }}>
                        {activeModel.icon} {activeModel.label}
                      </div>
                      <div className="typing">
                        <div className="dot" style={{ background: activeModel.color }} />
                        <div className="dot" style={{ background: activeModel.color }} />
                        <div className="dot" style={{ background: activeModel.color }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </>
            )}
          </div>

          {/* INPUT */}
          <div className="input-zone">
            <div className="input-wrap">
              <textarea ref={taRef} className="input-field"
                placeholder={needsKey ? `Add ${activeModel.name} API key to start...` : `Ask ${activeAgent.name} via ${activeModel.name}...`}
                value={input} disabled={needsKey}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey} rows={1}
                onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 130) + "px"; }} />
              <button className={`send ${input.trim() && !loading && !needsKey ? "ready" : ""}`}
                onClick={() => send()} disabled={!input.trim() || loading || needsKey}>↑</button>
            </div>
          </><div className="hint">Enter to send · Shift+Enter for new line · Each agent keeps its own conversation per model</div>
          </div>
          </>}
        </div>
      </div>
    </>
  );
}
        
