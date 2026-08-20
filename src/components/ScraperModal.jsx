import { X, PlayCircle, Database, Clock, Globe, CheckCircle2, AlertCircle, Zap, ShieldCheck } from 'lucide-react';

export default function ScraperModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const jobs = [
    {
      id: 1,
      name: 'Official Daily Closing Prices Scraper',
      fn: 'runJob1ClosingPrices()',
      url: 'https://dsebd.org/dse_close_price.php',
      schedule: 'Daily (Sun–Thu) at 3:30 PM BST',
      targetTable: 'price_history (SQLite)',
      description: 'Ingests official settlement closing prices, YCP, closing volume, and calculates official daily closing momentum & Daily P/E (Close / EPS).',
      status: 'Active (Daily Close)',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      highlights: [
        'Atomic ON CONFLICT upsert on (symbol, date)',
        'Guarantees strict 1 record per trading day',
        'Directly feeds the 20-year master chart timeline'
      ]
    },
    {
      id: 2,
      name: 'Live Intraday Ticker & Market Depth',
      fn: 'runJob2IntradaySync()',
      url: 'https://dsebd.org/latest_share_price_scroll_l.php',
      schedule: 'On-Demand (Sync Live Button)',
      targetTable: 'sessionStorage (0 DB Writes)',
      description: 'Fetches live intraday prices (LTP), calculates Live Daily P/E (Live LTP / Audited EPS), and saves to browser sessionStorage. Vanishes on reset or tab close.',
      status: 'Session-Wise (Pure RAM)',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      highlights: [
        'Zero database writes (Master SQLite left 100% pristine)',
        'Survives page refresh (F5) during active research session',
        'Instant Reset to DB Close button available in Header'
      ]
    },
    {
      id: 3,
      name: 'Audited Fundamental Disclosures Crawler',
      fn: 'runJob3DailyFundamentalsDelta()',
      url: 'https://dsebd.org/displayCompany.php?name={SYMBOL}',
      schedule: 'Daily (Sun–Thu) at 4:00 PM BST',
      targetTable: 'company_fundamentals (SQLite Smart Delta)',
      description: 'Scrapes audited EPS (Basic/Diluted), NAVPS, Paid-Up Capital, Dividend Yield, and Audited Period. Only modifies database rows when new financial disclosures are filed.',
      status: 'Active (Smart Delta)',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      highlights: [
        'Smart Delta check: 0 DB writes if disclosures are identical',
        'Auto-updates audited EPS & Audited P/E upon new quarterly filing',
        'Rate-limited batch crawler across all 440 listed companies'
      ]
    },
    {
      id: 4,
      name: 'Market Breadth & Sector Index Scraper',
      fn: 'runJob4MarketBreadth()',
      url: 'https://dsebd.org/ (Homepage & dseX_share.php)',
      schedule: 'Every 30m during Market Hours (10:00 - 15:00 BST)',
      targetTable: 'market_breadth (SQLite)',
      description: 'Aggregates macro market-level data: DSEX Index, total daily turnover (৳ Crore), advancing, declining, and unchanged issues. Keeps stock fundamentals isolated.',
      status: 'Active (Market Hours)',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      highlights: [
        'Feeds Top Market Pulse strip (DSEX, Turnover, Adv/Dec)',
        'Computes Bull/Bear market sentiment barometer',
        '100% isolated: Does not alter individual stock closing or P/E'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88vh]">
        
        {/* Header */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-500/30">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-black text-white">Automated Jobs Architecture</h2>
                <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40">
                  4 Configured Jobs
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Dhaka Stock Exchange (DSE) automation suite with strict SQLite database integrity.
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
        <div className="bg-emerald-50/80 border-b border-emerald-200 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold">
            <Database className="w-4 h-4 text-emerald-700" />
            <span>Master Storage: <strong>SQLite Engine</strong> (641,343 Daily Closing Records • 440 Listed Equities)</span>
          </div>
          <span className="text-[11px] text-emerald-800 font-mono bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Zero Data Loss & Corruption Prevention Active
          </span>
        </div>

        {/* Jobs List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                      {job.id}
                    </span>
                    <h3 className="font-display text-sm font-bold text-slate-900">
                      {job.name}
                    </h3>
                  </div>
                  <code className="text-[11px] font-mono text-blue-600 ml-7 block mt-0.5">
                    {job.fn}
                  </code>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${job.badgeColor}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {job.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 mb-3 ml-7">
                {job.description}
              </p>

              <div className="ml-7 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate" title={job.url}>Source: <strong className="text-slate-800">{job.url.replace('https://dsebd.org/', '')}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cron: <strong className="text-slate-800">{job.schedule}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>Target: <strong className="text-slate-800">{job.targetTable}</strong></span>
                </div>
              </div>

              <div className="ml-7">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Engine & Integrity Safeguards
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {job.highlights.map((pt, idx) => (
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
            <span>Server Timezone: Asia/Dhaka (UTC+6). Backed by SQLite.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors text-xs cursor-pointer"
          >
            Close Architecture
          </button>
        </div>
      </div>
    </div>
  );
}
