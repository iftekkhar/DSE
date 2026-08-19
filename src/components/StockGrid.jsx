import { Star, ArrowUpRight, Scale, Check } from 'lucide-react';
import { getFallbackTag } from '../services/dseData';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 mb-6">
      {stocks.map((stock) => {
        const isSaved = watchlist.includes(stock.symbol);
        const isCompared = compareList.some(s => s.symbol === stock.symbol);
        const isBullish = (stock.changePercent || 0) >= 0;
        const ltpTag = getFallbackTag(stock, 'ltp');
        const changeTag = getFallbackTag(stock, 'changePercent');
        const peTag = getFallbackTag(stock, 'pe');
        const roeTag = getFallbackTag(stock, 'roe');
        const epsTag = getFallbackTag(stock, 'eps');

        return (
          <div
            key={stock.symbol}
            onClick={() => onSelectStock(stock)}
            className="card-elevation p-4 flex flex-col justify-between group hover:border-[#2563eb]/40 transition-all cursor-pointer relative overflow-hidden"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center font-display font-black text-xs border border-blue-100">
                    {stock.symbol.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm text-slate-900 group-hover:text-[#2563eb] transition-colors leading-tight">
                      {stock.symbol}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">
                      {stock.fullName || stock.symbol}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onToggleCompare(stock)}
                    className={`p-1 rounded transition-colors ${
                      isCompared ? 'text-[#2563eb] bg-blue-50' : 'text-slate-300 hover:text-slate-600'
                    }`}
                    title={isCompared ? 'Remove from Compare' : 'Add to Compare'}
                  >
                    <Scale className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggleWatchlist(stock.symbol)}
                    className="p-1 text-slate-300 hover:text-amber-500 rounded transition-colors"
                  >
                    <Star className={`w-4 h-4 ${isSaved ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                </div>
              </div>

              {/* Price & Change */}
              <div className="flex items-baseline justify-between my-2.5">
                <div className="flex items-center gap-1">
                  <span className="font-mono text-xl font-black text-slate-900">
                    {stock.ltp !== null && stock.ltp !== undefined ? `৳${stock.ltp.toFixed(2)}` : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </span>
                  {ltpTag && (
                    <span className="text-[8px] font-semibold text-amber-700 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-300/50" title="Pulled from saved history">
                      {ltpTag}
                    </span>
                  )}
                </div>
                {stock.changePercent !== null && stock.changePercent !== undefined ? (
                  <span className={`inline-flex items-center text-xs font-mono font-bold ${
                    isBullish ? 'text-[#047857]' : 'text-[#b91c1c]'
                  }`}>
                    {isBullish ? '+' : ''}{stock.changePercent}%
                    {changeTag && ` (${changeTag})`}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">Not Available live</span>
                )}
              </div>

              {/* Minimal Metrics Strip */}
              <div className="grid grid-cols-3 gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl mb-3 border border-slate-100">
                <div className="text-center">
                  <div className="text-slate-400 text-[9px] font-bold">P/E</div>
                  <div className="font-mono font-bold text-slate-800 text-[11px]">
                    {stock.pe !== null && stock.pe !== undefined ? (
                      <div>
                        <div>{stock.pe}x</div>
                        {peTag && <div className="text-[7.5px] text-amber-600 font-normal leading-none mt-0.5">{peTag}</div>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal italic">Not Available live</span>
                    )}
                  </div>
                </div>
                <div className="text-center border-x border-slate-200/60">
                  <div className="text-slate-400 text-[9px] font-bold">ROE</div>
                  <div className={`font-mono font-bold text-[11px] ${stock.roe >= 15 ? 'text-[#047857]' : 'text-slate-800'}`}>
                    {stock.roe !== null && stock.roe !== undefined ? (
                      <div>
                        <div>{stock.roe}%</div>
                        {roeTag && <div className="text-[7.5px] text-amber-600 font-normal leading-none mt-0.5">{roeTag}</div>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal italic">Not Available live</span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-slate-400 text-[9px] font-bold">EPS</div>
                  <div className="font-mono font-bold text-slate-800 text-[11px]">
                    {stock.eps !== null && stock.eps !== undefined ? (
                      <div>
                        <div>৳{stock.eps.toFixed(1)}</div>
                        {epsTag && <div className="text-[7.5px] text-amber-600 font-normal leading-none mt-0.5">{epsTag}</div>}
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal italic">Not Available live</span>
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
                  className={`p-1 rounded-lg border text-xs ${
                    isCompared ? 'bg-blue-50 text-[#2563eb] border-blue-300' : 'text-slate-300 border-slate-200 hover:text-slate-600'
                  }`}
                  title={isCompared ? "Remove from comparison" : "Compare"}
                >
                  {isCompared ? <Check className="w-3 h-3" /> : <Scale className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => onSelectStock(stock)}
                  className="p-1 text-[#2563eb] hover:bg-blue-50 rounded text-xs font-bold flex items-center gap-0.5"
                >
                  <span>Details</span>
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
