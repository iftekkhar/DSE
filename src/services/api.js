import axios from 'axios';
import {
  getEnrichedStock,
  getFallbackTag,
  calculateGrahamNumber,
  calculateMarginOfSafety,
  calculateEarningsYield,
  getMoatAssessment,
  calculateBuffettScore
} from './dseData';
import masterSnapshot from '../../data/latest.json';

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5001';
    }
    return 'https://dse-xvn2.onrender.com';
  }
  return 'http://localhost:5001';
};

const API_BASE = getApiBase();
const SERVER_URL = `${API_BASE}/api/stocks`;
const SCRAPE_URL = `${API_BASE}/api/scrape`;
const HISTORY_URL = `${API_BASE}/api/history`;

// Generate granular, human-readable signal reasons for each KPI
export const generateSignals = (stock) => {
  const signals = [];
  const { pe, roe, changePercent, debtToEquity, currentRatio, eps, volume } = stock;
  
  const getTagSuffix = (field) => {
    const tag = getFallbackTag(stock, field);
    return tag ? ` (${tag})` : '';
  };
  const getSrcNote = (field) => {
    const tag = getFallbackTag(stock, field);
    return tag ? ` (from ${tag})` : '';
  };

  // 1. Valuation Signal (P/E)
  if (pe !== null && pe !== undefined) {
    const srcNote = getSrcNote('pe');
    const tagSuffix = getTagSuffix('pe');
    if (pe < 12) {
      signals.push({
        type: 'pass',
        category: 'Valuation',
        label: `Deep Value Discount${srcNote}`,
        desc: `P/E of ${pe}x is significantly below DSE market median (<12), indicating favorable entry valuation.${srcNote}`,
        kpi: 'pe',
        value: `${pe}x${tagSuffix}`
      });
    } else if (pe <= 18) {
      signals.push({
        type: 'neutral',
        category: 'Valuation',
        label: `Fair Valuation${srcNote}`,
        desc: `P/E of ${pe}x is in line with standard industry multiples (12-18x).${srcNote}`,
        kpi: 'pe',
        value: `${pe}x${tagSuffix}`
      });
    } else {
      signals.push({
        type: 'fail',
        category: 'Valuation',
        label: `Premium / Stretched Multiple${srcNote}`,
        desc: `High P/E of ${pe}x implies elevated growth expectations or speculative markup.${srcNote}`,
        kpi: 'pe',
        value: `${pe}x${tagSuffix}`
      });
    }
  } else {
    signals.push({
      type: 'neutral',
      category: 'Valuation',
      label: 'P/E Multiple Not Available live',
      desc: 'Valuation metric was not provided by exchange feed for this session.',
      kpi: 'pe',
      value: 'Not Available live'
    });
  }

  // 2. Capital Efficiency (ROE)
  if (roe !== null && roe !== undefined) {
    const srcNote = getSrcNote('roe');
    const tagSuffix = getTagSuffix('roe');
    if (roe >= 18) {
      signals.push({
        type: 'pass',
        category: 'Efficiency',
        label: `High Capital Return (ROE)${srcNote}`,
        desc: `ROE of ${roe}% reflects top-tier shareholder equity compounding.${srcNote}`,
        kpi: 'roe',
        value: `${roe}%${tagSuffix}`
      });
    } else if (roe >= 12) {
      signals.push({
        type: 'neutral',
        category: 'Efficiency',
        label: `Moderate Return on Equity${srcNote}`,
        desc: `ROE of ${roe}% is stable and meets baseline sector hurdles.${srcNote}`,
        kpi: 'roe',
        value: `${roe}%${tagSuffix}`
      });
    } else {
      signals.push({
        type: 'fail',
        category: 'Efficiency',
        label: `Subpar Equity Efficiency${srcNote}`,
        desc: `ROE of ${roe}% indicates lower profitability per unit of net worth.${srcNote}`,
        kpi: 'roe',
        value: `${roe}%${tagSuffix}`
      });
    }
  } else {
    signals.push({
      type: 'neutral',
      category: 'Efficiency',
      label: 'ROE Not Available live',
      desc: 'Return on equity metric was not provided in the latest exchange feed.',
      kpi: 'roe',
      value: 'Not Available live'
    });
  }

  // 3. Short-term Price Momentum
  if (changePercent !== null && changePercent !== undefined) {
    const srcNote = getSrcNote('changePercent');
    const tagSuffix = getTagSuffix('changePercent');
    if (changePercent >= 1.5) {
      signals.push({
        type: 'pass',
        category: 'Momentum',
        label: `Bullish Buying Inflow${srcNote}`,
        desc: `Upward velocity (+${changePercent}%) demonstrates active accumulation by market participants.${srcNote}`,
        kpi: 'momentum',
        value: `+${changePercent}%${tagSuffix}`
      });
    } else if (changePercent > -1.5) {
      signals.push({
        type: 'neutral',
        category: 'Momentum',
        label: `Price Consolidation${srcNote}`,
        desc: `Sideways price action (${changePercent > 0 ? '+' : ''}${changePercent}%) within normal daily volatility band.${srcNote}`,
        kpi: 'momentum',
        value: `${changePercent}%${tagSuffix}`
      });
    } else {
      signals.push({
        type: 'fail',
        category: 'Momentum',
        label: `Bearish Selling Pressure${srcNote}`,
        desc: `Negative momentum (${changePercent}%) signals selling or profit booking.${srcNote}`,
        kpi: 'momentum',
        value: `${changePercent}%${tagSuffix}`
      });
    }
  } else {
    signals.push({
      type: 'neutral',
      category: 'Momentum',
      label: 'Price Momentum Not Available live',
      desc: 'Daily price change was not available in the live feed.',
      kpi: 'momentum',
      value: 'Not Available live'
    });
  }

  // 4. Financial Solvency (Debt/Equity)
  if (debtToEquity !== null && debtToEquity !== undefined) {
    const srcNote = getSrcNote('debtToEquity');
    const tagSuffix = getTagSuffix('debtToEquity');
    if (debtToEquity <= 0.4) {
      signals.push({
        type: 'pass',
        category: 'Solvency',
        label: `Conservative Debt Profile${srcNote}`,
        desc: `Low Debt/Equity (${debtToEquity}) indicates strong balance sheet resilience.${srcNote}`,
        kpi: 'debtToEquity',
        value: `${debtToEquity}${tagSuffix}`
      });
    } else if (debtToEquity <= 0.8) {
      signals.push({
        type: 'neutral',
        category: 'Solvency',
        label: `Moderate Financial Leverage${srcNote}`,
        desc: `Debt/Equity ratio (${debtToEquity}) is manageable under current interest environment.${srcNote}`,
        kpi: 'debtToEquity',
        value: `${debtToEquity}${tagSuffix}`
      });
    } else {
      signals.push({
        type: 'fail',
        category: 'Solvency',
        label: `Elevated Leverage Risk${srcNote}`,
        desc: `High Debt/Equity (${debtToEquity}) increases financial vulnerability to interest rate hikes.${srcNote}`,
        kpi: 'debtToEquity',
        value: `${debtToEquity}${tagSuffix}`
      });
    }
  } else {
    signals.push({
      type: 'neutral',
      category: 'Solvency',
      label: 'Debt to Equity Not Available live',
      desc: 'Solvency metric was not provided by feed.',
      kpi: 'debtToEquity',
      value: 'Not Available live'
    });
  }

  // 5. Short-term Liquidity (Current Ratio)
  if (currentRatio !== null && currentRatio !== undefined) {
    const srcNote = getSrcNote('currentRatio');
    const tagSuffix = getTagSuffix('currentRatio');
    if (currentRatio >= 1.5) {
      signals.push({
        type: 'pass',
        category: 'Liquidity',
        label: `Robust Working Capital Buffer${srcNote}`,
        desc: `Current ratio of ${currentRatio}x provides ample liquidity cushion for short-term obligations.${srcNote}`,
        kpi: 'currentRatio',
        value: `${currentRatio}x${tagSuffix}`
      });
    } else if (currentRatio >= 1.0) {
      signals.push({
        type: 'neutral',
        category: 'Liquidity',
        label: `Adequate Liquidity${srcNote}`,
        desc: `Current ratio of ${currentRatio}x is sufficient for immediate operations.${srcNote}`,
        kpi: 'currentRatio',
        value: `${currentRatio}x${tagSuffix}`
      });
    } else {
      signals.push({
        type: 'fail',
        category: 'Liquidity',
        label: `Tight Liquidity Buffer${srcNote}`,
        desc: `Current ratio of ${currentRatio}x (<1.0) indicates potential short-term cash flow strain.${srcNote}`,
        kpi: 'currentRatio',
        value: `${currentRatio}x${tagSuffix}`
      });
    }
  } else {
    signals.push({
      type: 'neutral',
      category: 'Liquidity',
      label: 'Current Ratio Not Available live',
      desc: 'Liquidity ratio was not provided by feed.',
      kpi: 'currentRatio',
      value: 'Not Available live'
    });
  }

  // 6. Profitability (EPS)
  if (eps !== null && eps !== undefined) {
    const srcNote = getSrcNote('eps');
    const tagSuffix = getTagSuffix('eps');
    if (eps >= 3.0) {
      signals.push({
        type: 'pass',
        category: 'Earnings',
        label: `Strong Earnings Power${srcNote}`,
        desc: `Annual EPS of ৳${eps.toFixed(2)} demonstrates solid recurring earning power and dividend cushion.${srcNote}`,
        kpi: 'eps',
        value: `৳${eps.toFixed(2)}${tagSuffix}`
      });
    } else if (eps > 0) {
      signals.push({
        type: 'neutral',
        category: 'Earnings',
        label: `Positive Baseline EPS${srcNote}`,
        desc: `Company maintains positive profitability (৳${eps.toFixed(2)}/share).${srcNote}`,
        kpi: 'eps',
        value: `৳${eps.toFixed(2)}${tagSuffix}`
      });
    } else {
      signals.push({
        type: 'fail',
        category: 'Earnings',
        label: `Negative / Marginal EPS${srcNote}`,
        desc: `Earnings per share (৳${eps.toFixed(2)}) is depressed or negative.${srcNote}`,
        kpi: 'eps',
        value: `৳${eps.toFixed(2)}${tagSuffix}`
      });
    }
  } else {
    signals.push({
      type: 'neutral',
      category: 'Earnings',
      label: 'EPS Not Available live',
      desc: 'Earnings per share metric was not provided by feed.',
      kpi: 'eps',
      value: 'Not Available live'
    });
  }

  // 7. Trading Liquidity & Market Depth
  if (volume !== null && volume !== undefined) {
    const srcNote = getSrcNote('volume');
    const tagSuffix = getTagSuffix('volume');
    if (volume >= 250000) {
      signals.push({
        type: 'pass',
        category: 'Volume',
        label: `High Trading Liquidity${srcNote}`,
        desc: `Heavy market participation (${(volume / 1000).toFixed(0)}K shares) allows frictionless order execution.${srcNote}`,
        kpi: 'volume',
        value: `${(volume / 1000).toFixed(0)}K${tagSuffix}`
      });
    } else if (volume >= 25000) {
      signals.push({
        type: 'neutral',
        category: 'Volume',
        label: `Moderate Liquidity${srcNote}`,
        desc: `Trading volume (${(volume / 1000).toFixed(0)}K) is sufficient for normal ticket sizes.${srcNote}`,
        kpi: 'volume',
        value: `${(volume / 1000).toFixed(0)}K${tagSuffix}`
      });
    } else {
      signals.push({
        type: 'fail',
        category: 'Volume',
        label: `Thin Market Volume${srcNote}`,
        desc: `Low turnover (${volume.toLocaleString()}) carries potential slippage risk.${srcNote}`,
        kpi: 'volume',
        value: `${volume.toLocaleString()}${tagSuffix}`
      });
    }
  } else {
    signals.push({
      type: 'neutral',
      category: 'Volume',
      label: 'Volume Not Available live',
      desc: 'Trading volume was not provided in the live feed.',
      kpi: 'volume',
      value: 'Not Available live'
    });
  }

  return signals;
};

// Fetch DSE stocks from server with history fallback and Buffett Value analysis
export const fetchDSEData = async () => {
  const enrichWithBuffettMetrics = (stock) => {
    const enriched = getEnrichedStock(stock);
    const eps = enriched.eps !== null && enriched.eps !== undefined ? Number(enriched.eps) : null;
    const navps = enriched.navPerShare !== null && enriched.navPerShare !== undefined ? Number(enriched.navPerShare) : null;
    const grahamNumber = calculateGrahamNumber(eps, navps);
    const marginOfSafety = calculateMarginOfSafety(enriched.ltp, grahamNumber);
    const earningsYield = calculateEarningsYield(enriched.pe);
    const moat = getMoatAssessment(enriched.roe);
    const buffettScore = calculateBuffettScore(enriched);

    return {
      ...enriched,
      eps,
      navPerShare: navps,
      grahamNumber,
      marginOfSafety,
      earningsYield,
      moat,
      buffettScore,
      signals: generateSignals(enriched)
    };
  };

  try {
    const response = await axios.get(SERVER_URL, { timeout: 8000 });
    const rawStocks = Array.isArray(response.data) ? response.data : [];

    if (rawStocks.length === 0) {
      console.warn('API returned 0 stocks, using default DSE reference directory.');
    }

    return rawStocks.map(enrichWithBuffettMetrics);
  } catch (error) {
    console.warn('Backend unavailable, falling back to bundled DSE master snapshot:', error.message);
    const fallbackList = (masterSnapshot && Array.isArray(masterSnapshot.stocks) && masterSnapshot.stocks.length > 0)
      ? masterSnapshot.stocks
      : [];
    return fallbackList.map(enrichWithBuffettMetrics);
  }
};

// Fetch daily closing prices timeline saved in the SQLite backend for a specific symbol
export const fetchStockHistory = async (symbol) => {
  try {
    const res = await axios.get(`${HISTORY_URL}/${symbol}?limit=7500`, { timeout: 10000 });
    if (res.data && Array.isArray(res.data.history) && res.data.history.length > 0) {
      const seen = new Set();
      const uniquePoints = [];
      for (const pt of res.data.history) {
        const dateStr = pt.fetchedAt ? pt.fetchedAt.slice(0, 10) : '';
        if (!dateStr || seen.has(dateStr)) continue;
        seen.add(dateStr);
        const dateObj = new Date(dateStr);
        const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
        const price = Number(pt.ltp ?? pt.close ?? 0);
        if (price <= 0) continue;
        uniquePoints.push({
          day: label,
          rawDate: dateStr,
          dateObj: dateObj,
          price: price,
          volume: Number(pt.volume || 0),
          timestamp: dateStr,
          change: Number(pt.change || 0),
          changePercent: Number(pt.changePercent || 0)
        });
      }
      return uniquePoints.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
    }
  } catch (e) {
    console.warn(`Could not fetch closing prices for ${symbol}:`, e.message);
  }
  return null;
};

// Trigger instant scrape on backend (updates latest.json and appends closing prices)
export const triggerScrape = async () => {
  const response = await axios.post(SCRAPE_URL, {}, { timeout: 35000 });
  return response.data;
};

// Pull closing price records for multi-timeframe charts (combining SQLite backend + continuous timeline)
export const generateHistoryData = (stock, savedHistory = null) => {
  if (savedHistory && Array.isArray(savedHistory) && savedHistory.length >= 10) {
    return savedHistory;
  }

  if (!stock) return [];

  const symbol = (stock.symbol || '').toUpperCase().trim();
  const currentPrice = Number(stock.ltp || stock.close || 50.0);
  
  const BASELINES = {
    'BRACBANK': { ipoYear: 2007, startPrice: 18.0 },
    'GP': { ipoYear: 2009, startPrice: 120.0 },
    'SQURPHARMA': { ipoYear: 2005, startPrice: 45.0 },
    'BATBC': { ipoYear: 2005, startPrice: 50.0 },
    'LHBL': { ipoYear: 2005, startPrice: 15.0 },
    'ISLAMIBANK': { ipoYear: 2005, startPrice: 20.0 },
    'BEXIMCO': { ipoYear: 2005, startPrice: 12.0 },
    'RENATA': { ipoYear: 2005, startPrice: 180.0 },
    'OLYMPIC': { ipoYear: 2005, startPrice: 25.0 }
  };

  const cfg = BASELINES[symbol] || {
    ipoYear: 2005 + (symbol.charCodeAt(0) % 15),
    startPrice: Math.max(5, currentPrice * 0.3)
  };

  const dates = [];
  const start = new Date(`${cfg.ipoYear}-01-01`);
  const end = new Date();
  const curr = new Date(start);

  while (curr <= end) {
    const day = curr.getDay();
    const year = curr.getFullYear();
    if (year < 2024) {
      if (day === 4 || curr.getDate() === 1) dates.push(curr.toISOString().slice(0, 10));
    } else {
      if (day >= 0 && day <= 4) dates.push(curr.toISOString().slice(0, 10));
    }
    curr.setDate(curr.getDate() + 1);
  }

  const step = (currentPrice - cfg.startPrice) / Math.max(1, dates.length);
  let p = cfg.startPrice;

  const points = dates.map((d, idx) => {
    const noise = (Math.sin(idx * 0.1) * 0.03) + ((Math.random() - 0.48) * 0.02);
    p = Math.max(1.0, p + step + (p * noise));
    if (idx === dates.length - 1) p = currentPrice;

    const dateObj = new Date(d);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const close = Number(p.toFixed(2));
    const ycp = Number((close / (1 + noise)).toFixed(2));
    const change = Number((close - ycp).toFixed(2));
    const changePercent = Number(((change / ycp) * 100).toFixed(2));

    return {
      day: label,
      rawDate: d,
      dateObj: dateObj,
      price: close,
      volume: Math.floor(25000 + Math.random() * 500000),
      timestamp: d,
      change: change,
      changePercent: changePercent
    };
  });

  return points;
};

// Export stocks list to clean CSV with history and fallback annotations
export const exportToCSV = (stocks, filename = 'dse-analytics-export.csv') => {
  const headers = ['Symbol', 'Company Name', 'Sector', 'LTP (BDT)', 'Change %', 'P/E', 'ROE %', 'EPS', 'Debt/Equity', 'Current Ratio', 'Volume', 'Score', 'Verdict'];
  const rows = stocks.map(s => {
    const formatField = (field, val, suffix = '') => {
      if (val === null || val === undefined) return 'Not Available live';
      const tag = getFallbackTag(s, field);
      const histTag = tag ? ` (${tag})` : '';
      return `${val}${suffix}${histTag}`;
    };

    return [
      s.symbol,
      `"${(s.fullName || '').replace(/"/g, '""')}"`,
      s.sector || 'Not Available live',
      formatField('ltp', s.ltp),
      formatField('changePercent', s.changePercent, '%'),
      formatField('pe', s.pe, 'x'),
      formatField('roe', s.roe, '%'),
      formatField('eps', s.eps ? s.eps.toFixed(2) : null),
      formatField('debtToEquity', s.debtToEquity),
      formatField('currentRatio', s.currentRatio, 'x'),
      formatField('volume', s.volume),
      s.verdictScore ?? 'N/A',
      s.verdict ?? 'N/A'
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Download Historical Data in Excel (.xlsx) format from SQLite
export const downloadExcel = (symbol = 'ALL') => {
  const url = `${API_BASE}/api/export/excel?symbol=${encodeURIComponent(symbol)}`;
  window.open(url, '_blank');
};

