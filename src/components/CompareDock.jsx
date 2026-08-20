import { Scale, X, ArrowRight } from 'lucide-react';

export default function CompareDock({ compareList, onOpenModal, onRemove, onClear }) {
  if (!compareList || compareList.length === 0) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0f172a]/95 backdrop-blur-md text-white px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between sm:justify-start gap-2.5 sm:gap-4 max-w-[94vw] sm:max-w-fit animate-in slide-in-from-bottom-6 duration-200 select-none">
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div className="p-1 sm:p-1.5 bg-blue-600/30 rounded-lg text-blue-400">
          <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <span className="text-xs font-bold text-slate-200 hidden xs:inline">
          Compare ({compareList.length})
        </span>
      </div>

      {/* Stock pills */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar touch-scroll max-w-[140px] sm:max-w-xs">
        {compareList.map((stock) => (
          <div
            key={stock.symbol}
            className="flex items-center gap-1 bg-slate-800 text-slate-200 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-slate-700 font-mono font-bold shrink-0"
          >
            <span>{stock.symbol}</span>
            <button
              onClick={() => onRemove(stock.symbol)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <div className="h-4 sm:h-5 w-px bg-slate-700 shrink-0"></div>

      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={onOpenModal}
          className="px-2.5 sm:px-3.5 py-1.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-1 active:scale-95 cursor-pointer"
        >
          <span>Compare</span>
          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </button>
        <button
          onClick={onClear}
          className="p-1 text-slate-400 hover:text-slate-200 text-xs font-medium active:scale-95"
          title="Clear all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
