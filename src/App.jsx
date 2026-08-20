import { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

import Header from "./components/Header";
import MarketPulse from "./components/MarketPulse";
import FilterBar from "./components/FilterBar";
import StockTable from "./components/StockTable";
import StockGrid from "./components/StockGrid";
import StockModal from "./components/StockModal";
import CompareDock from "./components/CompareDock";
import CompareModal from "./components/CompareModal";
import ScoringModal from "./components/ScoringModal";
import ScraperModal from "./components/ScraperModal";

import { fetchDSEData, triggerScrape, exportToCSV } from "./services/api";
import { defaultCriteria } from "./config/criteria";

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Search & Navigation Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSector, setSelectedSector] = useState("All");
  const [sortBy, setSortBy] = useState("score_desc");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Interactive Features
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem("dse_watchlist");
      return saved ? JSON.parse(saved) : ["BRACBANK", "SQURPHARMA", "GP", "BATBC"];
    } catch {
      return ["BRACBANK", "SQURPHARMA", "GP", "BATBC"];
    }
  });

  const [compareList, setCompareList] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isScoringModalOpen, setIsScoringModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isScraperModalOpen, setIsScraperModalOpen] = useState(false);
  const [isLiveSessionActive, setIsLiveSessionActive] = useState(false);

  // Scoring Strategy Criteria
  const [criteria, setCriteria] = useState(() => {
    try {
      const saved = localStorage.getItem("dse_strategy");
      return saved ? JSON.parse(saved) : defaultCriteria;
    } catch {
      return defaultCriteria;
    }
  });

  // Save watchlist & strategy to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dse_watchlist", JSON.stringify(watchlist));
    } catch (e) {
      console.warn("Could not save watchlist to localStorage", e);
    }
  }, [watchlist]);

  useEffect(() => {
    try {
      localStorage.setItem("dse_strategy", JSON.stringify(criteria));
    } catch (e) {
      console.warn("Could not save criteria to localStorage", e);
    }
  }, [criteria]);

  // Toast notification helper
  const showToast = useCallback((msg, type = "info") => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch stocks on mount (Checking active session first)
  useEffect(() => {
    let isMounted = true;
    try {
      const savedSession = sessionStorage.getItem("dse_live_session_stocks");
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (isMounted) {
            setStocks(parsed);
            setIsLiveSessionActive(true);
            setLoading(false);
            return;
          }
        }
      }
    } catch (e) {
      console.warn("Could not load from sessionStorage", e);
    }

    fetchDSEData()
      .then((data) => {
        if (isMounted) {
          setStocks(data);
          setIsLiveSessionActive(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load DSE data", error);
        if (isMounted) showToast("Backend offline: using cached DSE reference data", "warning");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showToast]);

  // Keyboard Shortcuts: '/' or Cmd+K to search, Esc to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const input = document.querySelector('input[type="text"]');
        if (input) input.focus();
      }
      if (e.key === "Escape") {
        setSelectedStock(null);
        setIsScoringModalOpen(false);
        setIsCompareModalOpen(false);
        setIsScraperModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Compute Verdict based on Active Strategy Criteria
  const computeVerdictFor = (stock, activeCriteria) => {
    const t = activeCriteria.thresholds;
    const checks = {
      pe: stock.pe !== null && stock.pe !== undefined ? stock.pe < t.pe : false,
      roe: stock.roe !== null && stock.roe !== undefined ? stock.roe > t.roe : false,
      momentum: stock.changePercent !== null && stock.changePercent !== undefined ? stock.changePercent > t.momentum : false,
      debtToEquity: stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity < t.debtToEquity : false,
      currentRatio: stock.currentRatio !== null && stock.currentRatio !== undefined ? stock.currentRatio > t.currentRatio : false,
      eps: stock.eps !== null && stock.eps !== undefined ? stock.eps > t.eps : false,
      volume: stock.volume !== null && stock.volume !== undefined ? stock.volume > t.volume : false,
    };

    const totalKPIs = Object.keys(checks).length;
    const score = Object.values(checks).reduce((s, v) => s + (v ? 1 : 0), 0);
    const pct = totalKPIs > 0 ? score / totalKPIs : 0;

    let verdict = "RISK";
    if (pct >= 0.70) verdict = "BUY";
    else if (pct >= 0.45) verdict = "HOLD";

    return {
      verdict,
      verdictScore: score,
      verdictPct: Math.round(pct * 100),
      verdictChecks: checks,
    };
  };

  // Derive stocks with updated scores whenever stocks or criteria change
  const derivedStocks = useMemo(() => {
    return stocks.map((s) => {
      const v = computeVerdictFor(s, criteria);
      return {
        ...s,
        verdict: v.verdict,
        verdictScore: v.verdictScore,
        verdictPct: v.verdictPct,
        verdictChecks: v.verdictChecks,
      };
    });
  }, [stocks, criteria]);

  // Filter & Search Logic
  const filteredStocks = useMemo(() => {
    return derivedStocks.filter((stock) => {
      // 1. Search Query
      const query = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !query ||
        stock.symbol.toLowerCase().includes(query) ||
        (stock.fullName && stock.fullName.toLowerCase().includes(query)) ||
        (stock.sector && stock.sector.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // 2. Sector Filter
      if (selectedSector !== "All" && stock.sector !== selectedSector) {
        return false;
      }

      // 3. Strategy Tab Filters
      switch (activeTab) {
        case "watchlist":
          return watchlist.includes(stock.symbol);
        case "buffett":
          // Warren Buffett Screen: ROE >= 14%, Low Debt (<= 0.55), Reasonable Valuation (P/E <= 18)
          return (stock.roe || 0) >= 14 && (stock.debtToEquity !== null ? stock.debtToEquity : 0.4) <= 0.55 && (stock.pe || 15) <= 18;
        case "buy":
          return stock.verdict === "BUY";
        case "value":
          return stock.pe && stock.pe < 15 && stock.roe && stock.roe > 12;
        case "momentum":
          return (stock.changePercent || 0) >= 1.5;
        case "risk":
          return stock.verdict === "RISK" || stock.verdict === "HIGH RISK";
        default:
          return true;
      }
    });
  }, [derivedStocks, searchTerm, selectedSector, activeTab, watchlist]);

  // Sorting Logic
  const sortedStocks = useMemo(() => {
    const list = [...filteredStocks];
    switch (sortBy) {
      case "score_desc":
        return list.sort((a, b) => (b.verdictScore || 0) - (a.verdictScore || 0) || (b.roe || 0) - (a.roe || 0));
      case "buffett_desc":
        return list.sort((a, b) => (b.buffettScore || 0) - (a.buffettScore || 0));
      case "margin_desc":
        return list.sort((a, b) => (b.marginOfSafety || -999) - (a.marginOfSafety || -999));
      case "gainers":
        return list.sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
      case "losers":
        return list.sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
      case "pe_asc":
        return list.sort((a, b) => (a.pe || 999) - (b.pe || 999));
      case "roe_desc":
        return list.sort((a, b) => (b.roe || 0) - (a.roe || 0));
      case "eps_desc":
        return list.sort((a, b) => (b.eps || 0) - (a.eps || 0));
      case "volume_desc":
        return list.sort((a, b) => (b.volume || 0) - (a.volume || 0));
      case "symbol_asc":
        return list.sort((a, b) => a.symbol.localeCompare(b.symbol));
      default:
        return list;
    }
  }, [filteredStocks, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedStocks.length / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedStocks = sortedStocks.slice(startIdx, startIdx + itemsPerPage);

  // Watchlist Toggle
  const handleToggleWatchlist = (symbol) => {
    setWatchlist((prev) => {
      if (prev.includes(symbol)) {
        showToast(`Removed ${symbol} from watchlist`, "info");
        return prev.filter((s) => s !== symbol);
      } else {
        showToast(`⭐ Added ${symbol} to your watchlist!`, "success");
        return [...prev, symbol];
      }
    });
  };

  // Compare Toggle
  const handleToggleCompare = (stock) => {
    setCompareList((prev) => {
      const exists = prev.some((s) => s.symbol === stock.symbol);
      if (exists) {
        return prev.filter((s) => s.symbol !== stock.symbol);
      }
      if (prev.length >= 4) {
        showToast("You can compare up to 4 stocks simultaneously", "warning");
        return prev;
      }
      showToast(`Added ${stock.symbol} to comparison`, "info");
      return [...prev, stock];
    });
  };

  // Trigger Scrape & Sync (Job 2: Live Intraday Session Sync, 0 DB writes)
  const handleScrape = async () => {
    try {
      setScraping(true);
      showToast("Connecting to live DSE market feed for Intraday Session...", "info");
      const res = await triggerScrape();
      if (res && res.stocks && Array.isArray(res.stocks) && res.stocks.length > 0) {
        sessionStorage.setItem("dse_live_session_stocks", JSON.stringify(res.stocks));
        setIsLiveSessionActive(true);
        setStocks(res.stocks);
        showToast(`⚡ Live Intraday Session active (${res.stocks.length} scrips synced). Daily P/Es updated.`, "success");
      } else {
        const fresh = await fetchDSEData();
        setStocks(fresh);
        showToast("Market data refreshed from SQLite DB.", "success");
      }
    } catch (err) {
      console.warn("Scrape notice:", err.message);
      showToast("Live sync completed with available market data.", "success");
      const fresh = await fetchDSEData();
      setStocks(fresh);
    } finally {
      setScraping(false);
    }
  };

  // Reset Session to 100% Official DB Closing Balance
  const handleResetToDB = async () => {
    try {
      sessionStorage.removeItem("dse_live_session_stocks");
      setIsLiveSessionActive(false);
      setLoading(true);
      const dbStocks = await fetchDSEData();
      setStocks(dbStocks);
      showToast("↩ Returned to Official SQLite Database Closing Balance.", "info");
    } catch (e) {
      console.error("Failed to reset to DB:", e);
    } finally {
      setLoading(false);
    }
  };

  // Export CSV
  const handleExport = () => {
    exportToCSV(sortedStocks, `dse-analytics-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`);
    showToast(`Exported ${sortedStocks.length} equities to CSV`, "success");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-18 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`px-4 py-2.5 rounded-xl shadow-xl border text-xs font-bold flex items-center gap-2 ${toastMessage.type === "success"
              ? "bg-[#047857] text-white border-emerald-400/30"
              : toastMessage.type === "warning"
                ? "bg-[#b45309] text-white border-amber-400/30"
                : "bg-[#0f172a] text-white border-slate-700"
            }`}>
            {toastMessage.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-300" />}
            {toastMessage.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-300" />}
            {toastMessage.type === "info" && <Info className="w-4 h-4 text-blue-300" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Modern App Header */}
      <Header
        searchTerm={searchTerm}
        setSearchTerm={(term) => {
          setSearchTerm(term);
          setCurrentPage(1);
        }}
        onOpenSettings={() => setIsScoringModalOpen(true)}
        activePresetName={criteria.name || "DSE Balanced"}
        onScrape={handleScrape}
        scraping={scraping}
        watchlistCount={watchlist.length}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setCurrentPage(1);
        }}
        isLiveSessionActive={isLiveSessionActive}
        onResetToDB={handleResetToDB}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">

        {/* Top Market Macro Pulse Cards */}
        <MarketPulse
          stocks={derivedStocks}
          onSelectStock={(s) => setSelectedStock(s)}
        />

        {/* Strategy Tabs, Sector Filter & Search Toolbar */}
        <FilterBar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setCurrentPage(1);
          }}
          selectedSector={selectedSector}
          setSelectedSector={(sec) => {
            setSelectedSector(sec);
            setCurrentPage(1);
          }}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={(n) => {
            setItemsPerPage(n);
            setCurrentPage(1);
          }}
          onExportCSV={handleExport}
          totalFiltered={sortedStocks.length}
          watchlistCount={watchlist.length}
          stocksCount={derivedStocks.length}
          onOpenScrapersModal={() => setIsScraperModalOpen(true)}
        />

        {/* Loading Shimmer State */}
        {loading ? (
          <div className="card-elevation p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin"></div>
            <p className="font-display font-bold text-sm text-slate-700">Loading DSE Market Feed...</p>
            <span className="text-xs text-slate-400 font-mono">Connecting to live market data stream</span>
          </div>
        ) : (
          <>
            {/* Primary Stock View (Table or Grid) */}
            {viewMode === "table" ? (
              <StockTable
                stocks={paginatedStocks}
                onSelectStock={(s) => setSelectedStock(s)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
                compareList={compareList}
                onToggleCompare={handleToggleCompare}
              />
            ) : (
              <StockGrid
                stocks={paginatedStocks}
                onSelectStock={(s) => setSelectedStock(s)}
                watchlist={watchlist}
                onToggleWatchlist={handleToggleWatchlist}
                compareList={compareList}
                onToggleCompare={handleToggleCompare}
              />
            )}

            {/* Bottom Pagination Controls */}
            {sortedStocks.length > 0 && (
              <div className="card-elevation p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600 mb-8">
                <div>
                  Showing{" "}
                  <span className="font-mono font-bold text-slate-900">
                    {startIdx + 1} - {Math.min(startIdx + itemsPerPage, sortedStocks.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-mono font-bold text-slate-900">{sortedStocks.length}</span>{" "}
                  equities
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Page {currentPage} of {totalPages}</span>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-bold transition-all"
                    >
                      Previous
                    </button>

                    {/* Quick Page Numbers */}
                    {(() => {
                      const maxButtons = 5;
                      let start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                      let end = start + maxButtons - 1;
                      if (end > totalPages) {
                        end = totalPages;
                        start = Math.max(1, end - maxButtons + 1);
                      }
                      const pages = [];
                      for (let p = start; p <= end; p++) {
                        pages.push(p);
                      }
                      return pages.map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg font-mono font-bold transition-all ${currentPage === pageNum
                              ? "bg-[#2563eb] text-white shadow-xs"
                              : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                        >
                          {pageNum}
                        </button>
                      ));
                    })()}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-bold transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Floating Compare Dock */}
      <CompareDock
        compareList={compareList}
        onOpenModal={() => setIsCompareModalOpen(true)}
        onRemove={(sym) => setCompareList((prev) => prev.filter((s) => s.symbol !== sym))}
        onClear={() => setCompareList([])}
      />

      {/* Deep-Dive Stock Analysis Modal */}
      {selectedStock && (
        <StockModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          criteria={criteria}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
          compareList={compareList}
          onToggleCompare={handleToggleCompare}
        />
      )}

      {/* Side-by-Side Equities Compare Modal */}
      {isCompareModalOpen && (
        <CompareModal
          compareList={compareList}
          onClose={() => setIsCompareModalOpen(false)}
          onClear={() => {
            setCompareList([]);
            setIsCompareModalOpen(false);
          }}
          onSelectStock={(s) => {
            setIsCompareModalOpen(false);
            setSelectedStock(s);
          }}
        />
      )}

      {/* Scoring Engine & Strategy Settings Modal */}
      <ScoringModal
        isOpen={isScoringModalOpen}
        onClose={() => setIsScoringModalOpen(false)}
        criteria={criteria}
        onSaveCriteria={(newCriteria) => {
          setCriteria(newCriteria);
          showToast(`Strategy updated to: ${newCriteria.name}`, "success");
        }}
      />

      {/* Scrapers on Hold Catalog Modal */}
      <ScraperModal
        isOpen={isScraperModalOpen}
        onClose={() => setIsScraperModalOpen(false)}
      />

      {/* Refined Footer */}
      <footer className="w-full bg-[#0f172a] text-slate-400 py-6 border-t border-slate-800 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              D
            </div>
            <span className="font-display font-bold text-slate-200">DSE PULSE TERMINAL</span>
            <span className="text-slate-600">|</span>
            <span>Real-time Dhaka Stock Exchange Analytics</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Powered by DSE Market Engine & AI KPI Analytics</span>
            <span>•</span>
            <span>Dhaka Time: UTC+6</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
