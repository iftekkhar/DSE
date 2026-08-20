import { useState } from 'react';
import { X, SlidersHorizontal, RotateCcw, Check, Maximize2, Minimize2 } from 'lucide-react';
import { STRATEGY_PRESETS, defaultCriteria } from '../config/criteria';

export default function ScoringModal({
  isOpen,
  onClose,
  criteria,
  onSaveCriteria
}) {
  if (!isOpen) return null;

  return (
    <ScoringModalContent
      onClose={onClose}
      criteria={criteria}
      onSaveCriteria={onSaveCriteria}
    />
  );
}

function ScoringModalContent({ onClose, criteria, onSaveCriteria }) {
  const [activePreset, setActivePreset] = useState(criteria.id || 'balanced');
  const [thresholds, setThresholds] = useState({ ...criteria.thresholds });
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleSelectPreset = (preset) => {
    setActivePreset(preset.id);
    setThresholds({ ...preset.thresholds });
  };

  const handleSave = () => {
    const matched = STRATEGY_PRESETS.find(p => p.id === activePreset);
    onSaveCriteria({
      id: activePreset,
      name: matched ? matched.name : 'Custom Strategy',
      thresholds: { ...thresholds }
    });
    onClose();
  };

  const handleReset = () => {
    setActivePreset(defaultCriteria.id);
    setThresholds({ ...defaultCriteria.thresholds });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className={`bg-white text-slate-900 border border-slate-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-6 duration-200 transition-all ${
        isFullScreen
          ? 'w-full h-full max-w-none max-h-none rounded-none inset-0 sm:m-0'
          : 'w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[90vh]'
      }`}>

        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-full flex justify-center pt-2.5 pb-1 bg-[#0f172a]">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-[#0f172a] text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-white leading-tight">
                KPI Scoring Engine & Strategy Presets
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Configure thresholds to dynamically classify Buy, Hold, and Risk stocks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Full Screen Toggle */}
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 cursor-pointer border border-slate-700"
              title={isFullScreen ? "Exit Full Screen" : "Full Screen Mode"}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 cursor-pointer border border-slate-700"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1 text-xs touch-scroll pb-safe">

          {/* Strategy Presets Grid */}
          <div>
            <label className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Preset Investment Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {STRATEGY_PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left transition-all active:scale-[0.99] cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-[#2563eb] ring-2 ring-blue-500/20'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{preset.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#2563eb]" />}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Threshold Sliders & Inputs */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider">
                Active Threshold Parameters
              </label>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-semibold cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Balanced Defaults</span>
              </button>
            </div>

            <div className="space-y-3 bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200">
              
              {/* Max P/E */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-800 block">Max P/E Multiple</span>
                  <span className="text-[10px] text-slate-500">Maximum daily price-to-earnings multiple to qualify as value</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={thresholds.pe}
                    onChange={(e) => {
                      setThresholds({ ...thresholds, pe: Number(e.target.value) });
                      setActivePreset('custom');
                    }}
                    className="w-20 sm:w-28 accent-[#2563eb] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-slate-900 w-10 text-right">{thresholds.pe}x</span>
                </div>
              </div>

              {/* Min ROE */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Min Return on Equity (ROE %)</span>
                  <span className="text-[10px] text-slate-500">Minimum capital return efficiency hurdle</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="1"
                    value={thresholds.roe}
                    onChange={(e) => {
                      setThresholds({ ...thresholds, roe: Number(e.target.value) });
                      setActivePreset('custom');
                    }}
                    className="w-20 sm:w-28 accent-[#2563eb] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-slate-900 w-10 text-right">{thresholds.roe}%</span>
                </div>
              </div>

              {/* Max Debt/Equity */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Max Debt-to-Equity Ratio</span>
                  <span className="text-[10px] text-slate-500">Solvency ceiling to prevent excessive leverage</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.05"
                    value={thresholds.debtToEquity}
                    onChange={(e) => {
                      setThresholds({ ...thresholds, debtToEquity: Number(e.target.value) });
                      setActivePreset('custom');
                    }}
                    className="w-20 sm:w-28 accent-[#2563eb] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-slate-900 w-10 text-right">{thresholds.debtToEquity}</span>
                </div>
              </div>

              {/* Min Current Ratio */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Min Current Ratio</span>
                  <span className="text-[10px] text-slate-500">Short-term liquidity health check (Current Assets / Liabilities)</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={thresholds.currentRatio}
                    onChange={(e) => {
                      setThresholds({ ...thresholds, currentRatio: Number(e.target.value) });
                      setActivePreset('custom');
                    }}
                    className="w-20 sm:w-28 accent-[#2563eb] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-slate-900 w-10 text-right">{thresholds.currentRatio}x</span>
                </div>
              </div>

              {/* Min Session Momentum */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-200">
                <div>
                  <span className="font-bold text-slate-800 block">Min Momentum (%)</span>
                  <span className="text-[10px] text-slate-500">Minimum price gain to earn momentum checkmark</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="-5"
                    max="10"
                    step="0.5"
                    value={thresholds.momentum}
                    onChange={(e) => {
                      setThresholds({ ...thresholds, momentum: Number(e.target.value) });
                      setActivePreset('custom');
                    }}
                    className="w-20 sm:w-28 accent-[#2563eb] cursor-pointer"
                  />
                  <span className="font-mono font-bold text-slate-900 w-10 text-right">{thresholds.momentum}%</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-semibold rounded-xl text-xs active:scale-95 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-xs transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            Apply Strategy
          </button>
        </div>

      </div>
    </div>
  );
}
