import { useState, useEffect } from 'react';
import {
  X, Star, CheckCircle2, AlertTriangle, XCircle,
  Sparkles, Scale, Info, Activity, Clock, FileSpreadsheet
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { generateHistoryData, fetchStockHistory, downloadExcel } from '../services/api';
import { getFallbackTag } from '../services/dseData';
import { KPI_DESCRIPTIONS } from '../config/criteria';

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

  if (!stock) return null;

  const isSaved = watchlist.includes(stock.symbol);
  const isCompared = compareList.some(s => s.symbol === stock.symbol);
  const isBullish = (stock.changePercent || 0) >= 0;
  const historyData = generateHistoryData(stock, savedHistory);

  const t = criteria.thresholds;
  const kpis = [
    {
      key: 'pe',
      label: 'P/E Multiple',
      value: stock.pe !== null && stock.pe !== undefined ? `${stock.pe}x` : 'Not Available live',
      historyTag: getFallbackTag(stock, 'pe'),
      threshold: `< ${t.pe}x`,
      passed: stock.pe !== null && stock.pe !== undefined ? stock.pe < t.pe : false,
      info: KPI_DESCRIPTIONS.pe
    },
    {
      key: 'roe',
      label: 'Return on Equity',
      value: stock.roe !== null && stock.roe !== undefined ? `${stock.roe}%` : 'Not Available live',
      historyTag: getFallbackTag(stock, 'roe'),
      threshold: `> ${t.roe}%`,
      passed: stock.roe !== null && stock.roe !== undefined ? stock.roe > t.roe : false,
      info: KPI_DESCRIPTIONS.roe
    },
    {
      key: 'momentum',
      label: '24h Momentum',
      value: stock.changePercent !== null && stock.changePercent !== undefined ? `${stock.changePercent > 0 ? '+' : ''}${stock.changePercent}%` : 'Not Available live',
      historyTag: getFallbackTag(stock, 'changePercent'),
      threshold: `> ${t.momentum}%`,
      passed: stock.changePercent !== null && stock.changePercent !== undefined ? stock.changePercent > t.momentum : false,
      info: KPI_DESCRIPTIONS.momentum
    },
    {
      key: 'debtToEquity',
      label: 'Debt / Equity',
      value: stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity : 'Not Available live',
      historyTag: getFallbackTag(stock, 'debtToEquity'),
      threshold: `< ${t.debtToEquity}`,
      passed: stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity < t.debtToEquity : false,
      info: KPI_DESCRIPTIONS.debtToEquity
    },
    {
      key: 'currentRatio',
      label: 'Current Ratio',
      value: stock.currentRatio !== null && stock.currentRatio !== undefined ? `${stock.currentRatio}x` : 'Not Available live',
      historyTag: getFallbackTag(stock, 'currentRatio'),
      threshold: `> ${t.currentRatio}x`,
      passed: stock.currentRatio !== null && stock.currentRatio !== undefined ? stock.currentRatio > t.currentRatio : false,
      info: KPI_DESCRIPTIONS.currentRatio
    },
    {
      key: 'eps',
      label: 'EPS',
      value: stock.eps !== null && stock.eps !== undefined ? `৳${stock.eps.toFixed(2)}` : 'Not Available live',
      historyTag: getFallbackTag(stock, 'eps'),
      threshold: `> ৳${t.eps}`,
      passed: stock.eps !== null && stock.eps !== undefined ? stock.eps > t.eps : false,
      info: KPI_DESCRIPTIONS.eps
    },
    {
      key: 'volume',
      label: 'Volume',
      value: stock.volume !== null && stock.volume !== undefined ? stock.volume.toLocaleString() : 'Not Available live',
      historyTag: getFallbackTag(stock, 'volume'),
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
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Last Price (LTP)
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-slate-900">
                  ৳{stock.ltp !== null && stock.ltp !== undefined ? stock.ltp.toFixed(2) : '—'}
                </span>
                <span className={`font-mono text-xs font-bold ${isBullish ? 'text-[#047857]' : 'text-[#b91c1c]'}`}>
                  {isBullish ? '+' : ''}{stock.changePercent || 0}%
                </span>
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
                  className={`p-2.5 rounded-xl border ${
                    kpi.passed ? 'bg-emerald-50/30 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mb-0.5">
                    <span>{kpi.label}</span>
                    <div className="flex items-center gap-1">
                      {kpi.historyTag && (
                        <span className="text-[8px] font-semibold text-amber-700 bg-amber-100 px-1 py-0.2 rounded border border-amber-300" title="Retrieved from saved history">
                          {kpi.historyTag}
                        </span>
                      )}
                      {kpi.passed ? (
                        <span className="text-[#047857] font-bold text-[9px]">Pass</span>
                      ) : (
                        <span className="text-[#b91c1c] font-bold text-[9px]">Fail</span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-base font-black text-slate-900 truncate">
                    {kpi.value}
                  </div>
                  <div className="text-[9px] text-slate-400">Target: {kpi.threshold}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved History Timeline Chart */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[11px] font-bold text-slate-700">
                  Saved App History Timeline
                </span>
                {savedHistory && (
                  <span className="text-[9px] text-blue-700 bg-blue-100 px-1.5 py-0.2 rounded font-semibold">
                    {savedHistory.length} snapshots recorded
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadExcel(stock.symbol)}
                  className="flex items-center gap-1 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300 transition-colors shadow-xs"
                  title="Download company 20-year history in Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>Export Excel</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono">BDT</span>
              </div>
            </div>

            {loadingHistory ? (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400">
                Loading saved history...
              </div>
            ) : historyData.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400 italic">
                No historical records saved for this scrip yet. Click Sync to record snapshots.
              </div>
            ) : (
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                      formatter={(val) => [`৳${val}`, 'Price']}
                    />
                    <Area type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#priceGrad)" />
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
