import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, RefreshCw, Star, Activity, X } from 'lucide-react';

export default function Header({
  searchTerm,
  setSearchTerm,
  onOpenSettings,
  activePresetName,
  onScrape,
  scraping,
  watchlistCount,
  activeTab,
  setActiveTab
}) {
  const [dhakaTime, setDhakaTime] = useState('');
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      setDhakaTime(new Intl.DateTimeFormat('en-US', options).format(now));

      const dhakaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
      const day = dhakaDate.getDay();
      const hours = dhakaDate.getHours();
      const minutes = dhakaDate.getMinutes();
      const currentMinutes = hours * 60 + minutes;
      
      const isWeekday = day >= 0 && day <= 4;
      const isTradingTime = currentMinutes >= (10 * 60) && currentMinutes <= (14 * 60 + 30);
      setIsMarketOpen(isWeekday && isTradingTime);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full bg-[#0f172a] text-white border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand identity & Live status */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none"
            onClick={() => setActiveTab('all')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#1e3a8a] p-0.5 shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-[#0f172a] rounded-[10px] flex items-center justify-center">
                <Activity className="w-4 h-4 text-[#3b82f6]" />
              </div>
            </div>
            <div>
              <span className="font-display font-black text-base tracking-tight text-white">DSE PULSE</span>
            </div>
          </div>

          {/* Minimalist Live Status Pill */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/60 text-[11px] font-medium text-slate-300">
            <span className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-[#10b981] animate-pulse-dot shadow-[0_0_6px_#10b981]' : 'bg-slate-400'}`}></span>
            <span>{isMarketOpen ? 'Market Open' : 'Market Closed'}</span>
            <span className="text-slate-500">•</span>
            <span className="font-mono text-slate-400 text-[10px]">{dhakaTime}</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scrip (e.g. BRACBANK, SQURPHARMA)..."
              className="w-full bg-[#1e293b]/90 text-slate-100 placeholder-slate-400 text-xs pl-9 pr-10 py-2 rounded-xl border border-slate-700/60 focus:outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Watchlist Filter */}
          <button
            onClick={() => setActiveTab(activeTab === 'watchlist' ? 'all' : 'watchlist')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              activeTab === 'watchlist'
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-slate-800/80 text-slate-300 border-slate-700/70 hover:text-white'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${watchlistCount > 0 && activeTab !== 'watchlist' ? 'fill-amber-400 text-amber-400' : 'fill-current'}`} />
            <span className="hidden sm:inline">Watchlist</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'watchlist' ? 'bg-white/20 text-white' : 'bg-slate-900 text-amber-400'
            }`}>
              {watchlistCount}
            </span>
          </button>

          {/* Strategy Preset */}
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/70 transition-all"
            title="Configure KPI Strategy Presets"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400 text-[11px]">Strategy:</span>
            <span className="text-slate-200 font-bold text-xs max-w-[90px] truncate">{activePresetName.replace(/^[^\w]+/, '')}</span>
          </button>

          {/* Sync Button */}
          <button
            onClick={onScrape}
            disabled={scraping}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              scraping
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scraping ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{scraping ? 'Syncing...' : 'Sync'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
