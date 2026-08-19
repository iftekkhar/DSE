import { X, Scale } from 'lucide-react';
import { getFallbackTag, formatDateDDMMM } from '../services/dseData';

export default function CompareModal({ compareList, onClose, onClear, onSelectStock }) {
  if (!compareList || compareList.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Side-by-Side Equities Comparison</h2>
              <p className="text-xs text-slate-400">Comparing valuation, capital efficiency, and financial health</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClear}
              className="text-xs text-slate-400 hover:text-rose-400 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-900 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Matrix Table */}
        <div className="overflow-x-auto p-6 flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-1/4">Metric</th>
                {compareList.map((s) => (
                  <th key={s.symbol} className="pb-3 text-center">
                    <div className="flex flex-col items-center cursor-pointer hover:opacity-80" onClick={() => onSelectStock && onSelectStock(s)}>
                      <span className="font-display text-base font-black text-slate-900">{s.symbol}</span>
                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                        {s.fullName || s.symbol}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Price */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">Daily Closing Price</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center font-mono font-bold text-slate-900 text-sm">
                    {s.ltp !== null && s.ltp !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span>৳{s.ltp.toFixed(2)}</span>
                        <span className="text-[8px] text-blue-700 font-normal">{formatDateDDMMM(s.closeDate || '2026-08-20')}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* 24h Change */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">Closing Momentum</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center">
                    {s.changePercent !== null && s.changePercent !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span className={`font-mono font-bold text-xs ${
                          (s.changePercent || 0) >= 0 ? 'text-[#047857]' : 'text-[#b91c1c]'
                        }`}>
                          {(s.changePercent || 0) >= 0 ? '+' : ''}{s.changePercent}%
                        </span>
                        <span className="text-[8px] text-slate-400">{formatDateDDMMM(s.closeDate || '2026-08-20')}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* P/E Ratio */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">P/E Multiple (Daily / Audited)</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {s.pe !== null && s.pe !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span>{s.pe}x <span className="text-[9px] font-normal text-slate-400">Daily</span></span>
                        <span className="text-[8px] text-slate-500 font-normal">Audited: {s.auditedPe || s.pe}x</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* ROE */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">Return on Equity (Audited)</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {s.roe !== null && s.roe !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span className={s.roe >= 15 ? 'text-emerald-700 font-black' : ''}>{s.roe}%</span>
                        <span className="text-[8px] text-emerald-700 font-normal">{(s.auditedPeriod || '').includes('2026') ? 'FY26 Q3' : 'FY25'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* EPS */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">Earnings Per Share (Audited)</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {s.eps !== null && s.eps !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span>৳{s.eps.toFixed(2)}</span>
                        <span className="text-[8px] text-slate-500 font-normal">{(s.auditedPeriod || '').includes('2026') ? 'FY26 Q3' : 'FY25'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Debt/Equity */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">Debt to Equity</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {s.debtToEquity !== null && s.debtToEquity !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span>{s.debtToEquity}</span>
                        <span className="text-[8px] text-slate-400 font-normal">FY25/26</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Current Ratio */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">Current Ratio (Liquidity)</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                    {s.currentRatio !== null && s.currentRatio !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span>{s.currentRatio}x</span>
                        <span className="text-[8px] text-slate-400 font-normal">FY25/26</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Volume */}
              <tr className="hover:bg-slate-50">
                <td className="py-3 px-4 font-bold text-slate-600">Trading Volume</td>
                {compareList.map((s) => (
                  <td key={s.symbol} className="py-3 px-4 text-center font-mono text-slate-600">
                    {s.volume !== null && s.volume !== undefined ? (
                      <div className="flex flex-col items-center">
                        <span>{s.volume.toLocaleString()}</span>
                        <span className="text-[8px] text-slate-400">{formatDateDDMMM(s.closeDate || '2026-08-20')}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-normal italic text-xs">Not Available live</span>
                    )}
                  </td>
                ))}
              </tr>

                {/* KPI Score */}
                <tr className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-600">KPI Score / 7</td>
                  {compareList.map((s) => (
                    <td key={s.symbol} className="py-3 px-4 text-center">
                      <span className="font-display font-black text-lg text-slate-900">
                        {s.verdictScore || 0}/7
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Final Verdict */}
                <tr className="bg-slate-50/50">
                  <td className="py-3.5 px-4 font-bold text-slate-700">Final Verdict</td>
                  {compareList.map((s) => (
                    <td key={s.symbol} className="py-3.5 px-4 text-center">
                      <span className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider border ${
                        s.verdict === 'BUY'
                          ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                          : s.verdict === 'HOLD'
                            ? 'bg-amber-50 text-[#b45309] border-amber-200'
                            : 'bg-rose-50 text-[#b91c1c] border-rose-200'
                      }`}>
                        {s.verdict}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Select up to 4 DSE stocks for instant multi-factor comparison</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl shadow-sm transition-all"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
}
