import { useState, useEffect, useMemo } from 'react';
import {
  X, Star, AlertTriangle, Check,
  Sparkles, Scale, Activity, Clock, FileSpreadsheet,
  ShieldCheck, Bookmark
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStockHistory, generateHistoryData, downloadExcel } from '../services/api';
import {
  formatDateDDMMM,
  formatPeriodBadge,
  calculateGrahamNumber,
  calculateMarginOfSafety,
  calculateEarningsYield,
  getMoatAssessment,
  calculateBuffettScore
} from '../services/dseData';

const TIME_RANGES = [
  { id: '7D', label: '7D', fullLabel: 'Last 7 Days (Closing Balance)', days: 7, limit: 7 },
  { id: '1M', label: '1M', fullLabel: '1 Month', days: 30, limit: 30 },
  { id: '3M', label: '3M', fullLabel: '3 Months', days: 90, limit: 90 },
  { id: '6M', label: '6M', fullLabel: '6 Months', days: 180, limit: 180 },
  { id: '1Y', label: '1Y', fullLabel: '1 Year', days: 365, limit: 365 },
  { id: '5Y', label: '5Y', fullLabel: '5 Years', days: 1825, limit: 1825 },
  { id: '20Y', label: '20Y', fullLabel: '20 Years (All Archive)', days: 7500, limit: 7500 }
];

export default function StockModal({
  stock,
  onClose,
  criteria,
  watchlist,
  onToggleWatchlist,
  compareList,
  onToggleCompare
}) {
  const [savedHistory, setSavedHistory] = useState(null);
  const [timeRange, setTimeRange] = useState('7D'); // Default: Last 7 days closing balance

  const symbol = stock?.symbol;

  useEffect(() => {
    let active = true;
    if (symbol) {
      fetchStockHistory(symbol)
        .then((pts) => {
          if (active) {
            if (pts && pts.length > 0) setSavedHistory(pts);
            else setSavedHistory(null);
          }
        })
        .catch(() => {
          if (active) setSavedHistory(null);
        });
    }
    return () => {
      active = false;
    };
  }, [symbol]);

  // Compute filtered timeline data for chart & performance metrics
  const { chartData, metrics } = useMemo(() => {
    const rawTimeline = generateHistoryData(stock, savedHistory);

    if (!rawTimeline || rawTimeline.length === 0) {
      const fallback = stock?.ltp !== null && stock?.ltp !== undefined
        ? [{ day: 'Latest Close', price: Number(stock.ltp), volume: stock.volume || 0 }]
        : [];
      return { chartData: fallback, metrics: null };
    }

    // Strict 1 closing price per calendar date (YYYY-MM-DD)
    const seenDates = new Set();
    const fullTimeline = [];
    for (const pt of rawTimeline) {
      const dStr = String(pt.rawDate || pt.timestamp || pt.fetchedAt || '').slice(0, 10);
      const price = Number(pt.price ?? pt.ltp ?? pt.close ?? 0);
      if (dStr && price > 0 && !seenDates.has(dStr)) {
        seenDates.add(dStr);
        fullTimeline.push({
          ...pt,
          rawDate: dStr,
          timestamp: dStr,
          price: price,
          volume: Number(pt.volume || 0),
          dateObj: new Date(dStr)
        });
      }
    }

    const currentCfg = TIME_RANGES.find(r => r.id === timeRange) || TIME_RANGES[0];

    // Filter by calendar cutoff date for accurate real-world timeframes
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - currentCfg.days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    let slice = timeRange === '20Y'
      ? fullTimeline
      : fullTimeline.filter(pt => pt.rawDate >= cutoffStr);

    if (!slice || slice.length < Math.min(5, fullTimeline.length)) {
      slice = fullTimeline.slice(-currentCfg.limit);
    }

    const formatted = slice.map((pt) => {
      let label = pt.rawDate;
      if (pt.rawDate && pt.rawDate.length >= 10) {
        const parts = pt.rawDate.split('-');
        if (parts.length === 3) {
          const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          label = timeRange === '20Y' || timeRange === '5Y'
            ? `${mNames[mIdx]} '${parts[0].slice(2)}`
            : `${parseInt(parts[2], 10)} ${mNames[mIdx]}`;
        }
      }
      return {
        ...pt,
        day: label || 'Close',
        fullDate: pt.rawDate,
        displayPrice: pt.price.toFixed(2),
        volume: Number(pt.volume || 0)
      };
    });

    // Compute period performance metrics
    if (formatted.length >= 2) {
      const firstClose = formatted[0].price;
      const lastClose = formatted[formatted.length - 1].price;
      const priceDiff = lastClose - firstClose;
      const periodReturn = Number((((lastClose - firstClose) / firstClose) * 100).toFixed(2));
      const prices = formatted.map(p => p.price);
      const periodHigh = Math.max(...prices);
      const periodLow = Math.min(...prices);

      return {
        chartData: formatted,
        metrics: {
          periodReturn,
          priceDiff: Number(priceDiff.toFixed(2)),
          periodHigh,
          periodLow,
          firstClose,
          lastClose,
          dataPoints: formatted.length,
          startDate: formatted[0].fullDate,
          endDate: formatted[formatted.length - 1].fullDate
        }
      };
    }

    return { chartData: formatted, metrics: null };
  }, [stock, savedHistory, timeRange]);

  if (!stock) return null;

  const isSaved = watchlist.includes(stock.symbol);
  const isCompared = compareList.some(s => s.symbol === stock.symbol);
  const isBullish = (stock.changePercent || 0) >= 0;
  const closeDate = stock.closeDate || stock.date || null;
  const dateLabel = closeDate ? formatDateDDMMM(closeDate) : 'Latest';
  const periodBadge = formatPeriodBadge(stock.auditedPeriod || stock.quarterlyDisclosure, stock.symbol, stock.sector);

  // Buffett Valuation Computations (Strictly from actual DB fundamentals & prices)
  const eps = stock.eps !== null && stock.eps !== undefined ? Number(stock.eps) : null;
  const navps = stock.navPerShare !== null && stock.navPerShare !== undefined ? Number(stock.navPerShare) : null;
  const ltp = stock.ltp !== null && stock.ltp !== undefined ? Number(stock.ltp) : null;
  const pe = stock.pe !== null && stock.pe !== undefined ? Number(stock.pe) : null;
  const roe = stock.roe !== null && stock.roe !== undefined ? Number(stock.roe) : null;

  const grahamNumber = calculateGrahamNumber(eps, navps);
  const marginOfSafety = calculateMarginOfSafety(ltp, grahamNumber);
  const earningsYield = calculateEarningsYield(pe);
  const moat = getMoatAssessment(roe);
  const buffettScore = calculateBuffettScore(stock);

  // Bond spread: Earnings yield minus 10Y Bangladesh Govt Treasury Bond benchmark (11.50%)
  const bondSpread = earningsYield !== null ? Number((earningsYield - 11.50).toFixed(2)) : null;

  // Thresholds from active criteria
  const t = criteria?.thresholds || {
    pe: 15,
    roe: 15,
    momentum: 1,
    debtToEquity: 0.6,
    currentRatio: 1.2,
    eps: 2,
    volume: 10000
  };

  // Signals analysis cards list (Plain English layman-friendly insights)
  const peVal = stock.pe !== null && stock.pe !== undefined ? Number(stock.pe) : null;
  const roeVal = stock.roe !== null && stock.roe !== undefined ? Number(stock.roe) : null;
  const cpVal = stock.changePercent !== null && stock.changePercent !== undefined ? Number(stock.changePercent) : null;
  const deVal = stock.debtToEquity !== null && stock.debtToEquity !== undefined ? Number(stock.debtToEquity) : null;

  const signals = [
    // 1. Valuation Pillar (P/E)
    {
      pillar: 'Valuation (P/E)',
      question: 'Are you getting a bargain?',
      type: peVal !== null && peVal < 15 ? 'pass' : 'warn',
      title: peVal !== null
        ? (peVal < 12 ? `Deep Value Bargain (P/E: ${peVal.toFixed(2)}x)` : peVal <= 18 ? `Fair Market Price (P/E: ${peVal.toFixed(2)}x)` : `Premium Price Tag (P/E: ${peVal.toFixed(2)}x)`)
        : 'Valuation Multiple Check',
      desc: peVal !== null
        ? (peVal < 12
            ? `Tells you how many Takas you must pay in share price for every ৳1 the company makes in annual profit. At P/E ${peVal.toFixed(2)}x, you are buying profits at a deep discount below the DSE average.`
            : peVal <= 18
              ? `Tells you how many Takas you must pay in share price for every ৳1 the company makes in profit. At P/E ${peVal.toFixed(2)}x, the stock is trading at a fair and standard market valuation.`
              : `Tells you how many Takas you must pay in share price for every ৳1 the company makes in profit. At P/E ${peVal.toFixed(2)}x, investors are paying a premium price for anticipated future earnings growth.`)
        : 'EPS or price data is unavailable, so price-to-earnings cannot be evaluated.'
    },

    // 2. Capital Return Pillar (ROE)
    {
      pillar: 'Capital Return (ROE)',
      question: 'How hard is your money working?',
      type: roeVal !== null && roeVal >= 15 ? 'pass' : 'warn',
      title: roeVal !== null
        ? (roeVal >= 15 ? `High Profit Generator (ROE: ${roeVal.toFixed(2)}%)` : `Moderate Return (ROE: ${roeVal.toFixed(2)}%)`)
        : 'Capital Return Rate',
      desc: roeVal !== null
        ? (roeVal >= 15
            ? `For every ৳100 in shareholder equity, the business produces ৳${roeVal.toFixed(2)} in net profit each year—demonstrating superior management efficiency in compounding your capital.`
            : `For every ৳100 in shareholder equity, the business produces ৳${roeVal.toFixed(2)} in annual profit—stable, but below the 15% institutional high-growth benchmark.`)
        : 'Audited book value or earnings are unavailable in published filings.'
    },

    // 3. Buyer Demand Pillar (Momentum)
    {
      pillar: 'Buyer Demand (Momentum)',
      question: 'Are buyers actively pushing the price up?',
      type: cpVal !== null && cpVal >= 0 ? 'pass' : 'warn',
      title: cpVal !== null
        ? (cpVal > 0 ? `Active Buyer Demand (+${cpVal.toFixed(2)}%)` : cpVal < 0 ? `Selling Consolidation (${cpVal.toFixed(2)}%)` : 'Balanced Session (0.00%)')
        : 'Session Momentum Check',
      desc: cpVal !== null
        ? (cpVal > 0
            ? `Shows whether market participants are actively accumulating the stock. In the latest session, buyers actively pushed the price up by +${cpVal.toFixed(2)}%.`
            : cpVal < 0
              ? `Shows whether market participants are actively accumulating or taking profits. The share price closed lower (${cpVal.toFixed(2)}%) due to selling pressure.`
              : 'Shows whether market participants are actively accumulating or taking profits. Buyers and sellers closed in complete equilibrium (0.00%).')
        : 'Daily session closing movement is not recorded.'
    },

    // 4. Solvency Pillar (Debt/Equity)
    {
      pillar: 'Solvency (Debt/Equity)',
      question: 'Is the company safe from loan trouble?',
      type: deVal !== null && deVal <= 0.6 ? 'pass' : 'warn',
      title: deVal !== null
        ? (deVal <= 0.6 ? `Low Debt & High Safety (D/E: ${deVal.toFixed(2)})` : `Elevated Debt Load (D/E: ${deVal.toFixed(2)})`)
        : 'Debt to Equity Not Available',
      desc: deVal !== null
        ? (deVal <= 0.6
            ? `Measures how much the company relies on bank borrowing versus its own funds. With just ৳${deVal.toFixed(2)} debt per ৳1 equity, low debt protects the company during interest rate hikes.`
            : `Measures how much the company relies on bank borrowing versus its own funds. At ৳${deVal.toFixed(2)} debt per ৳1 equity, higher loan obligations require consistent cash flow to service interest.`)
        : 'Solvency breakdown was not disclosed in the filing (common for banking and financial sector balance sheets).'
    }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white text-slate-900 w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-6 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 bg-[#0f172a]">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0f172a] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1d4ed8] flex items-center justify-center font-display font-black text-sm text-white shadow-md shrink-0 uppercase">
              {stock.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-lg sm:text-xl text-white tracking-tight leading-none uppercase">
                  {stock.symbol}
                </h2>
                <span className="text-[10px] text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-700/50">
                  {stock.sector || 'Equities'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-[320px] mt-0.5">
                {stock.fullName || stock.symbol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onToggleWatchlist(stock.symbol)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                isSaved ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Toggle Watchlist"
            >
              <Star className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => onToggleCompare(stock)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all active:scale-95 cursor-pointer ${
                isCompared ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Toggle Compare"
            >
              <Scale className="w-4 h-4 text-blue-400" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-1 active:scale-95 cursor-pointer"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 text-xs touch-scroll pb-safe">
          
          {/* Top 3 Metric Cards Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* 1. CLOSING PRICE */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Closing Price
                </span>
                <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {dateLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-1">
                <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  ৳{stock.ltp !== null && stock.ltp !== undefined ? Number(stock.ltp).toFixed(2) : '—'}
                </span>
                <span className={`font-mono text-xs font-bold ${isBullish ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {stock.changePercent !== null && stock.changePercent !== undefined ? `${isBullish ? '+' : ''}${Number(stock.changePercent).toFixed(2)}%` : '—'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Yesterday Close (YCP): <strong className="text-slate-700 font-mono">৳{stock.ycp !== null && stock.ycp !== undefined ? Number(stock.ycp).toFixed(2) : '—'}</strong>
              </div>
            </div>

            {/* 2. STRATEGY SCORE */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                Strategy Score
              </span>
              <div className="flex items-baseline gap-2 my-1">
                <span className="font-display text-2xl sm:text-3xl font-black text-slate-900">
                  {stock.verdictScore !== null && stock.verdictScore !== undefined ? stock.verdictScore : 0}/7
                </span>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  🎯 {criteria.name || 'DSE Balanced (Standard)'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    stock.verdict === 'BUY' ? 'bg-emerald-500' : stock.verdict === 'HOLD' ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${((stock.verdictScore || 0) / 7) * 100}%` }}
                />
              </div>
            </div>

            {/* 3. VERDICT */}
            <div className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
              stock.verdict === 'BUY'
                ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                : stock.verdict === 'HOLD'
                  ? 'bg-amber-50/50 border-amber-300 text-amber-950'
                  : 'bg-rose-50/50 border-rose-300 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Verdict</span>
                <span className={`font-black uppercase tracking-wider text-sm ${
                  stock.verdict === 'BUY' ? 'text-emerald-700' : stock.verdict === 'HOLD' ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {stock.verdict || 'HOLD'}
                </span>
              </div>
              <p className="text-[11px] font-medium leading-relaxed mt-1 text-slate-700">
                {stock.verdict === 'BUY' && 'Strong fundamental & momentum alignment.'}
                {stock.verdict === 'HOLD' && 'Fair fundamentals, awaiting breakout volume.'}
                {stock.verdict === 'RISK' && 'Elevated debt or depressed liquidity detected.'}
                {stock.verdict === 'HIGH RISK' && 'Multiple severe KPI failures detected.'}
              </p>
            </div>
          </div>

          {/* Section 1: 7-POINT FUNDAMENTAL MATRIX */}
          <div>
            <h3 className="font-display text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>7-Point Fundamental Matrix (Daily Closing P/E: {stock.pe !== null && stock.pe !== undefined ? `${Number(stock.pe).toFixed(2)}x` : 'N/A'})</span>
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
              
              {/* 1. Daily P/E */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                stock.verdictChecks?.pe ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Daily P/E</span>
                  <span className={`text-[10px] font-bold ${stock.verdictChecks?.pe ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stock.verdictChecks?.pe ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div className="font-mono text-base font-black text-slate-900 my-1">
                  {stock.pe !== null && stock.pe !== undefined ? `${Number(stock.pe).toFixed(2)}x` : 'N/A'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Target: &lt; {t.pe}x</span>
                  <span className="text-blue-700 bg-blue-50 px-1 rounded">Daily: {dateLabel}</span>
                </div>
              </div>

              {/* 2. Return on Equity */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                stock.verdictChecks?.roe ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Return on Equity</span>
                  <span className={`text-[10px] font-bold ${stock.verdictChecks?.roe ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stock.verdictChecks?.roe ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div className="font-mono text-base font-black text-slate-900 my-1">
                  {stock.roe !== null && stock.roe !== undefined ? `${Number(stock.roe).toFixed(2)}%` : '—'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Target: &gt; {t.roe}%</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{periodBadge}</span>
                </div>
              </div>

              {/* 3. Closing Momentum */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                stock.verdictChecks?.momentum ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Closing Momentum</span>
                  <span className={`text-[10px] font-bold ${stock.verdictChecks?.momentum ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stock.verdictChecks?.momentum ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div className="font-mono text-base font-black text-slate-900 my-1">
                  {stock.changePercent !== null && stock.changePercent !== undefined ? `${isBullish ? '+' : ''}${Number(stock.changePercent).toFixed(2)}%` : '—'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Target: &gt; {t.momentum}%</span>
                  <span className="text-blue-700 bg-blue-50 px-1 rounded">{dateLabel}</span>
                </div>
              </div>

              {/* 4. Debt / Equity */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                stock.verdictChecks?.debtToEquity ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Debt / Equity</span>
                  <span className={`text-[10px] font-bold ${stock.verdictChecks?.debtToEquity ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stock.verdictChecks?.debtToEquity ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div className="font-mono text-sm font-black text-slate-900 my-1 truncate">
                  {stock.debtToEquity !== null && stock.debtToEquity !== undefined ? Number(stock.debtToEquity).toFixed(2) : 'Not Available'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Target: &lt; {t.debtToEquity}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{periodBadge}</span>
                </div>
              </div>

              {/* 5. Current Ratio */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                stock.verdictChecks?.currentRatio ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Current Ratio</span>
                  <span className={`text-[10px] font-bold ${stock.verdictChecks?.currentRatio ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stock.verdictChecks?.currentRatio ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div className="font-mono text-sm font-black text-slate-900 my-1 truncate">
                  {stock.currentRatio !== null && stock.currentRatio !== undefined ? `${Number(stock.currentRatio).toFixed(2)}x` : 'Not Available'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Target: &gt; {t.currentRatio}x</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{periodBadge}</span>
                </div>
              </div>

              {/* 6. EPS (Audited) */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                stock.verdictChecks?.eps ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">EPS (Audited)</span>
                  <span className={`text-[10px] font-bold ${stock.verdictChecks?.eps ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stock.verdictChecks?.eps ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div className="font-mono text-base font-black text-slate-900 my-1">
                  {stock.eps !== null && stock.eps !== undefined ? `৳${Number(stock.eps).toFixed(2)}` : '—'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Target: &gt; ৳{t.eps}</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{periodBadge}</span>
                </div>
              </div>

              {/* 7. Trading Volume */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between ${
                stock.verdictChecks?.volume ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold">Trading Volume</span>
                  <span className={`text-[10px] font-bold ${stock.verdictChecks?.volume ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {stock.verdictChecks?.volume ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div className="font-mono text-base font-black text-slate-900 my-1">
                  {stock.volume !== null && stock.volume !== undefined ? Number(stock.volume).toLocaleString() : '—'}
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                  <span>Target: &gt; {Number(t.volume).toLocaleString()}</span>
                  <span className="text-blue-700 bg-blue-50 px-1 rounded">{dateLabel}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: AUDITED FINANCIAL DISCLOSURES */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="font-display text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-[#2563eb]" />
                <span>Audited Financial Disclosures ({periodBadge.toUpperCase()})</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-medium">
                Settlement Date: <strong className="text-slate-800">{dateLabel}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 font-mono">
              
              {/* Audited P/E */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Audited P/E</span>
                <span className="text-base font-black text-slate-900 block my-0.5">
                  {stock.auditedPe !== null && stock.auditedPe !== undefined ? `${Number(stock.auditedPe).toFixed(2)}x` : '—'}
                </span>
                <span className="text-[8px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-sans font-semibold">
                  {periodBadge}
                </span>
              </div>

              {/* Audited EPS */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Audited EPS</span>
                <span className="text-base font-black text-slate-900 block my-0.5">
                  {stock.eps !== null && stock.eps !== undefined ? `৳${Number(stock.eps).toFixed(2)}` : '—'}
                </span>
                <span className="text-[8px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-sans font-semibold">
                  {periodBadge}
                </span>
              </div>

              {/* NAV Per Share */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">NAV Per Share</span>
                <span className="text-base font-black text-slate-900 block my-0.5">
                  {stock.navPerShare !== null && stock.navPerShare !== undefined ? `৳${Number(stock.navPerShare).toFixed(2)}` : '—'}
                </span>
                <span className="text-[8px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-sans font-semibold">
                  {periodBadge}
                </span>
              </div>

              {/* Paid-Up Capital */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Paid-Up Capital</span>
                <span className="text-base font-black text-slate-900 block my-0.5">
                  {stock.paidUpCapital ? `৳${Number(stock.paidUpCapital).toLocaleString()}M` : '—'}
                </span>
                <span className="text-[8.5px] text-slate-500 font-sans">
                  {stock.authorizedCapital ? `Auth: ৳${Number(stock.authorizedCapital).toLocaleString()}M` : 'Auth: —'}
                </span>
              </div>

              {/* Market Cap */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Market Cap</span>
                <span className="text-base font-black text-slate-900 block my-0.5">
                  {stock.marketCap ? `৳${Number(stock.marketCap).toLocaleString()}M` : '—'}
                </span>
                <span className="text-[8.5px] text-blue-700 font-sans">
                  As of {dateLabel}
                </span>
              </div>

              {/* Dividend Yield */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[9px] font-bold text-slate-400 block uppercase">Dividend Yield</span>
                <span className="text-base font-black text-slate-900 block my-0.5">
                  {stock.dividendYield !== null && stock.dividendYield !== undefined ? `${Number(stock.dividendYield).toFixed(2)}%` : '—'}
                </span>
                <span className="text-[8px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-sans font-semibold">
                  {periodBadge}
                </span>
              </div>

            </div>
          </div>

          {/* Section 3: WARREN BUFFETT & GRAHAM VALUE INSIGHTS */}
          <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Warren Buffett & Graham Value Insights</span>
              </h3>
              <div className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold font-mono shadow-xs">
                <span>Buffett Quality:</span>
                <span>{buffettScore !== null && buffettScore !== undefined ? `${buffettScore} / 100` : '—'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Economic Moat */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Economic Moat</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                      {moat?.badge || '⚖️ Unrated'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {moat?.desc || 'Pricing power and compounding returns on shareholder capital.'}
                  </p>
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-900 mt-2 pt-2 border-t border-slate-100">
                  ROE : <span className="text-emerald-700">{stock.roe !== null && stock.roe !== undefined ? `${Number(stock.roe).toFixed(2)}%` : '—'}</span>
                </div>
              </div>

              {/* Graham Fair Value */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Graham Fair Value</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-mono">
                      {marginOfSafety !== null && marginOfSafety !== undefined ? `${marginOfSafety >= 0 ? '+' : ''}${marginOfSafety.toFixed(2)}% Discount` : 'N/A'}
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-black text-slate-900">
                    {grahamNumber !== null && grahamNumber !== undefined ? `৳${grahamNumber.toFixed(2)}` : 'N/A'}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-600 mt-2 pt-2 border-t border-slate-100">
                  Margin of Safety: <strong className="text-emerald-700">{marginOfSafety !== null && marginOfSafety !== undefined ? `${marginOfSafety.toFixed(2)}%` : 'N/A'}</strong>
                </div>
              </div>

              {/* Earnings Yield */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Earnings Yield (1/PE)</span>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md font-mono">
                      {bondSpread !== null ? `${bondSpread >= 0 ? '+' : ''}${bondSpread}% vs Bond` : 'N/A'}
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-black text-slate-900">
                    {earningsYield !== null && earningsYield !== undefined ? `${earningsYield.toFixed(2)}%` : 'N/A'}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  Govt 10Y Bond Benchmark: <strong className="text-slate-800">11.50%</strong>
                </div>
              </div>

            </div>
          </div>

          {/* Section 4: DAILY CLOSING PRICES CHART */}
          <div className="card-elevation p-3.5 sm:p-4 border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Clock className="w-4 h-4 text-[#2563eb]" />
                <span className="font-display font-bold text-xs text-slate-900">
                  Daily Closing Prices
                </span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 font-mono font-medium">
                  {metrics?.dataPoints || chartData.length} trading sessions ({timeRange})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadExcel(stock.symbol)}
                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 font-bold rounded-lg text-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono font-bold">BDT</span>
              </div>
            </div>

            {/* Range Selector & Return Indicator */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar touch-scroll">
                {TIME_RANGES.map((rng) => (
                  <button
                    key={rng.id}
                    onClick={() => setTimeRange(rng.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                      timeRange === rng.id
                        ? 'bg-[#2563eb] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {rng.label}
                  </button>
                ))}
              </div>

              {metrics && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    metrics.periodReturn >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    {metrics.periodReturn >= 0 ? '↗' : '↘'} {metrics.periodReturn >= 0 ? '+' : ''}{metrics.periodReturn}% (৳{metrics.priceDiff >= 0 ? '+' : ''}{metrics.priceDiff})
                  </span>
                  <span className="text-[11px] text-slate-500 font-sans">
                    H: <strong className="text-slate-800 font-mono">৳{metrics.periodHigh.toFixed(2)}</strong> • L: <strong className="text-slate-800 font-mono">৳{metrics.periodLow.toFixed(2)}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Area Chart */}
            <div className="w-full h-48 sm:h-56">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `৳${v}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0].payload;
                          return (
                            <div className="bg-[#0f172a] text-white p-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-mono">
                              <div className="text-[10px] text-slate-400">{d.fullDate || d.day}</div>
                              <div className="text-sm font-bold text-blue-400">৳{d.displayPrice || d.price}</div>
                              {d.volume > 0 && (
                                <div className="text-[10px] text-slate-300">Vol: {Number(d.volume).toLocaleString()}</div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#priceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-mono">
                  Loading Historical Closing Records...
                </div>
              )}
            </div>
          </div>

          {/* Section 5: SIGNAL ANALYSIS */}
          <div>
            <h3 className="font-display text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Signal Analysis</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {signals.map((sig, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border flex items-start gap-2.5 transition-all ${
                    sig.type === 'pass'
                      ? 'bg-white border-emerald-200/90 shadow-xs'
                      : 'bg-white border-amber-200/90 shadow-xs'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {sig.type === 'pass' ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {sig.pillar}
                      </span>
                      <span className="text-[10px] italic text-[#2563eb] font-semibold truncate">
                        &ldquo;{sig.question}&rdquo;
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 text-xs block leading-tight">
                      {sig.title}
                    </span>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      {sig.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 6: AI INTELLIGENCE SUMMARY */}
          <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200/80 flex items-start gap-2.5">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-display font-bold text-xs text-blue-950 block">
                AI Intelligence Summary
              </span>
              <p className="text-xs text-slate-700 leading-relaxed mt-0.5">
                <strong className="text-slate-900">{stock.symbol}</strong> demonstrates {stock.roe !== null && stock.roe !== undefined && stock.roe >= 15 ? 'superior' : 'moderate'} capital efficiency (ROE: {stock.roe !== null && stock.roe !== undefined ? `${Number(stock.roe).toFixed(2)}%` : '—'}) and {stock.pe !== null && stock.pe !== undefined && stock.pe < 15 ? 'attractive' : 'standard'} valuation multiples. Balanced risk profile for medium-term capital compounding.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer with Close Action */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#0f172a] hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
