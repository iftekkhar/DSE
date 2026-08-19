import { useState } from 'react';
import { X, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-white">KPI Scoring Engine & Strategy Presets</h2>
              <p className="text-xs text-slate-400">Configure thresholds to dynamically classify Buy, Hold, and Risk stocks</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

          {/* Strategy Presets Grid */}
          <div>
            <label className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Select Preset Investment Strategy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STRATEGY_PRESETS.map((preset) => {
                const isSelected = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-xl border text-left transition-all ${isSelected
                        ? 'bg-blue-50/70 border-[#2563eb] ring-2 ring-blue-500/20'
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
            <label className="font-display text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">
              Fine-Tune Quantitative Hurdles
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* P/E */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">P/E Multiple Target</span>
                  <span className="font-mono font-bold text-[#2563eb] text-sm">&lt; {thresholds.pe}x</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Lower indicates undervaluation</p>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={thresholds.pe}
                  onChange={(e) => setThresholds({ ...thresholds, pe: Number(e.target.value) })}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

              {/* ROE */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">Minimum ROE (%)</span>
                  <span className="font-mono font-bold text-[#2563eb] text-sm">&gt; {thresholds.roe}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Higher indicates equity efficiency</p>
                <input
                  type="range"
                  min="5"
                  max="40"
                  step="1"
                  value={thresholds.roe}
                  onChange={(e) => setThresholds({ ...thresholds, roe: Number(e.target.value) })}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

              {/* Momentum */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">24h Momentum (% Change)</span>
                  <span className="font-mono font-bold text-[#2563eb] text-sm">&gt; {thresholds.momentum}%</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Price velocity hurdle</p>
                <input
                  type="range"
                  min="-3"
                  max="5"
                  step="0.5"
                  value={thresholds.momentum}
                  onChange={(e) => setThresholds({ ...thresholds, momentum: Number(e.target.value) })}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

              {/* Debt / Equity */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">Max Debt / Equity</span>
                  <span className="font-mono font-bold text-[#2563eb] text-sm">&lt; {thresholds.debtToEquity}</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Lower indicates low solvency risk</p>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={thresholds.debtToEquity}
                  onChange={(e) => setThresholds({ ...thresholds, debtToEquity: Number(e.target.value) })}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

              {/* Current Ratio */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">Min Current Ratio</span>
                  <span className="font-mono font-bold text-[#2563eb] text-sm">&gt; {thresholds.currentRatio}x</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Working capital buffer</p>
                <input
                  type="range"
                  min="0.8"
                  max="3.0"
                  step="0.1"
                  value={thresholds.currentRatio}
                  onChange={(e) => setThresholds({ ...thresholds, currentRatio: Number(e.target.value) })}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

              {/* EPS */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-800">Min EPS (BDT)</span>
                  <span className="font-mono font-bold text-[#2563eb] text-sm">&gt; ৳{thresholds.eps}</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Annual earnings per share</p>
                <input
                  type="range"
                  min="0.5"
                  max="10.0"
                  step="0.5"
                  value={thresholds.eps}
                  onChange={(e) => setThresholds({ ...thresholds, eps: Number(e.target.value) })}
                  className="w-full accent-[#2563eb] cursor-pointer"
                />
              </div>

            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 text-slate-600 leading-relaxed text-[11px]">
            <strong>💡 How scoring works:</strong> Each stock receives 1 point per KPI that passes your configured threshold. Stocks scoring ≥70% are classified as <strong>BUY</strong>, 45-69% as <strong>HOLD</strong>, and &lt;45% as <strong>RISK</strong>.
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleReset}
            className="px-3.5 py-2 text-slate-600 hover:text-slate-900 font-bold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              Apply Strategy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
