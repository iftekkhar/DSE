import { Download, Grid, List, ArrowUpDown, Filter, FileSpreadsheet } from 'lucide-react';
import { DSE_SECTORS } from '../services/dseData';
import { downloadExcel } from '../services/api';

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
    <div className="card-elevation p-3.5 mb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      {/* Strategy Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0 no-scrollbar">
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

      {/* Filters, Sorting & View Controls */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {/* Sector Filter */}
        <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600">
          <Filter className="w-3 h-3 text-slate-400" />
          <select
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
          >
            {DSE_SECTORS.map((sec) => (
              <option key={sec} value={sec}>
                {sec === 'All' ? 'All Sectors' : sec}
              </option>
            ))}
          </select>
        </div>

        {/* Sort By Selector */}
        <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600">
          <ArrowUpDown className="w-3 h-3 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer text-xs"
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

        {/* View Mode Toggle */}
        <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Table View"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
            title="Grid View"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Export Excel (.xlsx) */}
        <button
          onClick={() => downloadExcel('ALL')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 transition-all text-xs shadow-xs"
          title="Download SQLite Historical Data in Excel (.xlsx)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Export Excel</span>
        </button>

        {/* Export CSV */}
        <button
          onClick={onExportCSV}
          className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
          title="Export Table to CSV"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    </div>
  );
}
