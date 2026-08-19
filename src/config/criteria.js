// Configurable KPI Scoring Presets & Explanations

export const STRATEGY_PRESETS = [
  {
    id: "balanced",
    name: "🎯 DSE Balanced (Standard)",
    description: "Well-rounded criteria balancing reasonable valuation, capital returns, and low debt.",
    thresholds: {
      pe: 15,
      roe: 15,
      momentum: 1.0,
      debtToEquity: 0.60,
      currentRatio: 1.20,
      eps: 2.0,
      volume: 10000
    }
  },
  {
    id: "value",
    name: "🏛️ Warren Buffett Deep Value",
    description: "Focus on deeply undervalued bargains with fortress balance sheets and high ROE.",
    thresholds: {
      pe: 12,
      roe: 18,
      momentum: -0.5,
      debtToEquity: 0.40,
      currentRatio: 1.40,
      eps: 3.5,
      volume: 25000
    }
  },
  {
    id: "growth",
    name: "🚀 High Growth & Momentum",
    description: "Targets aggressive price velocity, strong earnings per share expansion, and high liquidity.",
    thresholds: {
      pe: 22,
      roe: 14,
      momentum: 2.5,
      debtToEquity: 0.70,
      currentRatio: 1.10,
      eps: 4.0,
      volume: 100000
    }
  },
  {
    id: "defensive",
    name: "🛡️ Capital Preservation",
    description: "Ultra-conservative criteria prioritizing zero debt stress, high liquidity buffer, and steady EPS.",
    thresholds: {
      pe: 14,
      roe: 12,
      momentum: 0.0,
      debtToEquity: 0.35,
      currentRatio: 1.60,
      eps: 2.5,
      volume: 15000
    }
  }
];

export const defaultCriteria = STRATEGY_PRESETS[0];

export const KPI_DESCRIPTIONS = {
  pe: {
    title: "Price-to-Earnings (P/E)",
    rule: "Lower is Better (< threshold)",
    unit: "x",
    explanation: "Compares the stock's current share price to its annual per-share earnings. A low P/E suggests the stock may be undervalued relative to its earning power."
  },
  roe: {
    title: "Return on Equity (ROE)",
    rule: "Higher is Better (> threshold)",
    unit: "%",
    explanation: "Measures how efficiently management uses shareholder capital to generate profits. A high ROE (>15%) indicates a strong competitive advantage."
  },
  momentum: {
    title: "Daily Price Momentum",
    rule: "Higher is Better (> threshold)",
    unit: "%",
    explanation: "Percentage price change over recent trading sessions. Positive momentum indicates active accumulation and buying volume."
  },
  debtToEquity: {
    title: "Debt-to-Equity Ratio",
    rule: "Lower is Better (< threshold)",
    unit: "",
    explanation: "Total debt divided by total shareholder equity. Lower values (<0.5) denote a solid balance sheet with minimal risk from interest burdens."
  },
  currentRatio: {
    title: "Current Liquidity Ratio",
    rule: "Higher is Better (> threshold)",
    unit: "x",
    explanation: "Measures ability to pay short-term obligations (Current Assets / Current Liabilities). Ratios above 1.2 indicate healthy cash flow and working capital."
  },
  eps: {
    title: "Earnings Per Share (EPS)",
    rule: "Higher is Better (> threshold)",
    unit: "BDT",
    explanation: "Net profit generated per outstanding share. High and growing EPS fuels dividend payouts and capital appreciation."
  },
  volume: {
    title: "Trading Volume",
    rule: "Higher is Better (> threshold)",
    unit: "shares",
    explanation: "Number of shares traded. High volume ensures liquidity, narrow bid-ask spreads, and effortless entry and exit for investors."
  }
};
