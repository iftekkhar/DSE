import { X, PauseCircle, ShieldAlert, Database, Clock, Globe, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ScraperModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const scrapers = [
    {
      id: 1,
      name: 'Official Daily Closing Prices Scraper',
      fn: 'fetchDSEClosingPrices()',
      url: 'https://dsebd.org/dse_close_price.php',
      schedule: 'Daily (Sun–Thu) at 3:30 PM BST',
      targetTable: 'price_history (SQLite)',
      description: 'Captures official settlement closing price, yesterday close (YCP), trading high, low, closing volume, and value.',
      status: 'PAUSED / ON HOLD',
      reviewPoints: [
        'Guarantees single settlement record per trading day',
        'Validates against weekend / holiday empty responses',
        'Directly feeds the 20-year master timeline'
      ]
    },
    {
      id: 2,
      name: 'Live Intraday Ticker & Market Depth',
      fn: 'fetchDSELiveTicker()',
      url: 'https://dsebd.org/latest_share_price_scroll_l.php',
      schedule: 'Hourly during market hours (10:00 - 14:30 BST)',
      targetTable: 'In-Memory Cache / Real-time Snapshot',
      description: 'Tracks intraday Last Traded Price (LTP), live volume flow, and bid/ask spread movements.',
      status: 'PAUSED / ON HOLD',
      reviewPoints: [
        'Must not overwrite official settlement closing prices',
        'Rate-limited to prevent IP blocking from DSE servers',
        'Keeps ticker updates isolated from closing history'
      ]
    },
    {
      id: 3,
      name: 'Audited Fundamental Disclosures Crawler',
      fn: 'crawlCompanyFundamentals(symbol)',
      url: 'https://dsebd.org/displayCompany.php?name={SYMBOL}',
      schedule: 'Weekly (Saturdays 02:00 AM BST)',
      targetTable: 'company_fundamentals (SQLite)',
      description: 'Crawls audited EPS, NAVPS, Paid-Up Capital, Authorized Capital, Cash Dividend Yield, and quarterly disclosures.',
      status: 'PAUSED / ON HOLD',
      reviewPoints: [
        'Handles variations across Banks, Insurance, and Mutual Funds',
        'Extracts audited disclosure period tags (e.g. FY26 Q3 9M)',
        'Throttled with 200ms delay across all 440 listed companies'
      ]
    },
    {
      id: 4,
      name: 'Market Breadth & Sector Index Scraper',
      fn: 'fetchMarketPulse()',
      url: 'https://dsebd.org/dseX_share.php',
      schedule: 'Hourly during trading days',
      targetTable: 'market_breadth (SQLite)',
      description: 'Aggregates market-wide breadth: total advances, declines, unchanged issues, and sector turnover.',
      status: 'PAUSED / ON HOLD',
      reviewPoints: [
        'Tracks macro sentiment and market turnover ratio',
        'Maintains historical sectoral index trends'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
              <PauseCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-black text-white">Scraper Jobs Inventory</h2>
                <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/40">
                  4 Jobs on Hold
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                All automated cron jobs are currently paused. Strict SQLite Database mode is active.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Status Banner */}
        <div className="bg-emerald-50/80 border-b border-emerald-200 px-5 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <Database className="w-4 h-4 text-emerald-700" />
            <span>Active Operational Mode: <strong>100% Strict SQLite DB</strong> (641,343 Daily Closing Records • 440 Listed Equities)</span>
          </div>
          <span className="text-[11px] text-emerald-800 font-mono bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
            No live scraper pollution
          </span>
        </div>

        {/* Scrapers List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {scrapers.map((sc) => (
            <div
              key={sc.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      {sc.id}
                    </span>
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      {sc.name}
                    </h3>
                  </div>
                  <code className="text-[11px] font-mono text-blue-600 ml-7 block mt-0.5">
                    {sc.fn}
                  </code>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                    {sc.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3 ml-7">
                {sc.description}
              </p>

              <div className="ml-7 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate" title={sc.url}>Source: <strong className="text-slate-800">{sc.url.replace('https://dsebd.org/', '')}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cron: <strong className="text-slate-800">{sc.schedule}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>Target: <strong className="text-slate-800">{sc.targetTable}</strong></span>
                </div>
              </div>

              <div className="ml-7">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Review & Sanitization Checklist
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {sc.reviewPoints.map((pt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[10.5px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {pt}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="bg-slate-100/80 p-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span>Ready for step-by-step review when user instructs.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors text-xs"
          >
            Close Catalog
          </button>
        </div>
      </div>
    </div>
  );
}
