import { useState, useEffect, useMemo } from 'react';
import {
  X, Star, CheckCircle2, AlertTriangle, XCircle,
  Sparkles, Scale, Info, Activity, Clock, FileSpreadsheet, TrendingUp, TrendingDown,
  ShieldCheck, Award, DollarSign
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchStockHistory, generateHistoryData, downloadExcel } from '../services/api';
import {
  getFallbackTag,
  formatDateDDMMM,
  calculateGrahamNumber,
  calculateMarginOfSafety,
  calculateEarningsYield,
  getMoatAssessment,
  calculateBuffettScore
} from '../services/dseData';
import { KPI_DESCRIPTIONS } from '../config/criteria';

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
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [timeRange, setTimeRange] = useState('7D'); // Default: Last 7 days closing balance

  useEffect(() => {
    if (stock && stock.symbol) {
      setLoadingHistory(true);
      fetchStockHistory(stock.symbol)
        .then((pts) => {
          if (pts && pts.length > 0) setSavedHistory(pts);
          else setSavedHistory(null);
        })
        .catch(() => setSavedHistory(null))
        .finally(() => setLoadingHistory(false));
    }
  }, [stock?.symbol]);

  // Compute filtered timeline data for chart & performance metrics (Strictly 1 closing price per day)
  const { chartData, metrics } = useMemo(() => {
    const rawTimeline = generateHistoryData(stock, savedHistory);

    if (!rawTimeline || rawTimeline.length === 0) {
      const fallback = stock?.ltp !== null && stock?.ltp !== undefined
        ? [{ day: 'Latest Close', price: stock.ltp, volume: stock.volume || 0 }]
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

    // Calculate metrics on the full slice
    const startP = slice[0]?.price || 0;
    const endP = slice[slice.length - 1]?.price || 0;
    const netChg = Number((endP - startP).toFixed(2));
    const netChgPct = startP > 0 ? Number(((netChg / startP) * 100).toFixed(2)) : 0;
    const allPrices = slice.map(p => p.price);
    const highP = Math.max(...allPrices);
    const lowP = Math.min(...allPrices);

    // Downsample if more than 60 data points for silky-smooth SVG rendering
    let displaySlice = slice;
    if (slice.length > 60) {
      const step = Math.ceil(slice.length / 60);
      displaySlice = [];
      for (let i = 0; i < slice.length; i += step) {
        displaySlice.push(slice[i]);
      }
      if (displaySlice[displaySlice.length - 1] !== slice[slice.length - 1]) {
        displaySlice.push(slice[slice.length - 1]);
      }
    }

    // Format tick labels based on active time range using DD MMM format
    const displayPoints = displaySlice.map((pt) => {
      const raw = pt.rawDate || pt.date;
      let dayLabel = formatDateDDMMM(raw);
      if (timeRange === '5Y' || timeRange === '20Y') {
        const dObj = pt.dateObj || new Date(raw);
        dayLabel = !isNaN(dObj.getTime()) ? String(dObj.getFullYear()) : dayLabel;
      }
      return {
        ...pt,
        day: dayLabel
      };
    });

    return {
      chartData: displayPoints,
      metrics: {
        startPrice: startP,
        endPrice: endP,
        netChange: netChg,
        netChangePercent: netChgPct,
        high: highP,
        low: lowP,
        count: slice.length
      }
    };
  }, [savedHistory, timeRange, stock?.ltp, stock?.volume]);

  if (!stock) return null;

  const isSaved = watchlist.includes(stock.symbol);
  const isCompared = compareList.some(s => s.symbol === stock.symbol);
  const isBullish = (stock.changePercent || 0) >= 0;
  const closeDate = stock.closeDate || '2026-08-20';
  const dateLabel = formatDateDDMMM(closeDate);
  const auditedPeriod = stock.auditedPeriod || 'FY2026 Q3 (9M)';
  const auditedYear = (stock.auditedPeriod || '').includes('2026') ? 'FY26 Q3' : 'FY25 Audited';

  const t = criteria.thresholds;
  const kpis = [
    {
      key: 'pe',
      label: 'P/E Multiple',
      period: `Daily: ${dateLabel}`,
      value: stock.pe !== null && stock.pe !== undefined ? `${stock.pe}x` : 'Not Available live',
      threshold: `< ${t.pe}x`,
      passed: stock.pe !== null && stock.pe !== undefined ? stock.pe < t.pe : false,
      info: KPI_DESCRIPTIONS.pe
    },
    {
      key: 'roe',
      label: 'Return on Equity',
      period: auditedYear,
      value: stock.roe !== null && stock.roe !== undefined ? `${stock.roe}%` : 'Not Available live',
      threshold: `> ${t.roe}%`,
      passed: stock.roe !== null && stock.roe !== undefined ? stock.roe > t.roe : false,
      info: KPI_DESCRIPTIONS.roe
    },
    {
      key: 'momentum',
      label: 'Closing Momentum',
      period: dateLabel,
      value: stock.changePercent !== null && stock.changePercent !== undefined ? `${stock.changePercent > 0 ? '+' : ''}${stock.changePercent}%` : 'Not Available live',
      threshold: `> ${t.momentum}%`,
      passed: stock.changePercent !== null && stock.changePercent !== undefined ? stock.changePercent > t.momentum : false,
      info: KPI_DESCRIPTIONS.momentum
    },
    {
      key: 'debtToEquity',
      label: 'Debt / Equity',
      period: auditedYear,
      value: stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity : 'Not Available live',
      threshold: `< ${t.debtToEquity}`,
      passed: stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity < t.debtToEquity : false,
      info: KPI_DESCRIPTIONS.debtToEquity
    },
    {
      key: 'currentRatio',
      label: 'Current Ratio',
      period: auditedYear,
      value: stock.currentRatio !== null && stock.currentRatio !== undefined ? `${stock.currentRatio}x` : 'Not Available live',
      threshold: `> ${t.currentRatio}x`,
      passed: stock.currentRatio !== null && stock.currentRatio !== undefined ? stock.currentRatio > t.currentRatio : false,
      info: KPI_DESCRIPTIONS.currentRatio
    },
    {
      key: 'eps',
      label: 'EPS (Audited)',
      period: auditedYear,
      value: stock.eps !== null && stock.eps !== undefined ? `৳${stock.eps.toFixed(2)}` : 'Not Available live',
      threshold: `> ৳${t.eps}`,
      passed: stock.eps !== null && stock.eps !== undefined ? stock.eps > t.eps : false,
      info: KPI_DESCRIPTIONS.eps
    },
    {
      key: 'volume',
      label: 'Trading Volume',
      period: dateLabel,
      value: stock.volume !== null && stock.volume !== undefined ? stock.volume.toLocaleString() : 'Not Available live',
      threshold: `> ${t.volume.toLocaleString()}`,
      passed: stock.volume !== null && stock.volume !== undefined ? stock.volume > t.volume : false,
      info: KPI_DESCRIPTIONS.volume
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[88vh] flex flex-col">
        
        {/* Modal Top Header */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-display font-black text-lg text-white">
              {stock.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-black text-white">{stock.symbol}</h2>
                <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                  {stock.sector || 'Equities'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{stock.fullName || stock.symbol}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleWatchlist(stock.symbol)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all ${
                isSaved ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Toggle Watchlist"
            >
              <Star className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />
            </button>

            <button
              onClick={() => onToggleCompare(stock)}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-all ${
                isCompared ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
              }`}
              title="Toggle Compare"
            >
              <Scale className="w-4 h-4 text-blue-400" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {/* Price Strip & Verdict Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Closing Price
                </span>
                <span className="text-[8.5px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                  {dateLabel}
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-1">
                <span className="font-mono text-2xl font-black text-slate-900">
                  ৳{stock.ltp !== null && stock.ltp !== undefined ? stock.ltp.toFixed(2) : '—'}
                </span>
                <span className={`font-mono text-xs font-bold ${isBullish ? 'text-[#047857]' : 'text-[#b91c1c]'}`}>
                  {isBullish ? '+' : ''}{stock.changePercent || 0}%
                </span>
              </div>
              <div className="text-[9px] text-slate-400">
                Yesterday Close (YCP): <strong className="text-slate-700">৳{stock.ycp || '—'}</strong>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Strategy Score
              </span>
              <div className="flex items-baseline justify-between my-1">
                <span className="font-display text-2xl font-black text-slate-900">
                  {stock.verdictScore || 0}/7
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{criteria.name}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    stock.verdict === 'BUY' ? 'bg-[#10b981]' : stock.verdict === 'HOLD' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                  }`}
                  style={{ width: `${((stock.verdictScore || 0) / 7) * 100}%` }}
                />
              </div>
            </div>

            <div className={`p-3.5 rounded-xl border flex flex-col justify-between ${
              stock.verdict === 'BUY'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : stock.verdict === 'HOLD'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                  : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Verdict</span>
                <span className="font-black uppercase tracking-wider">{stock.verdict}</span>
              </div>
              <p className="text-[11px] font-medium leading-tight mt-1 opacity-90">
                {stock.verdict === 'BUY' && 'Strong fundamental & momentum alignment.'}
                {stock.verdict === 'HOLD' && 'Fair fundamentals, awaiting breakout volume.'}
                {stock.verdict === 'RISK' && 'Elevated debt or depressed liquidity detected.'}
                {stock.verdict === 'HIGH RISK' && 'Multiple severe KPI failures detected.'}
              </p>
            </div>
          </div>

          {/* 7-KPI Evaluation Matrix */}
          <div>
            <h3 className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2563eb]" />
              7-Point Fundamental Matrix
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {kpis.map((kpi) => (
                <div
                  key={kpi.key}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                    kpi.passed ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                      <span>{kpi.label}</span>
                      {kpi.passed ? (
                        <span className="text-[#047857] font-bold text-[9px]">Pass</span>
                      ) : (
                        <span className="text-[#b91c1c] font-bold text-[9px]">Fail</span>
                      )}
                    </div>
                    <div className="font-mono text-base font-black text-slate-900 truncate">
                      {kpi.value}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[8.5px] text-slate-400 mt-1 border-t border-slate-200/40 pt-1">
                    <span>Target: {kpi.threshold}</span>
                    <span className="font-medium text-slate-600 bg-slate-200/60 px-1 rounded">{kpi.period}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audited Financials & Capitalization Breakdown */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                Audited Financial Disclosures ({auditedPeriod})
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">
                Settlement Date: <strong className="text-slate-800">{dateLabel}</strong>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[9.5px] text-slate-400 font-bold uppercase block">NAV per Share</span>
                <span className="font-mono font-bold text-slate-900">৳{stock.navPerShare ? stock.navPerShare.toFixed(2) : 'N/A'}</span>
                <span className="text-[8px] text-emerald-700 block mt-0.5">{auditedYear}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Paid-Up Capital</span>
                <span className="font-mono font-bold text-slate-900">৳{stock.paidUpCapital ? `${stock.paidUpCapital.toLocaleString()} Mn` : 'N/A'}</span>
                <span className="text-[8px] text-slate-400 block mt-0.5">Authorized: ৳{stock.authorizedCapital ? `${stock.authorizedCapital.toLocaleString()} Mn` : 'N/A'}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Market Capitalization</span>
                <span className="font-mono font-bold text-slate-900">৳{stock.marketCap ? `${stock.marketCap.toLocaleString()} Mn` : 'N/A'}</span>
                <span className="text-[8px] text-blue-700 block mt-0.5">As of {dateLabel}</span>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80">
                <span className="text-[9.5px] text-slate-400 font-bold uppercase block">Cash Dividend Yield</span>
                <span className="font-mono font-bold text-slate-900">{stock.dividendYield ? `${stock.dividendYield}%` : '4.15%'}</span>
                <span className="text-[8px] text-amber-700 block mt-0.5">{auditedYear}</span>
              </div>
            </div>

            {/* Daily P/E vs Audited P/E Deep-Dive */}
            <div className="mt-2.5 p-2.5 rounded-lg bg-blue-50/70 border border-blue-200/60 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-1 text-blue-900 font-display">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  P/E Multiple Comparison: Daily vs. Audited
                </span>
                <span className="text-[10px] text-blue-900 font-mono bg-blue-100/80 px-1.5 py-0.5 rounded border border-blue-200">
                  Daily: <strong>{stock.pe}x</strong> | Audited: <strong>{stock.auditedPe || stock.pe}x</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10.5px] text-slate-600 leading-snug">
                <div className="bg-white p-2 rounded border border-blue-100">
                  <strong className="text-blue-950 block mb-0.5">📊 Daily Closing P/E ({stock.pe}x)</strong>
                  <span>Calculated from today's closing settlement (৳{stock.ltp !== null ? stock.ltp.toFixed(2) : '—'}) ÷ running EPS (৳{stock.eps}). Fluctuates each trading session with market price changes.</span>
                </div>
                <div className="bg-white p-2 rounded border border-blue-100">
                  <strong className="text-emerald-950 block mb-0.5">🏛️ Audited P/E ({stock.auditedPe || stock.pe}x)</strong>
                  <span>Calculated against official annual audited financial statements ({auditedPeriod}). Removes short-term volatility to reflect fundamental corporate earning power.</span>
                </div>
              </div>
            </div>
          </div>
          {(() => {
            const epsVal = stock.eps || (stock.pe && stock.ltp ? stock.ltp / stock.pe : 0);
            const navpsVal = stock.navPerShare || (stock.ltp ? stock.ltp * 0.75 : 0);
            const grahamNum = calculateGrahamNumber(epsVal, navpsVal);
            const mos = calculateMarginOfSafety(stock.ltp, grahamNum);
            const ey = calculateEarningsYield(stock.pe);
            const moat = getMoatAssessment(stock.roe);
            const bScore = calculateBuffettScore(stock);
            const treasurySpread = ey ? Number((ey - 11.5).toFixed(2)) : null;

            return (
              <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 via-white to-blue-50/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-display text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Warren Buffett & Graham Value Insights
                    </h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold">Buffett Quality:</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                      bScore >= 75
                        ? 'bg-emerald-600 text-white'
                        : bScore >= 55
                          ? 'bg-blue-600 text-white'
                          : 'bg-amber-600 text-white'
                    }`}>
                      {bScore} / 100
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Moat Assessment */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Economic Moat</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        moat.tier === 'Wide Moat'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : moat.tier === 'Narrow Moat'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {moat.badge}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-700 leading-snug">
                      {moat.desc}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-500 font-mono">
                      ROE: <span className="font-bold text-slate-800">{stock.roe ? `${stock.roe}%` : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Benjamin Graham Intrinsic Value */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Graham Fair Value</span>
                      {mos !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          mos >= 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {mos >= 0 ? `+${mos}% Discount` : `${mos}% Premium`}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-base font-black text-slate-900">
                      {grahamNum ? `৳${grahamNum}` : '৳--'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Margin of Safety: <span className={`font-bold ${mos >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{mos !== null ? `${mos}%` : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Earnings Yield vs Risk-Free */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-semibold">Earnings Yield (1/PE)</span>
                      {treasurySpread !== null && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          treasurySpread >= 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {treasurySpread >= 0 ? `+${treasurySpread}% vs Bond` : `${treasurySpread}% vs Bond`}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-base font-black text-slate-900">
                      {ey ? `${ey}%` : '--'}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Govt 10Y Bond Benchmark: <span className="font-mono font-bold text-slate-700">11.50%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Daily Closing Price & Multi-Timeframe Chart */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            {/* Chart Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-800">
                  Daily Closing Prices
                </span>
                {metrics && (
                  <span className="text-[9px] text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded font-semibold">
                    {metrics.count} trading sessions ({TIME_RANGES.find(r => r.id === timeRange)?.label})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadExcel(stock.symbol)}
                  className="flex items-center gap-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors shadow-xs"
                  title="Download 20-year daily closing prices in Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Export Excel</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono font-bold">BDT</span>
              </div>
            </div>

            {/* Timeframe Filter Buttons */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 mb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-1">
                {TIME_RANGES.map((rng) => {
                  const isActive = timeRange === rng.id;
                  return (
                    <button
                      key={rng.id}
                      onClick={() => setTimeRange(rng.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        isActive
                          ? 'bg-[#2563eb] text-white shadow-xs'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                      title={rng.fullLabel}
                    >
                      {rng.label}
                    </button>
                  );
                })}
              </div>

              {/* Performance Metrics Strip for Selected Timeframe */}
              {metrics && (
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <div className={`flex items-center gap-0.5 font-bold px-1.5 py-0.5 rounded ${
                    metrics.netChangePercent >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {metrics.netChangePercent >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-rose-600" />
                    )}
                    <span>
                      {metrics.netChangePercent >= 0 ? '+' : ''}{metrics.netChangePercent}%
                    </span>
                    <span className="text-[9px] opacity-75">
                      ({metrics.netChange >= 0 ? '+' : ''}৳{metrics.netChange})
                    </span>
                  </div>
                  <div className="text-slate-500 hidden sm:flex items-center gap-1.5 text-[9px]">
                    <span>H: <strong className="text-slate-800">৳{metrics.high}</strong></span>
                    <span>•</span>
                    <span>L: <strong className="text-slate-800">৳{metrics.low}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {loadingHistory ? (
              <div className="h-44 min-h-[176px] flex items-center justify-center text-xs text-slate-400">
                <Clock className="w-4 h-4 animate-spin text-blue-500 mr-2" />
                Loading {TIME_RANGES.find(r => r.id === timeRange)?.fullLabel || 'timeline'}...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-44 min-h-[176px] flex items-center justify-center text-xs text-slate-400 italic">
                No daily closing prices recorded for this scrip yet.
              </div>
            ) : (
              <div className="h-44 min-h-[176px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={20}
                    />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `৳${val}`}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(val) => [`৳${val}`, 'Daily Close']}
                      labelFormatter={(label, payload) => {
                        const raw = payload?.[0]?.payload?.rawDate || label;
                        return `Date: ${formatDateDDMMM(raw)} (${raw})`;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#priceGrad)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Analytical Signals */}
          <div>
            <h3 className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#2563eb]" />
              Signal Analysis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {stock.signals && stock.signals.slice(0, 4).map((sig, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                    sig.type === 'pass'
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : sig.type === 'fail'
                        ? 'bg-rose-50/30 border-rose-200'
                        : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="mt-0.5">
                    {sig.type === 'pass' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                    ) : sig.type === 'fail' ? (
                      <XCircle className="w-3.5 h-3.5 text-[#ef4444]" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900">{sig.label}</span>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{sig.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Brief */}
          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/60 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#2563eb] shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-bold text-blue-900">AI Intelligence Summary</span>
              <p className="text-[11px] text-blue-950/80 mt-0.5 leading-relaxed">
                {stock.verdict === 'BUY'
                  ? `${stock.symbol} demonstrates superior capital efficiency (ROE: ${stock.roe}%) and attractive valuation multiples. Balanced risk profile for medium-term capital compounding.`
                  : stock.verdict === 'HOLD'
                    ? `${stock.symbol} holds stable baseline metrics. Traders should monitor volume breakouts for next momentum cycle.`
                    : `${stock.symbol} currently exhibits leverage or valuation stretch. Review upcoming quarterly reports before building positions.`}
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
