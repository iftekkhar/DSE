import React, { useState, useEffect, useMemo } from 'react';
import { Search, Bell, User } from 'lucide-react';
import heroImage from './assets/hero.png';
import { fetchDSEData } from './services/api';
import { defaultCriteria } from './config/criteria';

export default function App() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedStock, setExpandedStock] = useState(null);

  const [itemsPerPage, setItemsPerPage] = useState(10);


  // Fetch real stock data from AmarStock API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchDSEData();
        setStocks(data);
      } catch (error) {
        console.error("Failed to load real data", error);
        // Add minimal error handling to state
        setStocks([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // scoring criteria (configurable)
  const [criteria, setCriteria] = useState(defaultCriteria);
  const [showWhyMap, setShowWhyMap] = useState({});
  const [showSettings, setShowSettings] = useState(false);

  const computeVerdictFor = (stock, criteria) => {
    const t = criteria.thresholds;

    // Each KPI gives 1 point if it passes; missing KPIs give 0.
    const checks = {
      pe: (stock.pe !== null && stock.pe !== undefined) ? (stock.pe < t.pe) : false,
      roe: (stock.roe !== null && stock.roe !== undefined) ? (stock.roe > t.roe) : false,
      momentum: (stock.changePercent !== null && stock.changePercent !== undefined) ? (stock.changePercent > t.momentum) : false,
      debtToEquity: (stock.debtToEquity !== null && stock.debtToEquity !== undefined) ? (stock.debtToEquity < t.debtToEquity) : false,
      currentRatio: (stock.currentRatio !== null && stock.currentRatio !== undefined) ? (stock.currentRatio > t.currentRatio) : false,
      eps: (stock.eps !== null && stock.eps !== undefined) ? (stock.eps > t.eps) : false,
      volume: (stock.volume !== null && stock.volume !== undefined) ? (stock.volume > t.volume) : false
    };

    const totalKPIs = Object.keys(checks).length;
    const score = Object.values(checks).reduce((s, v) => s + (v ? 1 : 0), 0);
    const pct = totalKPIs > 0 ? (score / totalKPIs) : 0;

    // Map score percentage into discrete levels
    let level = 1;
    if (pct >= 0.75) level = 4; // BUY
    else if (pct >= 0.5) level = 3; // HOLD
    else if (pct >= 0.25) level = 2; // RISK
    else level = 1; // HIGH RISK

    let verdictLabel = 'HIGH RISK';
    if (level === 4) verdictLabel = 'BUY';
    else if (level === 3) verdictLabel = 'HOLD';
    else if (level === 2) verdictLabel = 'RISK';

    const verdictColor = level === 4 ? 'bg-emerald-100 text-emerald-700' : level === 3 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';

    return {
      verdict: verdictLabel,
      verdictScore: score,
      verdictPct: Math.round(pct * 100),
      verdictColor,
      checks,
      totalKPIs
    };
  };

  // KPI label map (display-friendly)
  const KPI_LABELS = {
    pe: 'P/E',
    roe: 'ROE',
    momentum: 'MOMENTUM',
    debtToEquity: 'DEBT/EQUITY',
    currentRatio: 'CURRENT RATIO',
    eps: 'EPS',
    volume: 'VOLUME',
    ltp: 'CURRENT PRICE'
  };

  // derived stocks with verdict computed from criteria
  const derivedStocks = useMemo(() => {
    return stocks.map(s => {
      const v = computeVerdictFor(s, criteria);
      return { ...s, verdict: v.verdict, verdictScore: v.verdictScore, verdictPct: v.verdictPct, verdictColor: v.verdictColor, verdictChecks: v.checks };
    });
  }, [stocks, criteria]);

  // Filter and search logic (use derivedStocks)
  const filteredStocks = derivedStocks.filter(stock => {
    const matchesSearch = stock.symbol.toLowerCase().includes(searchTerm.toLowerCase());

    switch(filterType) {
      case 'buy':
        return matchesSearch && stock.verdict === 'BUY';
      case 'high-risk':
        return matchesSearch && stock.verdict === 'HIGH RISK';
      case 'risk':
        return matchesSearch && stock.verdict === 'RISK';
      case 'hold':
        return matchesSearch && stock.verdict === 'HOLD';
      default:
        return matchesSearch;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedStocks = filteredStocks.slice(startIdx, startIdx + itemsPerPage);

  const handlePrevious = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7fe] font-sans text-slate-800 relative">

      {/* Main Content */}
      <div className="flex-1 p-4 md:p-8 w-full transition-all duration-300">
        {/* Top Header */}
        <div className="w-full -mx-4 md:-mx-8 bg-gradient-to-br from-[#3b56ff] to-[#6b4bff] py-2 px-4 md:px-8 mb-4 shadow-sm">
          <div className="flex items-center gap-4 w-full">
            <div className="flex items-center gap-3">
              <img src={heroImage} alt="Site logo" className="w-10 h-10 rounded-md object-cover" />
              <div>
                <div className="text-sm font-bold text-white tracking-wider">SHREVOU</div>
                <div className="text-white/90 text-sm">Site Details</div>
              </div>
            </div>

            <div className="flex-1 mx-4">
              <div className="max-w-lg mx-auto">
                <div className="relative">
                  <Search className="w-4 h-4 text-white/70 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search symbols or company"
                    className="w-full pl-9 pr-4 py-2 bg-white/20 text-white rounded-full placeholder-white/70 focus:bg-white/25 outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="bg-white/10 text-white/90 p-2 rounded-lg hover:bg-white/12">
                <Bell className="w-4 h-4" />
              </button>
              <button className="bg-white/10 text-white/90 p-2 rounded-lg hover:bg-white/12">
                <User className="w-4 h-4" />
              </button>
              <button
                onClick={async () => {
                  try {
                    setLoading(true);
                    const resp = await fetch('http://localhost:5001/api/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                    const json = await resp.json();
                    alert('Scrape started: ' + JSON.stringify(json.result));
                    const data = await fetchDSEData();
                    setStocks(data);
                  } catch (err) {
                    alert('Scrape failed: ' + err.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-white text-[#3b56ff] px-4 py-2 rounded-lg font-semibold text-sm shadow-sm"
              >
                Scrape Now
              </button>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={() => setShowSettings(prev => !prev)}
            className="text-sm text-[#4318ff] font-semibold underline"
          >
            Scoring Settings
          </button>
          {showSettings && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-full">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1">P/E threshold (lower is better)</div>
                  <input type="number" value={criteria.thresholds.pe} onChange={(e) => setCriteria(c => ({ ...c, thresholds: { ...c.thresholds, pe: Number(e.target.value) } }))} className="w-full px-3 py-2 rounded-md border" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">ROE threshold (higher is better)</div>
                  <input type="number" value={criteria.thresholds.roe} onChange={(e) => setCriteria(c => ({ ...c, thresholds: { ...c.thresholds, roe: Number(e.target.value) } }))} className="w-full px-3 py-2 rounded-md border" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Momentum % threshold</div>
                  <input type="number" value={criteria.thresholds.momentum} onChange={(e) => setCriteria(c => ({ ...c, thresholds: { ...c.thresholds, momentum: Number(e.target.value) } }))} className="w-full px-3 py-2 rounded-md border" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Debt/Equity threshold (lower is better)</div>
                  <input type="number" step="0.1" value={criteria.thresholds.debtToEquity} onChange={(e) => setCriteria(c => ({ ...c, thresholds: { ...c.thresholds, debtToEquity: Number(e.target.value) } }))} className="w-full px-3 py-2 rounded-md border" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Current Ratio threshold</div>
                  <input type="number" step="0.1" value={criteria.thresholds.currentRatio} onChange={(e) => setCriteria(c => ({ ...c, thresholds: { ...c.thresholds, currentRatio: Number(e.target.value) } }))} className="w-full px-3 py-2 rounded-md border" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">EPS threshold</div>
                  <input type="number" step="0.1" value={criteria.thresholds.eps} onChange={(e) => setCriteria(c => ({ ...c, thresholds: { ...c.thresholds, eps: Number(e.target.value) } }))} className="w-full px-3 py-2 rounded-md border" />
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Volume threshold</div>
                  <input type="number" value={criteria.thresholds.volume} onChange={(e) => setCriteria(c => ({ ...c, thresholds: { ...c.thresholds, volume: Number(e.target.value) } }))} className="w-full px-3 py-2 rounded-md border" />
                </div>
                <div className="col-span-2">
                  <div className="text-sm font-semibold">Scoring</div>
                  <div className="text-xs text-slate-500">Scoring now awards 1 point per KPI when it meets the configured threshold. Missing KPIs score 0. Total possible points: 7.</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setShowSettings(false)} className="px-3 py-1 rounded bg-[#4318ff] text-white text-sm">Close</button>
                <button onClick={() => setCriteria(defaultCriteria)} className="px-3 py-1 rounded border text-sm">Reset</button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Show</span>




              <select 
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-slate-50 border-none rounded-lg px-3 py-1.5 text-sm font-semibold focus:ring-2 focus:ring-[#4318ff]/20 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Entries</span>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-slate-100"></div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
              <FilterButton active={filterType === 'all'} onClick={() => setFilterType('all')} label="All" />
              <FilterButton active={filterType === 'buy'} onClick={() => setFilterType('buy')} label="Buy" />
            <FilterButton active={filterType === 'hold'} onClick={() => setFilterType('hold')} label="Hold" />
            <FilterButton active={filterType === 'risk'} onClick={() => setFilterType('risk')} label="Risk" />
            <FilterButton active={filterType === 'high-risk'} onClick={() => setFilterType('high-risk')} label="High Risk" />
            </div>
          </div>

          <div className="relative w-full xl:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search records"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm placeholder-slate-400 focus:ring-2 focus:ring-[#4318ff]/20 transition-all"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-[#4318ff] border-t-transparent"></div>
          </div>
        )}

        {/* Stock Table */}
        {!loading && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Stock Scrip</th>
                    <th className="px-6 py-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">CURRENT PRICE</th>
                    <th className="px-6 py-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">P/E</th>
                    <th className="px-6 py-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">ROE</th>
                    <th className="px-6 py-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">EPS</th>
                    <th className="px-6 py-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">VERDICT</th>
                    <th className="px-6 py-5 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedStocks.length > 0 ? (
                    paginatedStocks.map((stock) => (
                      <React.Fragment key={stock.symbol}>
                        <tr className={`hover:bg-slate-50/50 transition-colors group ${expandedStock === stock.symbol ? 'bg-[#eef6ff]' : ''}`}>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{stock.symbol}</span>
                              {/* show full stock name here instead of the small colored span */}
                              <span className="text-sm text-slate-500">{stock.fullName || stock.symbol}</span>
                            </div>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex flex-col items-start">
                              <div className="flex items-center gap-3">
                                <div className="text-[12px] font-black text-slate-900">{stock.ltp !== null && stock.ltp !== undefined ? `৳${stock.ltp.toFixed(2)}` : 'N/A'}</div>
                                <div className={`text-xs font-bold ${stock.changePercent !== null && stock.changePercent !== undefined ? (stock.changePercent >= 0 ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-400'}`}>
                                 {stock.changePercent !== null && stock.changePercent !== undefined ? `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent}%` : 'Not available'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col">
                              <div className="text-[12px] font-black text-slate-900">{stock.pe !== null && stock.pe !== undefined ? stock.pe : 'N/A'}</div>
                              <div className="text-[10px] text-slate-500">P/E Ratio</div>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col">
                              <div className="text-[12px] font-black text-slate-900">{stock.roe !== null && stock.roe !== undefined ? `${stock.roe}%` : 'N/A'}</div>
                              <div className="text-[10px] text-slate-500">ROE %</div>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center">
                            <div className="flex flex-col">
                              <div className="text-[12px] font-black text-slate-900">{stock.eps !== null && stock.eps !== undefined ? stock.eps : 'N/A'}</div>
                              <div className="text-[10px] text-slate-500">EPS</div>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${stock.verdictColor}`}>{stock.verdict}</div>
                              <button
                                onClick={() => setShowWhyMap(prev => ({ ...prev, [stock.symbol]: !prev[stock.symbol] }))}
                                className="text-xs text-slate-500 underline hover:text-slate-700"
                                aria-label={`Why ${stock.symbol} got ${stock.verdict}`}
                              >
                                Why
                              </button>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-center">
                            <button
                              onClick={() => setExpandedStock(expandedStock === stock.symbol ? null : stock.symbol)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                expandedStock === stock.symbol 
                                  ? 'bg-[#4318ff] text-white border-[#4318ff]' 
                                  : 'text-[#4318ff] hover:bg-[#4318ff]/10 border-[#4318ff]/20'
                              }`}
                            >
                              {expandedStock === stock.symbol ? 'Close' : 'Analyze'}
                            </button>
                          </td>
                        </tr>
                        {showWhyMap[stock.symbol] && (
                          <tr>
                            <td colSpan="7" className="px-4 md:px-8 py-4 bg-white/50 border-b border-slate-100">
                              <div className="text-sm text-slate-700">
                                <div className="font-bold mb-2">Why this verdict?</div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                  <div className="text-xs text-slate-500">P/E &nbsp; {stock.pe !== null && stock.pe !== undefined ? stock.pe : 'N/A'}  — {stock.verdictChecks?.pe ? <span className="text-emerald-600">Pass</span> : (stock.pe !== null && stock.pe !== undefined ? <span className="text-rose-600">Fail</span> : <span className="text-amber-600">N/A</span>)}</div>
                                  <div className="text-xs text-slate-500">ROE &nbsp; {stock.roe !== null && stock.roe !== undefined ? `${stock.roe}%` : 'N/A'}  — {stock.verdictChecks?.roe ? <span className="text-emerald-600">Pass</span> : (stock.roe !== null && stock.roe !== undefined ? <span className="text-rose-600">Fail</span> : <span className="text-amber-600">N/A</span>)}</div>
                                  <div className="text-xs text-slate-500">Momentum &nbsp; {stock.changePercent !== null && stock.changePercent !== undefined ? `${stock.changePercent}%` : 'N/A'}  — {stock.verdictChecks?.momentum ? <span className="text-emerald-600">Pass</span> : (stock.changePercent !== null && stock.changePercent !== undefined ? <span className="text-rose-600">Fail</span> : <span className="text-amber-600">N/A</span>)}</div>
                                  <div className="text-xs text-slate-500">Debt/Equity &nbsp; {stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity : 'N/A'}  — {stock.verdictChecks?.debtToEquity ? <span className="text-emerald-600">Pass</span> : (stock.debtToEquity !== null && stock.debtToEquity !== undefined ? <span className="text-rose-600">Fail</span> : <span className="text-amber-600">N/A</span>)}</div>
                                  <div className="text-xs text-slate-500">Current Ratio &nbsp; {stock.currentRatio !== null && stock.currentRatio !== undefined ? stock.currentRatio : 'N/A'}  — {stock.verdictChecks?.currentRatio ? <span className="text-emerald-600">Pass</span> : (stock.currentRatio !== null && stock.currentRatio !== undefined ? <span className="text-rose-600">Fail</span> : <span className="text-amber-600">N/A</span>)}</div>
                                  <div className="text-xs text-slate-500">EPS &nbsp; {stock.eps !== null && stock.eps !== undefined ? stock.eps : 'N/A'}  — {stock.verdictChecks?.eps ? <span className="text-emerald-600">Pass</span> : (stock.eps !== null && stock.eps !== undefined ? <span className="text-rose-600">Fail</span> : <span className="text-amber-600">N/A</span>)}</div>
                                  <div className="text-xs text-slate-500">Volume &nbsp; {stock.volume !== null && stock.volume !== undefined ? stock.volume : 'N/A'}  — {stock.verdictChecks?.volume ? <span className="text-emerald-600">Pass</span> : (stock.volume !== null && stock.volume !== undefined ? <span className="text-rose-600">Fail</span> : <span className="text-amber-600">N/A</span>)}</div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {expandedStock === stock.symbol && (
                          <tr>
                            <td colSpan="7" className="px-4 md:px-8 py-10 bg-[#dbe8ff] border-b border-slate-100">
                              <div className="animate-in slide-in-from-top-4 duration-500 ease-out">
                                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
                                  <div>
                                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{stock.symbol} Analysis</h3>
                                    <p className="text-slate-500 text-sm font-medium mt-1">Detailed KPI breakdown and market signals</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                  {/* Left Column: KPI Cards */}
                                  <div className="xl:col-span-2 space-y-8">
                                    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4">
                                      <KPICard label="CURRENT PRICE" value={stock.ltp !== null && stock.ltp !== undefined ? `৳${stock.ltp.toFixed(2)}` : 'N/A'} status={stock.ltp !== null ? (stock.ltp >= 0 ? 'pass' : 'neutral') : 'neutral'} tooltip={defaultCriteria.descriptions.pe} />
                                      <KPICard label="P/E" value={stock.pe !== null && stock.pe !== undefined ? stock.pe : 'N/A'} status={stock.verdictChecks?.pe ? 'pass' : (stock.pe !== null ? 'fail' : 'neutral')} tooltip={defaultCriteria.descriptions.pe} />
                                      <KPICard label="ROE" value={stock.roe !== null && stock.roe !== undefined ? `${stock.roe}%` : 'N/A'} status={stock.verdictChecks?.roe ? 'pass' : (stock.roe !== null ? 'fail' : 'neutral')} tooltip={defaultCriteria.descriptions.roe} />
                                      <KPICard label="MOMENTUM" value={stock.changePercent !== null && stock.changePercent !== undefined ? `${stock.changePercent}%` : 'N/A'} status={stock.verdictChecks?.momentum ? 'pass' : (stock.changePercent !== null ? 'fail' : 'neutral')} tooltip={defaultCriteria.descriptions.momentum} />
                                      <KPICard label="EPS" value={stock.eps !== null && stock.eps !== undefined ? stock.eps : 'N/A'} status={stock.verdictChecks?.eps ? 'pass' : (stock.eps !== null ? 'fail' : 'neutral')} tooltip={defaultCriteria.descriptions.eps} />
                                      <KPICard label="DEBT/EQUITY" value={stock.debtToEquity !== null && stock.debtToEquity !== undefined ? stock.debtToEquity : 'N/A'} status={stock.verdictChecks?.debtToEquity ? 'pass' : (stock.debtToEquity !== null ? 'fail' : 'neutral')} tooltip={defaultCriteria.descriptions.debtToEquity} />
                                      <KPICard label="CURRENT RATIO" value={stock.currentRatio !== null && stock.currentRatio !== undefined ? stock.currentRatio : 'N/A'} status={stock.verdictChecks?.currentRatio ? 'pass' : (stock.currentRatio !== null ? 'fail' : 'neutral')} tooltip={defaultCriteria.descriptions.currentRatio} />
                                      <KPICard label="VOLUME" value={stock.volume !== null && stock.volume !== undefined ? stock.volume : 'N/A'} status={stock.verdictChecks?.volume ? 'pass' : (stock.volume !== null ? 'fail' : 'neutral')} tooltip={defaultCriteria.descriptions.volume } />
                                    </div>

                                    {/* Signal Analysis List */}
                                    <div className="bg-slate-50 p-6 md:p-8 rounded-3xl md:rounded-4xl border border-slate-100 shadow-sm">
                                      <div className="flex items-center gap-3 mb-8">
                                        <div className="p-2 bg-[#4318ff]/10 rounded-lg">
                                          <AlertCircle className="w-5 h-5 text-[#4318ff]" />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900">Advanced Signal Analysis</h4>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                        {stock.signals.length > 0 ? stock.signals.map((signal, idx) => (
                                          <div key={idx} className="flex flex-col gap-1.5 group">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                                              <div className={`w-1.5 h-1.5 rounded-full shadow-sm ${signal.label.includes('✓') ? 'bg-emerald-500' : signal.label.includes('•') ? 'bg-amber-500' : 'bg-rose-500'}`}></div>
                                              <span className={signal.label.includes('✓') ? 'text-emerald-600' : signal.label.includes('•') ? 'text-amber-600' : 'text-rose-600'}>{signal.label.replace(/[✓✗]\s/, '')}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 leading-relaxed font-medium pl-3 border-l-2 border-slate-50 group-hover:border-[#4318ff]/30 transition-colors">
                                              {signal.desc}
                                              {signal.usedKPIs && signal.usedKPIs.length > 0 && (
                                                <div className="text-[11px] mt-2 text-slate-400">Used KPIs: {signal.usedKPIs.map(k => KPI_LABELS[k] || k).join(', ')}</div>
                                              )}
                                            </div>
                                          </div>
                                        )) : (
                                          <div className="text-xs text-slate-400 font-medium col-span-2">No specific signals detected for this scrip at this time.</div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right Column: Recommendation Summary */}
                                  <div className="xl:col-span-1">
                                    <div className={`h-full p-8 rounded-3xl md:rounded-4xl border ${stock.verdictColor.split(' ')[0]} bg-opacity-10 flex flex-col justify-between shadow-sm min-h-[350px]`}>
                                      <div>
                                        <div className="text-[10px] uppercase font-black tracking-[0.2em] opacity-50 mb-2">Final Verdict</div>
                                        <div className="text-5xl font-black tracking-tighter mb-4">{stock.verdict}</div>
                                        <p className="text-xs font-medium opacity-70 leading-relaxed mb-4">
                                          {stock.verdict === 'BUY' && `Based on the checks passed, this stock shows strong bullish characteristics.`}
                                          {stock.verdict === 'HOLD' && `Mixed signals — some KPIs are positive while others are neutral.`}
                                          {stock.verdict === 'RISK' && `Risk detected: several financial or momentum checks failed; exercise caution.`}
                                          {stock.verdict === 'HIGH RISK' && `Multiple negative checks detected; this stock is showing significant risk and should be reviewed closely.`}
                                        </p>
                                      </div>
                                      
                                      <div className="space-y-6">
                                        <div>
                                          <div className="flex justify-between items-end mb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Signal Score</span>
                                           <span className="text-2xl font-black">{stock.verdictScore}<span className="text-xs opacity-40">/7</span></span>
                                          </div>
                                          <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full rounded-full bg-emerald-500 transition-all duration-1000`}
                                              style={{ width: `${stock.verdictPct}%` }}
                                            ></div>
                                          </div>
                                        </div>
                                        
                                        <div className="bg-white/40 p-4 rounded-xl border border-white/20 text-center">
                                          <div className="text-[9px] uppercase font-black tracking-widest opacity-40 mb-1">Market Sentiment</div>
                                          <div className="text-xs font-bold text-slate-700">
                                            {stock.verdict === 'BUY' && 'Strong Buy Signal Confirmed'}
                                            {stock.verdict === 'HOLD' && 'Mixed signals — monitor closely'}
                                            {stock.verdict === 'RISK' && 'Risk Alert — review financials before acting'}
                                            {stock.verdict === 'HIGH RISK' && 'High Risk — avoid buying until issues are resolved'}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-400 font-medium">
                        No stocks found matching your criteria
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {filteredStocks.length > 0 && (
              <div className="px-6 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-slate-400 text-[10px] md:text-xs font-bold text-center">
                  SHOWING <span className="text-slate-700">{startIdx + 1}-{Math.min(startIdx + itemsPerPage, filteredStocks.length)}</span> OF <span className="text-slate-700">{filteredStocks.length}</span> ENTRIES
                </div>






                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Page</span>
                    <select 
                      value={currentPage}
                      onChange={(e) => setCurrentPage(Number(e.target.value))}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-[#4318ff] focus:ring-2 focus:ring-[#4318ff]/20 cursor-pointer outline-none"
                    >
                      {[...Array(totalPages)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">of {totalPages}</span>
                  </div>


                  <div className="flex items-center gap-1">
                    <PageButton disabled={currentPage === 1} onClick={handlePrevious}>
                      <ChevronUp className="-rotate-90 w-4 h-4" />
                    </PageButton>
                    <PageButton disabled={currentPage === totalPages} onClick={handleNext}>
                      <ChevronDown className="-rotate-90 w-4 h-4" />
                    </PageButton>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// Helper Components

function FilterButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${active ? 'bg-[#4318ff] text-white shadow-md shadow-blue-100' : 'text-slate-400 hover:bg-slate-100'}`}
    >
      {label}
    </button>
  );
}

function PageButton({ children, active = false, disabled = false, onClick }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${active ? 'bg-[#4318ff] text-white shadow-md shadow-blue-100' : 'text-slate-400 hover:bg-slate-100 disabled:opacity-30'}`}
    >
      {children}
    </button>
  );
}

function KPICard({ label, value, status = 'neutral', tooltip = '' }) {
  // status: 'pass' | 'fail' | 'neutral'
  const colorClass = status === 'pass' ? 'text-emerald-600' : status === 'fail' ? 'text-rose-600' : 'text-amber-600';
  return (
    <div title={tooltip} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">{label}</div>
        <div className={`w-2 h-2 rounded-full ${status === 'pass' ? 'bg-emerald-500' : status === 'fail' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
      </div>
      <div className={`text-lg font-black tracking-tight ${colorClass}`}>{value}</div>
    </div>
  );
}