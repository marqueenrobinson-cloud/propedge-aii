import { useState, useMemo, useEffect } from 'react'

/**
 * PropEdge AI — Property Comparison
 * Side-by-side deal analyzer with two modes:
 *   • Rental — cash flow, cap rate, cash-on-cash, 1% rule, GRM, NOI
 *   • Flip   — 70% rule max offer, project cost, profit, ROI, verdict
 *
 * Toggle at top switches inputs + metrics. Stronger property is
 * highlighted on every row; overall winner is crowned.
 *
 * Self-contained: no external UI libs. Drop into your Vite/React app and
 * render <PropertyCompare /> anywhere (e.g. a new tab/route in PropEdge).
 */

// ---- helpers -------------------------------------------------------------

const num = (v) => {
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? 0 : n
}

const money = (n) =>
  !isFinite(n) || n === 0
    ? '—'
    : n.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })

const moneySigned = (n) =>
  !isFinite(n) || n === 0
    ? '—'
    : (n < 0 ? '-' : '') +
      Math.abs(n).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      })

const pct = (n) => (isFinite(n) ? `${n.toFixed(1)}%` : '—')

// Two decimals for the 1% rule. With one decimal, 0.95% showed as "1.0%" and
// looked like a pass when it wasn't.
const pct2 = (n) => (isFinite(n) ? `${n.toFixed(2)}%` : '—')

// Remember what was typed, so leaving this screen doesn't erase it.
const STORAGE_KEY = 'propedge_compare'
const loadSaved = () => {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (s && Array.isArray(s.props) && s.props.length >= 2 && s.props.length <= 3) return s
  } catch {}
  return null
}

// ---- RENTAL analysis -----------------------------------------------------

function analyzeRental(p) {
  const price = num(p.price)
  const rent = num(p.rent)
  const taxes = num(p.taxes)
  const insurance = num(p.insurance)
  const hoa = num(p.hoa)
  const maintenance = num(p.maintenance)
  const vacancyPctVal = num(p.vacancy)
  const mgmtPctVal = num(p.mgmt)
  const downPctVal = num(p.down)
  const rate = num(p.rate)
  const term = num(p.term) || 30

  const grossAnnualRent = rent * 12
  const vacancyLoss = grossAnnualRent * (vacancyPctVal / 100)
  const mgmtCost = grossAnnualRent * (mgmtPctVal / 100)
  const annualOpEx =
    taxes + insurance + hoa * 12 + maintenance * 12 + vacancyLoss + mgmtCost
  const noi = grossAnnualRent - annualOpEx

  const downPayment = price * (downPctVal / 100)
  const loan = price - downPayment
  const monthlyRate = rate / 100 / 12
  const nMonths = term * 12
  let monthlyPI = 0
  if (loan > 0 && monthlyRate > 0) {
    monthlyPI = (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -nMonths))
  } else if (loan > 0) {
    monthlyPI = loan / nMonths
  }
  const annualDebtService = monthlyPI * 12
  const annualCashFlow = noi - annualDebtService
  const monthlyCashFlow = annualCashFlow / 12

  const capRate = price > 0 ? (noi / price) * 100 : 0
  const cashOnCash = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0
  const onePctRule = price > 0 ? (rent / price) * 100 : 0
  const grm = grossAnnualRent > 0 ? price / grossAnnualRent : 0

  return {
    monthlyCashFlow, annualCashFlow, cashOnCash, capRate,
    onePctRule, grm, noi, monthlyPI, downPayment,
  }
}

// ---- FLIP analysis -------------------------------------------------------

function analyzeFlip(p) {
  const price = num(p.price)          // your purchase price
  const arv = num(p.arv)              // after-repair value
  const rehab = num(p.rehab)          // rehab budget
  const months = num(p.months) || 6   // holding period
  const holdingMo = num(p.holding)    // holding cost per month (taxes, utils, loan, insurance)
  const sellingPctVal = num(p.selling) // selling costs as % of ARV (agent, closing)
  const buyingCost = num(p.buying)    // closing costs to acquire

  // 70% rule: max you should pay = ARV*0.70 - rehab
  const maxOffer70 = arv * 0.7 - rehab
  const offerGap = maxOffer70 - price // positive = you're under the rule (good)

  const holdingTotal = holdingMo * months
  const sellingCost = arv * (sellingPctVal / 100)

  // Financing (optional). Loan is typically taken against purchase + rehab.
  const financed = !!p.financed
  const downPctVal = num(p.flipDown)   // % down on the financed base
  const loanRate = num(p.flipRate)     // annual interest %
  const pointsPct = num(p.points)      // origination points, % of loan

  const financedBase = price + rehab
  const downPayment = financed ? financedBase * (downPctVal / 100) : financedBase
  const loanAmount = financed ? financedBase - downPayment : 0
  const pointsCost = financed ? loanAmount * (pointsPct / 100) : 0
  const loanInterest = financed ? loanAmount * (loanRate / 100) * (months / 12) : 0
  const financingCost = pointsCost + loanInterest

  const totalProjectCost =
    price + rehab + buyingCost + holdingTotal + sellingCost + financingCost
  const profit = arv - totalProjectCost

  // Cash actually out of pocket. Financed = down + points + interest + other.
  const cashInvested = financed
    ? downPayment + buyingCost + holdingTotal + financingCost
    : price + rehab + buyingCost + holdingTotal
  const roi = cashInvested > 0 ? (profit / cashInvested) * 100 : 0
  const annualizedRoi = months > 0 ? roi * (12 / months) : 0

  return {
    maxOffer70, offerGap, totalProjectCost, sellingCost, holdingTotal,
    financingCost, cashInvested, profit, roi, annualizedRoi, arv,
  }
}

// ---- metric + field definitions per mode ---------------------------------

const RENTAL_METRICS = [
  { key: 'monthlyCashFlow', label: 'Monthly Cash Flow', fmt: moneySigned, higher: true, gold: true },
  { key: 'annualCashFlow', label: 'Annual Cash Flow', fmt: moneySigned, higher: true, gold: true },
  { key: 'cashOnCash', label: 'Cash-on-Cash Return', fmt: pct, higher: true },
  { key: 'capRate', label: 'Cap Rate', fmt: pct, higher: true },
  { key: 'onePctRule', label: '1% Rule', fmt: pct2, higher: true, note: '≥ 1.00% is strong' },
  { key: 'grm', label: 'Gross Rent Multiplier', fmt: (n) => (n ? n.toFixed(1) : '—'), higher: false, note: 'lower is better' },
  { key: 'noi', label: 'Net Operating Income', fmt: money, higher: true, gold: true },
  { key: 'monthlyPI', label: 'Mortgage P&I /mo', fmt: money, higher: false, gold: true },
  { key: 'downPayment', label: 'Cash to Close (down)', fmt: money, higher: false, gold: true },
]

const FLIP_METRICS = [
  { key: 'profit', label: 'Projected Profit', fmt: moneySigned, higher: true, gold: true },
  { key: 'roi', label: 'Return on Investment', fmt: pct, higher: true },
  { key: 'annualizedRoi', label: 'Annualized ROI', fmt: pct, higher: true, note: 'ROI scaled to 1 yr' },
  { key: 'maxOffer70', label: '70% Rule — Max Offer', fmt: money, higher: true, gold: true, note: 'ARV×0.7 − rehab' },
  { key: 'offerGap', label: 'Offer vs 70% Rule', fmt: moneySigned, higher: true, note: '+ = under the rule (good)' },
  { key: 'totalProjectCost', label: 'Total Project Cost', fmt: money, higher: false, gold: true },
  { key: 'cashInvested', label: 'Cash Invested', fmt: money, higher: false, gold: true, note: 'out of pocket' },
  { key: 'financingCost', label: 'Financing Cost', fmt: money, higher: false, gold: true, note: 'points + interest' },
  { key: 'holdingTotal', label: 'Holding Costs', fmt: money, higher: false, gold: true },
  { key: 'sellingCost', label: 'Selling Costs', fmt: money, higher: false, gold: true },
]

const RENTAL_FIELDS = [
  { key: 'price', label: 'Purchase Price', prefix: '$', placeholder: '250000' },
  { key: 'rent', label: 'Monthly Rent', prefix: '$', placeholder: '2200' },
  { key: 'down', label: 'Down Payment', suffix: '%', placeholder: '20' },
  { key: 'rate', label: 'Interest Rate', suffix: '%', placeholder: '7.0' },
  { key: 'term', label: 'Loan Term', suffix: 'yrs', placeholder: '30' },
  { key: 'taxes', label: 'Property Tax /yr', prefix: '$', placeholder: '3000' },
  { key: 'insurance', label: 'Insurance /yr', prefix: '$', placeholder: '1200' },
  { key: 'hoa', label: 'HOA /mo', prefix: '$', placeholder: '0' },
  { key: 'maintenance', label: 'Maintenance /mo', prefix: '$', placeholder: '150' },
  { key: 'vacancy', label: 'Vacancy', suffix: '%', placeholder: '5' },
  { key: 'mgmt', label: 'Property Mgmt', suffix: '%', placeholder: '8' },
]

const FLIP_FIELDS = [
  { key: 'price', label: 'Purchase Price', prefix: '$', placeholder: '180000' },
  { key: 'arv', label: 'After-Repair Value', prefix: '$', placeholder: '320000' },
  { key: 'rehab', label: 'Rehab Budget', prefix: '$', placeholder: '60000' },
  { key: 'buying', label: 'Buying / Closing Costs', prefix: '$', placeholder: '5000' },
  { key: 'holding', label: 'Holding Cost /mo', prefix: '$', placeholder: '1500' },
  { key: 'months', label: 'Holding Period', suffix: 'mo', placeholder: '6' },
  { key: 'selling', label: 'Selling Costs', suffix: '% ARV', placeholder: '8' },
]

const FLIP_FINANCE_FIELDS = [
  { key: 'flipDown', label: 'Down Payment', suffix: '%', placeholder: '10' },
  { key: 'flipRate', label: 'Loan Rate', suffix: '%', placeholder: '11' },
  { key: 'points', label: 'Points (loan fee)', suffix: '%', placeholder: '2' },
]

const MODES = {
  rental: { metrics: RENTAL_METRICS, fields: RENTAL_FIELDS, analyze: analyzeRental, requires: ['price', 'rent'] },
  flip: { metrics: FLIP_METRICS, fields: FLIP_FIELDS, analyze: analyzeFlip, requires: ['price', 'arv'] },
}

const blankProperty = (name) => ({
  name,
  // rental
  price: '', rent: '', down: '20', rate: '7', term: '30',
  taxes: '', insurance: '', hoa: '', maintenance: '', vacancy: '5', mgmt: '8',
  // flip
  arv: '', rehab: '', buying: '', holding: '', months: '6', selling: '8',
  // flip financing
  financed: false, flipDown: '10', flipRate: '11', points: '2',
})

// ---- component -----------------------------------------------------------

export default function PropertyCompare({ onAsk }) {
  const [saved] = useState(loadSaved)
  const [mode, setMode] = useState(saved && MODES[saved.mode] ? saved.mode : 'rental')
  const [props, setProps] = useState(
    saved
      ? saved.props.map((p, i) => ({ ...blankProperty(`Property ${String.fromCharCode(65 + i)}`), ...p }))
      : [blankProperty('Property A'), blankProperty('Property B')]
  )

  // Save on every change (quietly skip if the phone blocks storage).
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, props })) } catch {}
  }, [mode, props])

  const cfg = MODES[mode]

  const resetAll = () => setProps([blankProperty('Property A'), blankProperty('Property B')])

  // Plain-English summary of the numbers, handed to the Deal Analyzer chat.
  const buildSummary = () => {
    const d = (v) => `$${num(v).toLocaleString('en-US')}`
    const lines = props.filter((p) => cfg.requires.every((k) => p[k] !== '')).map((p) =>
      mode === 'rental'
        ? `${p.name}: price ${d(p.price)}, rent ${d(p.rent)}/mo, ${num(p.down)}% down at ${num(p.rate)}% for ${num(p.term) || 30} years, taxes ${d(p.taxes)}/yr, insurance ${d(p.insurance)}/yr, HOA ${d(p.hoa)}/mo, maintenance ${d(p.maintenance)}/mo, vacancy ${num(p.vacancy)}%, management ${num(p.mgmt)}%.`
        : `${p.name}: purchase ${d(p.price)}, ARV ${d(p.arv)}, rehab ${d(p.rehab)}, buying costs ${d(p.buying)}, holding ${d(p.holding)}/mo for ${num(p.months) || 6} months, selling costs ${num(p.selling)}% of ARV` +
          (p.financed ? `, financed with ${num(p.flipDown)}% down at ${num(p.flipRate)}% plus ${num(p.points)} points.` : ', paid in cash.')
    )
    return (
      `Compare these ${mode === 'rental' ? 'rental' : 'fix-and-flip'} deals. Tell me which one is stronger and why, check my math, and flag anything I'm missing.\n\n` +
      lines.join('\n')
    )
  }

  const update = (i, key, value) => {
    setProps((prev) => {
      const next = [...prev]
      next[i] = { ...next[i], [key]: value }
      return next
    })
  }

  const addProperty = () => {
    if (props.length >= 3) return
    setProps((prev) => [...prev, blankProperty(`Property ${String.fromCharCode(65 + prev.length)}`)])
  }

  const removeProperty = (i) => {
    if (props.length <= 2) return
    setProps((prev) => prev.filter((_, idx) => idx !== i))
  }

  const hasData = (p) => cfg.requires.every((k) => p[k] !== '')

  const analyses = useMemo(() => props.map(cfg.analyze), [props, mode])

  const winners = useMemo(() => {
    const w = {}
    cfg.metrics.forEach((m) => {
      let bestIdx = -1
      let bestVal = m.higher ? -Infinity : Infinity
      analyses.forEach((a, i) => {
        if (!hasData(props[i])) return
        const v = a[m.key]
        if (!isFinite(v) || v === 0) return
        if (m.higher ? v > bestVal : v < bestVal) {
          bestVal = v
          bestIdx = i
        }
      })
      w[m.key] = bestIdx
    })
    return w
  }, [analyses, props, mode])

  const tally = useMemo(() => {
    const counts = props.map(() => 0)
    cfg.metrics.forEach((m) => {
      if (winners[m.key] >= 0) counts[winners[m.key]]++
    })
    return counts
  }, [winners, props, mode])

  const overallWinner = useMemo(() => {
    const max = Math.max(...tally)
    if (max === 0) return -1
    if (tally.filter((t) => t === max).length > 1) return -1
    return tally.indexOf(max)
  }, [tally])

  const anyData = props.some(hasData)

  // The "best" deal can still be a bad deal. Say so instead of just crowning it.
  const winnerLosesMoney =
    overallWinner >= 0 &&
    (mode === 'rental'
      ? analyses[overallWinner].monthlyCashFlow < 0
      : analyses[overallWinner].profit < 0)

  return (
    <div style={S.page}>
      <style>{KEYFRAMES}</style>

      <header style={S.header}>
        <div style={S.kicker}>PropEdge AI · Deal Tools</div>
        <h1 style={S.h1}>Property Comparison</h1>
        <p style={S.sub}>
          Enter the numbers for each deal. Metrics calculate live and the
          stronger property is highlighted on every row.
        </p>

        {/* MODE TOGGLE */}
        <div style={S.toggle}>
          {['rental', 'flip'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{ ...S.toggleBtn, ...(mode === m ? S.toggleActive : null) }}
            >
              {m === 'rental' ? 'Rental' : 'Flip'}
            </button>
          ))}
        </div>
        {anyData && (
          <button style={S.resetBtn} onClick={resetAll}>clear all numbers</button>
        )}
      </header>

      {/* INPUTS */}
      <section style={S.grid}>
        {props.map((p, i) => (
          <div key={i} style={S.card}>
            <div style={S.cardHead}>
              <input
                style={S.nameInput}
                value={p.name}
                onChange={(e) => update(i, 'name', e.target.value)}
              />
              {props.length > 2 && (
                <button style={S.remove} onClick={() => removeProperty(i)} aria-label="Remove">✕</button>
              )}
            </div>

            {cfg.fields.map((f) => (
              <label key={f.key} style={S.fieldRow}>
                <span style={S.fieldLabel}>{f.label}</span>
                <span style={S.inputWrap}>
                  {f.prefix && <span style={S.affix}>{f.prefix}</span>}
                  <input
                    style={{ ...S.input, paddingLeft: f.prefix ? 18 : 10 }}
                    inputMode="decimal"
                    placeholder={f.placeholder}
                    value={p[f.key]}
                    onChange={(e) => update(i, f.key, e.target.value)}
                  />
                  {f.suffix && <span style={S.affixR}>{f.suffix}</span>}
                </span>
              </label>
            ))}

            {mode === 'flip' && (
              <>
                <label style={S.checkRow}>
                  <input
                    type="checkbox"
                    checked={p.financed}
                    onChange={(e) => update(i, 'financed', e.target.checked)}
                    style={S.checkbox}
                  />
                  <span style={S.checkLabel}>Financed (hard money / loan)</span>
                </label>

                {p.financed &&
                  FLIP_FINANCE_FIELDS.map((f) => (
                    <label key={f.key} style={S.fieldRow}>
                      <span style={S.fieldLabel}>{f.label}</span>
                      <span style={S.inputWrap}>
                        {f.prefix && <span style={S.affix}>{f.prefix}</span>}
                        <input
                          style={{ ...S.input, paddingLeft: f.prefix ? 18 : 10 }}
                          inputMode="decimal"
                          placeholder={f.placeholder}
                          value={p[f.key]}
                          onChange={(e) => update(i, f.key, e.target.value)}
                        />
                        {f.suffix && <span style={S.affixR}>{f.suffix}</span>}
                      </span>
                    </label>
                  ))}
              </>
            )}
          </div>
        ))}

        {props.length < 3 && (
          <button style={S.addCard} onClick={addProperty}>
            <span style={{ fontSize: 28, lineHeight: 1 }}>＋</span>
            <span>Add property</span>
          </button>
        )}
      </section>

      {/* RESULTS */}
      <section>
        <h2 style={S.h2}>{mode === 'rental' ? 'The Numbers' : 'Flip Breakdown'}</h2>
        <div style={S.tableScroll}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, textAlign: 'left' }}>Metric</th>
                {props.map((p, i) => (
                  <th key={i} style={S.th}>
                    {p.name}
                    {overallWinner === i && <span style={S.crown}>★ Best</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cfg.metrics.map((m) => (
                <tr key={m.key} className="pc-row">
                  <td style={S.metricCell}>
                    {m.label}
                    {m.note && <span style={S.metricNote}>{m.note}</span>}
                  </td>
                  {analyses.map((a, i) => {
                    const isWin = winners[m.key] === i
                    const has = hasData(props[i])
                    const v = a[m.key]
                    // profit/offerGap go red when negative
                    const negativeBad = (m.key === 'profit' || m.key === 'offerGap') && v < 0
                    return (
                      <td
                        key={i}
                        style={{
                          ...S.valueCell,
                          ...(isWin ? S.winCell : null),
                          color: !has
                            ? '#5a5a52'
                            : negativeBad
                            ? '#d88a8a'
                            : m.gold
                            ? '#d8b46a'
                            : '#ece9e0',
                        }}
                      >
                        {has ? m.fmt(v) : '—'}
                        {isWin && <span style={S.winDot} />}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {overallWinner >= 0 && (
          <div style={S.verdict}>
            <span style={S.verdictStar}>★</span>
            <span>
              <strong style={{ color: '#d8b46a' }}>{props[overallWinner].name}</strong>{' '}
              leads on {tally[overallWinner]} of {cfg.metrics.length} metrics.
              {mode === 'flip'
                ? ' Confirm ARV with real comps and pad the rehab budget — overruns kill flips.'
                : ' Always confirm taxes, insurance, and rent comps before committing.'}
              {winnerLosesMoney && (
                <span style={S.warn}>
                  {mode === 'rental'
                    ? ' Heads up: even the leader has negative cash flow. It loses money every month at these numbers.'
                    : ' Heads up: even the leader shows a loss at these numbers.'}
                </span>
              )}
            </span>
          </div>
        )}

        {onAsk && anyData && (
          <button style={S.askBtn} onClick={() => onAsk(buildSummary())}>
            Ask the Deal Analyzer about these numbers →
          </button>
        )}
      </section>
    </div>
  )
}

// ---- styles --------------------------------------------------------------

const KEYFRAMES = `
@keyframes pcFade { from { opacity:0; transform:translateY(8px);} to {opacity:1; transform:none;} }
.pc-row:hover td { background: rgba(216,180,106,0.04); }
`

const S = {
  page: {
    // No minHeight:100vh and an explicit width: the old values made this page
    // wider than a phone screen and impossible to scroll.
    background: '#0e0e0c', color: '#ece9e0',
    padding: '24px 16px 80px', boxSizing: 'border-box',
    fontFamily: "'DM Sans', -apple-system, system-ui, sans-serif",
    animation: 'pcFade 0.4s ease both', width: '100%', maxWidth: 1100, margin: '0 auto',
  },
  resetBtn: {
    display: 'block', marginTop: 12, background: 'transparent', border: 'none',
    color: '#7a7a6e', cursor: 'pointer', padding: '4px 0', fontSize: 12,
    fontFamily: "'DM Mono', monospace", textDecoration: 'underline',
  },
  askBtn: {
    display: 'block', width: '100%', marginTop: 16, background: '#d8b46a', color: '#0e0e0c',
    border: 'none', borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
    fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  warn: { color: '#d88a8a' },
  header: { marginBottom: 28 },
  kicker: {
    fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: '#d8b46a', marginBottom: 8,
  },
  h1: {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 600, margin: 0, letterSpacing: '-0.01em',
  },
  sub: { color: '#9a978c', maxWidth: 540, marginTop: 10, lineHeight: 1.55, fontSize: 15 },
  toggle: {
    display: 'inline-flex', marginTop: 18, background: '#16160f',
    border: '1px solid #28281e', borderRadius: 10, padding: 4, gap: 4,
  },
  toggleBtn: {
    background: 'transparent', border: 'none', color: '#9a978c', cursor: 'pointer',
    padding: '8px 22px', borderRadius: 7, fontSize: 14,
    fontFamily: "'DM Mono', monospace", letterSpacing: '0.04em',
  },
  toggleActive: { background: '#d8b46a', color: '#0e0e0c', fontWeight: 500 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16, marginBottom: 36,
  },
  card: { background: '#16160f', border: '1px solid #28281e', borderRadius: 14, padding: 18 },
  cardHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  nameInput: {
    flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid #3a3a2c',
    color: '#ece9e0', fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: 19, fontWeight: 600, padding: '4px 0', outline: 'none',
  },
  remove: { background: 'transparent', border: 'none', color: '#7a7a6e', cursor: 'pointer', fontSize: 14, padding: 4 },
  fieldRow: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 },
  checkRow: {
    display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px',
    cursor: 'pointer', padding: '8px 10px', background: '#0e0e0c',
    border: '1px solid #2c2c20', borderRadius: 8,
  },
  checkbox: { accentColor: '#d8b46a', width: 15, height: 15, cursor: 'pointer' },
  checkLabel: { fontSize: 12, color: '#cbc8bd', fontFamily: "'DM Mono', monospace" },
  fieldLabel: { fontSize: 12, color: '#9a978c', fontFamily: "'DM Mono', monospace" },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  affix: { position: 'absolute', left: 8, color: '#d8b46a', fontSize: 13 },
  affixR: { position: 'absolute', right: 10, color: '#7a7a6e', fontSize: 12 },
  input: {
    width: '100%', background: '#0e0e0c', border: '1px solid #2c2c20', borderRadius: 8,
    // 16px on purpose: anything smaller makes iPhones zoom the page on tap.
    color: '#ece9e0', padding: '8px 10px', fontSize: 16, fontFamily: "'DM Mono', monospace", outline: 'none',
    boxSizing: 'border-box',
  },
  addCard: {
    background: 'transparent', border: '1px dashed #3a3a2c', borderRadius: 14, color: '#9a978c',
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 8, minHeight: 120, fontSize: 14, fontFamily: "'DM Mono', monospace",
  },
  h2: { fontFamily: "'Playfair Display', Georgia, serif", fontSize: 26, fontWeight: 600, margin: '0 0 16px' },
  tableScroll: { overflowX: 'auto', borderRadius: 14, border: '1px solid #28281e' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 420 },
  th: {
    background: '#16160f', color: '#ece9e0', fontFamily: "'Playfair Display', Georgia, serif",
    fontWeight: 600, fontSize: 15, padding: '14px 16px', textAlign: 'right',
    borderBottom: '1px solid #28281e', whiteSpace: 'nowrap',
  },
  crown: {
    display: 'block', fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#d8b46a',
    fontWeight: 400, letterSpacing: '0.1em', marginTop: 2,
  },
  metricCell: {
    padding: '13px 16px', fontSize: 13, color: '#cbc8bd',
    borderBottom: '1px solid #1d1d16', fontFamily: "'DM Mono', monospace",
  },
  metricNote: { display: 'block', fontSize: 10, color: '#6f6f63', marginTop: 2, letterSpacing: '0.04em' },
  valueCell: {
    padding: '13px 16px', textAlign: 'right', fontFamily: "'DM Mono', monospace",
    fontSize: 14, borderBottom: '1px solid #1d1d16', position: 'relative', whiteSpace: 'nowrap',
  },
  winCell: { background: 'rgba(120,180,110,0.10)' },
  winDot: {
    display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
    background: '#7ab46e', marginLeft: 8, verticalAlign: 'middle',
  },
  verdict: {
    marginTop: 22, background: '#16160f', border: '1px solid #28281e',
    borderLeft: '3px solid #d8b46a', borderRadius: 10, padding: '16px 18px',
    display: 'flex', gap: 12, alignItems: 'flex-start', fontSize: 14, lineHeight: 1.5, color: '#cbc8bd',
  },
  verdictStar: { color: '#d8b46a', fontSize: 20, lineHeight: 1 },
}
