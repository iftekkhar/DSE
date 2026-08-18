import fs from 'fs/promises';
import path from 'path';
import fsSync from 'fs';

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const DEBUG_DIR = path.join(DATA_DIR, 'debug');

async function findDebugFile() {
  try {
    const files = await fs.readdir(DEBUG_DIR);
    for (const f of files) {
      if (f.includes('823af3f1ebdd')) return path.join(DEBUG_DIR, f);
    }
  } catch (e) {
    return null;
  }
  return null;
}

function toNumber(v){
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/,/g,''));
  return Number.isFinite(n) ? n : null;
}

(async ()=>{
  const dbg = await findDebugFile();
  if (!dbg) {
    console.error('debug file not found');
    process.exit(2);
  }
  const txt = await fs.readFile(dbg,'utf8');
  const obj = JSON.parse(txt);
  if (!obj || !Array.isArray(obj.aa)) {
    console.error('debug json missing aa array');
    process.exit(3);
  }
  const aa = obj.aa;
  const get = (k) => Array.isArray(obj[k]) ? obj[k] : [];
  const ea = get('ea'); // ltp
  const ad = get('ad'); // volume
  const an = get('an'); // pct change
  const aj = get('aj'); // previous
  const ba = get('ba'); // pe
  const bb = get('bb'); // roe
  const bc = get('bc'); // debt/equity
  const ei = get('ei'); // current ratio
  const ar = get('ar'); // market cap

  const mapped = [];
  for (let i=0;i<aa.length;i++){
    const sym = aa[i];
    if (!sym) continue;
    const rec = {
      symbol: String(sym).toUpperCase(),
      ltp: toNumber(ea[i]),
      previousClose: toNumber(aj[i]),
      change: (toNumber(ea[i])!=null && toNumber(aj[i])!=null) ? (toNumber(ea[i]) - toNumber(aj[i])) : null,
      changePercent: toNumber(an[i]),
      volume: toNumber(ad[i]) ? Math.round(toNumber(ad[i])) : null,
      pe: toNumber(ba[i]),
      roe: toNumber(bb[i]),
      debtToEquity: toNumber(bc[i]),
      currentRatio: toNumber(ei[i]),
      marketCap: toNumber(ar[i])
    };
    mapped.push(rec);
  }

  // write debug mapped
  await fs.mkdir(DEBUG_DIR, { recursive: true });
  const outDebug = path.join(DEBUG_DIR, 'bulk-mapped.json');
  await fs.writeFile(outDebug, JSON.stringify({ generatedAt: new Date().toISOString(), count: mapped.length, data: mapped.slice(0,200) }, null, 2), 'utf8');
  console.log('wrote', outDebug);

  // Now load symbols.json
  const SYMBOLS_FILE = path.join(process.cwd(), 'server','symbols.json');
  let symbols = null;
  try { symbols = JSON.parse(await fs.readFile(SYMBOLS_FILE,'utf8')); } catch(e){ symbols = null; }
  const targetSymbols = Array.isArray(symbols) && symbols.length ? symbols.map(s=>s.toUpperCase()) : ['1JANATAMF','BATBC','BRACBANK','SINGERBD'];

  // Build latest.json limited to our targetSymbols
  const latest = { fetchedAt: new Date().toISOString(), data: [] };
  const missingReport = { fetchedAt: new Date().toISOString(), missingReport: [] };
  for (const ts of targetSymbols) {
    const found = mapped.find(m => m.symbol === ts);
    const rec = found ? {
      symbol: found.symbol,
      ltp: found.ltp ?? null,
      change: found.change ?? null,
      changePercent: found.changePercent ?? null,
      pe: found.pe ?? null,
      roe: found.roe ?? null,
      eps: null,
      debtToEquity: found.debtToEquity ?? null,
      currentRatio: found.currentRatio ?? null,
      volume: found.volume ?? null,
      marketCap: found.marketCap ?? null
    } : { symbol: ts, ltp:null, change:null, changePercent:null, pe:null, roe:null, eps:null, debtToEquity:null, currentRatio:null, volume:null };
    latest.data.push(rec);
    const missing = Object.keys(rec).filter(k => k !== 'symbol' && (rec[k] === null || rec[k] === undefined));
    if (missing.length) missingReport.missingReport.push({ symbol: ts, missing });
  }

  // write latest and missing report
  const LATEST_FILE = path.join(process.cwd(),'data','latest.json');
  const REPORT_FILE = path.join(process.cwd(),'data','missing_report.json');
  await fs.writeFile(LATEST_FILE, JSON.stringify(latest, null, 2), 'utf8');
  await fs.writeFile(REPORT_FILE, JSON.stringify(missingReport, null, 2), 'utf8');
  console.log('wrote latest and report');

})();
