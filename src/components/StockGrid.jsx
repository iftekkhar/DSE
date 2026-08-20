import { Star, ArrowUpRight, Scale, Check } from 'lucide-react';
import { formatDateDDMMM, formatPeriodBadge } from '../services/dseData';

export default function StockGrid({
  stocks,
  onSelectStock,
  watchlist,
  onToggleWatchlist,
  compareList,
  onToggleCompare
}) {
  if (!stocks || stocks.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 mb-6">
      {stocks.map((stock) => {
        const isSaved = watchlist.includes(stock.symbol);
        const isCompared = compareList.some(s => s.symbol === stock.symbol);
        const isBullish = (stock.changePercent || 0) >= 0;
        const closeDate = stock.closeDate || stock.date || null;
        const dateLabel = closeDate ? formatDateDDMMM(closeDate) : 'Latest';
        const periodBadge = formatPeriodBadge(stock.auditedPeriod || stock.quarterlyDisclosure, stock.symbol, stock.sector);

        return (
          <div
            key={stock.symbol}
            onClick={() => onSelectStock(stock)}
            className="card-elevation p-3.5 sm:p-4 flex flex-col justify-between group hover:border-[#2563eb]/40 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center font-display font-black text-xs border border-blue-100 shrink-0">
                    {stock.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-display font-black text-sm text-slate-900 group-hover:text-[#2563eb] transition-colors leading-tight">
                        {stock.symbol}
                      </h3>
                      {stock.moat?.tier === 'Wide Moat' && (
                        <span className="text-[8.5px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded border border-emerald-300">
                          🏰 Moat
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[140px]">
                      {stock.fullName || stock.symbol}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleCompare(stock)}
                    className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
                      isCompared ? 'text-[#2563eb] bg-blue-50' : 'text-slate-300 hover:text-slate-600'
                    }`}
                    title={isCompared ? 'Remove from Compare' : 'Add to Compare'}
                  >
                    <Scale className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleWatchlist(stock.symbol)}
                    className="p-1.5 text-slate-300 hover:text-amber-500 rounded-lg transition-colors active:scale-95"
                    title={isSaved ? "Remove from watchlist" : "Add to watchlist"}
                  >
                    <Star className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                </div>
              </div>

              {/* Price & Change */}
              <div className="flex items-baseline justify-between my-2.5">
                <div className="flex flex-col">
                  <span className="font-mono text-xl font-black text-slate-900 leading-none">
                    {stock.ltp !== null && stock.ltp !== undefined ? `৳${Number(stock.ltp).toFixed(2)}` : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </span>
                  <span className="text-[8.5px] font-semibold text-blue-700 mt-1">
                    Close: {dateLabel}
                  </span>
                </div>
                {stock.changePercent !== null && stock.changePercent !== undefined ? (
                  <span className={`inline-flex items-center text-xs font-mono font-bold ${
                    isBullish ? 'text-[#047857]' : 'text-[#b91c1c]'
                  }`}>
                    {isBullish ? '+' : ''}{stock.changePercent}%
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Not Available live</span>
                )}
              </div>

              {/* Minimal Metrics Strip */}
              <div className="grid grid-cols-3 gap-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl mb-3 border border-slate-100">
                <div className="text-center">
                  <div className="text-slate-400 text-[8px] font-bold uppercase">P/E (Daily)</div>
                  <div className="font-mono font-bold text-slate-800 text-[11px]">
                    {stock.pe !== null && stock.pe !== undefined ? (
                      <div>
                        <div>{stock.pe}x</div>
                        <div className="text-[7.5px] text-slate-400 font-normal">Aud: {stock.auditedPe || stock.pe}x</div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal italic">N/A</span>
                    )}
                  </div>
                </div>
                <div className="text-center border-x border-slate-200/60">
                  <div className="text-slate-400 text-[8px] font-bold uppercase">ROE</div>
                  <div className={`font-mono font-bold text-[11px] ${stock.roe >= 15 ? 'text-[#047857]' : 'text-slate-800'}`}>
                    {stock.roe !== null && stock.roe !== undefined ? (
                      <div>
                        <div>{stock.roe}%</div>
                        <div className="text-[7.5px] text-emerald-700 font-normal">
                          {periodBadge}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal italic">N/A</span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-[8px] font-bold uppercase">EPS</div>
                  <div className="font-mono font-bold text-slate-800 text-[11px]">
                    {stock.eps !== null && stock.eps !== undefined ? (
                      <div>
                        <div>৳{Number(stock.eps).toFixed(1)}</div>
                        <div className="text-[7.5px] text-slate-500 font-normal">
                          {periodBadge}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal italic">N/A</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                stock.verdict === 'BUY'
                  ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                  : stock.verdict === 'HOLD'
                    ? 'bg-amber-50 text-[#b45309] border-amber-200'
                    : 'bg-rose-50 text-[#b91c1c] border-rose-200'
              }`}>
                {stock.verdict} ({stock.verdictScore}/7)
              </span>

              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => onToggleCompare(stock)}
                  className={`p-1.5 rounded-lg border text-xs active:scale-95 ${
                    isCompared ? 'bg-blue-50 text-[#2563eb] border-blue-300' : 'text-slate-300 border-slate-200 hover:text-slate-600'
                  }`}
                  title={isCompared ? "Remove from comparison" : "Compare"}
                >
                  {isCompared ? <Check className="w-3.5 h-3.5" /> : <Scale className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => onSelectStock(stock)}
                  className="px-2 py-1 text-[#2563eb] hover:bg-blue-50 rounded-lg text-xs font-bold flex items-center gap-0.5 active:scale-95"
                >
                  <span>Inspect</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
