import { useState } from 'react';
import { X, Scale, Maximize2, Minimize2 } from 'lucide-react';
import { formatDateDDMMM, formatPeriodBadge } from '../services/dseData';

export default function CompareModal({ compareList, onClose, onClear, onSelectStock }) {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (!compareList || compareList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-white text-slate-900 border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-200 transition-all ${
        isFullScreen
          ? 'w-full h-full max-w-none max-h-none rounded-none inset-0 sm:m-0'
          : 'w-full sm:max-w-5xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[90vh]'
      }`}>
        
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 bg-[#0f172a]">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-[#0f172a] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                Side-by-Side Equities Comparison
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Comparing valuation, capital efficiency, and financial health ({compareList.length} scrips)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="text-xs text-slate-400 hover:text-rose-400 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-900 transition-colors active:scale-95 cursor-pointer"
            >
              Clear All
            </button>

            {/* Full Screen Toggle */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer border border-slate-700"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Table Container with Touch Scroll */}
        <div className="overflow-x-auto p-3 sm:p-5 touch-scroll flex-1 pb-safe">
          <table className="w-full text-left text-xs border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="py-3 px-3 sm:px-4 text-slate-400 font-bold uppercase w-1/4 sticky-col-first">Metric</th>
                {compareList.map((s) => (
                  <th key={s.symbol} className="py-3 px-3 sm:px-4 text-center">
                    <div
                      className="font-display font-black text-sm text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => onSelectStock && onSelectStock(s)}
                    >
                      {s.symbol}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal truncate max-w-[120px] sm:max-w-[140px] mx-auto">
                      {s.fullName || s.symbol}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              
              {/* Daily Close Price */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">Daily Close Price</td>
                {compareList.map((s) => {
                  const closeDate = s.closeDate || s.date || null;
                  const dateLabel = closeDate ? formatDateDDMMM(closeDate) : 'Latest';
                  return (
                    <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-slate-900">
                      {s.ltp !== null && s.ltp !== undefined ? (
                        <div className="flex flex-col items-center">
                          <span>৳{Number(s.ltp).toFixed(2)}</span>
                          <span className="text-[8px] text-blue-700 font-normal">Close: {dateLabel}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Price Momentum */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">Price Momentum</td>
                {compareList.map((s) => {
                  const isBullish = (s.changePercent || 0) >= 0;
                  return (
                    <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center font-mono font-bold">
                      {s.changePercent !== null && s.changePercent !== undefined ? (
                        <span className={isBullish ? 'text-emerald-700' : 'text-rose-700'}>
                          {isBullish ? '+' : ''}{Number(s.changePercent).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Daily vs Audited P/E */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">P/E Ratio</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center font-mono">
                    <div className="font-bold text-slate-900">
                      {s.pe !== null && s.pe !== undefined ? `${s.pe}x` : 'N/A'}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Aud: {s.auditedPe !== null && s.auditedPe !== undefined ? `${s.auditedPe}x` : 'N/A'}
                    </div>
                  </td>
                ))}
              </tr>

              {/* ROE */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">ROE (Audited)</td>
                {compareList.map((s) => {
                  const periodBadge = formatPeriodBadge(s.auditedPeriod || s.quarterlyDisclosure, s.symbol, s.sector);
                  return (
                    <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center font-mono">
                      <div className={`font-bold ${(s.roe || 0) >= 15 ? 'text-emerald-700' : 'text-slate-800'}`}>
                        {s.roe !== null && s.roe !== undefined ? `${s.roe}%` : '—'}
                      </div>
                      <span className="text-[8.5px] text-emerald-800 font-normal bg-emerald-50 px-1 py-0.2 rounded">
                        {periodBadge}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Audited Basic EPS */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">Basic EPS (Audited)</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-slate-900">
                    {s.eps !== null && s.eps !== undefined ? `৳${Number(s.eps).toFixed(2)}` : '—'}
                  </td>
                ))}
              </tr>

              {/* NAV Per Share */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">NAV Per Share</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center font-mono font-bold text-slate-900">
                    ৳{s.navPerShare !== null && s.navPerShare !== undefined ? Number(s.navPerShare).toFixed(2) : '—'}
                  </td>
                ))}
              </tr>

              {/* Paid Up Capital */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">Paid Up Capital</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center font-mono text-slate-700">
                    {s.paidUpCapital ? `৳${Number(s.paidUpCapital).toLocaleString()} mn` : '—'}
                  </td>
                ))}
              </tr>

              {/* Strategy Verdict */}
              <tr className="hover:bg-slate-50/80">
                <td className="py-3 px-3 sm:px-4 font-bold text-slate-600 sticky-col-first">Verdict</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-3 sm:px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.verdict === 'BUY'
                          ? 'bg-emerald-100 text-emerald-800'
                          : s.verdict === 'HOLD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {s.verdict || 'HOLD'} ({s.verdictScore}/7)
                    </span>
                  </td>
                ))}
              </tr>

            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
