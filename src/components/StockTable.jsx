import { Star, BarChart3, Plus, Check } from 'lucide-react';
import { getFallbackTag, formatDateDDMMM, formatPeriodBadge } from '../services/dseData';

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
      <div className="card-elevation p-12 text-center">
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
    <div className="card-elevation overflow-hidden mb-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
              <th className="py-3 px-4 w-10 text-center">⭐</th>
              <th className="py-3 px-4">Scrip</th>
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
              const closeDate = stock.closeDate || '2026-08-20';
              const dateLabel = formatDateDDMMM(closeDate);
              const auditedPeriod = stock.auditedPeriod || 'FY2026 Q1';
              const periodBadge = formatPeriodBadge(stock.auditedPeriod || stock.quarterlyDisclosure, stock.symbol, stock.sector);

              return (
                <tr
                  key={stock.symbol}
                  className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                  onClick={() => onSelectStock(stock)}
                >
                  {/* Star Watchlist */}
                  <td
                    className="py-3 px-4 text-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWatchlist(stock.symbol);
                    }}
                  >
                    <button
                      className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-300 hover:text-amber-500"
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
                  <td className="py-3 px-4">
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
                        {stock.marginOfSafety !== null && stock.marginOfSafety > 15 && (
                          <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded border border-blue-300">
                            +{stock.marginOfSafety}% Safety
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {stock.fullName || stock.symbol}
                      </span>
                    </div>
                  </td>

                  {/* Price & 24h Change Inline */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {stock.ltp !== null && stock.ltp !== undefined ? `৳${stock.ltp.toFixed(2)}` : (
                            <span className="text-slate-400 font-normal italic text-[11px]">Not Available live</span>
                          )}
                        </span>
                        <span className="text-[8.5px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200" title={`Latest Settlement: ${closeDate}`}>
                          {dateLabel}
                        </span>
                      </div>
                      {stock.changePercent !== null && stock.changePercent !== undefined ? (
                        <span className={`inline-flex items-center font-mono text-[10px] font-bold ${
                          isBullish ? 'text-[#047857]' : 'text-[#b91c1c]'
                        }`}>
                          {isBullish ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Not Available live</span>
                      )}
                    </div>
                  </td>

                  {/* P/E Ratio (Daily & Audited) */}
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                    {stock.pe !== null && stock.pe !== undefined ? (
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900">{stock.pe}x <span className="text-[9px] font-normal text-slate-400">Daily</span></span>
                        <span className="text-[8.5px] text-slate-500 font-normal">Audited: {stock.auditedPe || stock.pe}x</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-[11px]">Not Available live</span>
                    )}
                  </td>

                  {/* ROE % */}
                  <td className="py-3 px-4 text-right font-mono font-medium">
                    {stock.roe !== null && stock.roe !== undefined ? (
                      <div className="flex flex-col items-end">
                        <span className={stock.roe >= 15 ? 'text-[#047857] font-bold' : 'text-slate-700 font-bold'}>
                          {stock.roe}%
                        </span>
                        <span className="text-[8.5px] text-emerald-700 bg-emerald-50 px-1 rounded font-normal" title={auditedPeriod}>
                          {periodBadge}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-[11px]">Not Available live</span>
                    )}
                  </td>

                  {/* EPS */}
                  <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                    {stock.eps !== null && stock.eps !== undefined ? (
                      <div className="flex flex-col items-end">
                        <span className="font-bold text-slate-900">৳{stock.eps.toFixed(2)}</span>
                        <span className="text-[8.5px] text-slate-500 font-normal" title={auditedPeriod}>
                          {periodBadge}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-[11px]">Not Available live</span>
                    )}
                  </td>

                  {/* Verdict & Score */}
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider border ${
                      stock.verdict === 'BUY'
                        ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                        : stock.verdict === 'HOLD'
                          ? 'bg-amber-50 text-[#b45309] border-amber-200'
                          : 'bg-rose-50 text-[#b91c1c] border-rose-200'
                    }`}>
                      <span>{stock.verdict || 'REVIEW'}</span>
                      <span className="font-mono opacity-60 font-medium">({stock.verdictScore || 0}/7)</span>
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => onSelectStock(stock)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#2563eb] text-slate-700 hover:text-white text-[11px] font-bold transition-all"
                      >
                        Analyze
                      </button>

                      <button
                        onClick={() => onToggleCompare(stock)}
                        className={`p-1 rounded-lg border transition-all ${
                          isCompared
                            ? 'bg-blue-50 text-[#2563eb] border-blue-300'
                            : 'text-slate-300 border-slate-200 hover:text-slate-600'
                        }`}
                        title={isCompared ? "Remove from comparison" : "Compare"}
                      >
                        {isCompared ? <Check className="w-3 h-3 text-[#2563eb]" /> : <Plus className="w-3 h-3" />}
                      </button>
                    </div>
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
