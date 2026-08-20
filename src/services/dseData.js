// Comprehensive DSE Equities Metadata & Realistic Market Baseline Reference

export const DSE_SECTORS = [
  "All",
  "Bank",
  "Pharmaceuticals",
  "Fuel & Power",
  "Telecommunication",
  "Engineering",
  "Food & Allied",
  "Textile",
  "Financial Institutions",
  "Insurance",
  "Cement",
  "IT Sector",
  "Mutual Funds",
  "Ceramics",
  "Paper & Printing",
  "Miscellaneous"
];

// Date Formatter: strictly format dates as "DD MMM" (e.g. "20 Aug")
export const formatDateDDMMM = (dateStr) => {
  if (!dateStr) return '';
  const clean = String(dateStr).slice(0, 10);
  const parts = clean.split('-');
  if (parts.length === 3) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (!isNaN(day) && monthIndex >= 0 && monthIndex < 12) {
      return `${String(day).padStart(2, '0')} ${months[monthIndex]}`;
    }
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  return `${day} ${month}`;
};

// -------------------------------------------------------------
// WARREN BUFFETT & BENJAMIN GRAHAM VALUE INVESTING ALGORITHMS
// -------------------------------------------------------------

/**
 * 1. Benjamin Graham Number (Intrinsic Fair Value)
 * Formula: Intrinsic Value = sqrt(22.5 * Basic EPS * NAVPS)
 * Grounded in Graham's rule that P/E <= 15 and P/BV <= 1.5 (15 * 1.5 = 22.5).
 * Only applicable for companies with positive earnings and positive net asset backing.
 */
export const calculateGrahamNumber = (eps, navps) => {
  const e = Number(eps || 0);
  const n = Number(navps || 0);
  if (e <= 0 || n <= 0) return null;
  return Number(Math.sqrt(22.5 * e * n).toFixed(2));
};

/**
 * 2. Margin of Safety %
 * Formula: ((Graham Fair Value - Current Price) / Graham Fair Value) * 100
 * A positive % indicates the share is trading at a discount below intrinsic value.
 * A negative % indicates the share is trading at a premium above intrinsic value.
 */
export const calculateMarginOfSafety = (price, grahamNumber) => {
  const p = Number(price || 0);
  const g = Number(grahamNumber || 0);
  if (p <= 0 || g <= 0) return null;
  return Number((((g - p) / g) * 100).toFixed(2));
};

/**
 * 3. Earnings Yield % (Buffett's "Equity-as-a-Bond" Yield)
 * Formula: (EPS / Price) * 100 or (1 / P/E) * 100
 * Measures the percentage of annual earnings generated per Taka invested.
 */
export const calculateEarningsYield = (pe) => {
  const val = Number(pe || 0);
  if (val <= 0) return null;
  return Number(((1 / val) * 100).toFixed(2));
};

/**
 * 4. Warren Buffett Economic Moat Assessment
 * Evaluates pricing power, capital compounding, and balance sheet protection.
 */
export const getMoatAssessment = (roe, debtToEquity = null) => {
  const r = Number(roe || 0);
  const de = debtToEquity !== null && debtToEquity !== undefined ? Number(debtToEquity) : null;

  if (r >= 20 && (de === null || de <= 0.6)) {
    return {
      tier: 'Wide Moat',
      badge: '🏰 Wide Moat',
      color: 'emerald',
      desc: 'Exceptional pricing power and sustainable economic moat capable of compounding shareholder capital.'
    };
  }
  if (r >= 14) {
    return {
      tier: 'Narrow Moat',
      badge: '🛡️ Narrow Moat',
      color: 'blue',
      desc: 'Solid competitive advantage with steady above-average return on shareholder equity.'
    };
  }
  return {
    tier: 'No Moat',
    badge: '⚖️ No Moat',
    color: 'slate',
    desc: 'Vulnerable to commoditized pricing pressure or moderate capital return.'
  };
};

/**
 * 5. Composite Warren Buffett Quality Score (0 - 100)
 * Evaluates 4 pillars: Return on Equity (30%), Solvency/Debt (25%), Value/P/E (25%), Liquidity (20%).
 */
export const calculateBuffettScore = (stock) => {
  if (!stock) return null;
  let pointsScored = 0;
  let maxPossible = 0;

  // A. Economic Moat (Return on Equity) - Max 30 pts
  if (stock.roe !== null && stock.roe !== undefined) {
    maxPossible += 30;
    const roe = Number(stock.roe);
    if (roe >= 22) pointsScored += 30;
    else if (roe >= 16) pointsScored += 24;
    else if (roe >= 12) pointsScored += 16;
    else if (roe >= 8) pointsScored += 8;
  }

  // B. Financial Health (Debt to Equity) - Max 25 pts
  if (stock.debtToEquity !== null && stock.debtToEquity !== undefined) {
    maxPossible += 25;
    const de = Number(stock.debtToEquity);
    if (de <= 0.20) pointsScored += 25;
    else if (de <= 0.40) pointsScored += 20;
    else if (de <= 0.60) pointsScored += 14;
    else if (de <= 0.80) pointsScored += 6;
  }

  // C. Valuation Multiple (P/E) - Max 25 pts
  if (stock.pe !== null && stock.pe !== undefined && stock.pe > 0) {
    maxPossible += 25;
    const pe = Number(stock.pe);
    if (pe <= 10) pointsScored += 25;
    else if (pe <= 14) pointsScored += 20;
    else if (pe <= 18) pointsScored += 12;
    else if (pe <= 24) pointsScored += 5;
  }

  // D. Short-Term Liquidity (Current Ratio) - Max 20 pts
  if (stock.currentRatio !== null && stock.currentRatio !== undefined) {
    maxPossible += 20;
    const cr = Number(stock.currentRatio);
    if (cr >= 1.8) pointsScored += 20;
    else if (cr >= 1.4) pointsScored += 16;
    else if (cr >= 1.1) pointsScored += 10;
    else if (cr >= 0.9) pointsScored += 4;
  }

  if (maxPossible === 0) return null;
  return Math.round((pointsScored / maxPossible) * 100);
};

// Enriches stock record strictly from database values without hardcoded mocks
export function getEnrichedStock(stock) {
  if (!stock) return null;
  const sym = String(stock.symbol || "").toUpperCase();
  const sector = stock.sector || "Miscellaneous";
  const fullName = stock.fullName && stock.fullName !== "N/A" ? stock.fullName : sym;

  const fallbackFlags = { ...(stock._historyFallback || {}) };

  // Use strictly authentic values from DB / DSE publications without made up numbers
  const ltp = stock.ltp != null ? Number(stock.ltp) : null;
  const ycp = stock.ycp != null ? Number(stock.ycp) : null;
  const change = stock.change != null ? Number(stock.change) : null;
  const changePercent = stock.changePercent != null ? Number(stock.changePercent) : null;
  const eps = stock.eps != null ? Number(stock.eps) : null;
  const navPerShare = stock.navPerShare != null ? Number(stock.navPerShare) : null;
  const debtToEquity = stock.debtToEquity != null ? Number(stock.debtToEquity) : null;
  const currentRatio = stock.currentRatio != null ? Number(stock.currentRatio) : null;
  const volume = stock.volume != null ? Number(stock.volume) : null;

  // Daily P/E strictly computed: LTP / Audited EPS
  const dailyPe = (ltp !== null && eps !== null && eps > 0)
    ? Number((ltp / eps).toFixed(2))
    : (stock.pe != null ? Number(stock.pe) : null);

  // Audited P/E strictly computed: YCP / Audited EPS
  const auditedPe = (ycp !== null && eps !== null && eps > 0)
    ? Number((ycp / eps).toFixed(2))
    : dailyPe;

  // ROE strictly computed: (Audited EPS / Audited NAVPS) * 100
  const roe = (eps !== null && navPerShare !== null && navPerShare > 0)
    ? Number(((eps / navPerShare) * 100).toFixed(2))
    : (stock.roe != null ? Number(stock.roe) : null);

  const auditedPeriod = stock.auditedPeriod || null;
  const quarterlyDisclosure = stock.quarterlyDisclosure || null;

  return {
    ...stock,
    symbol: sym,
    fullName,
    sector,
    ltp,
    ycp,
    change,
    changePercent,
    pe: dailyPe,
    dailyPe,
    auditedPe,
    roe,
    eps,
    navPerShare,
    debtToEquity,
    currentRatio,
    volume,
    auditedPeriod,
    quarterlyDisclosure,
    closeDate: stock.closeDate || null,
    marketCap: stock.marketCap || (ltp !== null && stock.paidUpCapital ? Number(((stock.paidUpCapital / 10) * ltp).toFixed(2)) : null),
    _historyFallback: fallbackFlags
  };
}

// Format period badge (e.g. FY25 Audited, FY24 Audited, FY26 Audited)
export function formatPeriodBadge(periodStr, _symbol = '', _sector = '') {
  if (!periodStr) return 'Audited';

  const p = String(periodStr).toUpperCase();
  if (p.includes('Q1') && (p.includes('2026') || p.includes('FY26'))) return 'FY26 Q1 Audited';
  if (p.includes('Q2') && (p.includes('2026') || p.includes('FY26'))) return 'FY26 Q2 Audited';
  if (p.includes('Q3') && (p.includes('2026') || p.includes('FY26'))) return 'FY26 Q3 Audited';
  if (p.includes('2026') || p.includes('FY26')) return 'FY26 Audited';
  if (p.includes('2025') || p.includes('FY25')) return 'FY25 Audited';
  if (p.includes('2024') || p.includes('FY24')) return 'FY24 Audited';
  if (p.includes('2023') || p.includes('FY23')) return 'FY23 Audited';

  return periodStr;
}

// Helper to extract clean closing and audited tags without the word 'history'
export function getFallbackTag(stock, field) {
  const fb = stock?._historyFallback?.[field];
  if (!fb) return null;
  if (typeof fb === 'string') {
    if (fb.startsWith('Close') || fb.startsWith('Audited')) return fb;
    const isDaily = ['ltp', 'change', 'changePercent', 'volume', 'pe', 'momentum'].includes(field);
    return isDaily ? 'Daily Close' : 'Audited';
  }
  if (fb.type === 'daily') {
    const dStr = fb.date ? fb.date.slice(0, 10) : '';
    return dStr ? `Close (${dStr})` : 'Daily Close';
  }
  return fb.year ? `Audited (${fb.year})` : 'Audited';
}
