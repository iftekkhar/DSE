import { useState, useEffect, useMemo } from 'react';
import {
  X, Sparkles, Scale, Activity,
  TrendingUp, TrendingDown,
  Layers, Landmark, Compass,
  ArrowDownRight, RefreshCw, BarChart2,
  Maximize2, Minimize2
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { fetchHistoricalAnalysis } from '../services/api';

const TIMEFRAMES = [
  { id: '1Y', label: '1Y', days: 365 },
  { id: '3Y', label: '3Y', days: 1095 },
  { id: '5Y', label: '5Y', days: 1825 },
  { id: '10Y', label: '10Y', days: 3650 },
  { id: '20Y', label: '20Y (All)', days: 7500 }
];

export default function HistoricalAnalysisModal({
  stock,
  onClose,
  onOpenStockModal
}) {
  const [data, setData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('20Y');
  const [activeCatalyst, setActiveCatalyst] = useState(null);
  const [showDsexOverlay, setShowDsexOverlay] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const symbol = stock?.symbol;

  useEffect(() => {
    let isMounted = true;
    if (symbol) {
      fetchHistoricalAnalysis(symbol)
        .then((res) => {
          if (isMounted) {
            setData(res);
          }
        })
        .catch(() => {
          if (isMounted) {
            setData(null);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [symbol]);

  const loading = !data || data.symbol !== symbol;

  // Filter timeline based on selected timeframe
  const filteredTimeline = useMemo(() => {
    if (!data || !data.timeline || data.timeline.length === 0) return [];
    
    const cfg = TIMEFRAMES.find(t => t.id === selectedTimeframe) || TIMEFRAMES[4];
    if (selectedTimeframe === '20Y') return data.timeline;

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - cfg.days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const filtered = data.timeline.filter(t => t.date >= cutoffStr);
    return filtered.length >= 5 ? filtered : data.timeline.slice(-Math.min(250, data.timeline.length));
  }, [data, selectedTimeframe]);

  // Formatted chart points & relative performance calculation
  const chartData = useMemo(() => {
    if (!filteredTimeline || filteredTimeline.length === 0) {
      return { points: [], alpha: null, stockReturn: null, dsexReturn: null };
    }

    const firstPt = filteredTimeline[0];
    const basePrice = Number(firstPt.price || 1);
    const baseDsex = Number(firstPt.dsex || 1);

    const points = filteredTimeline.map(pt => {
      let label = pt.date;
      if (pt.date && pt.date.length >= 10) {
        const parts = pt.date.split('-');
        if (parts.length === 3) {
          const mNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          label = selectedTimeframe === '20Y' || selectedTimeframe === '10Y' || selectedTimeframe === '5Y'
            ? `${mNames[mIdx]} '${parts[0].slice(2)}`
            : `${parseInt(parts[2], 10)} ${mNames[mIdx]}`;
        }
      }

      const p = Number(pt.price || 0);
      const d = pt.dsex !== null && pt.dsex !== undefined ? Number(pt.dsex) : null;
      const stockReturnPct = Number((((p - basePrice) / basePrice) * 100).toFixed(2));
      const dsexReturnPct = d !== null ? Number((((d - baseDsex) / baseDsex) * 100).toFixed(2)) : 0;

      return {
        ...pt,
        displayDate: label,
        fullDate: pt.date,
        price: p,
        dsex: d,
        stockReturnPct,
        dsexReturnPct,
        priceFormatted: p.toFixed(2),
        dsexFormatted: d !== null ? d.toFixed(2) : '—'
      };
    });

    const lastPt = points[points.length - 1];
    const stockReturn = lastPt ? lastPt.stockReturnPct : 0;
    const dsexReturn = lastPt ? lastPt.dsexReturnPct : 0;
    const alpha = Number((stockReturn - dsexReturn).toFixed(2));

    return { points, alpha, stockReturn, dsexReturn };
  }, [filteredTimeline, selectedTimeframe]);

  const chartPoints = chartData.points;

  if (!stock) return null;

  const currentPrice = data?.currentPrice || stock.ltp || 0;
  const ath = data?.ath || { price: currentPrice, date: '—', drawdownPercent: 0 };
  const atl = data?.atl || { price: currentPrice, date: '—', risePercent: 0 };
  const mdd = data?.maxDrawdown || { percent: 0, peakDate: '—', troughDate: '—' };
  const tech = data?.technical || { sma50: currentPrice, sma200: currentPrice, trendSignal: 'Analyzing' };
  const corridor = data?.valuationCorridor || { medianPe: null, p25Pe: null, p75Pe: null, pePercentileRank: null };
  const reversion = data?.meanReversion || { targetPrice: null, impliedUpside: null };
  const graham = data?.grahamAndBuffett || {};

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-[#f8fafc] text-slate-900 flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-6 duration-200 transition-all ${
          isFullScreen
            ? 'w-full h-full max-w-none max-h-none rounded-none inset-0'
            : 'w-full sm:max-w-5xl max-h-[94vh] sm:max-h-[92vh] rounded-t-3xl sm:rounded-3xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 bg-[#0f172a]">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Premium Modal Header */}
        <div className="p-4 sm:p-5 bg-[#0f172a] text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center font-display font-black text-sm text-white shadow-lg shrink-0 uppercase tracking-wider">
              {symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-black text-lg sm:text-2xl text-white tracking-tight leading-none uppercase">
                  {symbol}
                </h2>
                <span className="text-[10px] text-blue-300 bg-blue-900/60 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-blue-700/50">
                  {data?.sector || stock.sector || 'Equities'}
                </span>
                <span className="text-[10px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-amber-500/50 flex items-center gap-1 font-mono">
                  <span>👑</span>
                  <span>Institutional 20Y Quant</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[200px] sm:max-w-[420px] mt-0.5">
                {data?.fullName || stock.fullName || stock.symbol}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenStockModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenStockModal(stock);
                }}
                className="px-2.5 sm:px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-700/60 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                title="Switch to Standard Overview Modal"
              >
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">Overview</span>
              </button>
            )}

            {/* Full Screen Toggle */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer border border-slate-700"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all ml-0.5 active:scale-95 cursor-pointer border border-slate-700"
              title="Close Analysis"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Analytical Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1 text-xs touch-scroll pb-safe">
          
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-sm font-medium">Computing 20-Year Historical Quant Matrix & Catalysts from Database...</p>
            </div>
          ) : (
            <>
              {/* Top Horizon 4-Metric Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                
                {/* 1. ALL-TIME HIGH (ATH) */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      All-Time High
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {ath.date || '—'}
                    </span>
                  </div>
                  <div className="my-1.5">
                    <div className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                      ৳{Number(ath.price).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">From ATH:</span>
                    <span className={`font-mono font-bold ${ath.drawdownPercent <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {ath.drawdownPercent > 0 ? '+' : ''}{ath.drawdownPercent}%
                    </span>
                  </div>
                </div>

                {/* 2. ALL-TIME LOW (ATL) */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-cyan-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <TrendingDown className="w-3.5 h-3.5 text-blue-600" />
                      All-Time Low
                    </span>
                    <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {atl.date || '—'}
                    </span>
                  </div>
                  <div className="my-1.5">
                    <div className="font-mono text-xl sm:text-2xl font-black text-slate-900">
                      ৳{Number(atl.price).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Gain from Low:</span>
                    <span className="font-mono font-bold text-emerald-600">
                      +{atl.risePercent}%
                    </span>
                  </div>
                </div>

                {/* 3. MAX DRAWDOWN (MDD) */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-rose-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                      Max Drawdown
                    </span>
                    <span className="text-[9px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      Stress
                    </span>
                  </div>
                  <div className="my-1.5">
                    <div className="font-mono text-xl sm:text-2xl font-black text-rose-600">
                      {mdd.percent}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 font-mono text-slate-400">
                    <span>{mdd.peakDate ? mdd.peakDate.slice(0, 7) : '—'} → {mdd.troughDate ? mdd.troughDate.slice(0, 7) : '—'}</span>
                  </div>
                </div>

                {/* 4. TECHNICAL TREND SIGNAL */}
                <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-600" />
                      Technical Trend
                    </span>
                    <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      SMA 50/200
                    </span>
                  </div>
                  <div className="my-1.5">
                    <div className="text-xs font-bold text-slate-800 truncate leading-snug">
                      {tech.trendSignal}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100 font-mono text-slate-500">
                    <span>50D: <strong className="text-slate-900">৳{tech.sma50}</strong></span>
                    <span>200D: <strong className="text-slate-900">৳{tech.sma200}</strong></span>
                  </div>
                </div>

              </div>

              {/* Section 2: 20-Year Timeline Chart with Catalyst & DSEX Benchmark Overlays */}
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-600" />
                      <h3 className="font-display font-bold text-sm text-slate-900">
                        20-Year Master Price History & Benchmark Relative Curve
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Spanning {chartPoints.length} verified trading sessions from SQLite archive (2005–2026)
                    </p>
                  </div>

                  {/* Benchmark Toggle & Timeframe selector */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setShowDsexOverlay(!showDsexOverlay)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                        showDsexOverlay
                          ? 'bg-amber-50 text-amber-800 border-amber-400 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                      title="Compare relative performance with DSEX Broad Market Index"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-600" />
                      <span>{showDsexOverlay ? 'DSEX Index Overlay ON' : 'Overlay DSEX Index'}</span>
                    </button>

                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar">
                      {TIMEFRAMES.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTimeframe(t.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                            selectedTimeframe === t.id
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alpha & Relative Return Strip (When Overlay Active) */}
                {showDsexOverlay && (
                  <div className="mb-4 p-3 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between flex-wrap gap-2 text-xs font-mono">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                        <span className="text-slate-700">{symbol} Return:</span>
                        <strong className={chartData.stockReturn >= 0 ? 'text-blue-700' : 'text-rose-600'}>
                          {chartData.stockReturn >= 0 ? '+' : ''}{chartData.stockReturn}%
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <span className="text-slate-700">DSEX Benchmark:</span>
                        <strong className={chartData.dsexReturn >= 0 ? 'text-amber-800' : 'text-rose-600'}>
                          {chartData.dsexReturn >= 0 ? '+' : ''}{chartData.dsexReturn}%
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-amber-300 shadow-2xs">
                      <span className="text-slate-600">Generated Alpha:</span>
                      <strong className={`font-bold ${chartData.alpha >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {chartData.alpha >= 0 ? '+' : ''}{chartData.alpha}% Excess Return
                      </strong>
                    </div>
                  </div>
                )}

                {/* Area Chart */}
                <div className="w-full h-56 sm:h-72">
                  {chartPoints.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="dsexGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.20} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="displayDate"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={30}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          domain={['auto', 'auto']}
                          tickFormatter={(v) => showDsexOverlay ? `${v}%` : `৳${v}`}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const d = payload[0].payload;
                              return (
                                <div className="bg-[#0f172a] text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-mono space-y-1">
                                  <div className="text-[10px] text-slate-400">{d.fullDate}</div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span className="text-cyan-400 font-bold">{symbol}:</span>
                                    <span className="font-bold text-white">৳{d.priceFormatted} {showDsexOverlay ? `(${d.stockReturnPct >= 0 ? '+' : ''}${d.stockReturnPct}%)` : ''}</span>
                                  </div>
                                  {d.dsex && (
                                    <div className="flex items-center justify-between gap-4 text-amber-300">
                                      <span>DSEX Index:</span>
                                      <span>{d.dsexFormatted} pts {showDsexOverlay ? `(${d.dsexReturnPct >= 0 ? '+' : ''}${d.dsexReturnPct}%)` : ''}</span>
                                    </div>
                                  )}
                                  {d.volume > 0 && (
                                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                                      Volume: {Number(d.volume).toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        {/* Stock Curve */}
                        <Area
                          type="monotone"
                          dataKey={showDsexOverlay ? 'stockReturnPct' : 'price'}
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#histGradient)"
                          name={symbol}
                        />
                        {/* DSEX Benchmark Curve (When Overlay active) */}
                        {showDsexOverlay && (
                          <Area
                            type="monotone"
                            dataKey="dsexReturnPct"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            fillOpacity={1}
                            fill="url(#dsexGradient)"
                            name="DSEX Benchmark"
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-mono text-xs">
                      No historical timeline points available for this period.
                    </div>
                  )}
                </div>

                {/* Macro Milestone Catalyst Badges */}
                {data?.catalysts && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-amber-600" />
                      <span>Historical DSE Market Regime Catalysts (Click to inspect)</span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar touch-scroll">
                      {data.catalysts.map((cat, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveCatalyst(activeCatalyst?.title === cat.title ? null : cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                            activeCatalyst?.title === cat.title
                              ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{cat.badge}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({cat.date.slice(0, 4)})</span>
                        </button>
                      ))}
                    </div>

                    {/* Active Catalyst Details Popover Card */}
                    {activeCatalyst && (
                      <div className="mt-3 p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-amber-900 text-sm">
                            {activeCatalyst.title} ({activeCatalyst.date})
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white text-amber-800 font-mono border border-amber-300">
                            {activeCatalyst.type}
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed mt-1">
                          {activeCatalyst.desc}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Section 3: Historical Rise & Fall Cycle Analysis ("Why it happened") */}
              <div>
                <h3 className="font-display font-bold text-xs text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>20-Year Historical Cycles & Price Action Attribution</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data?.cycles && data.cycles.map((cyc, i) => (
                    <div
                      key={i}
                      className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-display font-bold text-sm text-blue-700">
                            {cyc.period}: {cyc.title}
                          </span>
                        </div>
                        
                        <div className="mt-2 space-y-2">
                          <div className="text-[11px] text-slate-600 leading-relaxed">
                            <strong className="text-amber-800 block mb-0.5">Macro & Corporate Driver:</strong>
                            {cyc.driver}
                          </div>
                          <div className="text-[11px] text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                            <strong className="text-blue-800 block mb-0.5">Historical Impact:</strong>
                            {cyc.outcome}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Valuation Corridors & Mean Reversion Model */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* 1. Valuation Corridors */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-blue-600" />
                        20-Year Valuation Corridor (P/E Quantiles)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                        {corridor.pePercentileRank !== null ? `${corridor.pePercentileRank}th Percentile` : 'N/A'}
                      </span>
                    </div>

                    <div className="my-3">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-2xl sm:text-3xl font-black text-slate-900">
                          {corridor.currentPe !== null ? `${corridor.currentPe}x` : 'N/A'}
                        </span>
                        <span className="text-xs text-slate-500">Current P/E</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {corridor.status}
                      </p>
                    </div>

                    {/* Quantile Breakdown Bar */}
                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-emerald-700 font-semibold">25th Percentile (Deep Value):</span>
                        <strong className="text-slate-900">{corridor.p25Pe !== null ? `${corridor.p25Pe}x` : '—'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-blue-700 font-semibold">50th Median (Historical Fair Value):</span>
                        <strong className="text-slate-900">{corridor.medianPe !== null ? `${corridor.medianPe}x` : '—'}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-rose-700 font-semibold">75th Percentile (Historical Elevated):</span>
                        <strong className="text-slate-900">{corridor.p75Pe !== null ? `${corridor.p75Pe}x` : '—'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Mean Reversion Model */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Mean Reversion Projection
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                        Historical Normalization
                      </span>
                    </div>

                    <div className="my-3">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-2xl sm:text-3xl font-black text-amber-700">
                          {reversion.targetPrice !== null ? `৳${reversion.targetPrice}` : 'N/A'}
                        </span>
                        <span className={`text-xs font-mono font-bold ${reversion.impliedUpside >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {reversion.impliedUpside !== null ? `${reversion.impliedUpside >= 0 ? '+' : ''}${reversion.impliedUpside}% Implied Upside` : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Calculates where share price trades if current P/E multiple converges back to its 20-year historical median of <strong className="text-slate-900 font-mono">{corridor.medianPe}x</strong> based on audited earnings.
                      </p>
                    </div>

                    {/* Graham & Bond Spread details */}
                    <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-600">Graham Fair Intrinsic Value:</span>
                        <strong className="text-emerald-700">{graham.grahamNumber ? `৳${graham.grahamNumber}` : 'N/A'} ({graham.marginOfSafety ? `${graham.marginOfSafety}% Margin` : '—'})</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-600">Earnings Yield vs 10Y Govt Bond (11.50%):</span>
                        <strong className={graham.bondSpread >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {graham.bondSpread !== null && graham.bondSpread !== undefined ? `${graham.bondSpread >= 0 ? '+' : ''}${graham.bondSpread}% Spread` : 'N/A'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Section 5: 20-Year Audited Financial Statements Growth & Progression Table */}
              {data.financialStatements && data.financialStatements.length > 0 && (
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-blue-600" />
                      20-Year Audited Financial Statements History (2005–2025)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                      {data.financialStatements.length} Fiscal Years Recorded
                    </span>
                  </div>

                  <div className="overflow-x-auto touch-scroll border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                          <th className="py-2.5 px-3">Fiscal Year</th>
                          <th className="py-2.5 px-3 text-right">EPS (BDT)</th>
                          <th className="py-2.5 px-3 text-right">NAVPS (BDT)</th>
                          <th className="py-2.5 px-3 text-right">ROE %</th>
                          <th className="py-2.5 px-3 text-right">Div Yield %</th>
                          <th className="py-2.5 px-3 text-right">Paid-Up (Mn)</th>
                          <th className="py-2.5 px-3 text-right">P/E Ratio</th>
                          <th className="py-2.5 px-3 text-center">Audit Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.financialStatements.map((st, idx) => (
                          <tr
                            key={st.year}
                            className={`hover:bg-blue-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                          >
                            <td className="py-2 px-3 font-bold text-slate-900">
                              FY{st.year}
                              {st.year === 2025 && (
                                <span className="ml-1.5 text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-sans font-bold">
                                  Latest
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                              ৳{Number(st.eps).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-blue-700 font-bold">
                              ৳{Number(st.navps).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700">
                              {Number(st.roe).toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right text-amber-700">
                              {Number(st.dividendYield).toFixed(2)}%
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">
                              ৳{Number(st.paidUpCapital).toLocaleString()}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-800 font-bold">
                              {st.pe ? `${Number(st.pe).toFixed(2)}x` : '—'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                                Audited
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </>
          )}

        </div>

      </div>
    </div>
  );
}
