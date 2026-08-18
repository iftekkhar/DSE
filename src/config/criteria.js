// Default scoring thresholds and weights for verdict computation
export const defaultCriteria = {
  thresholds: {
    pe: 15,            // P/E below this is considered undervalued
    roe: 15,           // ROE above this is considered good
    momentum: 1.5,     // % change threshold for positive momentum
    debtToEquity: 0.6, // below this considered low leverage
    currentRatio: 1.2, // above this considered healthy liquidity
    eps: 2,            // EPS above this considered healthy
    volume: 1000       // trading volume above this considered active
  },
  weights: {
    // kept for backward-compatibility but scoring is now 1 point per KPI in the UI logic
    pe: 1,
    roe: 1,
    momentum: 1,
    debtToEquity: 1,
    currentRatio: 1,
    eps: 1,
    volume: 1
  },
  // Descriptions shown in tooltips for KPI cards
  descriptions: {
    pe: 'Price-to-Earnings ratio. Lower often indicates undervaluation compared to peers.',
    roe: 'Return on Equity. Higher values indicate efficient use of shareholder capital.',
    momentum: 'Short-term price momentum (percentage change). Positive values indicate upward movement.',
    debtToEquity: 'Debt-to-Equity ratio. Lower values mean lower leverage and financial risk.',
    currentRatio: 'Current ratio (current assets / current liabilities). Higher values indicate better short-term liquidity.',
    eps: 'Earnings per share. Higher EPS generally indicates better profitability.',
    volume: 'Trading volume. Higher volume implies better liquidity and easier execution.'
  },
  // status color classes used throughout the app for consistency
  statusClasses: {
    pass: 'text-emerald-600',   // green
    fail: 'text-rose-600',      // red
    neutral: 'text-amber-600'   // yellow
  }
};
