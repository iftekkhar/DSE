import { Download, Grid, List, ArrowUpDown, Filter, PauseCircle } from 'lucide-react';
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
  onExportCSV,
  watchlistCount,
  stocksCount,
  onOpenScrapersModal
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
    <div className="card-elevation p-3.5 mb-5 space-y-3">
      {/* Top Row: Strategy Tabs & Scraper Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
        {/* Strategy Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? tab.isWatchlist
                      ? 'bg-amber-500 text-white shadow-xs'
                      : tab.isBuffett
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-[#2563eb] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Automation Jobs Architecture Pill */}
        <button
          onClick={onOpenScrapersModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200/80 transition-all shadow-2xs self-start md:self-auto cursor-pointer"
          title="Click to view 4 Automated Jobs Architecture & Engine Specs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
          <span className="font-bold">4 Automation Jobs</span>
          <span className="text-[10px] text-blue-700 font-normal hidden sm:inline">(SQLite Master)</span>
        </button>
      </div>

      {/* Bottom Row: Sector Filter, Sort By, View Mode & Export */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs pt-0.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Sector Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 transition-colors">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400 font-semibold">Sector:</span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs pr-1"
            >
              {DSE_SECTORS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'All' ? 'All Sectors' : sec}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 transition-colors">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400 font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer text-xs pr-1"
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

        {/* View Mode & Export Toolbar */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid View"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          {/* Export CSV / Report */}
          <button
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-200 transition-colors shadow-2xs"
            title="Export Active Table to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-bold">CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}
