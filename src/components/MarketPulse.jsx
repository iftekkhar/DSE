import { BarChart2, Award, Zap, Gem } from 'lucide-react';

export default function MarketPulse({ stocks, onSelectStock }) {
  if (!stocks || stocks.length === 0) return null;

  // Market Breadth & Sentiment
  const buyCount = stocks.filter(s => s.verdict === 'BUY').length;
  const holdCount = stocks.filter(s => s.verdict === 'HOLD').length;
  const riskCount = stocks.filter(s => s.verdict === 'RISK' || s.verdict === 'HIGH RISK').length;
  const total = stocks.length || 1;

  const buyPct = Math.round((buyCount / total) * 100);
  const holdPct = Math.round((holdCount / total) * 100);
  const riskPct = Math.round((riskCount / total) * 100);

  // Top Bullish Pick
  const sortedBullish = [...stocks].sort((a, b) => {
    if ((b.verdictScore || 0) !== (a.verdictScore || 0)) {
      return (b.verdictScore || 0) - (a.verdictScore || 0);
    }
    return (b.changePercent || 0) - (a.changePercent || 0);
  });
  const topPick = sortedBullish[0];

  // Top Volume Leader
  const sortedVolume = [...stocks].sort((a, b) => (b.volume || 0) - (a.volume || 0));
  const topVolume = sortedVolume[0];

  // Deep Value Pick
  const sortedValue = [...stocks]
    .filter(s => s.pe && s.pe > 4 && s.pe < 16 && s.roe && s.roe > 14)
    .sort((a, b) => (a.pe || 99) - (b.pe || 99));
  const topValue = sortedValue[0] || sortedBullish[1] || topPick;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 1. Market Sentiment & Breadth */}
      <div className="card-elevation p-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
            <span className="flex items-center gap-1.5 text-slate-700">
              <BarChart2 className="w-3.5 h-3.5 text-[#2563eb]" />
              Market Breadth
            </span>
            <span className="text-[11px] font-mono text-slate-400">{total} Scrips</span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span className="font-display text-xl font-black text-slate-900">
              {buyPct >= 40 ? 'Bullish' : buyPct >= 25 ? 'Balanced' : 'Defensive'}
            </span>
            <span className="text-xs font-mono font-bold text-[#047857]">{buyPct}% Buy</span>
          </div>

          {/* Minimalist Progress Bar */}
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
            <div style={{ width: `${buyPct}%` }} className="h-full bg-[#10b981]" />
            <div style={{ width: `${holdPct}%` }} className="h-full bg-[#f59e0b]" />
            <div style={{ width: `${riskPct}%` }} className="h-full bg-[#ef4444]" />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-3 pt-2 border-t border-slate-100">
          <span>{buyCount} Buy</span>
          <span>{holdCount} Hold</span>
          <span>{riskCount} Risk</span>
        </div>
      </div>

      {/* 2. Top Bullish Pick */}
      {topPick && (
        <div
          onClick={() => onSelectStock(topPick)}
          className="card-elevation p-4 flex flex-col justify-between cursor-pointer group hover:border-[#10b981]/50 transition-all"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Award className="w-3.5 h-3.5 text-[#10b981]" />
                Top Bullish Pick
              </span>
              <span className="text-[10px] text-[#047857] font-bold bg-emerald-50 px-1.5 py-0.2 rounded">
                Score {topPick.verdictScore}/7
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-display text-xl font-black text-slate-900 group-hover:text-[#2563eb] transition-colors">
                  {topPick.symbol}
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {topPick.fullName || topPick.symbol}
                </p>
              </div>

              <div className="text-right font-mono">
                <div className="text-sm font-bold text-slate-900">
                  ৳{topPick.ltp?.toFixed(2) || '—'}
                </div>
                <div className="text-xs font-bold text-[#047857]">
                  +{topPick.changePercent || 0}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-3 pt-2 border-t border-slate-100">
            <span>P/E: <strong className="text-slate-700 font-mono">{topPick.pe || '—'}x</strong></span>
            <span>ROE: <strong className="text-slate-700 font-mono">{topPick.roe || '—'}%</strong></span>
          </div>
        </div>
      )}

      {/* 3. Volume Leader */}
      {topVolume && (
        <div
          onClick={() => onSelectStock(topVolume)}
          className="card-elevation p-4 flex flex-col justify-between cursor-pointer group hover:border-[#2563eb]/50 transition-all"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Zap className="w-3.5 h-3.5 text-[#2563eb]" />
                Volume Leader
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {((topVolume.volume || 0) / 1000).toFixed(0)}K Shares
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-display text-xl font-black text-slate-900 group-hover:text-[#2563eb] transition-colors">
                  {topVolume.symbol}
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {topVolume.fullName || topVolume.symbol}
                </p>
              </div>

              <div className="text-right font-mono">
                <div className="text-sm font-bold text-slate-900">
                  ৳{topVolume.ltp?.toFixed(2) || '—'}
                </div>
                <div className={`text-xs font-bold ${
                  (topVolume.changePercent || 0) >= 0 ? 'text-[#047857]' : 'text-[#b91c1c]'
                }`}>
                  {(topVolume.changePercent || 0) >= 0 ? '+' : ''}{topVolume.changePercent || 0}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-3 pt-2 border-t border-slate-100">
            <span>Sector: <strong className="text-slate-700">{topVolume.sector}</strong></span>
            <span className="text-[#2563eb] font-semibold">Inspect</span>
          </div>
        </div>
      )}

      {/* 4. Deep Value Pick */}
      {topValue && (
        <div
          onClick={() => onSelectStock(topValue)}
          className="card-elevation p-4 flex flex-col justify-between cursor-pointer group hover:border-[#f59e0b]/50 transition-all"
        >
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-2">
              <span className="flex items-center gap-1.5 text-slate-700">
                <Gem className="w-3.5 h-3.5 text-[#f59e0b]" />
                Value Bargain
              </span>
              <span className="text-[10px] text-[#b45309] font-bold bg-amber-50 px-1.5 py-0.2 rounded">
                P/E {topValue.pe}x
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <div className="font-display text-xl font-black text-slate-900 group-hover:text-[#2563eb] transition-colors">
                  {topValue.symbol}
                </div>
                <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                  {topValue.fullName || topValue.symbol}
                </p>
              </div>

              <div className="text-right font-mono">
                <div className="text-sm font-bold text-slate-900">
                  ৳{topValue.ltp?.toFixed(2) || '—'}
                </div>
                <div className="text-xs font-bold text-[#b45309]">
                  ROE {topValue.roe}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium mt-3 pt-2 border-t border-slate-100">
            <span>Debt/Eq: <strong className="text-slate-700 font-mono">{topValue.debtToEquity ?? 'Low'}</strong></span>
            <span className="text-[#2563eb] font-semibold">Inspect</span>
          </div>
        </div>
      )}
    </div>
  );
}
