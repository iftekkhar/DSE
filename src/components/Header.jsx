import { useState } from 'react';
import { Search, SlidersHorizontal, RefreshCw, Star, Activity, X, RotateCcw, Zap } from 'lucide-react';
import { useDhakaClock } from '../hooks/useDhakaClock';

export default function Header({
  searchTerm,
  setSearchTerm,
  onOpenSettings,
  activePresetName,
  onScrape,
  scraping,
  watchlistCount,
  activeTab,
  setActiveTab,
  isLiveSessionActive,
  onResetToDB
}) {
  const { dhakaTime, isMarketOpen } = useDhakaClock();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full glass-header shadow-md select-none transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand identity */}
        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <div
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer active:scale-95 transition-transform"
            onClick={() => setActiveTab('all')}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] p-0.5 shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#3b82f6]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-sm sm:text-base tracking-tight text-white leading-none">
                DSE PULSE
              </span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase hidden xs:inline">
                Institutional
              </span>
            </div>
          </div>

          {/* Market Status Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/90 px-2 sm:px-2.5 py-1 rounded-full border border-slate-700/60 text-[10px] sm:text-[11px] font-medium text-slate-300">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isMarketOpen
                  ? 'bg-[#10b981] animate-pulse-dot shadow-[0_0_6px_#10b981]'
                  : 'bg-slate-400'
              }`}
            />
            <span className="hidden sm:inline">{isMarketOpen ? 'Market Open' : 'Market Closed'}</span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span className="font-mono text-slate-300 text-[10px] font-semibold">{dhakaTime || 'Dhaka UTC+6'}</span>
          </div>

          {/* Live Session Pill */}
          {isLiveSessionActive && (
            <div className="hidden lg:flex items-center gap-1.5 bg-blue-950/90 text-blue-300 px-2.5 py-1 rounded-full border border-blue-600/50 text-[10.5px] font-semibold">
              <Zap className="w-3 h-3 text-blue-400 animate-pulse" />
              <span>Job 2 Live Active</span>
            </div>
          )}
        </div>

        {/* Search Bar (Desktop / Tablet inline; Mobile expandable) */}
        <div className="flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-1 sm:mx-2 hidden md:block">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scrip or sector (e.g. BRACBANK, GP)..."
              className="w-full bg-[#1e293b]/90 text-slate-100 placeholder-slate-400 text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-700/60 focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Mobile Search Icon Toggle */}
          <button
            onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/70 active:scale-95 transition-all"
            title="Search Scrips"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Watchlist Filter */}
          <button
            onClick={() => setActiveTab(activeTab === 'watchlist' ? 'all' : 'watchlist')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border active:scale-95 ${
              activeTab === 'watchlist'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/70 hover:text-white'
            }`}
            title="Toggle Watchlist"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                watchlistCount > 0 && activeTab !== 'watchlist'
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-current'
              }`}
            />
            <span className="hidden sm:inline">Watchlist</span>
            <span
              className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                activeTab === 'watchlist' ? 'bg-white/20 text-white' : 'bg-slate-900 text-amber-400'
              }`}
            >
              {watchlistCount}
            </span>
          </button>

          {/* Strategy Preset */}
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/70 transition-all active:scale-95"
            title="Configure KPI Strategy Presets"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 text-[11px] hidden md:inline">Strategy:</span>
            <span className="text-slate-200 font-bold text-xs max-w-[80px] sm:max-w-[100px] truncate">
              {activePresetName.replace(/^[^\w]+/, '')}
            </span>
          </button>

          {/* Reset Session / DB Button (Always visible beside Sync Live) */}
          <button
            onClick={onResetToDB}
            className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer ${
              isLiveSessionActive
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/50 shadow-amber-500/10'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70'
            }`}
            title="Reset active session and reload official data directly from SQLite Database"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reset Session</span>
          </button>

          {/* Sync Live Button */}
          <button
            onClick={onScrape}
            disabled={scraping}
            className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer ${
              scraping
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
            }`}
            title="Sync Live Intraday Ticker (Job 2 Session Snapshot)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{scraping ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Expandable Search Drawer */}
      {mobileSearchOpen && (
        <div className="md:hidden px-3 pb-3 pt-1 border-t border-slate-800 bg-[#0f172a] animate-in slide-in-from-top-2 duration-150">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by code (e.g. BRACBANK, GP)..."
              className="w-full bg-[#1e293b] text-slate-100 placeholder-slate-400 text-xs pl-9 pr-9 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-[#2563eb]"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="absolute right-3 text-[11px] font-bold text-slate-400 hover:text-white"
              >
                Done
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
