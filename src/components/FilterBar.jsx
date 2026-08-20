import { Grid, List, ArrowUpDown, Filter } from 'lucide-react';
import { DSE_SECTORS } from '../services/dseData';

export default function FilterBar({
  activeTab,
  setActiveTab,
  selectedSector,
  setSelectedSector,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  watchlistCount,
  stocksCount
}) {
  const tabs = [
    { id: 'all', label: 'All Equities', count: stocksCount },
    { id: 'watchlist', label: 'Watchlist', count: watchlistCount, isWatchlist: true },
    { id: 'buffett', label: '🏰 Buffett Moats', isBuffett: true },
    { id: 'value', label: '💎 Deep Value' },
    { id: 'buy', label: '🟢 Buy Signals' },
    { id: 'momentum', label: '🚀 Momentum' },
    { id: 'risk', label: '⚠️ Risk Alerts' }
  ];

  return (
    <div className="card-elevation p-2.5 sm:p-3 mb-4 sm:mb-5 space-y-2 sm:space-y-2.5">
      {/* Top Row: Horizontal Swipeable Strategy Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 touch-scroll no-scrollbar -mx-1 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                isActive
                  ? tab.isWatchlist
                    ? 'bg-amber-500 text-white shadow-xs'
                    : tab.isBuffett
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-[#2563eb] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-slate-50/50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Row: Controls for Sector, Sort, and View Mode */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-xs pt-0.5">
        
        {/* Left Controls: Sector & Sort */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Sector Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold hidden xs:inline">Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs w-full sm:w-auto truncate"
            >
              {DSE_SECTORS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'All' ? 'All Sectors' : sec}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold hidden xs:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs w-full sm:w-auto truncate"
            >
              <option value="score_desc">Verdict Score (High to Low)</option>
              <option value="buffett_desc">🏰 Buffett Quality (High to Low)</option>
              <option value="margin_desc">🛡️ Margin of Safety (High to Low)</option>
              <option value="gainers">Top Gainers (%)</option>
              <option value="losers">Top Losers (%)</option>
              <option value="pe_asc">P/E (Low to High)</option>
              <option value="roe_desc">ROE (High to Low)</option>
              <option value="volume_desc">Highest Volume</option>
              <option value="symbol_asc">Symbol (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Right Controls: View Mode */}
        <div className="flex items-center justify-end gap-2 shrink-0">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
