import heroImage from '../assets/hero.png';

export default function Sidebar() {
  return (
    <aside className="w-72 hidden md:flex flex-col bg-[#0f172a] text-white min-h-screen p-6 gap-6 border-r border-slate-800">
      <div className="flex items-center gap-3">
        <img src={heroImage} alt="Logo" className="w-12 h-12 rounded-lg object-cover ring-2 ring-blue-500/20" />
        <div>
          <div className="text-sm font-bold tracking-widest text-white font-display">DSE PULSE</div>
          <div className="text-xs text-slate-400">Terminal</div>
        </div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-2 mt-6">
          <li className="px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 font-semibold border border-blue-500/30">Dashboard</li>
          <li className="px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">Watchlist</li>
          <li className="px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">Sector Map</li>
          <li className="px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer">Strategy Presets</li>
        </ul>
      </nav>

      <div className="text-xs text-slate-500 font-mono">v2.0.0 Pro</div>
    </aside>
  );
}
