import { Star, BarChart3, Plus, Check } from 'lucide-react';
import { formatDateDDMMM, formatPeriodBadge } from '../services/dseData';

export default function StockTable({
  stocks,
  onSelectStock,
  watchlist,
  onToggleWatchlist,
  compareList,
  onToggleCompare
}) {
  if (!stocks || stocks.length === 0) {
    return (
      <div className="card-elevation p-8 sm:p-12 text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
          <BarChart3 className="w-6 h-6" />
        </div>
        <h3 className="font-display text-base font-bold text-slate-800 mb-1">No Equities Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No stocks match your active search or filters. Try adjusting your query or selecting another tab.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevation overflow-hidden mb-6 border border-slate-200/80">
      <div className="overflow-x-auto touch-scroll">
        <table className="w-full text-left border-collapse min-w-[720px] lg:min-w-full">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <th className="py-3 px-3 w-10 text-center sticky-col-first">⭐</th>
              <th className="py-3 px-4 sticky-col-first">Scrip</th>
              <th className="py-3 px-4 text-right">Daily Close</th>
              <th className="py-3 px-4 text-right">P/E (Daily / Audited)</th>
              <th className="py-3 px-4 text-right">ROE (Audited)</th>
              <th className="py-3 px-4 text-right">EPS (Audited)</th>
              <th className="py-3 px-4 text-center">Verdict</th>
              <th className="py-3 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {stocks.map((stock) => {
              const isSaved = watchlist.includes(stock.symbol);
              const isCompared = compareList.some(s => s.symbol === stock.symbol);
              const isBullish = (stock.changePercent || 0) >= 0;
              const closeDate = stock.closeDate || stock.date || null;
              const dateLabel = closeDate ? formatDateDDMMM(closeDate) : 'Latest';
              const periodBadge = formatPeriodBadge(stock.auditedPeriod || stock.quarterlyDisclosure, stock.symbol, stock.sector);

              return (
                <tr
                  key={stock.symbol}
                  className="hover:bg-blue-50/40 transition-colors group cursor-pointer active:bg-blue-50/60"
                  onClick={() => onSelectStock(stock)}
                >
                  {/* Star Watchlist */}
                  <td
                    className="py-3 px-3 text-center sticky-col-first"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(stock.symbol);
                    }}
                  >
                    <button
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-300 hover:text-amber-500 active:scale-95"
                      title={isSaved ? "Remove from Watchlist" : "Add to Watchlist"}
                    >
                      <Star
                        className={`w-4 h-4 transition-transform ${
                          isSaved ? 'fill-amber-400 text-amber-400' : 'text-slate-300 group-hover:text-slate-400'
                        }`}
                      />
                    </button>
                  </td>

                  {/* Scrip / Company */}
                  <td className="py-3 px-4 sticky-col-first">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display font-black text-sm text-slate-900 tracking-tight group-hover:text-[#2563eb] transition-colors">
                          {stock.symbol}
                        </span>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                          {stock.sector || 'Equities'}
                        </span>
                        {stock.moat?.tier === 'Wide Moat' && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                            🏰 Wide Moat
                          </span>
                        )}
                        {stock.marginOfSafety !== null && stock.marginOfSafety !== undefined && stock.marginOfSafety > 15 && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded border border-blue-300">
                            +{stock.marginOfSafety}% Safety
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[220px]">
                        {stock.fullName || stock.symbol}
                      </span>
                    </div>
                  </td>

                  {/* Daily Closing Price */}
                  <td className="py-3 px-4 text-right font-mono">
                    <div className="text-slate-900 font-bold text-sm">
                      ৳{stock.ltp !== null && stock.ltp !== undefined ? Number(stock.ltp).toFixed(2) : '—'}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 text-[11px]">
                      <span className={`font-bold ${isBullish ? 'text-[#047857]' : 'text-[#b91c1c]'}`}>
                        {isBullish ? '+' : ''}{stock.changePercent || 0}%
                      </span>
                      <span className="text-[9px] text-slate-400">({dateLabel})</span>
                    </div>
                  </td>

                  {/* Daily & Audited P/E Ratios */}
                  <td className="py-3 px-4 text-right font-mono">
                    <div className="text-slate-900 font-bold">
                      {stock.pe !== null && stock.pe !== undefined ? `${stock.pe}x` : 'N/A'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Audited: <span className="font-semibold text-slate-600">{stock.auditedPe !== null && stock.auditedPe !== undefined ? `${stock.auditedPe}x` : 'N/A'}</span>
                    </div>
                  </td>

                  {/* ROE */}
                  <td className="py-3 px-4 text-right font-mono">
                    <div className={`font-bold ${
                      (stock.roe || 0) >= 15 ? 'text-[#047857]' : (stock.roe || 0) <= 0 ? 'text-[#b91c1c]' : 'text-slate-700'
                    }`}>
                      {stock.roe !== null && stock.roe !== undefined ? `${stock.roe}%` : '—'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      NAV: ৳{stock.navPerShare || '—'}
                    </div>
                  </td>

                  {/* Audited Basic EPS & Disclosure Badge */}
                  <td className="py-3 px-4 text-right font-mono">
                    <div className="text-slate-900 font-bold">
                      ৳{stock.eps !== null && stock.eps !== undefined ? Number(stock.eps).toFixed(2) : '—'}
                    </div>
                    <span className="text-[9.5px] font-sans font-medium text-slate-500 bg-slate-100/80 px-1.5 py-0.2 rounded inline-block">
                      {periodBadge}
                    </span>
                  </td>

                  {/* Strategy Verdict Badge */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        stock.verdict === 'BUY'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : stock.verdict === 'HOLD'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {stock.verdict || 'HOLD'}
                    </span>
                  </td>

                  {/* Action (Compare / Inspect) */}
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onToggleCompare(stock)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 mx-auto transition-all active:scale-95 ${
                        isCompared
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200'
                      }`}
                      title={isCompared ? "Remove from comparison" : "Compare this stock"}
                    >
                      {isCompared ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      <span className="hidden lg:inline">{isCompared ? 'Compared' : 'Compare'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
